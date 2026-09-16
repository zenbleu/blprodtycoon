/**
 * events.js — Company events, actor events, chemistry pulse
 * Prompt 6: 7 company events, 10 actor event types, weekly chemistry pulse
 * Prompt 8: tier-based CP frequency, always-succeed, decline penalties, breakup threshold
 */
import { A } from './state.jsx'
import { getChem, bondKey } from './chemistry.js'
import { getGameTierByRank } from './tiers.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ─── Company Events (7) ───────────────────────────────────────────────────────
// Each event: { id, weight, condition?, makeData(state) → { label, message, choices } | null }
const COMPANY_EVENTS = [
  {
    id: 'comp_bad_review',
    weight: 4,
    label: '📰 BAD PRESS',
    condition: s => s.history.length > 0,
    makeData: (s) => {
      const floor = (s.reputation ?? 0) >= 20
      return {
        message:
          'A major outlet published a scathing review of your latest production. '
          + 'Your studio\'s reputation is taking heat.'
          + (floor ? '\n\n💪 Your strong standing softens the blow — reduced penalties.' : ''),
        choices: [
          { label: floor ? '🤝 Apologise publicly (−1 rep)' : '🤝 Apologise publicly (−2 rep)',
            effect: (s2, d) => d({ type: A.ADD_REPUTATION, amount: floor ? -1 : -2 }) },
          { label: floor ? '🙄 Ignore it (−2 rep)' : '🙄 Ignore it (−5 rep)',
            effect: (s2, d) => d({ type: A.ADD_REPUTATION, amount: floor ? -2 : -5 }) },
        ],
      }
    },
  },
  {
    id: 'comp_sponsorship',
    weight: 4,
    label: '💼 BRAND SPONSORSHIP',
    makeData: (s) => {
      const accepts  = s.flags?.sponsorAccepts ?? 0
      const fatigued = accepts >= 3
      return {
        message:
          'A lifestyle brand wants to sponsor your studio.'
          + (fatigued
            ? '\n\n⚠️ Brand fatigue warning: you\'ve taken many deals recently. Accepting risks your artistic credibility.'
            : ' Easy money — but overexposure could hurt your standing over time.'),
        choices: [
          { label: fatigued ? '✅ Accept (+₩2,000, −1 rep — brand fatigue)' : '✅ Accept (+₩2,000)',
            effect: (s2, d) => {
              d({ type: A.ADD_MONEY, amount: 2000 })
              d({ type: A.SET_FLAG, key: 'sponsorAccepts', value: (s2.flags?.sponsorAccepts ?? 0) + 1 })
              if (fatigued) d({ type: A.ADD_REPUTATION, amount: -1 })
            } },
          { label: '❌ Decline (+2 rep — artistic integrity)',
            effect: (s2, d) => d({ type: A.ADD_REPUTATION, amount: 2 }) },
        ],
      }
    },
  },
  {
    id: 'comp_competitor_hit',
    weight: 3,
    label: '⚔️ COMPETITOR STRIKES',
    condition: s => s.reputation > 5,
    makeData: () => ({
      message:
        'A rival agency launched a smear campaign against your studio. '
        + 'Industry gossip is hurting your standing.',
      choices: [
        { label: '😤 Absorb the hit (−5 rep)',
          effect: (s, d) => d({ type: A.ADD_REPUTATION, amount: -5 }) },
        { label: '⚖️ Counter-campaign (−₩1,500, −2 rep)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: -1500 })
            d({ type: A.ADD_REPUTATION, amount: -2 })
          } },
      ],
    }),
  },
  {
    id: 'comp_script_leak',
    weight: 3,
    label: '🔓 SCRIPT LEAK',
    condition: s => s.productions.length > 0,
    makeData: () => ({
      message:
        'Unfinished script pages from your current production leaked online. '
        + 'Fans are speculating wildly.',
      choices: [
        { label: '🔍 Investigate (−₩1,500, −1 rep)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: -1500 })
            d({ type: A.ADD_REPUTATION, amount: -1 })
          } },
        { label: (s.reputation ?? 0) >= 20 ? '🤷 Ignore it (−1 rep — strong rep absorbs)' : '🤷 Ignore it (−3 rep)',
          effect: (s2, d) => d({ type: A.ADD_REPUTATION, amount: (s.reputation ?? 0) >= 20 ? -1 : -3 }) },
      ],
    }),
  },
  {
    id: 'comp_intl_platform',
    weight: 3,
    label: '🌏 INTERNATIONAL OFFER',
    condition: s => s.reputation >= 20,
    makeData: (s) => {
      const accepts  = s.flags?.sponsorAccepts ?? 0
      const fatigued = accepts >= 3
      return {
        message:
          'An international streaming platform wants to license your catalogue. '
          + 'A nice cash infusion.'
          + (fatigued ? '\n\n⚠️ Repeated licensing is starting to feel commercial — risk to artistic credibility.' : ''),
        choices: [
          { label: fatigued ? '✅ Accept (+₩2,500, −1 rep)' : '✅ Accept (+₩2,500)',
            effect: (s2, d) => {
              d({ type: A.ADD_MONEY, amount: 2500 })
              d({ type: A.SET_FLAG, key: 'sponsorAccepts', value: (s2.flags?.sponsorAccepts ?? 0) + 1 })
              if (fatigued) d({ type: A.ADD_REPUTATION, amount: -1 })
            } },
          { label: '❌ Decline', effect: () => {} },
        ],
      }
    },
  },
  {
    id: 'comp_worldwide_star',
    weight: 1,
    label: '🌟 WORLDWIDE STAR APPROACHES',
    condition: s =>
      s.numericRank <= 15 && s.actors.some(a => a.tier === 'Worldwide' && !a.signed),
    makeData: (s) => {
      const star = s.actors.find(a => a.tier === 'Worldwide' && !a.signed)
      if (!star) return null
      return {
        message:
          `${star.name} (Worldwide tier) has heard of your studio's prestige and is open to signing! `
          + `This rare opportunity won't last.`,
        choices: [
          { label: `✍️ Sign ${star.name} (₩${star.signCost.toLocaleString()})`,
            effect: (s2, d) => {
              if (s2.money >= star.signCost) {
                d({ type: A.SIGN_ACTOR, id: star.id, cost: star.signCost })
              } else {
                d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
                  title: '💸 INSUFFICIENT FUNDS',
                  message: `You need ₩${star.signCost.toLocaleString()} to sign ${star.name}.`,
                } } })
              }
            } },
          { label: '❌ Pass on this opportunity', effect: () => {} },
        ],
      }
    },
  },
  {
    id: 'comp_fixed_cp',
    weight: 2,
    label: '💕 CP CONTRACT OFFER',
    // Prompt 6.3: only for actors who do NOT already have any fixed CP partner
    condition: s => {
      const signed   = s.actors.filter(a => a.signed)
      const fixedIds = new Set((s.fixedCPs ?? []).flat())
      const free     = signed.filter(a => !fixedIds.has(a.id))
      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          if (getChem(free[i], free[j].id) >= 75) return true
        }
      }
      return false
    },
    makeData: (s) => {
      const signed   = s.actors.filter(a => a.signed)
      const fixedIds = new Set((s.fixedCPs ?? []).flat())
      const free     = signed.filter(a => !fixedIds.has(a.id))
      let bestPair = null, bestChem = 0
      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          const c = getChem(free[i], free[j].id)
          if (c > bestChem) { bestChem = c; bestPair = [free[i], free[j]] }
        }
      }
      if (!bestPair) return null
      const [a, b] = bestPair
      return {
        message:
          `Management is pushing for a Fixed CP contract between ${a.name} and ${b.name} `
          + `(Chemistry: ${bestChem}). This locks them as the lead pair for future productions.\n\n`
          + `⚠️ Commitment: They'll expect to work together for at least 3 productions. Casting them separately will feel like a betrayal.`,
        choices: [
          { label: `💕 Form Fixed CP: ${a.name} × ${b.name} (3-production commitment)`,
            effect: (s2, d) => d({ type: A.ADD_FIXED_CP, pair: [a.id, b.id] }) },
          { label: '❌ Keep things natural', effect: () => {} },
        ],
      }
    },
  },
  {
    id: 'comp_financial_audit',
    weight: 3,
    label: '🔍 FINANCIAL AUDIT',
    condition: s => (s.reputation ?? 0) < 10,
    makeData: () => ({
      message:
        'A regulatory body has flagged your studio for a financial review — '
        + 'your poor reputation has attracted scrutiny. Compliance is expected.',
      choices: [
        { label: '📋 Comply (−₩2,000, +1 rep)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: -2000 })
            d({ type: A.ADD_REPUTATION, amount: 1 })
          } },
        { label: '🙈 Stonewall them (−5 rep)',
          effect: (s, d) => d({ type: A.ADD_REPUTATION, amount: -5 }) },
      ],
    }),
  },
]

