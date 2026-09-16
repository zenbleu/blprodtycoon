/**
 * weekAdvance.js — Custom hook: NEXT WEEK logic
 * Prompt 5: passes castActors + chemValue to evaluateProduction,
 *           handles awards dispatch and controversy modal.
 * Prompt 8: tier-based scaling throughout.
 */
import { useState } from 'react'
import { useGame, A, pushToast, pushEventLog } from './state.jsx'
import { tickProduction, calcRevenue, calcScore, popularityDeltaByPlatform, PROD_TYPES } from './productions.js'
import { weeklyActorRecovery, grantExp, NEW_TALENT_POOL, checkTierPromotion, applyTierPromotion, actorDisplayName, startHoneymoon, HONEYMOON_NEW_RECRUIT_WEEKS } from './actors.js'
import { calcChemistryBonus, calcBondGrowth, applyBondDeltas, getChem } from './chemistry.js'
import { evaluateProduction } from './evaluators.js'
import { rollWeeklyEvents, rollActorEvent, runChemPulse, rollCpEvents } from './events.js'
import { generateAtmosphereMessage } from './atmosphere.js'
import { calcRank, computeNumericRank, playerScore } from './ranking.js'
import { SFX, resumeAudio } from './audio.js'
import { getGameTierByRank } from './tiers.js'
import { GENRE_UNLOCK_BY_GRADE, GENRE_UNLOCK_COUNTS, GENRES } from './productions.js'
import { THEME_UNLOCK_BY_GRADE, THEME_UNLOCK_COUNTS, DEFAULT_THEMES } from './themes.js'
import { computeAllAwards, calcAttendanceEffects, getLackingArea, getYearFromWeek, AWARD_DEFS } from './awards.js'

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