// ─── Tricky Events (Prompt 6.5 — 30% of all events, ⚠️ badge, both choices cost something) ──
// Pop rewards capped at 10–25K so no single event can skip tier thresholds.
// Every choice has a real downside — no free win on either option.
const TRICKY_COMPANY_EVENTS = [
  {
    id: 'tricky_viral_stunt',
    weight: 3,
    label: '⚠️ VIRAL STUNT OFFER',
    makeData: (s) => {
      const tier    = getGameTierByRank(s.numericRank ?? 50)
      const popGain = Math.round(12000 * tier.tierPopMult)
      const popLoss = Math.round(5000  * tier.tierPopMult)
      return {
        badge: '⚠️ RISKY CHOICE',
        message:
          'A media agency offers a viral marketing stunt. '
          + 'It\'ll spike fan attention but the content is edgy and divisive. '
          + 'Turning it down means sitting out the trend — fans notice.'
          + '\n\n⚠️ Accepting builds a −2 rep/week debt paid over 4 weeks on top of the upfront hit.',
        choices: [
          { label: `✅ Accept (+${Math.round(popGain/1000)}k pop, −8 rep +4wk rep debt)`,
            effect: (s2, d) => {
              d({ type: A.SET_POPULARITY, value: s2.popularity + popGain })
              d({ type: A.ADD_REPUTATION, amount: -8 })
              d({ type: A.SET_FLAG, key: 'repDebtPW',  value: 2 })
              d({ type: A.SET_FLAG, key: 'repDebtEnd', value: (s2.week ?? 0) + 4 })
            } },
          { label: `❌ Decline (−${Math.round(popLoss/1000)}k pop, +4 rep)`,
            effect: (s2, d) => {
              d({ type: A.SET_POPULARITY, value: Math.max(0, s2.popularity - popLoss) })
              d({ type: A.ADD_REPUTATION, amount: 4 })
            } },
        ],
      }
    },
  },
  {
    id: 'tricky_budget_raid',
    weight: 3,
    label: '⚠️ BUDGET REALLOCATION',
    makeData: () => ({
      badge: '⚠️ RISKY CHOICE',
      message:
        'Finance suggests raiding the equipment reserve for quick cash. '
        + 'Good for funds but industry insiders will notice. '
        + 'A proper audit keeps your standing but costs time and money.',
      choices: [
        { label: '✅ Raid reserve (+₩8,000, −6 rep)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: 8000 })
            d({ type: A.ADD_REPUTATION, amount: -6 })
          } },
        { label: '❌ Proper audit (−₩2,000, +4 rep)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: -2000 })
            d({ type: A.ADD_REPUTATION, amount: 4 })
          } },
      ],
    }),
  },
  {
    id: 'tricky_rival_alliance',
    weight: 2,
    label: '⚠️ RIVAL ALLIANCE OFFER',
    condition: s => s.reputation >= 15,
    makeData: () => ({
      badge: '⚠️ RISKY CHOICE',
      message:
        'A rival studio proposes a co-branding deal. '
        + 'Accepting builds your credibility — but sharing the spotlight costs fans. '
        + 'Declining runs counter-marketing, boosting your pop but burning a bridge.',
      choices: [
        { label: '✅ Accept (+7 rep, −8,000 pop — sharing spotlight)',
          effect: (s, d) => {
            d({ type: A.ADD_REPUTATION, amount: 7 })
            d({ type: A.SET_POPULARITY, value: Math.max(0, s.popularity - 8000) })
          } },
        { label: '❌ Decline (+8,000 pop, −3 rep — seen as territorial)',
          effect: (s, d) => {
            d({ type: A.SET_POPULARITY, value: s.popularity + 8000 })
            d({ type: A.ADD_REPUTATION, amount: -3 })
          } },
      ],
    }),
  },
  {
    id: 'tricky_fan_demand',
    weight: 3,
    label: '⚠️ EXTREME FAN DEMAND',
    condition: s => s.actors.some(a => a.signed),
    makeData: (s) => {
      const actor   = s.actors.filter(a => a.signed)[0]
      if (!actor) return null
      const tier    = getGameTierByRank(s.numericRank ?? 50)
      const popPush = Math.round(18000 * tier.tierPopMult)
      const popProt = Math.round(6000  * tier.tierPopMult)
      return {
        badge: '⚠️ RISKY CHOICE',
        message:
          `Fans are demanding ${actor.name} do a solo fan meet ASAP. `
          + `Pushing them delivers pop but hammers their happiness. `
          + `Protecting them keeps morale up but disappoints the fanbase.`,
        choices: [
          { label: `✅ Push ${actor.name} (+${Math.round(popPush/1000)}k pop, −12 happiness)`,
            effect: (s2, d) => {
              d({ type: A.SET_POPULARITY, value: s2.popularity + popPush })
              const cur = s2.actors.find(x => x.id === actor.id)
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { happiness: clamp(((cur ?? actor).happiness ?? 70) - 12, 0, 100) } })
            } },
          { label: `❌ Protect ${actor.name} (+10 happiness, −${Math.round(popProt/1000)}k pop)`,
            effect: (s2, d) => {
              d({ type: A.SET_POPULARITY, value: Math.max(0, s2.popularity - popProt) })
              const cur = s2.actors.find(x => x.id === actor.id)
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { happiness: clamp(((cur ?? actor).happiness ?? 70) + 10, 0, 100) } })
            } },
        ],
      }
    },
  },
  {
    id: 'tricky_controversial_shoot',
    weight: 2,
    label: '⚠️ CONTROVERSIAL PHOTOSHOOT',
    makeData: () => ({
      badge: '⚠️ RISKY CHOICE',
      message:
        'A top magazine offers a provocative cover shoot. '
        + 'Good money and a pop spike, but the community is divided. '
        + 'Declining protects your rep — but the planning fee is already spent.',
      choices: [
        { label: '✅ Accept (+₩4,000, +pop, −5 rep)',
          effect: (s, d) => {
            const t = getGameTierByRank(s.numericRank ?? 50)
            d({ type: A.ADD_MONEY,      amount: 4000 })
            d({ type: A.SET_POPULARITY, value: s.popularity + Math.round(15000 * t.tierPopMult) })
            d({ type: A.ADD_REPUTATION, amount: -5 })
          } },
        { label: '❌ Decline (−₩1,000 sunk cost, +4 rep)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: -1000 })
            d({ type: A.ADD_REPUTATION, amount: 4 })
          } },
      ],
    }),
  },
  {
    id: 'tricky_hidden_romance',
    weight: 2,
    label: '⚠️ HIDDEN RELATIONSHIP RUMOUR',
    condition: s => s.actors.filter(a => a.signed).length >= 2,
    makeData: (s) => {
      const signed = s.actors.filter(a => a.signed)
      if (signed.length < 2) return null
      const a = signed[0], b = signed[1]
      return {
        badge: '⚠️ RISKY CHOICE',
        message:
          `Tabloids claim ${a.name} and ${b.name} are secretly dating. `
          + `Confirming thrills fans and builds chemistry — but the spotlight strains their loyalty. `
          + `Denying protects them professionally but fans lose interest.`,
        choices: [
          { label: `✅ Confirm (+pop, +15 chem, −10 loyalty each)`,
            effect: (s2, d) => {
              const t = getGameTierByRank(s2.numericRank ?? 50)
              d({ type: A.SET_POPULARITY, value: s2.popularity + Math.round(20000 * t.tierPopMult) })
              const curA = s2.actors.find(x => x.id === a.id)
              const curB = s2.actors.find(x => x.id === b.id)
              if (curA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
                loyalty:       clamp((curA.loyalty ?? 60) - 10, 0, 100),
                chemistry_map: { ...(curA.chemistry_map ?? {}), [b.id]: clamp((curA.chemistry_map?.[b.id] ?? 0) + 15, 0, 100) },
              } })
              if (curB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
                loyalty:       clamp((curB.loyalty ?? 60) - 10, 0, 100),
                chemistry_map: { ...(curB.chemistry_map ?? {}), [a.id]: clamp((curB.chemistry_map?.[a.id] ?? 0) + 15, 0, 100) },
              } })
            } },
          { label: `❌ Deny (−8,000 pop, +10 loyalty each)`,
            effect: (s2, d) => {
              d({ type: A.SET_POPULARITY, value: Math.max(0, s2.popularity - 8000) })
              const curA = s2.actors.find(x => x.id === a.id)
              const curB = s2.actors.find(x => x.id === b.id)
              if (curA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: { loyalty: clamp((curA.loyalty ?? 60) + 10, 0, 100) } })
              if (curB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: { loyalty: clamp((curB.loyalty ?? 60) + 10, 0, 100) } })
            } },
        ],
      }
    },
  },
  {
    id: 'tricky_awards_gamble',
    weight: 2,
    label: '⚠️ AWARDS CAMPAIGN GAMBLE',
    condition: s => s.history.length > 0 && s.money >= 5000,
    makeData: () => ({
      badge: '⚠️ RISKY CHOICE',
      message:
        'An awards strategist offers a guaranteed nomination campaign — costly but high rep impact. '
        + 'Declining saves the budget but the missed PR causes your fanbase to stagnate.',
      choices: [
        { label: '✅ Launch campaign (−₩5,000, +10 rep, +1 award)',
          effect: (s, d) => {
            d({ type: A.ADD_MONEY,      amount: -5000 })
            d({ type: A.ADD_REPUTATION, amount: 10 })
            d({ type: A.ADD_AWARD })
          } },
        { label: '❌ Save the money (−8,000 pop, +2 rep)',
          effect: (s, d) => {
            d({ type: A.SET_POPULARITY, value: Math.max(0, s.popularity - 8000) })
            d({ type: A.ADD_REPUTATION, amount: 2 })
          } },
      ],
    }),
  },
]

// ─── Actor Events (10 types) ──────────────────────────────────────────────────
function makeActorEvent(type, actor, state) {
  const h = actor.happiness ?? 70
  const l = actor.loyalty   ?? 60

  switch (type) {
    case 'poached':
      return {
        label: `😱 POACHING ATTEMPT — ${actor.name.toUpperCase()}`,
        message:
          `A rival agency has approached ${actor.name} with a lucrative counter-offer. `
          + `They're waiting for your response.`,
        choices: [
          { label: '💰 Match offer (−₩2,000, +loyalty)',
            effect: (s, d) => {
              d({ type: A.ADD_MONEY, amount: -2000 })
              const cur = s.actors.find(x => x.id === actor.id)
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { loyalty: clamp(((cur ?? actor).loyalty ?? 60) + 15, 0, 100) } })
            } },
          { label: '🤝 Counter-offer from rival (+10 ACT skill, −20 loyalty — short-term gain)',
            effect: (s, d) => {
              const cur = s.actors.find(x => x.id === actor.id)
              if (cur) d({ type: A.UPDATE_ACTOR, id: actor.id, patch: {
                loyalty: clamp((cur.loyalty ?? 60) - 20, 0, 100),
                skills:  { ...(cur.skills ?? {}), act: clamp((cur.skills?.act ?? 30) + 10, 0, 100) },
              } })
            } },
          { label: '👋 Let them go',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { signed: false, status: 'locked', loyalty: 0 } }) },
        ],
      }

    case 'scandal': {
      const isHighProfile = actor.tier === 'Popular' || actor.tier === 'Worldwide'
      return {
        label: `🚨 SCANDAL — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name} has been caught in a public scandal. The tabloids are going wild.`
          + (isHighProfile ? '\n\n⚠️ High-profile actor: PR cleanup has a 25% chance of backfiring.' : ''),
        choices: [
          { label: isHighProfile ? '🧹 PR cleanup (−₩3,000 — 75% success, 25% backfire)' : '🧹 PR cleanup (−₩3,000, +2 rep)',
            effect: (s, d) => {
              d({ type: A.ADD_MONEY, amount: -3000 })
              if (isHighProfile && Math.random() < 0.25) {
                d({ type: A.ADD_REPUTATION, amount: -3 })
                d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
                  title: `😱 PR FAILED — ${actor.name.toUpperCase()}`,
                  message: `The campaign for ${actor.name} backfired. Industry backlash — reputation −3.`,
                } } })
              } else {
                d({ type: A.ADD_REPUTATION, amount: 2 })
              }
            } },
          { label: '🙄 Ignore it (−5 rep)',
            effect: (s, d) => {
              d({ type: A.ADD_REPUTATION, amount: -5 })
              d({ type: A.SET_FLAG, key: 'scandalCount', value: (s.flags?.scandalCount ?? 0) + 1 })
            } },
          { label: '🔥 Fire them (−10 rep — industry backlash for firing a star)',
            effect: (s, d) => {
              d({ type: A.UPDATE_ACTOR, id: actor.id, patch: { signed: false, status: 'locked' } })
              d({ type: A.ADD_REPUTATION, amount: -10 })
            } },
        ],
      }
    }

    case 'romance': {
      // Problem 7: 6-week per-actor cooldown
      const romanceCoolKey = `offScriptRomance_${actor.id}`
      const lastRomanceWk  = state.flags?.[romanceCoolKey] ?? -999
      if ((state.week - lastRomanceWk) < 6) return null

      // Problems 1 & 8: exclude existing Fixed CP partner and current production co-leads
      const actorCpPartnerIds = new Set(
        (state.fixedCPs ?? []).flatMap(([x, y]) =>
          x === actor.id ? [y] : y === actor.id ? [x] : []
        )
      )
      const actorActiveProd = state.productions.find(p =>
        (p.leadIds ?? []).includes(actor.id)
      )
      const actorCoLeadIds = new Set(
        actorActiveProd ? (actorActiveProd.leadIds ?? []).filter(id => id !== actor.id) : []
      )
      const eligible = state.actors.filter(a =>
        a.signed &&
        a.id !== actor.id &&
        !actorCpPartnerIds.has(a.id) &&
        !actorCoLeadIds.has(a.id)
      )
      // Problem 4 (null case): actor is too committed — no eligible partner
      if (!eligible.length) return null

      // Problem 1: pick highest-chemistry eligible partner
      let other = eligible[0], bestChem = getChem(actor, eligible[0].id)
      for (const o of eligible) {
        const c = getChem(actor, o.id)
        if (c > bestChem) { bestChem = c; other = o }
      }

      // Problem 2: warn if trigger actor is in a Fixed CP (with someone else, since partner is excluded)
      const cpConflictId = [...actorCpPartnerIds][0]
      const cpConflictActor = cpConflictId ? state.actors.find(a => a.id === cpConflictId) : null
      const cpWarning = cpConflictActor
        ? `\n\n⚠️ ${actor.name} is currently in a Fixed CP with ${cpConflictActor.name}. Confirming this romance will damage that relationship!`
        : ''

      return {
        label: '💘 OFF-SCRIPT ROMANCE',
        flagKey: romanceCoolKey,
        message:
          `${actor.name} and ${other.name} (chemistry: ${bestChem}) have been spotted together off-set. `
          + `Fans are shipping them hard. What's your official stance?`
          + cpWarning,
        choices: [
          // Problem 3: symmetric chemistry update on both actors
          { label: '✅ Confirm relationship (+20 chemistry, +happiness to both)',
            effect: (s, d) => {
              const curA = s.actors.find(x => x.id === actor.id)
              const curB = s.actors.find(x => x.id === other.id)
              if (curA) d({ type: A.UPDATE_ACTOR, id: actor.id, patch: {
                chemistry_map: { ...(curA.chemistry_map ?? {}), [other.id]: clamp((curA.chemistry_map?.[other.id] ?? 0) + 20, 0, 100) },
                happiness: clamp((curA.happiness ?? 70) + 10, 0, 100),
              } })
              if (curB) d({ type: A.UPDATE_ACTOR, id: other.id, patch: {
                chemistry_map: { ...(curB.chemistry_map ?? {}), [actor.id]: clamp((curB.chemistry_map?.[actor.id] ?? 0) + 20, 0, 100) },
                happiness: clamp((curB.happiness ?? 70) + 10, 0, 100),
              } })
            } },
          // Problem 5: denial costs both actors
          { label: '❌ Deny publicly (−15 happiness trigger, −10 partner, −8k pop)',
            effect: (s, d) => {
              const curA = s.actors.find(x => x.id === actor.id)
              const curB = s.actors.find(x => x.id === other.id)
              if (curA) d({ type: A.UPDATE_ACTOR, id: actor.id,
                patch: { happiness: clamp((curA.happiness ?? 70) - 15, 0, 100) } })
              if (curB) d({ type: A.UPDATE_ACTOR, id: other.id,
                patch: { happiness: clamp((curB.happiness ?? 70) - 10, 0, 100) } })
              d({ type: A.SET_POPULARITY, value: Math.max(0, s.popularity - 8000) })
            } },
          // Problem 6: no comment has real cost
          { label: '🤷 No comment (−2k pop, −5 loyalty to both — confusion)',
            effect: (s, d) => {
              d({ type: A.SET_POPULARITY, value: Math.max(0, s.popularity - 2000) })
              const curA = s.actors.find(x => x.id === actor.id)
              const curB = s.actors.find(x => x.id === other.id)
              if (curA) d({ type: A.UPDATE_ACTOR, id: actor.id,
                patch: { loyalty: clamp((curA.loyalty ?? 60) - 5, 0, 100) } })
              if (curB) d({ type: A.UPDATE_ACTOR, id: other.id,
                patch: { loyalty: clamp((curB.loyalty ?? 60) - 5, 0, 100) } })
            } },
        ],
      }
    }

    case 'solo_ambitions':
      return {
        label: `🎤 SOLO AMBITIONS — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name} wants to pursue solo projects outside the studio's productions.`,
        choices: [
          { label: '✅ Allow it (+happiness, +loyalty)',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { happiness: clamp(h + 15, 0, 100), loyalty: clamp(l + 10, 0, 100) } }) },
          { label: '❌ Studio comes first (−happiness)',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { happiness: clamp(h - 20, 0, 100) } }) },
        ],
      }

    case 'injury': {
      if (actor.status !== 'filming') return null
      const isHighTierActor = actor.tier === 'Popular' || actor.tier === 'Worldwide'
      const successChance   = isHighTierActor ? 70 : 40
      return {
        label: `🤕 ON-SET INJURY — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name} sustained an injury during filming. They need time to recover.`
          + `\n\n🎬 Pushing through is a gamble: ${successChance}% fast recovery (1 wk), ${100 - successChance}% re-injures for 3 wks.`,
        choices: [
          { label: '🏥 Full rest — 2-week recovery (safe)',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { status: 'injured', injuredWeeks: 2, assignedTo: null } }) },
          { label: `🎬 Push through (${successChance}% recover in 1 wk — risk 3-wk re-injury)`,
            effect: (s, d) => {
              if (Math.random() * 100 < successChance) {
                d({ type: A.UPDATE_ACTOR, id: actor.id,
                    patch: { status: 'injured', injuredWeeks: 1, assignedTo: null } })
              } else {
                d({ type: A.UPDATE_ACTOR, id: actor.id,
                    patch: { status: 'injured', injuredWeeks: 3, assignedTo: null } })
                d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
                  title: `💔 RE-INJURY — ${actor.name.toUpperCase()}`,
                  message: `${actor.name} pushed too hard and re-injured. Forced 3-week recovery.`,
                } } })
              }
            } },
        ],
      }
    }

    case 'fan_meeting':
      // Fan meetings only make sense once an actor has some on-screen experience
      if ((actor.completedProds ?? 0) < 1) return null
      return {
        label: `🎤 FAN MEETING — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name}'s fans are requesting a fan meeting event. `
          + `It costs money to organise but boosts popularity and mood.`,
        choices: [
          { label: '✅ Organise event (−₩1,500, +pop, +happiness)',
            effect: (s, d) => {
              const t = getGameTierByRank(s.numericRank ?? 50)
              d({ type: A.ADD_MONEY,       amount: -1500 })
              d({ type: A.SET_POPULARITY,  value: s.popularity + Math.round(8000 * t.tierPopMult) })
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { happiness: clamp(h + 20, 0, 100) } })
            } },
          { label: '❌ Decline (−happiness)',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { happiness: clamp(h - 10, 0, 100) } }) },
        ],
      }

    case 'raise':
      return {
        label: `💸 RAISE DEMAND — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name} is demanding a pay raise. Refuse and they might walk.`,
        choices: [
          { label: '✅ Pay up (−₩2,500, +loyalty)',
            effect: (s, d) => {
              d({ type: A.ADD_MONEY, amount: -2500 })
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { loyalty: clamp(l + 15, 0, 100) } })
            } },
          { label: '❌ Refuse (40% chance they quit)',
            effect: (s, d) => {
              if (Math.random() < 0.4) {
                d({ type: A.UPDATE_ACTOR, id: actor.id,
                    patch: { signed: false, status: 'locked' } })
                d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
                  title: `😤 ${actor.name} HAS LEFT`,
                  message: `${actor.name} quit the studio over the pay dispute.`,
                } } })
              } else {
                d({ type: A.UPDATE_ACTOR, id: actor.id,
                    patch: {
                      loyalty:   clamp(l - 20, 0, 100),
                      happiness: clamp(h - 15, 0, 100),
                    } })
              }
            } },
        ],
      }

    case 'viral_chemistry': {
      // Fix 5: per-actor cooldown — 8 weeks between viral chemistry events for the same actor
      const viralCoolKey = `viralChem_${actor.id}`
      const lastViralWk  = state.flags?.[viralCoolKey] ?? -999
      if ((state.week - lastViralWk) < 8) return null

      // Exclude existing Fixed CP partner (event would be meaningless with them)
      const existingCpPartnerIds = new Set(
        (state.fixedCPs ?? []).flatMap(([x, y]) =>
          x === actor.id ? [y] : y === actor.id ? [x] : []
        )
      )

      // Exclude current production co-leads (filming together = no viral "surprise")
      const activeProd = state.productions.find(p =>
        (p.leadIds ?? []).includes(actor.id)
      )
      const coLeadIds = new Set(
        activeProd ? (activeProd.leadIds ?? []).filter(id => id !== actor.id) : []
      )

      const others = state.actors.filter(a =>
        a.signed &&
        a.id !== actor.id &&
        !existingCpPartnerIds.has(a.id) &&
        !coLeadIds.has(a.id)
      )
      // No eligible partner (actor is too committed) — skip event
      if (!others.length) return null
      let partner = others[0], bestChem = getChem(actor, others[0].id)
      for (const o of others) {
        const c = getChem(actor, o.id)
        if (c > bestChem) { bestChem = c; partner = o }
      }

      // Fix 3: detect existing Fixed CP relationships that would be hurt — warn explicitly
      const conflictNames = []
      for (const [x, y] of (state.fixedCPs ?? [])) {
        if (x === actor.id   && y !== partner.id) { const o = state.actors.find(a => a.id === y); if (o) conflictNames.push(o.name) }
        if (y === actor.id   && x !== partner.id) { const o = state.actors.find(a => a.id === x); if (o) conflictNames.push(o.name) }
        if (x === partner.id && y !== actor.id)   { const o = state.actors.find(a => a.id === y); if (o && !conflictNames.includes(o.name)) conflictNames.push(o.name) }
        if (y === partner.id && x !== actor.id)   { const o = state.actors.find(a => a.id === x); if (o && !conflictNames.includes(o.name)) conflictNames.push(o.name) }
      }
      const warningText = conflictNames.length > 0
        ? `\n\n⚠️ WARNING: This will damage existing Fixed CP bonds with ${conflictNames.join(', ')}.`
        : ''

      // Fix 1: fresh-state target lookup inside the effect (not stale closure)
      function getPenaltyTargetId(s, actorId, excludeId) {
        const prod = s.productions.find(p =>
          (p.leadIds ?? []).includes(actorId) || (p.castIds ?? []).includes(actorId)
        )
        if (prod) {
          const coStar = (prod.leadIds ?? []).find(id => id !== actorId && id !== excludeId)
            ?? (prod.castIds ?? []).find(id => id !== actorId && id !== excludeId)
          if (coStar) return coStar
        }
        for (const [x, y] of (s.fixedCPs ?? [])) {
          if (x === actorId && y !== excludeId) return y
          if (y === actorId && x !== excludeId) return x
        }
        return null
      }

      // Fix 1 + Fix 2 + Fix 4: fresh state, fallback cost, scaled by prior chem strength
      function applyPenalty(s, d, ratio) {
        const aTargetId = getPenaltyTargetId(s, actor.id, partner.id)
        const pTargetId = getPenaltyTargetId(s, partner.id, actor.id)
        let anyTarget = false

        function deductChem(fromId, toId) {
          const from = s.actors.find(x => x.id === fromId)
          const to   = s.actors.find(x => x.id === toId)
          if (!from || !to) return
          anyTarget = true
          // Fix 4: scale penalty proportional to prior chemistry (minimum 5)
          const prior  = from.chemistry_map?.[toId] ?? 0
          const amount = Math.max(5, Math.round(prior * ratio))
          d({ type: A.UPDATE_ACTOR, id: fromId, patch: {
            chemistry_map: { ...(from.chemistry_map ?? {}), [toId]: clamp(prior - amount, 0, 100) },
          } })
          d({ type: A.UPDATE_ACTOR, id: toId, patch: {
            chemistry_map: { ...(to.chemistry_map ?? {}), [fromId]: clamp((to.chemistry_map?.[fromId] ?? 0) - amount, 0, 100) },
          } })
        }
        if (aTargetId) deductChem(actor.id, aTargetId)
        if (pTargetId && pTargetId !== aTargetId) deductChem(partner.id, pTargetId)

        // Fix 2: fallback cost when no current partner to penalise
        if (!anyTarget) {
          d({ type: A.ADD_REPUTATION, amount: -2 })
          d({ type: A.ADD_MONEY,      amount: -1000 })
        }
      }

      return {
        label:   '🔥 VIRAL CHEMISTRY MOMENT',
        flagKey: viralCoolKey,   // Fix 5: returned to weekAdvance so it sets the cooldown flag
        message:
          `A candid video of ${actor.name} and ${partner.name} went viral! `
          + `Fans are obsessed with their chemistry (${bestChem}). `
          + `Management wants to capitalize — but this could shake up existing bonds.`
          + warningText,
        choices: [
          {
            label: `💕 Form Fixed CP: ${actor.name} × ${partner.name} (++ pop, penalty ∝ betrayed bond strength)`,
            effect: (s, d) => {
              const t = getGameTierByRank(s.numericRank ?? 50)
              d({ type: A.ADD_FIXED_CP, pair: [actor.id, partner.id] })
              d({ type: A.SET_POPULARITY, value: s.popularity + Math.round(20000 * t.tierPopMult) })
              applyPenalty(s, d, 0.35)   // 35% of prior chem
            },
          },
          {
            label: `🤷 Ride the moment (+ pop, smaller penalty ∝ bond strength)`,
            effect: (s, d) => {
              const t = getGameTierByRank(s.numericRank ?? 50)
              d({ type: A.SET_POPULARITY, value: s.popularity + Math.round(10000 * t.tierPopMult) })
              applyPenalty(s, d, 0.20)   // 20% of prior chem
            },
          },
        ],
      }
    }

    case 'language_barrier':
      return {
        label: `🗣️ LANGUAGE BARRIER — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name} is struggling with language requirements for an international production. `
          + `This could affect quality.`,
        choices: [
          { label: '📚 Hire tutor (−₩1,000, +LANG skill)',
            effect: (s, d) => {
              d({ type: A.ADD_MONEY, amount: -1000 })
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { skills: {
                    ...(actor.skills ?? {}),
                    lang: clamp((actor.skills?.lang ?? 30) + 5, 0, 100),
                  } } })
            } },
          { label: '🎲 Risk it (−happiness)',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { happiness: clamp(h - 10, 0, 100) } }) },
        ],
      }

    case 'singing_debut':
      return {
        label: `🎵 SINGING DEBUT — ${actor.name.toUpperCase()}`,
        message:
          `${actor.name} wants to release a solo single! `
          + `Producing it costs money but could boost their fame significantly.`,
        choices: [
          { label: '🎤 Produce the single (−₩2,000, +pop, +happiness)',
            effect: (s, d) => {
              const t = getGameTierByRank(s.numericRank ?? 50)
              d({ type: A.ADD_MONEY,      amount: -2000 })
              d({ type: A.SET_POPULARITY, value: s.popularity + Math.round(10000 * t.tierPopMult) })
              d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { happiness: clamp(h + 20, 0, 100) } })
            } },
          { label: '❌ Decline (−happiness)',
            effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
              patch: { happiness: clamp(h - 15, 0, 100) } }) },
        ],
      }

    default:
      return null
  }
}