export function useWeekAdvance() {
  const { state, dispatch } = useGame()
  const [advancing, setAdvancing] = useState(false)

  async function advanceWeek() {
    if (advancing) return
    resumeAudio()
    SFX.nextTurn()
    setAdvancing(true)

    // try-finally guarantees advancing is cleared even if an error is thrown
    try {
    const week = state.week
    // Prompt 1: tier now derived from numeric rank, not week
    const tier = getGameTierByRank(state.numericRank ?? 101)

    // ── Genre trends: regenerate at start of each year (or first week ever) ──
    const weekInYear = ((week - 1) % 52) + 1
    // Reset per-year actor tracking at new year start
    if (weekInYear === 1) {
      for (const actor of state.actors) {
        if ((actor.injuredThisYear ?? 0) > 0) {
          dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { injuredThisYear: 0 } })
        }
      }
    }
    if (weekInYear === 1 || !(state.genreTrends?.length)) {
      const trendCounts = { rookie: 3, rising: 4, popular: 5, worldwide: 6 }
      const trendCount  = trendCounts[tier.id] ?? 3
      const shuffled    = [...GENRES].sort(() => Math.random() - 0.5)
      dispatch({ type: A.SET_GENRE_TRENDS, trends: shuffled.slice(0, trendCount) })
    }

    // ── 1. Tick productions ───────────────────────────────────────────────────
    const completedThisWeek    = []
    const wrappedThisWeek      = []
    const releasingThisWeek    = []
    const extraHistoryRecords  = []   // for awards: productions completing this week

    for (const prod of state.productions) {
      if (prod.status !== 'active') continue
      // Prompt 1 (Year Lineup): skip productions not yet at their scheduled start week
      if (prod.weekScheduled && week < prod.weekScheduled) continue
      const patch = tickProduction(prod)
      dispatch({ type: A.UPDATE_PRODUCTION, id: prod.id, patch })

      if (patch.status === 'completed') {
        completedThisWeek.push({ ...prod, ...patch })
      } else if (patch.phase === 'wrap' && prod.phase === 'filming') {
        wrappedThisWeek.push({ ...prod, ...patch })
        // Note: comboResult is set by tickProduction at wrap time
      } else if (patch.phase === 'releasing') {
        releasingThisWeek.push({ ...prod, ...patch })
      } else if (prod.phase === 'filming' && patch.phase !== 'wrap') {
        // Active filming week: roll for 40% chance of a contextual atmosphere message (Polish Version 1.1)
        if (Math.random() < 0.40) {
          const { text, usedIds } = generateAtmosphereMessage(prod, state.actors)
          dispatch({
            type: A.UPDATE_PRODUCTION,
            id: prod.id,
            patch: { usedAtmosphereIds: usedIds }
          })
          pushEventLog(dispatch, `🎥 [On Set: ${prod.title}] ${text}`, '', week)
        }
      }
    }

    // ── 2. Wrap events ────────────────────────────────────────────────────────
    // Modal consolidation: only pop up a modal for notable combos (PERFECT / BAD FIT).
    // GOOD combos (mult = 1.0) go to the event log only — reduces modal fatigue.
    for (const prod of wrappedThisWeek) {
      const combo = prod.comboResult
      if (combo) {
        pushEventLog(dispatch,
          `"${prod.title}" filming wrapped! Combo: ${combo.emoji} ${combo.label} ×${combo.mult}`,
          combo.mult >= 1.5 ? 'gold' : combo.mult < 1.0 ? 'red' : 'green', week,
        )
        // Only push modal for PERFECT (×1.5) or BAD FIT (×0.6) — GOOD is event-log-only
        if (combo.mult >= 1.5 || combo.mult <= 0.6) {
          dispatch({
            type: A.PUSH_MODAL,
            modal: {
              type: 'generic',
              data: {
                title: `🎬 ${prod.title} — WRAP!`,
                message: `Genre×Type Combo: ${combo.emoji} ${combo.label}\n\nScore multiplier: ×${combo.mult}\nEpisodes now releasing weekly.`,
              },
            },
          })
        }
      }
    }

    // ── 3. Episode releases ───────────────────────────────────────────────────
    for (const prod of releasingThisWeek) {
      const ep  = prod.episodesReleased
      const rat = prod.episodeRatings?.[ep - 1]
      if (rat != null) {
        pushEventLog(dispatch,
          `"${prod.title}" Ep.${ep} aired — rating ${rat}/10`,
          rat >= 8 ? 'pink' : rat >= 5 ? 'green' : 'red', week,
        )
      }
    }

    // ── 4. Evaluate completed productions ─────────────────────────────────────
    for (const prod of completedThisWeek) {
      const castActors = state.actors.filter(a => prod.castIds.includes(a.id))

      // Chemistry between lead pair
      const leads   = castActors.filter(a => (prod.leadIds ?? []).includes(a.id))
      const chemValue = leads.length >= 2
        ? getChem(leads[0], leads[1].id)
        : castActors.length >= 2
          ? getChem(castActors[0], castActors[1].id)
          : 0

      const chemBonus  = calcChemistryBonus(castActors)
      const baseScore  = calcScore(prod, castActors, chemBonus, state.productionsCompleted ?? 0)
      const comboMult  = prod.comboResult?.mult ?? 1.0
      // Apply Creative Differences quality bonus before genre reuse check
      let adjBase      = Math.round(Math.min(100, baseScore * comboMult))
      if (prod.qualityBonus) adjBase = Math.min(100, adjBase + prod.qualityBonus)
      // Movie Critic Buffer: +10 score bonus to offset single-episode RNG variance,
      // reflecting the higher production values and prestige of cinematic releases.
      if (prod.type === 'movie') adjBase = Math.min(100, adjBase + 10)

      // ── Genre reuse penalty — 13-week cooldown from each production's wrap ──
      // Uses weekCompleted so the clock starts when filming ends, not when episodes finish airing.
      const REUSE_COOLDOWN = 13
      const recentGenres    = (state.history ?? [])
        .filter(h => h.genre && h.weekCompleted != null && (week - h.weekCompleted) <= REUSE_COOLDOWN)
        .map(h => h.genre)
      const genreReuseCount = recentGenres.filter(g => g === prod.genre).length
      const genreReuseMod   = genreReuseCount >= 2 ? 0.75 : genreReuseCount === 1 ? 0.85 : 1.0
      if (genreReuseMod < 1.0) {
        adjBase = Math.round(adjBase * genreReuseMod)
        pushEventLog(dispatch,
          `🔁 Genre reuse penalty for "${prod.genre}" (−${Math.round((1 - genreReuseMod) * 100)}%)`,
          'red', week)
      }

      const isTrending = (state.genreTrends ?? []).includes(prod.genre)

      // Four-critics evaluation (reconstructed into a clean sequential pipeline inside evaluators.js)
      const evalResult = evaluateProduction({
        production: prod,
        score:      adjBase,
        reputation: state.reputation,
        castActors,
        chemValue,
        tier,                // Prompt 8: pass tier for rep cap & distribution
        genreTrends: state.genreTrends ?? [],
      })

      const finalScore = evalResult.score
      const revenue = evalResult.revenue

      // Apply stat deltas — popDelta returned from evaluateProduction is already fully trended and calculated
      dispatch({ type: A.ADD_MONEY,      amount: revenue })
      dispatch({ type: A.ADD_REPUTATION, amount: evalResult.repDelta })
      dispatch({ type: A.SET_POPULARITY, value: state.popularity + evalResult.popDelta })
      if (isTrending) {
        pushEventLog(dispatch,
          `📈 "${prod.genre}" is trending! +20% pop bonus for "${prod.title}"`, 'gold', week)
      }

      // Chemistry + XP for cast
      const chemGrowthMult = PROD_TYPES[prod.type]?.chemistryMult ?? 1
      const chemDeltas = calcBondGrowth(castActors, finalScore, chemGrowthMult)
      for (const actor of castActors) {
        const expPatch   = grantExp(actor, evalResult.xpPerActor)
        const newChemMap = applyBondDeltas(actor, chemDeltas)
        dispatch({
          type: A.UPDATE_ACTOR, id: actor.id,
          patch: {
            ...expPatch,
            chemistry_map:  newChemMap,
            status:         'available',
            assignedTo:     null,
            completedProds: (actor.completedProds ?? 0) + 1,
          },
        })
      }

      // Record completion (chemScore, productionScore, criticScore, audienceScore stored for BL Awards)
      const historyRecord = {
        ...prod,
        score:         finalScore,
        revenue,
        grade:         evalResult.grade,
        weekCompleted: week,
        chemScore:     chemValue,
        productionScore: adjBase,
        criticScore:   evalResult.criticScore,
        audienceScore: evalResult.audienceScore,
      }
      dispatch({ type: A.COMPLETE_PRODUCTION, id: prod.id, record: historyRecord })
      extraHistoryRecords.push(historyRecord)

      // ── Awards (avgStars ≥ 4.5) ───────────────────────────────────────────
      if (evalResult.awarded) {
        dispatch({ type: A.ADD_REPUTATION, amount: 6 })
        dispatch({ type: A.SET_POPULARITY, value: state.popularity + evalResult.popDelta + 12000 })
        dispatch({ type: A.ADD_MONEY, amount: 2000 })
        dispatch({ type: A.ADD_AWARD })
        for (const actor of castActors) {
          dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { awards: (actor.awards ?? 0) + 1 } })
        }
        pushEventLog(dispatch,
          `🏆 "${prod.title}" wins an industry award! +6 rep · +₩2,000`,
          'gold', week,
        )
      }

      // ── Happiness bonus/penalty on cast actors based on grade ─────────────
      const happinessByGrade = { 'S+': 20, S: 15, A: 10, B: 6, C: 0, D: -6, F: -12 }
      const happinessDelta   = happinessByGrade[evalResult.grade] ?? 0
      if (happinessDelta !== 0) {
        for (const cActor of castActors) {
          const newH = clamp((cActor.happiness ?? 70) + happinessDelta, 0, 100)
          dispatch({ type: A.UPDATE_ACTOR, id: cActor.id, patch: { happiness: newH } })
        }
      }

      // ── Grade count increment → count-based genre & theme unlocks ──────────
      const newGradeCount   = ((state.gradeCounts ?? {})[evalResult.grade] ?? 0) + 1
      dispatch({ type: A.INCREMENT_GRADE_COUNT, grade: evalResult.grade })
      const gradeThreshold  = GENRE_UNLOCK_COUNTS[evalResult.grade]
      if (gradeThreshold && newGradeCount >= gradeThreshold) {
        const genresToUnlock = GENRE_UNLOCK_BY_GRADE[evalResult.grade] ?? []
        if (genresToUnlock.length > 0) {
          dispatch({ type: A.UNLOCK_GENRES, genres: genresToUnlock })
          const current = state.unlockedGenres ?? ['Romance', 'School', 'Office']
          const fresh   = genresToUnlock.filter(g => !current.includes(g))
          if (fresh.length > 0) {
            pushEventLog(dispatch,
              `🎭 Genres unlocked: ${fresh.join(', ')}! (${evalResult.grade}×${newGradeCount})`,
              'gold', week)
          }
        }

        // Theme unlocks — same count gate as genre unlocks
        const themesToUnlock = THEME_UNLOCK_BY_GRADE[evalResult.grade] ?? []
        if (themesToUnlock.length > 0) {
          dispatch({ type: A.UNLOCK_THEMES, themes: themesToUnlock })
          const currentThemes = state.unlockedThemes ?? DEFAULT_THEMES
          const freshThemes   = themesToUnlock.filter(t => !currentThemes.includes(t))
          if (freshThemes.length > 0) {
            pushEventLog(dispatch,
              `✨ Themes unlocked: ${freshThemes.join(', ')}! (${evalResult.grade}×${newGradeCount})`,
              'gold', week)
          }
        }
      }

      // ── Prompt 8: Reputation repair event (30% chance after rep loss) ─────
      if (evalResult.repDelta < 0 && Math.random() < 0.30) {
        const repGain = 10 + Math.floor(Math.random() * 11) // +10 to +20
        const repairEvents = [
          { label: '💝 CHARITY DRIVE', desc: 'Your studio organises a surprise charity stream.' },
          { label: '🙏 PUBLIC APOLOGY', desc: 'Your studio issues a heartfelt public statement.' },
          { label: '🤝 FAN MEET', desc: 'An unannounced fan meeting wins the crowd back.' },
          { label: '💌 LETTER TO FANS', desc: 'A personal letter from the leads goes viral.' },
        ]
        const evt = repairEvents[Math.floor(Math.random() * repairEvents.length)]
        dispatch({
          type: A.PUSH_MODAL,
          modal: {
            type: 'event',
            data: {
              label: `🌟 REPUTATION REPAIR — ${evt.label}`,
              message:
                `${evt.desc} The public response has been overwhelmingly positive.\n\n`
                + `Accept to restore +${repGain} reputation (free).`,
              choices: [
                { label: `✅ Accept (+${repGain} rep, free)`,
                  effect: (s, d) => d({ type: A.ADD_REPUTATION, amount: repGain }) },
                { label: '❌ Decline (no penalty)', effect: () => {} },
              ],
            },
          },
        })
        pushEventLog(dispatch, `🌟 Reputation repair opportunity after "${prod.title}" review.`, 'pink', week)
      }

      // ── Controversy (social critic ≤ 2) ───────────────────────────────────
      if (evalResult.controversy) {
        dispatch({
          type: A.PUSH_MODAL,
          modal: {
            type: 'event',
            data: {
              label: '⚠️ CONTROVERSY',
              message: `The Social Critic's review of "${prod.title}" sparked backlash over LGBTQ+ representation. Your studio is under scrutiny.`,
              choices: [
                { label: '🤝 Issue apology (-3 rep)',   effect: (s, d) => d({ type: A.ADD_REPUTATION, amount: -3 }) },
                { label: '🗣️ Stand firm (-6 rep)',      effect: (s, d) => d({ type: A.ADD_REPUTATION, amount: -6 }) },
                { label: '💰 Donate & rebrand (-₩8000)', effect: (s, d) => {
                  d({ type: A.ADD_MONEY, amount: -8000 })
                  d({ type: A.ADD_REPUTATION, amount: 2 })
                }},
              ],
            },
          },
        })
        pushEventLog(dispatch,
          `"${prod.title}" faces representation controversy. Choices matter.`,
          'red', week,
        )
      }

      // Event log + main result modal
      pushEventLog(dispatch,
        `🎬 "${prod.title}" released! Critics: ${evalResult.criticScore}/100, Audience: ${evalResult.audienceScore}/100 (${evalResult.grade})`,
        evalResult.grade === 'F' || evalResult.grade === 'D' ? 'red'
          : evalResult.grade === 'S+' || evalResult.grade === 'S' ? 'gold'
          : 'green',
        week,
      )

      dispatch({
        type: A.PUSH_MODAL,
        modal: {
          type: 'productionResult',
          data: { prod, eval: evalResult, score: finalScore, revenue },
        },
      })
    }

    // Increment studio experience counter once per completed production
    if (completedThisWeek.length > 0) {
      dispatch({ type: A.INCREMENT_PRODS_COMPLETED, count: completedThisWeek.length })
    }

    // ── 5. Weekly actor tick ──────────────────────────────────────────────────
    let currentMoney = state.money;
    for (const actor of state.actors) {
      if (!actor.signed) continue
      if (completedThisWeek.find(p => p.castIds.includes(actor.id))) continue

      let activeSubActivity = actor.subActivity
      if (actor.status === 'available' && activeSubActivity) {
        const cost = activeSubActivity === 'training' ? 150 : 250
        if (currentMoney < cost) {
          activeSubActivity = null
          dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { subActivity: null } })
          pushEventLog(dispatch, `⚠️ ${actorDisplayName(actor)}'s sub-activity cancelled due to low funds.`, 'red', week)
        } else {
          currentMoney -= cost
          dispatch({ type: A.ADD_MONEY, amount: -cost })
          const actLabel = activeSubActivity === 'training' ? 'Acting Masterclass' : 'Fan Meeting'
          pushEventLog(dispatch, `🏃 ${actorDisplayName(actor)} participated in ${actLabel} (−₩${cost})`, '', week)
        }
      }

      const actorWithResolvedActivity = activeSubActivity !== actor.subActivity
        ? { ...actor, subActivity: activeSubActivity }
        : actor

      // Prompt 8: pass tier to weeklyActorTick for threshold scaling
      const patch = weeklyActorRecovery(actorWithResolvedActivity, tier, week)
      dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch })

      // ── Prompt 8: Emergency save event at loyalty ≤ 10 (one-time) ────────
      const prevLoyalty = actor.loyalty ?? 60
      const newLoyalty  = patch.loyalty ?? prevLoyalty
      if (prevLoyalty > 10 && newLoyalty <= 10 && actor.status === 'available') {
        const coolKey = `loyaltyEmergency_${actor.id}`
        if (!state.flags?.[coolKey]) {
          dispatch({ type: A.SET_FLAG, key: coolKey, value: week })
          dispatch({
            type: A.PUSH_MODAL,
            modal: {
              type: 'event',
              data: {
                label: `⚠️ EMERGENCY SAVE — ${actor.name.toUpperCase()}`,
                message:
                  `${actor.name} is considering leaving. Loyalty has fallen critically low!\n\n`
                  + `Start an emergency production now to retain them? `
                  + `If accepted, they can be immediately cast in a new production for free (no production slot cost; normal filming costs apply).`,
                choices: [
                  { label: '🎬 Emergency production — cast them immediately (free slot)',
                    effect: (s, d) => {
                      d({ type: A.UPDATE_ACTOR, id: actor.id,
                        patch: { loyalty: clamp((actor.loyalty ?? 10) + 20, 0, 100) } })
                      d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
                        title: `✅ ${actor.name} — EMERGENCY RETAINED`,
                        message:
                          `${actor.name} agrees to stay! Cast them in a new production before next week to keep them.\n\n`
                          + `Loyalty restored to ${clamp((actor.loyalty ?? 10) + 20, 0, 100)}.`,
                      } } })
                    } },
                  { label: '👋 Decline — they will leave at 0 loyalty',
                    effect: () => {} },
                ],
              },
            },
          })
          pushEventLog(dispatch,
            `⚠️ EMERGENCY: ${actor.name} loyalty critically low — intervention needed!`, 'red', week)
        }
      }

      // ── 3.3 Loyalty drain — check after patch applied ────────────────────
      if (newLoyalty <= 0 && actor.status === 'available') {
        const coolKey = `loyaltyZero_${actor.id}`
        const lastWk  = state.flags?.[coolKey] ?? -999
        if (week - lastWk >= 4) {
          dispatch({ type: A.SET_FLAG, key: coolKey, value: week })
          dispatch({
            type: A.PUSH_MODAL,
            modal: {
              type: 'event',
              data: {
                label: `💔 LOYALTY CRISIS — ${actor.name.toUpperCase()}`,
                message:
                  `${actor.name} has been idle for ${actor.idleWeeks} weeks and their loyalty has hit zero! `
                  + `"${actor.name} is planning to leave... If this continues, they will leave the company. Add a new production now?"\n\n`
                  + `Act now or they will leave!`,
                choices: [
                  { label: '🎬 Commit to scheduling them soon (+loyalty)',
                    effect: (s, d) => d({ type: A.UPDATE_ACTOR, id: actor.id,
                      patch: { loyalty: 20, happiness: clamp((actor.happiness ?? 0) + 10, 0, 100) } }) },
                  { label: `💸 Emergency bonus (−₩3,000, +loyalty)`,
                    effect: (s, d) => {
                      d({ type: A.ADD_MONEY, amount: -3000 })
                      d({ type: A.UPDATE_ACTOR, id: actor.id,
                        patch: { loyalty: 30, happiness: clamp((actor.happiness ?? 0) + 20, 0, 100) } })
                    } },
                  { label: `👋 Let ${actor.name} leave → Free Agents Pool`,
                    effect: (s, d) => {
                      const displayName = actorDisplayName(actor)
                      const idleWks     = actor.idleWeeks ?? 0

                      // ── Burn letter: find recent co-actor from history ───────
                      const actorHistory = (s.history ?? [])
                        .filter(h => (h.castIds ?? []).includes(actor.id))
                        .sort((a, b) => (b.weekCompleted ?? 0) - (a.weekCompleted ?? 0))
                      const mostRecent = actorHistory[0]
                      let recentCoActorObj = null
                      if (mostRecent) {
                        const otherId = (mostRecent.castIds ?? []).find(id => id !== actor.id)
                        if (otherId) recentCoActorObj = s.actors.find(a => a.id === otherId) ?? null
                      }
                      const completedProds = actor.completedProds ?? 0
                      const coName = recentCoActorObj ? actorDisplayName(recentCoActorObj) : null

                      let letterText
                      if (completedProds > 0 && coName) {
                        letterText = `"Consider this my final goodbye, CEO. 👋 You wasted my time for ${idleWks} weeks. After starring in ${completedProds} production${completedProds !== 1 ? 's' : ''}, even ${coName} told me this studio never treated me right. You couldn't pay me enough to ever come back here!'"`
                      } else if (completedProds === 0 && coName) {
                        letterText = `"Consider this my final goodbye, CEO. 👋 You wasted my time for ${idleWks} weeks. I'm taking ${coName}'s advice: "This studio never treated me right". You couldn't pay me enough to ever come back here!'"`
                      } else if (completedProds > 0 && !coName) {
                        letterText = `"Consider this my final goodbye, CEO. 👋 You wasted my time for ${idleWks} weeks. After starring in ${completedProds} production${completedProds !== 1 ? 's' : ''}, this studio never treated me right. You couldn't pay me enough to ever come back here!'"`
                      } else {
                        letterText = `"I'm out, CEO. 🤬 ${idleWks} weeks of being ignored proved everything I needed to know. Your studio doesn't appreciate talent, and I'm never stepping foot on your company again.'"`
                      }

                      // ── Co-star loyalty/happiness penalty ───────────────────
                      // Dampened by 50% if the co-star is currently mid-shoot —
                      // they're too focused on filming to feel the full impact yet.
                      if (recentCoActorObj?.signed) {
                        const coIsFilming   = recentCoActorObj.status === 'filming'
                        const penaltyPoints = coIsFilming ? 5 : 10
                        d({ type: A.UPDATE_ACTOR, id: recentCoActorObj.id, patch: {
                          loyalty:   clamp((recentCoActorObj.loyalty   ?? 60) - penaltyPoints, 0, 100),
                          happiness: clamp((recentCoActorObj.happiness ?? 70) - penaltyPoints, 0, 100),
                        } })
                        pushEventLog(d,
                          `😞 ${actorDisplayName(recentCoActorObj)} is affected by ${displayName}'s departure. (−${penaltyPoints} loyalty, −${penaltyPoints} happiness${coIsFilming ? ' — shooting softens the blow' : ''})`,
                          'red', week)
                      }

                      // ── Move actor to free agents pool ──────────────────────
                      const boostedSkills = {}
                      for (const [k, v] of Object.entries(actor.skills ?? {})) {
                        boostedSkills[k] = Math.min(100, Math.round(v * 2))
                      }
                      const baseCost   = Math.round((actor.signCost ?? 200) * 3)
                      const resignCost = Math.round(baseCost * (tier.resignCostMult ?? 1.0))
                      const returnWk   = week + 16   // 16 weeks for loyalty walkouts (was 12)
                      d({ type: A.UPDATE_ACTOR, id: actor.id,
                        patch: { signed: false, status: 'locked', loyalty: 0 } })
                      d({ type: A.ADD_FREE_AGENT, entry: {
                        poolId:          `ex_${actor.id}_${week}`,
                        type:            'ex_actor',
                        originalActorId: actor.id,
                        name:            actor.name,
                        tier:            actor.tier,
                        skills:          boostedSkills,
                        characteristics: actor.characteristics ?? [],
                        signCost:        resignCost,
                        happiness:       actor.happiness ?? 20,
                        loyalty:         0,
                        weeksInPool:     0,
                        availableWeek:   returnWk,
                        permanentlyGone: false,
                        idleReturnCount: 0,
                      } })
                      pushEventLog(d,
                        `💔 ${displayName} left the studio (loyalty=0) → Free Agents Pool (returns Wk ${returnWk})`,
                        'red', week)

                      // ── Quit notice modal + burn letter ──────────────────────
                      d({ type: A.PUSH_MODAL, modal: {
                        type: 'actorQuitNotice',
                        data: { actorId: actor.id, actorName: displayName, returnWeek: returnWk, idleWeeks: idleWks },
                      } })
                      d({ type: A.PUSH_MODAL, modal: {
                        type: 'actorBurnLetter',
                        data: { actorName: displayName, letterText },
                      } })

                      // ── Studio Reputation Crisis on 3rd quit ────────────────
                      const newExCount = (s.freeAgentsPool ?? []).filter(e => e.type === 'ex_actor').length + 1
                      if (newExCount >= 3 && !s.flags?.studioRepCrisisTriggered) {
                        d({ type: A.SET_FLAG, key: 'studioRepCrisisTriggered', value: true })
                        d({ type: A.ADD_REPUTATION, amount: -50 })
                        d({ type: A.SET_POPULARITY, value: Math.max(0, s.popularity - 100000) })
                        d({ type: A.SET_FLAG, key: 'signCostPenaltyUntilWeek', value: week + 8 })
                        d({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
                          title: '📢 STUDIO REPUTATION CRISIS',
                          message:
                            'Word is spreading that your studio burns through talent. Industry insiders are watching.\n\n'
                            + '−50 Reputation · −100,000 Popularity\n'
                            + 'New actor sign costs +40% for the next 8 weeks.',
                        } } })
                        pushEventLog(d,
                          '📢 STUDIO REPUTATION CRISIS: −50 rep, −100K pop, +40% sign costs for 8 weeks.', 'red', week)
                      }
                    } },
                ],
              },
            },
          })
          pushEventLog(dispatch,
            `⚠️ ${actor.name} loyalty at zero! Intervention needed.`, 'red', week,
          )
        }
      }
    }

    // ── 5b. Actor tier promotion check ───────────────────────────────────────
    // Runs every week for all signed actors below Worldwide.
    // Uses the full history (including productions completed this week) so new grades count.
    const fullHistory = [...(state.history ?? []), ...extraHistoryRecords]
    for (const actor of state.actors) {
      if (!actor.signed || actor.tier === 'Worldwide') continue

      const promoResult = checkTierPromotion(actor, fullHistory)
      if (!promoResult.eligible) continue

      // One promotion per actor per game — flag prevents re-firing if dispatch is async
      const promoFlagKey = `tierPromoted_${actor.id}_to_${promoResult.nextTier}`
      if (state.flags?.[promoFlagKey]) continue

      const promoPatch = applyTierPromotion(actor)
      dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: promoPatch })
      dispatch({ type: A.SET_FLAG, key: promoFlagKey, value: week })

      pushEventLog(dispatch,
        `🌟 ${actor.name} promoted from ${actor.tier} → ${promoResult.nextTier}! All skills boosted.`,
        'gold', week,
      )
      dispatch({
        type: A.PUSH_MODAL,
        modal: {
          type: 'event',
          data: {
            label: `🌟 TIER PROMOTION — ${actor.name.toUpperCase()}`,
            message:
              `${actor.name} has risen from **${actor.tier}** to **${promoResult.nextTier}**!\n\n`
              + `Their skills have been boosted across all areas and their confidence is at an all-time high.\n\n`
              + `Loyalty +15 · Happiness +10 · All skills improved ✨`,
            choices: [
              { label: `🎉 Congratulations, ${actor.name.split(' ')[0]}!`, effect: () => {} },
            ],
          },
        },
      })
    }

    // ── 5.1 Tick pool entries (weeksInPool++, remove ex-actors after 24 weeks) ─
    if ((state.freeAgentsPool ?? []).length > 0) {
      const updatedPool = (state.freeAgentsPool ?? [])
        .map(e => ({ ...e, weeksInPool: (e.weeksInPool ?? 0) + 1 }))
        .filter(e => {
          if (e.permanentlyGone) return false
          if (e.type === 'ex_actor' && e.weeksInPool >= 24) {
            pushEventLog(dispatch,
              `⌛ ${e.name} left the free agent pool permanently (24-week limit).`, 'red', week)
            return false
          }
          return true
        })
      dispatch({ type: A.INIT_FREE_AGENTS, pool: updatedPool })
    }

    // ── 5.5 Numeric rank + tier unlocks ─────────────────────────────────────
    const numRank = computeNumericRank(state)
    if (numRank !== state.numericRank) {
      dispatch({ type: A.SET_NUMERIC_RANK, rank: numRank })
    }

    // Prompt 2: auto-sign actors on tier unlock (free, no modal "pay to sign")
    function autoSignTier(tierName, emoji, rankNum) {
      if (!state.unlockedTiers.includes(tierName)) {
        dispatch({ type: A.UNLOCK_TIER, tier: tierName })
        // Find all actors of this tier not yet signed and auto-sign them for free
        const newActors = state.actors.filter(a => a.tier === tierName && !a.signed)
        for (const actor of newActors) {
          dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { signed: true, status: 'available', ...startHoneymoon(actor, week, HONEYMOON_NEW_RECRUIT_WEEKS) } })
        }
        const names = newActors.map(a => a.name).join(', ')
        pushEventLog(dispatch,
          `${emoji} ${tierName} tier unlocked! ${newActors.length} actors auto-signed for free.`,
          'gold', week)
        dispatch({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
          title: `${emoji} ${tierName.toUpperCase()} TIER UNLOCKED — RANK #${rankNum}!`,
          message:
            `Your studio reached rank #${rankNum}!\n\n`
            + `${newActors.length} new actor${newActors.length !== 1 ? 's' : ''} automatically signed — completely free! 🎉\n\n`
            + `Welcome to the roster:\n${names || '(none available)'}`,
        } } })
      }
    }

    if (numRank <= 75) autoSignTier('Rising Star', '🌟', numRank)
    if (numRank <= 45) autoSignTier('Popular',     '💕', numRank)
    if (numRank <= 15) autoSignTier('Worldwide',   '🌍', numRank)

    // ── 5.6 Rivalry showdown (every 10 weeks) ────────────────────────────────
    // Player now picks a Focus before the result is resolved, adding agency.
    if (week > 0 && week % 10 === 0 && (state.rivals ?? []).length > 0) {
      const ps     = playerScore(state)
      const rivals = [...state.rivals].sort((a, b) => a.score - b.score)
      const rival  = rivals.find(r => r.score > ps)
      if (rival) {
        const baseWinChance = Math.min(0.88, (ps / (ps + rival.score)) * 1.6 + 0.05)

        // Pre-compute focus bonuses based on current studio strengths
        const hasStrongActors  = state.actors.some(a => a.signed && (a.tier === 'Worldwide' || a.tier === 'Popular'))
        const hasHighChemCP    = (state.fixedCPs ?? []).some(([x, y]) => {
          const actA = state.actors.find(ac => ac.id === x)
          return actA && getChem(actA, y) >= 70
        })
        const mediaBlitzBonus  = state.popularity > rival.score * 10 ? 0.10 : 0.04
        const talentBonus      = hasStrongActors ? 0.10 : 0.04
        const fanAppealBonus   = hasHighChemCP   ? 0.10 : 0.04

        // Resolve showdown after player picks a Focus strategy
        function resolveShowdown(focusBonus, s, d) {
          const winChance  = Math.min(0.92, baseWinChance + focusBonus)
          const playerWins = Math.random() < winChance
          if (playerWins) {
            d({ type: A.ADD_REPUTATION, amount: 5 })
            d({ type: A.SET_POPULARITY, value: s.popularity + 8000 })
            d({ type: A.UPDATE_RIVALS,  id: rival.id, scoreDelta: -25 })
            pushEventLog(d, `⚔️ Showdown vs ${rival.name}: WON! +5 rep +8K pop`, 'gold', week)
            d({ type: A.PUSH_MODAL, modal: { type: 'event', data: {
              label: '⚔️ RIVALRY SHOWDOWN — VICTORY!',
              message:
                `Your studio faced off against ${rival.name}!\n\n` +
                `Your score: ${ps.toLocaleString()}\nRival score: ${rival.score.toLocaleString()}\n\n` +
                `VICTORY! +5 rep · +8,000 pop · rival weakened.`,
              choices: [{ label: '🏆 CELEBRATE!', effect: () => {} }],
            } } })
          } else {
            d({ type: A.ADD_REPUTATION, amount: -4 })
            d({ type: A.UPDATE_RIVALS,  id: rival.id, scoreDelta: 10 })
            pushEventLog(d, `⚔️ Showdown vs ${rival.name}: lost. −4 rep`, 'red', week)
            d({ type: A.PUSH_MODAL, modal: { type: 'event', data: {
              label: '⚔️ RIVALRY SHOWDOWN — DEFEAT',
              message:
                `Your studio faced off against ${rival.name}.\n\n` +
                `Your score: ${ps.toLocaleString()}\nRival score: ${rival.score.toLocaleString()}\n\n` +
                `DEFEAT. −4 rep · rival grows stronger.`,
              choices: [{ label: '😤 NOTED', effect: () => {} }],
            } } })
          }
        }

        // Focus selection modal — player chooses their battle strategy
        dispatch({ type: A.PUSH_MODAL, modal: { type: 'event', data: {
          label: `⚔️ SHOWDOWN vs ${rival.name.toUpperCase()}`,
          message:
            `Rankings showdown incoming!\n\n` +
            `Your score: ${ps.toLocaleString()}  vs  ${rival.name}: ${rival.score.toLocaleString()}\n` +
            `Base win chance: ${Math.round(baseWinChance * 100)}%\n\n` +
            `Pick your battle strategy — strong studios earn +10% for their specialty:`,
          choices: [
            { label: `📡 Media Blitz — marketing & audience push  (${state.popularity > rival.score * 10 ? '+10%' : '+4%'} win chance)`,
              effect: (s, d) => resolveShowdown(mediaBlitzBonus, s, d) },
            { label: `⭐ Talent Showdown — actor quality & prestige  (${hasStrongActors ? '+10%' : '+4%'} win chance)`,
              effect: (s, d) => resolveShowdown(talentBonus,      s, d) },
            { label: `💕 Fan Appeal — CP chemistry & shipper fandom  (${hasHighChemCP ? '+10%' : '+4%'} win chance)`,
              effect: (s, d) => resolveShowdown(fanAppealBonus,   s, d) },
          ],
        } } })
        pushEventLog(dispatch,
          `⚔️ Showdown vs ${rival.name} this week! Base win: ${Math.round(baseWinChance * 100)}% — choose your strategy.`,
          'pink', week)
      }
    }

    // ── 5.7 Audition week (every 4 weeks) ────────────────────────────────────
    if (week > 0 && week % 4 === 0) {
      const unsigned = state.actors.filter(
        a => !a.signed && state.unlockedTiers.includes(a.tier)
      )
      if (unsigned.length > 0) {
        const shuffled   = [...unsigned].sort(() => Math.random() - 0.5)
        const candidates = shuffled.slice(0, Math.min(3, shuffled.length))
        dispatch({ type: A.PUSH_MODAL, modal: { type: 'audition', data: { candidates } } })
        pushEventLog(dispatch,
          `🎭 Audition week! ${candidates.length} candidate(s) seeking contracts.`, 'pink', week)
      }
    }

    // ── 6. Label rank update ─────────────────────────────────────────────────
    const newRank = calcRank(state.reputation, state.popularity)
    if (newRank.id !== state.rank) {
      dispatch({ type: A.SET_RANK, rank: newRank.id })
      pushEventLog(dispatch, `Studio ranked up to ${newRank.label}! 🎉`, 'gold', week)
      dispatch({ type: A.PUSH_MODAL, modal: { type: 'rankUp', data: { rank: newRank } } })
    }

    // ── 7a. Chemistry pulse ───────────────────────────────────────────────────
    const pulse = runChemPulse(state, week)
    for (const action of pulse.actions) {
      dispatch(action)
    }
    for (const modal of pulse.modals) {
      const lbl = modal.data?.label ?? modal.data?.title ?? 'Chemistry Event'
      pushEventLog(dispatch, `[CHEM] ${lbl}`, 'pink', week)
      dispatch({ type: A.PUSH_MODAL, modal })
    }

    // ── 7a2. CP events (Prompt 2) ─────────────────────────────────────────────
    const cpEvents = rollCpEvents(state, week)
    for (const { flagKey, modal } of cpEvents) {
      dispatch({ type: A.SET_FLAG, key: flagKey, value: week })
      const lbl = modal.data?.label ?? 'CP Event'
      pushEventLog(dispatch, `[CP] ${lbl}`, 'pink', week)
      dispatch({ type: A.PUSH_MODAL, modal })
    }

    // ── 7b. Company event ─────────────────────────────────────────────────────
    const companyEvents = rollWeeklyEvents(state)
    if (companyEvents.length > 0) {
      dispatch({ type: A.SET_FLAG, key: 'lastCompanyEvent', value: week })
    }
    for (const ev of companyEvents) {
      // Challenge events (burnout, talent raid, fan backlash) carry their own cooldown flagKey
      if (ev.flagKey) dispatch({ type: A.SET_FLAG, key: ev.flagKey, value: week })
      const lbl = ev.data?.label ?? 'Company Event'
      pushEventLog(dispatch, `[EVENT] ${lbl}`, 'pink', week)
      dispatch({ type: A.PUSH_MODAL, modal: ev })
    }

    // ── 7c. Actor event ───────────────────────────────────────────────────────
    const actorEvent = rollActorEvent(state)
    if (actorEvent) {
      // Set per-event cooldown flag if provided (e.g. viral_chemistry per-actor cooldown)
      if (actorEvent.flagKey) dispatch({ type: A.SET_FLAG, key: actorEvent.flagKey, value: week })
      const lbl = actorEvent.data?.label ?? 'Actor Event'
      pushEventLog(dispatch, `[ACTOR] ${lbl}`, 'pink', week)
      dispatch({ type: A.PUSH_MODAL, modal: actorEvent })
    }

    // ── 7d. BL Awards reminder — week 48 of each year ────────────────────────
    if (weekInYear === 48) {
      const awardsYear = getYearFromWeek(week)
      const startYear = state.startYear ?? 2026
      const calendarYear = startYear + awardsYear - 1
      const flagKey    = `awardsReminder_${awardsYear}`
      if (!state.flags?.[flagKey]) {
        dispatch({ type: A.SET_FLAG, key: flagKey, value: week })
        dispatch({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
          title: '✨ BL AWARDS COMING SOON',
          message:
            `The Year ${calendarYear} BL Awards Night is in 4 weeks!\n\n`
            + `Prepare your productions — the industry is watching.\n`
            + `Make sure your actors are in top form and your recent work shines.`,
          isAwardMessage: true,
        } } })
        pushEventLog(dispatch, `🏆 BL Awards: ceremony in 4 weeks! (Year ${calendarYear})`, 'gold', week)
      }
    }

    // ── 7e. BL Awards ceremony — week 52 of each year ────────────────────────
    if (weekInYear === 52) {
      const awardsYear   = getYearFromWeek(week)
      const startYear = state.startYear ?? 2026
      const calendarYear = startYear + awardsYear - 1
      const awardsResult = computeAllAwards(state, week, extraHistoryRecords)
      dispatch({ type: A.SET_AWARDS_DATA, data: awardsResult })
      // Track AotY winner for consecutive-win penalty next year
      const aotYResult = awardsResult.results.find(r => r.awardId === 'actor_of_year')
      dispatch({
        type: A.SET_FLAG, key: 'lastAotYWinner',
        value: aotYResult?.winner?.isPlayer ? (aotYResult.winner.actorName ?? null) : null,
      })
      dispatch({ type: A.PUSH_MODAL, modal: {
        type: 'event',
        data: {
          label: `✨ BL AWARDS NIGHT — YEAR ${calendarYear} ✨`,
          message:
            `The Year ${calendarYear} BL Awards Night has arrived!\n\n`
            + `Your productions, actors, and studio are all under the spotlight.\n\n`
            + `Will you attend the ceremony? Attending boosts visibility but comes with risk.`,
          choices: [
            {
              label: '✨ ATTEND THE CEREMONY',
              effect: (s, d) => d({ type: A.SET_AWARDS_PHASE, phase: 'ceremony', attended: true }),
            },
            {
              label: '📺 SKIP — WATCH FROM HOME',
              effect: (s, d) => d({ type: A.SET_AWARDS_PHASE, phase: 'summary', attended: false }),
            },
          ],
        },
      } })
      pushEventLog(dispatch, `✨ BL Awards Night Year ${calendarYear} — the ceremony begins!`, 'gold', week)
    }

    // ── 8. Advance week ───────────────────────────────────────────────────────
    dispatch({ type: A.ADVANCE_WEEK })
    pushToast(dispatch, `Week ${state.week + 1} begins.`)

    } finally {
      setAdvancing(false)
    }
  }

  return { advanceWeek, advancing }
}