const ACTOR_EVENT_TYPES = [
  // 'injury' removed — now triggers deterministically at every 3rd production completion
  'poached', 'scandal', 'romance', 'solo_ambitions',
  'fan_meeting', 'raise', 'viral_chemistry', 'language_barrier', 'singing_debut',
]

// ─── Roll for one actor event this week (20% chance) ─────────────────────────
export function rollActorEvent(state) {
  const signed = state.actors.filter(a => a.signed)
  if (!signed.length || Math.random() > 0.20) return null

  // Shuffle actor list to avoid always picking the first one
  const shuffled = [...signed].sort(() => Math.random() - 0.5)

  for (const type of [...ACTOR_EVENT_TYPES].sort(() => Math.random() - 0.5)) {
    const actor = shuffled[0]
    const data  = makeActorEvent(type, actor, state)
    if (data) {
      // Extract flagKey from event data (e.g. viral_chemistry per-actor cooldown) to top level
      const { flagKey, ...eventData } = data
      return { type: 'event', data: eventData, ...(flagKey ? { flagKey } : {}) }
    }
  }
  return null
}

// ─── CP Event System (Prompt 2) ───────────────────────────────────────────────
// During-production: actor requests (photos, lives, dances, covers, vlogs).
// After-production: company-managed promos (BTS, OST, fan meets, ads).
const DURING_PROD_EVENTS = [
  { id: 'tiktok_dance',   label: '🕺 TIKTOK DANCE TREND',      skillKeys: ['dance','comedy'],   cost: 0 },
  { id: 'ig_photos',      label: '📸 INSTAGRAM PHOTO DUMP',     skillKeys: ['visual','art'],     cost: 0 },
  { id: 'youtube_vlog',   label: '🎥 YOUTUBE VLOG TOGETHER',    skillKeys: ['comedy','art'],     cost: 0 },
  { id: 'singing_cover',  label: '🎵 SINGING COVER UPLOAD',     skillKeys: ['sing','visual'],    cost: 0 },
  { id: 'live_stream',    label: '📡 LIVE STREAM SESSION',      skillKeys: ['comedy','visual'],  cost: 0, risky: true },
]

const AFTER_PROD_EVENTS = [
  { id: 'bts_content',   label: '🎬 BEHIND-THE-SCENES DROP',   skillKeys: ['art','comedy'],     cost: 0    },
  { id: 'ost_perf',      label: '🎤 OST LIVE PERFORMANCE',     skillKeys: ['sing','dance'],     cost: 1500 },
  { id: 'fan_meeting',   label: '🎪 FAN MEETING EVENT',        skillKeys: ['visual','comedy'],  cost: 1500 },
  { id: 'ad_promo',      label: '📢 AD PROMOTION CAMPAIGN',    skillKeys: ['visual','act'],     cost: 1000 },
  { id: 'interview_pr',  label: '🗞️ JOINT INTERVIEW',         skillKeys: ['lang','comedy'],    cost: 0    },
]

// CP events always succeed when accepted (unless risky). Decline penalties scale by tier.
// Repeated declines with same pair → loyalty penalty. Risky events have 85%/15% chance.
function rollCpEventData(ev, a, b, isDuring, tier) {
  const chemDelta  = isDuring ? 5 : 3
  const repDelta   = isDuring ? 4 : 0
  const coRepDelta = isDuring ? 0 : 5
  const declineChemD = tier.declineChemPenalty
  const declineRepD  = tier.declineRepPenalty
  const bk = bondKey(a.id, b.id)

  function applySuccess(s, d, paidCost) {
    if (paidCost) d({ type: A.ADD_MONEY, amount: -paidCost })
    const actorA = s.actors.find(x => x.id === a.id)
    const actorB = s.actors.find(x => x.id === b.id)
    if (actorA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
      chemistry_map: { ...(actorA.chemistry_map ?? {}), [b.id]: clamp((actorA.chemistry_map?.[b.id] ?? 0) + chemDelta, 0, 100) }
    } })
    if (actorB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
      chemistry_map: { ...(actorB.chemistry_map ?? {}), [a.id]: clamp((actorB.chemistry_map?.[a.id] ?? 0) + chemDelta, 0, 100) }
    } })
    if (isDuring) {
      d({ type: A.UPDATE_ACTOR, id: a.id, patch: { fame: clamp((a.fame ?? 0) + repDelta * 100, 0, 999999) } })
      d({ type: A.UPDATE_ACTOR, id: b.id, patch: { fame: clamp((b.fame ?? 0) + repDelta * 100, 0, 999999) } })
    } else {
      d({ type: A.ADD_REPUTATION, amount: coRepDelta })
    }
    d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
      title: `✨ ${ev.label} — SUCCESS!`,
      message: `The content landed perfectly!\n\n+${chemDelta} chemistry · ${isDuring ? `+${repDelta} actor fame` : `+${coRepDelta} company rep`}`,
    } } })
  }

  const riskyNote = ev.risky ? '\n\n⚠️ Risky content: 85% success, 15% awkward fail (−10 chem, −2 rep).' : '\n\nThis will always succeed — results guaranteed!'

  return {
    label: `${ev.label} — ${a.name} × ${b.name}`,
    message:
      (isDuring
        ? `${a.name} and ${b.name} want to post ${ev.label.toLowerCase()} together. Fans are waiting! Will you greenlight this?`
        : `Company promo opportunity: ${ev.label} featuring ${a.name} × ${b.name}.${ev.cost ? ` Cost: ₩${ev.cost.toLocaleString()}` : ' Free.'} Will you proceed?`)
      + riskyNote,
    choices: [
      {
        label: `✅ Accept${ev.cost ? ` (−₩${ev.cost.toLocaleString()})` : ''}${ev.risky ? ' (risky!)' : ''}`,
        effect: (s, d) => {
          // Risky events: 85% success / 15% awkward fail
          if (ev.risky && Math.random() < 0.15) {
            const actorA = s.actors.find(x => x.id === a.id)
            const actorB = s.actors.find(x => x.id === b.id)
            if (actorA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
              chemistry_map: { ...(actorA.chemistry_map ?? {}), [b.id]: clamp((actorA.chemistry_map?.[b.id] ?? 0) - 10, 0, 100) }
            } })
            if (actorB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
              chemistry_map: { ...(actorB.chemistry_map ?? {}), [a.id]: clamp((actorB.chemistry_map?.[a.id] ?? 0) - 10, 0, 100) }
            } })
            d({ type: A.ADD_REPUTATION, amount: -2 })
            d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
              title: `😬 ${ev.label} — AWKWARD FAIL`,
              message: `${a.name} and ${b.name}'s session had an awkward moment! −10 chemistry each, studio rep −2.`,
            } } })
          } else {
            applySuccess(s, d, ev.cost ?? 0)
            const curA = s.actors.find(x => x.id === a.id)
            const curB = s.actors.find(x => x.id === b.id)
            if (curA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: { happiness: clamp((curA.happiness ?? 70) + 10, 0, 100) } })
            if (curB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: { happiness: clamp((curB.happiness ?? 70) + 10, 0, 100) } })
          }
        },
      },
      {
        label: `❌ Decline${declineChemD < 0 || declineRepD < 0
          ? ` (${declineChemD < 0 ? `${declineChemD} chem` : ''}${declineChemD < 0 && declineRepD < 0 ? ', ' : ''}${declineRepD < 0 ? `${declineRepD} rep` : ''})`
          : ' (−5 chem)'}`,
        effect: (s, d) => {
          // Chemistry penalty on decline
          if (declineChemD !== 0) {
            const actorA = s.actors.find(x => x.id === a.id)
            const actorB = s.actors.find(x => x.id === b.id)
            if (actorA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
              chemistry_map: { ...(actorA.chemistry_map ?? {}), [b.id]: clamp((actorA.chemistry_map?.[b.id] ?? 0) + declineChemD, 0, 100) }
            } })
            if (actorB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
              chemistry_map: { ...(actorB.chemistry_map ?? {}), [a.id]: clamp((actorB.chemistry_map?.[a.id] ?? 0) + declineChemD, 0, 100) }
            } })
          }
          if (declineRepD !== 0) d({ type: A.ADD_REPUTATION, amount: declineRepD })

          // Track total + per-pair declines for challenge event triggers
          const pairDeclines = (s.flags?.[`cpDeclines_${bk}`] ?? 0) + 1
          d({ type: A.SET_FLAG, key: `cpDeclines_${bk}`,  value: pairDeclines })
          d({ type: A.SET_FLAG, key: 'cpTotalDeclines',    value: (s.flags?.cpTotalDeclines ?? 0) + 1 })

          // 3+ declines in a row with same pair → loyalty penalty (studio is stonewalling them)
          if (pairDeclines >= 3) {
            const actorA = s.actors.find(x => x.id === a.id)
            const actorB = s.actors.find(x => x.id === b.id)
            if (actorA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: { loyalty: clamp((actorA.loyalty ?? 60) - 10, 0, 100) } })
            if (actorB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: { loyalty: clamp((actorB.loyalty ?? 60) - 10, 0, 100) } })
          }
        },
      },
    ],
  }
}

// ─── Creative Differences event ───────────────────────────────────────────────
// Fires during filming on the highest-chemistry pair (chem ≥ 60).
// Sacrificing −15 chemistry yields a +8 quality boost on their production.
function rollCreativeDifferencesEvent(state, week) {
  if (Math.random() > 0.18) return null

  const filmingProds = state.productions.filter(p => p.status === 'active' && p.phase === 'filming')
  let bestPair = null, bestChem = 59   // minimum threshold to trigger

  for (const prod of filmingProds) {
    const leads = (prod.leadIds ?? [])
      .map(id => state.actors.find(a => a.id === id))
      .filter(Boolean)
    if (leads.length >= 2) {
      const chem = getChem(leads[0], leads[1].id)
      if (chem > bestChem) { bestChem = chem; bestPair = { a: leads[0], b: leads[1], prod } }
    }
  }
  if (!bestPair) return null

  const { a, b, prod } = bestPair
  const coolKey = `creativeDiff_${bondKey(a.id, b.id)}`
  // Cooldown: one event per 10 weeks per pair
  const lastFired = state.flags?.[coolKey] ?? 0
  if (week - lastFired < 10) return null

  return {
    flagKey: coolKey,
    modal: {
      type: 'event',
      data: {
        label: `🎭 CREATIVE DIFFERENCES — ${a.name.toUpperCase()} × ${b.name.toUpperCase()}`,
        message:
          `On the set of "${prod.title}", creative tensions are rising between ${a.name} and ${b.name} `
          + `(Chemistry: ${bestChem}).\n\n`
          + `A heated artistic disagreement — friction that could either forge something brilliant or break the bond.\n\n`
          + `⚡ CHOICE: Let them clash (−15 chemistry, but +8 quality boost on "${prod.title}") — `
          + `or step in to keep the peace (no change).`,
        choices: [
          {
            label: `🔥 Let them clash (−15 chem, +8 quality on "${prod.title}")`,
            effect: (s, d) => {
              const actorA = s.actors.find(x => x.id === a.id)
              const actorB = s.actors.find(x => x.id === b.id)
              if (actorA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
                chemistry_map: { ...(actorA.chemistry_map ?? {}),
                  [b.id]: clamp((actorA.chemistry_map?.[b.id] ?? 0) - 15, 0, 100) },
              } })
              if (actorB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
                chemistry_map: { ...(actorB.chemistry_map ?? {}),
                  [a.id]: clamp((actorB.chemistry_map?.[a.id] ?? 0) - 15, 0, 100) },
              } })
              d({ type: A.UPDATE_PRODUCTION, id: prod.id, patch: { qualityBonus: (prod.qualityBonus ?? 0) + 8 } })
            },
          },
          {
            label: '🤝 Keep the peace (no change)',
            effect: () => {},
          },
        ],
      },
    },
  }
}

// Returns array of CP event modals for this week. Called from weekAdvance.js.
// Prompt 8: frequency scales by tier; always succeed; free:paid ratio by tier.
// Prompt 1: tier now derived from numericRank (not week).
export function rollCpEvents(state, week) {
  const modals = []
  const tier = getGameTierByRank(state.numericRank ?? 50)

  // Creative Differences fires independently of normal CP event frequency
  const cdEvent = rollCreativeDifferencesEvent(state, week)
  if (cdEvent) {
    modals.push({ flagKey: cdEvent.flagKey, modal: cdEvent.modal })
    return modals   // one special event per week is enough
  }

  // Tier-scaled event frequency
  if (Math.random() > tier.cpEventFreq) return modals

  const activeProds = state.productions.filter(p => p.status === 'active')
  if (!activeProds.length) return modals

  // Collect all eligible CP pairs (filming or recently completed)
  const duringPairs = []
  const afterPairs  = []

  for (const prod of activeProds) {
    const leads = (prod.leadIds ?? []).map(id => state.actors.find(a => a.id === id)).filter(Boolean)
    if (leads.length >= 2) {
      if (prod.phase === 'filming') {
        duringPairs.push({ a: leads[0], b: leads[1], prod })
      } else if (prod.phase === 'releasing' || prod.phase === 'wrap') {
        afterPairs.push({ a: leads[0], b: leads[1], prod })
      }
    }
  }

  const allPairs = [...duringPairs.map(p => ({ ...p, isDuring: true })),
                    ...afterPairs.map(p => ({ ...p, isDuring: false }))]
  if (!allPairs.length) return modals

  const pair = allPairs[Math.floor(Math.random() * allPairs.length)]

  // Tier-scaled free:paid ratio — prefer free events at lower tiers
  let pool = pair.isDuring ? DURING_PROD_EVENTS : AFTER_PROD_EVENTS
  const freePool = pool.filter(e => !e.cost)
  const paidPool = pool.filter(e =>  e.cost)
  if (freePool.length && paidPool.length) {
    pool = Math.random() < tier.freePaidRatio ? freePool : paidPool
  }

  const ev = pool[Math.floor(Math.random() * pool.length)]

  // Chemistry requirement for risky events: pair must have chem ≥ 40
  if (ev.risky && getChem(pair.a, pair.b.id) < 40) return modals

  // 6-week cooldown per CP pair per event
  const coolKey = `cpEvt_${ev.id}_${bondKey(pair.a.id, pair.b.id)}`
  const lastWk  = state.flags?.[coolKey] ?? -999
  if (week - lastWk < 6) return modals

  modals.push({
    flagKey: coolKey,
    modal: {
      type: 'event',
      data: rollCpEventData(ev, pair.a, pair.b, pair.isDuring, tier),
    },
  })
  return modals
}

// ─── Chemistry Pulse — pure function, returns { modals, actions } ─────────────
// Called every week advance. Returns action objects + modals (no direct dispatch).
// 3.1: Chemistry deductions ONLY for actors in active productions.
export function runChemPulse(state, week) {
  const modals  = []
  const actions = []

  const signed = state.actors.filter(a => a.signed)

  // Build set of actor IDs currently in active productions
  const activeProds = state.productions.filter(p => p.status === 'active')
  const filmingActorIds = new Set(activeProds.flatMap(p => p.castIds ?? []))

  // ── Pair checks — only for actors currently filming together ───────────────
  for (const prod of activeProds) {
    const castIds = prod.castIds ?? []
    const castActors = signed.filter(a => castIds.includes(a.id))

    for (let i = 0; i < castActors.length; i++) {
      for (let j = i + 1; j < castActors.length; j++) {
        const a    = castActors[i]
        const b    = castActors[j]
        const chem = getChem(a, b.id)
        const key  = bondKey(a.id, b.id)

        const isFixed = (state.fixedCPs ?? []).some(
          ([x, y]) => bondKey(x, y) === key
        )

        // Fixed CP + chem below tier threshold → grace period, then breakup crisis
        const breakupThreshold = getGameTierByRank(state.numericRank ?? 50).cpBreakupThreshold
        if (isFixed && chem < breakupThreshold) {
          const warnKey = `cpBreakupWarn_${key}`
          const coolKey = `cpBreakup_${key}`
          const lastWk  = state.flags?.[coolKey] ?? -999
          const isWarned = !!(state.flags?.[warnKey])

          if (!isWarned && week - lastWk >= 4) {
            // ── First warning: grace period — do NOT break up yet ──────────────
            actions.push({ type: A.SET_FLAG, key: warnKey, value: week })
            modals.push({
              type: 'event',
              data: {
                label: '⚠️ CP CHEMISTRY WARNING',
                message:
                  `The chemistry between ${a.name} and ${b.name} is dangerously low (${chem}, danger zone: <${breakupThreshold}). `
                  + `Their Fixed CP contract is at risk.\n\nYou have ONE WEEK to stabilise their bond before the contract breaks.`,
                choices: [
                  { label: '💰 Emergency fan meeting now (−₩1,500, +25 chemistry)',
                    effect: (s, d) => {
                      d({ type: A.ADD_MONEY, amount: -1500 })
                      const curA = s.actors.find(x => x.id === a.id)
                      if (curA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
                        chemistry_map: { ...(curA.chemistry_map ?? {}), [b.id]: clamp(chem + 25, 0, 100) }
                      } })
                      const curB = s.actors.find(x => x.id === b.id)
                      if (curB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
                        chemistry_map: { ...(curB.chemistry_map ?? {}), [a.id]: clamp(chem + 25, 0, 100) }
                      } })
                      // Grace period resolved early — clear the warn flag
                      d({ type: A.SET_FLAG, key: warnKey, value: null })
                    } },
                  { label: '📅 I\'ll handle it this week (skip)',
                    effect: () => {} },
                ],
              },
            })
          } else if (isWarned && week - lastWk >= 4) {
            // ── Second strike: warn was set last week and chem is still low — crisis ──
            actions.push({ type: A.SET_FLAG, key: warnKey, value: null })
            actions.push({ type: A.SET_FLAG, key: coolKey, value: week })

            // Check if this is an established long-standing pair (5+ productions together)
            const histTogether = (state.history ?? []).filter(h =>
              ((h.castIds ?? []).includes(a.id) || (h.leadIds ?? []).includes(a.id)) &&
              ((h.castIds ?? []).includes(b.id) || (h.leadIds ?? []).includes(b.id))
            ).length
            const isPublicBreakup = histTogether >= 5
            const publicNote = isPublicBreakup
              ? `\n\n⚠️ They've worked together on ${histTogether} productions — a public split will cause an industry scandal (−10 additional rep).`
              : ''

            modals.push({
              type: 'event',
              data: {
                label: '💔 CP BREAKUP CRISIS',
                message:
                  `The chemistry between ${a.name} and ${b.name} has fallen critically low (${chem}, threshold: ${breakupThreshold}). `
                  + `Their Fixed CP contract is at risk of dissolving.`
                  + publicNote,
                choices: [
                  { label: '💰 Intensive bonding session (−₩1,500, +25 chemistry)',
                    effect: (s, d) => {
                      d({ type: A.ADD_MONEY, amount: -1500 })
                      const curA = s.actors.find(x => x.id === a.id)
                      if (curA) d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
                        chemistry_map: { ...(curA.chemistry_map ?? {}), [b.id]: clamp(chem + 25, 0, 100) }
                      } })
                      const curB = s.actors.find(x => x.id === b.id)
                      if (curB) d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
                        chemistry_map: { ...(curB.chemistry_map ?? {}), [a.id]: clamp(chem + 25, 0, 100) }
                      } })
                    } },
                  { label: isPublicBreakup ? '🔓 Dissolve CP (−10 rep scandal + −loyalty)' : '🔓 Dissolve the CP contract (−5 rep −loyalty)',
                    effect: (s, d) => {
                      d({ type: A.REMOVE_FIXED_CP, pair: [a.id, b.id] })
                      d({ type: A.ADD_REPUTATION, amount: isPublicBreakup ? -10 : -5 })
                      d({ type: A.UPDATE_ACTOR, id: a.id, patch: {
                        loyalty:   clamp((a.loyalty ?? 60) - 15, 0, 100),
                        happiness: clamp((a.happiness ?? 70) - 10, 0, 100),
                      } })
                      d({ type: A.UPDATE_ACTOR, id: b.id, patch: {
                        loyalty:   clamp((b.loyalty ?? 60) - 15, 0, 100),
                        happiness: clamp((b.happiness ?? 70) - 10, 0, 100),
                      } })
                    } },
                ],
              },
            })
          }
          continue
        }

        // chem ≥ 75 → endorsement deal (8-week cooldown) — now a real choice
        if (chem >= 75) {
          const coolKey = `chemHigh_${key}`
          const lastWk  = state.flags?.[coolKey] ?? -999
          if (week - lastWk >= 8) {
            actions.push({ type: A.SET_FLAG, key: coolKey, value: week })

            // chem ≥ 90 → Legendary Pair Status notification (20-week cooldown)
            if (chem >= 90) {
              const legendKey = `legendPair_${key}`
              const lastLeg   = state.flags?.[legendKey] ?? -999
              if (week - lastLeg >= 20) {
                actions.push({ type: A.SET_FLAG, key: legendKey, value: week })
                modals.push({
                  type: 'generic',
                  data: {
                    title: '🏆 LEGENDARY PAIR STATUS!',
                    message:
                      `${a.name} × ${b.name} have achieved Legendary chemistry (${chem})!\n\n`
                      + `They now carry a +5% production score aura when cast together. True icons.`,
                  },
                })
              }
            }

            // Endorsement deal is now a player choice, not free auto-income
            modals.push({
              type: 'event',
              data: {
                label: '💕 CP ENDORSEMENT DEAL',
                message:
                  `${a.name} × ${b.name} chemistry (${chem}) caught a brand's eye!\n\n`
                  + `A brand wants to feature them. What's your call?`,
                choices: [
                  { label: '✅ Accept (+₩1,200 endorsement income)',
                    effect: (s, d) => d({ type: A.ADD_MONEY, amount: 1200 }) },
                  { label: '❌ Decline (+5,000 pop — fans love the exclusivity)',
                    effect: (s, d) => d({ type: A.SET_POPULARITY, value: s.popularity + 5000 }) },
                ],
              },
            })
          }
        }
        // 3.1: Awkward rumours only for filming pairs (deduction)
        else if (chem < 20 && !isFixed) {
          const coolKey = `chemLow_${key}`
          const lastWk  = state.flags?.[coolKey] ?? -999
          if (week - lastWk >= 6) {
            actions.push({ type: A.SET_FLAG, key: coolKey, value: week })
            actions.push({ type: A.ADD_REPUTATION, amount: -2 })
            modals.push({
              type: 'generic',
              data: {
                title: '😬 AWKWARD ON-SET CO-STARS',
                message:
                  `${a.name} and ${b.name}'s on-set chemistry (${chem}) is painfully low. `
                  + `The tension leaked to fans — reputation −2.`,
              },
            })
          }
        }
      }
    }
  }

  // ── Quit threats: unhappy+idle OR low loyalty+idle ────────────────────────
  for (const actor of signed) {
    const hap  = actor.happiness ?? 70
    const loy  = actor.loyalty   ?? 60
    const idle = actor.idleWeeks ?? 0
    const threatCondition = (hap < 20 && idle >= 4) || (loy < 30 && idle >= 2)
    if (threatCondition) {
      const coolKey = `quitThreat_${actor.id}`
      const lastWk  = state.flags?.[coolKey] ?? -999
      if (week - lastWk >= 4) {
        actions.push({ type: A.SET_FLAG, key: coolKey, value: week })
        const reason = (loy < 30 && idle >= 2 && hap >= 20)
          ? `Their loyalty has collapsed (${loy}) after being sidelined for ${idle} weeks.`
          : `They're miserable 😢 (happiness ${hap}) and haven't worked in ${idle} weeks.`
        modals.push({
          type: 'event',
          data: {
            label: `😤 QUIT THREAT — ${actor.name.toUpperCase()}`,
            message:
              `${actor.name} is seriously considering leaving the studio. ${reason}`,
            choices: [
              { label: '💰 Retention bonus (−₩1,500, +happiness)',
                effect: (s, d) => {
                  d({ type: A.ADD_MONEY, amount: -1500 })
                  d({ type: A.UPDATE_ACTOR, id: actor.id,
                      patch: {
                        happiness: clamp((actor.happiness ?? 0) + 30, 0, 100),
                        loyalty:   clamp((actor.loyalty   ?? 60) + 10, 0, 100),
                      } })
                } },
              { label: '📣 Schedule them for a production ASAP',
                effect: (s, d) => {
                  const cur = s.actors.find(x => x.id === actor.id)
                  d({ type: A.UPDATE_ACTOR, id: actor.id, patch: {
                    happiness: clamp(((cur ?? actor).happiness ?? 0) + 10, 0, 100),
                    loyalty:   clamp(((cur ?? actor).loyalty  ?? 60) + 5,  0, 100),
                  } })
                } },
              { label: '👋 Let them leave',
                effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
                  patch: { signed: false, status: 'locked' } }) },
            ],
          },
        })
      }
    }
  }

  // ── Rep debt ticking (from tricky_viral_stunt accept) ─────────────────────
  const repDebtPW  = state.flags?.repDebtPW  ?? 0
  const repDebtEnd = state.flags?.repDebtEnd ?? -1
  if (repDebtPW > 0 && week <= repDebtEnd) {
    actions.push({ type: A.ADD_REPUTATION, amount: -repDebtPW })
  }

  // ── Bankruptcy ─────────────────────────────────────────────────────────────
  if (state.money < 0) {
    const coolKey = 'bankruptcy'
    const lastWk  = state.flags?.[coolKey] ?? -999
    if (week - lastWk >= 4) {
      actions.push({ type: A.SET_FLAG, key: coolKey, value: week })
      modals.push({
        type: 'event',
        data: {
          label: '💸 BANKRUPTCY WARNING',
          message:
            `Your studio is in the red (₩${state.money.toLocaleString()})! `
            + `You need emergency funds or operations will shut down.`,
          choices: [
            { label: '🏦 Emergency loan (+₩5,000)',
              effect: (s, d) => d({ type: A.ADD_MONEY, amount: 5000 }) },
            { label: '🎬 Sell equipment (−3 rep, +₩3,000)',
              effect: (s, d) => {
                d({ type: A.ADD_MONEY,      amount: 3000 })
                d({ type: A.ADD_REPUTATION, amount: -3 })
              } },
          ],
        },
      })
    }
  }

  return { modals, actions }
}

// ─── Company event roller ─────────────────────────────────────────────────────
// Returns array of modal objects (may be empty).
// Prompt 6.5: 30% of events are tricky (⚠️ badge, mixed outcomes).
// Challenge events (burnout, talent raid, fan backlash) bypass the regular cooldown.
// weekAdvance.js should dispatch SET_FLAG 'lastCompanyEvent' if any event fires.
export function rollWeeklyEvents(state) {
  // ── Priority: challenge events triggered by cumulative bad outcomes ─────────
  const challengeModals = []

  // 1. Burnt-Out Studio: 3+ low-grade productions in the last 8 history items
  const recentFails = (state.history ?? []).slice(-8).filter(h => {
    const g = h.grade ?? h.overallGrade
    return g === 'C' || g === 'D' || g === 'F'
  }).length
  const burnoutKey = `burnout_s${Math.floor((state.week ?? 0) / 12)}`
  if (recentFails >= 3 && !(state.flags?.[burnoutKey])) {
    challengeModals.push({
      flagKey: burnoutKey,
      type: 'event',
      data: {
        label: '😩 BURNT-OUT STUDIO',
        badge: '⚠️ STUDIO CRISIS',
        message:
          `Your studio has struggled lately — ${recentFails} poor productions in the last 8 weeks. `
          + `Actor morale is collapsing. You need to make a call.`,
        choices: [
          { label: '😴 Mandatory break week (+15 happiness to all signed actors)',
            effect: (s, d) => s.actors.filter(a => a.signed).forEach(ac => {
              const cur = s.actors.find(x => x.id === ac.id)
              d({ type: A.UPDATE_ACTOR, id: ac.id,
                  patch: { happiness: clamp(((cur ?? ac).happiness ?? 70) + 15, 0, 100) } })
            }) },
          { label: '🔥 Push hard (50% risk: −20 happiness + −3 rep to all)',
            effect: (s, d) => {
              if (Math.random() < 0.50) {
                s.actors.filter(a => a.signed).forEach(ac => {
                  const cur = s.actors.find(x => x.id === ac.id)
                  d({ type: A.UPDATE_ACTOR, id: ac.id,
                      patch: { happiness: clamp(((cur ?? ac).happiness ?? 70) - 20, 0, 100) } })
                })
                d({ type: A.ADD_REPUTATION, amount: -3 })
              }
            } },
        ],
      },
    })
  }

  // 2. Rival Talent Raid: triggered when total CP event declines reach 5
  const cpDeclines = state.flags?.cpTotalDeclines ?? 0
  const raidKey    = `talentRaid_s${Math.floor((state.week ?? 0) / 8)}`
  if (cpDeclines >= 5 && !(state.flags?.[raidKey])) {
    const targets = (state.actors ?? []).filter(a => a.signed).slice(0, 2)
    if (targets.length >= 1) {
      challengeModals.push({
        flagKey: raidKey,
        type: 'event',
        data: {
          label: '⚔️ RIVAL TALENT RAID',
          badge: '⚠️ STUDIO CRISIS',
          message:
            `Your studio has declined too many fan content opportunities. Rival agencies smell blood — `
            + `they're poaching ${targets.map(a => a.name).join(' and ')} simultaneously!`,
          choices: [
            { label: `💰 Mass retention bonuses (−₩${(targets.length * 2000).toLocaleString()}, +20 loyalty each)`,
              effect: (s, d) => {
                d({ type: A.ADD_MONEY, amount: -(targets.length * 2000) })
                targets.forEach(t => {
                  const cur = s.actors.find(x => x.id === t.id)
                  if (cur) d({ type: A.UPDATE_ACTOR, id: t.id,
                    patch: { loyalty: clamp((cur.loyalty ?? 60) + 20, 0, 100) } })
                })
                d({ type: A.SET_FLAG, key: 'cpTotalDeclines', value: 0 })
              } },
            { label: '👋 Accept the losses (actors leave)',
              effect: (s, d) => targets.forEach(t => {
                d({ type: A.UPDATE_ACTOR, id: t.id, patch: { signed: false, status: 'locked' } })
              }) },
          ],
        },
      })
    }
  }

  // 3. Fan Backlash: triggered when ignored scandal count reaches 3
  const scandalCount = state.flags?.scandalCount ?? 0
  const backlashKey  = `fanBacklash_s${Math.floor((state.week ?? 0) / 8)}`
  if (scandalCount >= 3 && !(state.flags?.[backlashKey])) {
    challengeModals.push({
      flagKey: backlashKey,
      type: 'event',
      data: {
        label: '📢 FAN BACKLASH',
        badge: '⚠️ REPUTATION CRISIS',
        message:
          `Your studio has ignored ${scandalCount} scandals. Fan communities are organising a boycott — `
          + `your repeated mishandling is catching up with you.`,
        choices: [
          { label: '📣 Public apology tour (−₩3,000, +5 rep, resets scandal counter)',
            effect: (s, d) => {
              d({ type: A.ADD_MONEY,      amount: -3000 })
              d({ type: A.ADD_REPUTATION, amount: 5 })
              d({ type: A.SET_FLAG, key: 'scandalCount', value: 0 })
            } },
          { label: '🙈 Ride it out (−8 rep, −10,000 pop)',
            effect: (s, d) => {
              d({ type: A.ADD_REPUTATION, amount: -8 })
              d({ type: A.SET_POPULARITY, value: Math.max(0, s.popularity - 10000) })
            } },
        ],
      },
    })
  }

  // Return challenge events if any triggered this week (bypass regular cooldown)
  if (challengeModals.length > 0) return challengeModals

  // ── Regular event rolling (1-3 week cooldown, 35% chance) ──────────────────
  // 1-3 week cooldown between company events
  const lastEvtWeek = state.flags?.lastCompanyEvent ?? -999
  const minCooldown = 1 + Math.floor(Math.random() * 3)
  if ((state.week - lastEvtWeek) < minCooldown) return []

  // 35% weekly chance
  if (Math.random() > 0.35) return []

  // Route: 30% → tricky events, 70% → standard events
  const useTricky = Math.random() < 0.30
  const pool = useTricky
    ? TRICKY_COMPANY_EVENTS.filter(e => !e.condition || e.condition(state))
    : COMPANY_EVENTS.filter(e => !e.condition || e.condition(state))

  if (!pool.length) {
    // Fall back to the other pool if chosen pool is empty
    const fallback = useTricky
      ? COMPANY_EVENTS.filter(e => !e.condition || e.condition(state))
      : TRICKY_COMPANY_EVENTS.filter(e => !e.condition || e.condition(state))
    if (!fallback.length) return []
    const fEv = fallback[Math.floor(Math.random() * fallback.length)]
    const fData = fEv.makeData(state)
    if (!fData) return []
    return [{ type: 'event', data: { label: fEv.label, ...fData } }]
  }

  const totalWeight = pool.reduce((s, e) => s + e.weight, 0)
  const roll        = Math.random() * totalWeight
  let acc = 0
  for (const ev of pool) {
    acc += ev.weight
    if (roll < acc) {
      const makeData = ev.makeData(state)
      if (!makeData) return []
      return [{ type: 'event', data: { label: ev.label, ...makeData } }]
    }
  }
  return []
}
