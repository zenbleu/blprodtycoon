/**
 * awards.js — BL Awards: pure logic for the annual ceremony
 * Runs once per in-game year at week 52.
 */
import { actorDisplayName } from './actors.js'

// ─── Award Definitions (minor first → major last) ─────────────────────────────
export const AWARD_DEFS = [
  // Minor
  { id: 'rookie_actor',         label: 'Best Rookie Actor',          category: 'minor', icon: '🌱', kind: 'actor'      },
  { id: 'rising_actor',         label: 'Rising Star Actor Award',    category: 'minor', icon: '⭐', kind: 'actor'      },
  { id: 'popular_actor',        label: 'Popular Actor Award',        category: 'minor', icon: '💫', kind: 'actor'      },
  { id: 'worldwide_actor',      label: 'Worldwide Actor Award',      category: 'minor', icon: '🌍', kind: 'actor'      },
  { id: 'best_chemistry',       label: 'Best in Chemistry',          category: 'minor', icon: '💕', kind: 'chemistry'  },
  { id: 'best_quality',         label: 'Best in Production Quality', category: 'minor', icon: '💎', kind: 'production' },
  { id: 'best_originality',     label: 'Best in Originality',        category: 'minor', icon: '✍️', kind: 'production' },
  { id: 'best_adaptation',      label: 'Best in Adaptation',         category: 'minor', icon: '🎭', kind: 'production' },
  { id: 'best_storyline',       label: 'Best in Storyline',          category: 'minor', icon: '📖', kind: 'production' },
  { id: 'best_lead_actor',      label: 'Best Lead Actor',            category: 'minor', icon: '🎬', kind: 'actor'      },
  { id: 'best_mini_series',     label: 'Best Mini Series Award',     category: 'minor', icon: '📺', kind: 'production' },
  { id: 'best_cinematography',  label: 'Best Cinematography',        category: 'minor', icon: '🎥', kind: 'production' },
  { id: 'fan_favorite_ship',    label: 'Fan Favorite Ship',          category: 'minor', icon: '⚓', kind: 'chemistry'  },
  // Major
  { id: 'series_of_year',     label: 'Series Of The Year',         category: 'major', icon: '🏆', kind: 'production' },
  { id: 'movie_of_year',      label: 'Movie Of The Year',          category: 'major', icon: '🎞️', kind: 'production' },
  { id: 'actor_of_year',      label: 'Actor Of The Year',          category: 'major', icon: '👑', kind: 'actor'      },
  { id: 'production_of_year', label: 'Production Of The Year',     category: 'major', icon: '🌟', kind: 'production' },
  { id: 'bl_of_year',         label: 'BL Of The Year',             category: 'major', icon: '💖', kind: 'production' },
  { id: 'best_company',       label: 'Best Production Company',    category: 'major', icon: '🏢', kind: 'company'    },
]

// ─── Rival actor name pool ────────────────────────────────────────────────────
export const RIVAL_ACTOR_NAMES = [
  'Ji-Hoon', 'Seun',   'Arlo',   'Rael',   'Lian',   'Zhen',
  'Yoru',    'Caius',  'Hwan',   'Dae',    'Sable',  'Noel',
  'Cael',    'Yuki',   'Roan',   'Syon',   'Lev',    'Oryn',
  'Taeil',   'Bren',   'Yael',   'Soo',    'Ikaika', 'Zev',
  'Kylen',   'Mireu',  'Sato',   'Aldric', 'Jeong',  'Wren',
  'Nox',     'Suho',   'Cain',   'Ryu',    'Elio',   'Tae',
]

const RIVAL_TITLE_POOL = [
  'Moonlight Serenade', 'Crimson Thread',    'Beyond the Stars',  'Silent Devotion',
  'The Last Letter',    'Under One Roof',    'Secret Garden',     'Two Moons',
  'Heart Protocol',     'Winter Sonata',     'The Promised Bloom','Storm Chaser',
  'Eclipse Hour',       'Golden Ratio',      'The Stolen Kiss',   'Until Dawn',
  'Parallel Hearts',    'Velvet Underground','Signal Fire',       'The Glass Prince',
  'Crimson Tide',       'Paper Stars',       'Phantom Melody',    'Wild Chrysanthemum',
  'Distant Thunder',    'The Jade Ring',     'Starfall Protocol', 'Echo Chamber',
  'Lavender Sky',       'Borrowed Time',     'The Iron Rose',     'Quiet Confession',
]

// ─── Grade helpers ────────────────────────────────────────────────────────────
const GRADE_ORDER = ['S+', 'S', 'A', 'B', 'C', 'D', 'F']
const GRADE_RANK  = Object.fromEntries(GRADE_ORDER.map((g, i) => [g, i]))

/** grade is at least as good as minimum (e.g. isGradeAtLeast('S', 'A') → true) */
function isGradeAtLeast(grade, minimum) {
  return (GRADE_RANK[grade] ?? 99) <= (GRADE_RANK[minimum] ?? 99)
}

/** Returns best grade from an array of records */
function bestGrade(records) {
  return records.reduce((best, h) =>
    (GRADE_RANK[h.grade] ?? 99) < (GRADE_RANK[best] ?? 99) ? h.grade : best, 'F')
}

// ─── Performance multiplier for actor awards ──────────────────────────────────
const PERF_MULTIPLIERS = { 'S+': 1.6, 'S': 1.3, 'A': 1.0, 'B': 0.75, 'C': 0.55, 'D': 0.35, 'F': 0.35 }
const NO_PROD_MULT = 0.2   // actor had zero qualifying productions this year

// Per-tier fame ceilings — reaching ceiling = 100% fame contribution.
// Actors below ceiling can still win but have to compensate with higher grade multiplier.
const FAME_CEILING = {
  'Rookie':      3_000,
  'Rising Star': 10_000,
  'Popular':     40_000,
  'Worldwide':   100_000,
}

// Minimum grade an actor must have achieved to be eligible for each tier award
const TIER_MIN_GRADE = {
  'Rookie':      'B',
  'Rising Star': 'A',
  'Popular':     'S',
  'Worldwide':   'S+',
}

/** Best production grade for an actor across all this-year records */
function getBestActorGrade(actorId, yearHistory) {
  const prods = yearHistory.filter(h => (h.castIds ?? []).includes(actorId))
  if (!prods.length) return null
  return bestGrade(prods)
}

/**
 * Normalized actor score (0–160 range, same scale as bumped rival ranges).
 * fame is normalized against a per-tier ceiling so raw fame numbers cannot
 * auto-win — an actor needs both sufficient fame AND a strong grade to compete.
 * Grade multiplier (0.2–1.6) pushes the effective ceiling for elite performers.
 */
function actorNormalizedScore(actor, yearHistory, homeBonus = 5) {
  const grade    = getBestActorGrade(actor.id, yearHistory)
  const mult     = grade ? (PERF_MULTIPLIERS[grade] ?? 0.35) : NO_PROD_MULT
  const ceil     = FAME_CEILING[actor.tier] ?? FAME_CEILING['Popular']
  const normFame = Math.min(1, (actor.fame ?? 0) / ceil)
  return normFame * mult * 100 + homeBonus
}

/** Count lead-role productions (in leadIds) for actorId meeting minGrade this year */
function countLeadProductions(actorId, yearHistory, minGrade) {
  return yearHistory.filter(h =>
    (h.leadIds ?? []).includes(actorId) && isGradeAtLeast(h.grade, minGrade)
  ).length
}

/** Count all productions (lead or cast) for actorId meeting minGrade this year */
function countActorProductions(actorId, yearHistory, minGrade) {
  return yearHistory.filter(h =>
    (h.castIds ?? []).includes(actorId) && isGradeAtLeast(h.grade, minGrade)
  ).length
}

// ─── Year helpers ─────────────────────────────────────────────────────────────
export function getYearFromWeek(week)  { return Math.ceil(week / 52) }
export function getYearStartWeek(year) { return (year - 1) * 52 + 1  }

/** Productions completed this year (weeks yearStart..week) */
export function getYearHistory(history, week) {
  const year  = getYearFromWeek(week)
  const start = getYearStartWeek(year)
  return (history ?? []).filter(h => h.weekCompleted >= start && h.weekCompleted <= week)
}

// ─── Eligibility helpers ──────────────────────────────────────────────────────
/** Company production eligibility: < 5 F/D grades AND < 5 BAD FIT combos this year */
export function isCompanyProductionEligible(yearHistory) {
  const badGrades = yearHistory.filter(h => h.grade === 'F' || h.grade === 'D').length
  const badCombos = yearHistory.filter(h => h.comboResult?.label === 'BAD FIT').length
  return badGrades < 5 && badCombos < 5
}

/** Actor eligibility: signed, < 2 injuries this year, never left */
export function isActorEligible(actor) {
  return !!actor.signed && (actor.injuredThisYear ?? 0) < 2 && !actor.hasLeft
}

// ─── Rival helpers ────────────────────────────────────────────────────────────
/** Pick a rival company weighted by rank (higher rank = more likely for major awards) */
function pickRivalCompany(rivals, forMajor = false) {
  const sorted = [...(rivals ?? [])].sort((a, b) => b.score - a.score)
  const pool   = forMajor ? sorted.slice(0, 15) : sorted.slice(0, 50)
  if (!pool.length) return { name: 'Studio Unknown', score: 0 }
  const weights = pool.map((_, i) => Math.max(1, pool.length - i))
  const total   = weights.reduce((s, w) => s + w, 0)
  let   r       = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[0]
}

/** Pick a rival actor name without repeating within one ceremony */
function pickRivalActorName(usedNames) {
  const available = RIVAL_ACTOR_NAMES.filter(n => !usedNames.has(n))
  const pool      = available.length > 0 ? available : RIVAL_ACTOR_NAMES
  const name      = pool[Math.floor(Math.random() * pool.length)]
  usedNames.add(name)
  return name
}

/** Pick a rival production title without repeating */
function pickRivalTitle(usedTitles) {
  const available = RIVAL_TITLE_POOL.filter(t => !usedTitles.has(t))
  const pool      = available.length ? available : RIVAL_TITLE_POOL
  const title     = pool[Math.floor(Math.random() * pool.length)]
  usedTitles.add(title)
  return title
}

/**
 * Rival actor "fame score" for a tier, scaled by rival company's leaderboard score.
 * Ranges are calibrated to match the normalized 0–160 player score scale.
 * Competition grows harder each year (+4 per year, capped at +40).
 *
 * Tier award ranges (bumped up from previous [10-35]…[70-100]):
 *   Rookie      → [25,  55]
 *   Rising Star → [45,  80]
 *   Popular     → [65,  95]
 *   Worldwide   → [80, 110]
 * Major award ranges (higher ceiling, tougher competition):
 *   BestLead    → [65,  95]
 *   AotY        → [85, 120]
 */
function rivalActorScore(tier, rivalScore, year = 1) {
  const ranges = {
    'Rookie':      [38,  65],   // raised from [25,55] — harder to win tier awards early
    'Rising Star': [52,  90],   // raised from [45,80]
    'Popular':     [65,  95],
    'Worldwide':   [80, 110],
    'BestLead':    [65,  95],
    'AotY':        [85, 120],
  }
  const [lo, hi] = ranges[tier] ?? [45, 75]
  const norm      = Math.min(1, (rivalScore ?? 100) / 1000)
  const base      = lo + (hi - lo) * norm
  const yearBoost = Math.min((year - 1) * 4, 40)
  return base + yearBoost + (Math.random() * 10 - 5)
}

// ─── Main awards computation ──────────────────────────────────────────────────
/**
 * Compute all 17 BL Awards for the current year.
 * @param {object} state        - full game state
 * @param {number} week         - current game week (52, 104, …)
 * @param {Array}  extraHistory - productions completed THIS week (not yet in state.history)
 * @returns {{ results, userWins, year }}
 *   results:  Array<{ awardId, winner: { isPlayer, name, company, actorName?, title?, extra? } }>
 *   userWins: string[]  — awardIds the player won
 *   year:     number
 */
export function computeAllAwards(state, week, extraHistory = []) {
  function getExcellenceScore(h) {
    const prodScore   = h.productionScore ?? h.baseScore ?? h.score ?? 0
    const critic      = h.criticScore ?? h.score ?? 0
    const audience    = h.audienceScore ?? h.score ?? 0
    return Math.round(prodScore * 0.4 + critic * 0.4 + audience * 0.2)
  }

  const yearHistory     = [...getYearHistory(state.history, week), ...extraHistory]
  const year            = getYearFromWeek(week)
  const companyEligible = isCompanyProductionEligible(yearHistory)
  const rivals          = [...(state.rivals ?? [])].sort((a, b) => b.score - a.score)

  const usedActorNames = new Set()
  const usedTitles     = new Set()
  yearHistory.forEach(h => { if (h.title) usedTitles.add(h.title) })

  const results  = []
  const userWins = []

  // ── Helpers ────────────────────────────────────────────────────────────────
  function playerWin(awardId, winner) {
    results.push({ awardId, winner: { isPlayer: true, ...winner } })
    userWins.push(awardId)
  }

  function rivalWin(awardId, forMajor = false) {
    const rival     = pickRivalCompany(rivals, forMajor)
    const actorName = pickRivalActorName(usedActorNames)
    const title     = pickRivalTitle(usedTitles)
    results.push({ awardId, winner: { isPlayer: false, name: rival.name, company: rival.name, actorName, title } })
  }

  const companyName = state.companyName ?? 'Your Studio'

  // Set of cast actor IDs who appeared in any this-year production
  const yearCastIds = new Set(yearHistory.flatMap(h => h.castIds ?? []))

  // ── Actor tier awards (Rookie / Rising Star / Popular / Worldwide) ──────────
  const TIERS      = ['Rookie', 'Rising Star', 'Popular', 'Worldwide']
  const TIER_AIDS  = ['rookie_actor', 'rising_actor', 'popular_actor', 'worldwide_actor']

  TIERS.forEach((tier, i) => {
    const awardId  = TIER_AIDS[i]
    const minGrade = TIER_MIN_GRADE[tier]
    const eligible = (state.actors ?? []).filter(a => a.tier === tier && isActorEligible(a))

    // Best candidate only if they meet the minimum grade threshold for this tier
    const bestUser = eligible.length > 0
      ? eligible.reduce((best, a) => (a.fame ?? 0) > (best.fame ?? 0) ? a : best, eligible[0])
      : null
    const userActorGrade = bestUser ? getBestActorGrade(bestUser.id, yearHistory) : null
    const meetsThreshold = userActorGrade && isGradeAtLeast(userActorGrade, minGrade)
    // Normalized score — same scale as bumped rival ranges (0–160)
    const userScore = bestUser && meetsThreshold
      ? actorNormalizedScore(bestUser, yearHistory, 5)
      : -1

    const topRivals = rivals.slice(0, 10)
    let bestRivalScore = -1
    let bestRivalIdx   = 0
    topRivals.forEach((r, idx) => {
      const s = rivalActorScore(tier, r.score, year)
      if (s > bestRivalScore) { bestRivalScore = s; bestRivalIdx = idx }
    })

    if (bestUser && userScore >= bestRivalScore) {
      playerWin(awardId, { name: actorDisplayName(bestUser), company: companyName, actorName: actorDisplayName(bestUser), actorId: bestUser.id })
    } else if (topRivals.length > 0) {
      const rival     = topRivals[bestRivalIdx] ?? topRivals[0]
      const actorName = pickRivalActorName(usedActorNames)
      results.push({ awardId, winner: { isPlayer: false, name: rival.name, company: rival.name, actorName } })
    } else {
      rivalWin(awardId, false)
    }
  })

  // ── Best in Chemistry (≥2 productions with chemScore ≥ 90) ──────────────────
  if (companyEligible) {
    const chemProds = yearHistory.filter(h => (h.chemScore ?? 0) >= 90)
    if (chemProds.length >= 2) {
      const best = chemProds.reduce((a, b) => (b.chemScore ?? 0) > (a.chemScore ?? 0) ? b : a)
      const leadIds = best.leadIds ?? best.castIds ?? []
      const actor1 = (state.actors ?? []).find(a => a.id === leadIds[0])
      const actor2 = (state.actors ?? []).find(a => a.id === leadIds[1])
      playerWin('best_chemistry', {
        name: companyName, company: companyName,
        actor1Id: actor1?.id, actor2Id: actor2?.id,
        actor1Name: actor1 ? actorDisplayName(actor1) : 'Unknown',
        actor2Name: actor2 ? actorDisplayName(actor2) : 'Unknown',
        chemScore: Math.round(best.chemScore ?? 0),
        title: best.title,
        extra: `Chemistry: ${Math.round(best.chemScore ?? 0)}`,
      })
    } else {
      const rival = pickRivalCompany(rivals, false)
      const a1Name = pickRivalActorName(usedActorNames)
      const a2Name = pickRivalActorName(usedActorNames)
      results.push({ awardId: 'best_chemistry', winner: { isPlayer: false, name: rival.name, company: rival.name, actor1Name: a1Name, actor2Name: a2Name, chemScore: Math.round(85 + Math.random() * 20) } })
    }
  } else {
    const rival = pickRivalCompany(rivals, false)
    const a1Name = pickRivalActorName(usedActorNames)
    const a2Name = pickRivalActorName(usedActorNames)
    results.push({ awardId: 'best_chemistry', winner: { isPlayer: false, name: rival.name, company: rival.name, actor1Name: a1Name, actor2Name: a2Name, chemScore: Math.round(85 + Math.random() * 20) } })
  }

  // ── Best in Production Quality (≥2 productions with excellenceScore ≥ 90) ───────
  if (companyEligible) {
    const qualProds = yearHistory.filter(h => getExcellenceScore(h) >= 90)
    if (qualProds.length >= 2) {
      const best = qualProds.reduce((a, b) => getExcellenceScore(b) > getExcellenceScore(a) ? b : a)
      playerWin('best_quality', { name: companyName, company: companyName, title: best.title, extra: `Excellence: ${getExcellenceScore(best)}/100` })
    } else rivalWin('best_quality', false)
  } else rivalWin('best_quality', false)

  // ── Best in Originality (≥2 series with grade S or better) ─────────────────
  if (companyEligible) {
    const origProds = yearHistory.filter(h => h.type === 'series' && isGradeAtLeast(h.grade, 'S'))
    if (origProds.length >= 2) {
      const best = origProds.reduce((a, b) => (GRADE_RANK[a.grade] ?? 99) < (GRADE_RANK[b.grade] ?? 99) ? a : b)
      playerWin('best_originality', { name: companyName, company: companyName, title: best.title, extra: `Grade: ${best.grade}` })
    } else rivalWin('best_originality', false)
  } else rivalWin('best_originality', false)

  // ── Best in Adaptation (≥2 movies with grade S or better) ───────────────────
  if (companyEligible) {
    const adaptProds = yearHistory.filter(h => h.type === 'movie' && isGradeAtLeast(h.grade, 'S'))
    if (adaptProds.length >= 2) {
      const best = adaptProds.reduce((a, b) => (GRADE_RANK[a.grade] ?? 99) < (GRADE_RANK[b.grade] ?? 99) ? a : b)
      playerWin('best_adaptation', { name: companyName, company: companyName, title: best.title, extra: `Grade: ${best.grade}` })
    } else rivalWin('best_adaptation', false)
  } else rivalWin('best_adaptation', false)

  // ── Best in Storyline (≥3 PERFECT combos this year) ─────────────────────────
  if (companyEligible) {
    const perfectProds = yearHistory.filter(h => h.comboResult?.label === 'PERFECT')
    if (perfectProds.length >= 3) {
      playerWin('best_storyline', { name: companyName, company: companyName, extra: `${perfectProds.length} Perfect Combos` })
    } else rivalWin('best_storyline', false)
  } else rivalWin('best_storyline', false)

  // ── Best Lead Actor ────────────────────────────────────────────────────────
  // Requires: tier ≥ Rising Star AND ≥2 lead-role (leadIds) productions with grade ≥ A this year.
  // Score: normalized (0–160 scale). Rivals use BestLead range [65, 95].
  const LEAD_ELIGIBLE_TIERS = new Set(['Rising Star', 'Popular', 'Worldwide'])
  const yearLeadActors = (state.actors ?? []).filter(a =>
    isActorEligible(a) &&
    LEAD_ELIGIBLE_TIERS.has(a.tier) &&
    yearCastIds.has(a.id) &&
    countLeadProductions(a.id, yearHistory, 'A') >= 2
  )
  const bestLead = yearLeadActors.length > 0
    ? yearLeadActors.reduce((best, a) =>
        actorNormalizedScore(a, yearHistory, 0) > actorNormalizedScore(best, yearHistory, 0) ? a : best,
        yearLeadActors[0])
    : null
  const userLeadScore = bestLead ? actorNormalizedScore(bestLead, yearHistory, 5) : -1

  const top5Rivals = rivals.slice(0, 5)
  let bestRivalLeadScore = -1, bestRivalLeadIdx = 0
  top5Rivals.forEach((r, idx) => {
    const s = rivalActorScore('BestLead', r.score, year)
    if (s > bestRivalLeadScore) { bestRivalLeadScore = s; bestRivalLeadIdx = idx }
  })

  if (bestLead && userLeadScore >= bestRivalLeadScore) {
    playerWin('best_lead_actor', { name: actorDisplayName(bestLead), company: companyName, actorName: actorDisplayName(bestLead), actorId: bestLead.id })
  } else if (top5Rivals.length > 0) {
    const rival     = top5Rivals[bestRivalLeadIdx] ?? top5Rivals[0]
    const actorName = pickRivalActorName(usedActorNames)
    results.push({ awardId: 'best_lead_actor', winner: { isPlayer: false, name: rival.name, company: rival.name, actorName } })
  } else {
    rivalWin('best_lead_actor', false)
  }

  // ── Best Mini Series (best mini_series with grade S or S+) ─────────────────
  if (companyEligible) {
    const miniSeries = yearHistory.filter(h => h.type === 'mini_series' && isGradeAtLeast(h.grade, 'S'))
    if (miniSeries.length >= 1) {
      const best = miniSeries.reduce((a, b) => (GRADE_RANK[a.grade] ?? 99) < (GRADE_RANK[b.grade] ?? 99) ? a : b)
      playerWin('best_mini_series', { name: companyName, company: companyName, title: best.title, extra: `Grade: ${best.grade}` })
    } else rivalWin('best_mini_series', false)
  } else rivalWin('best_mini_series', false)

  // ── Best Cinematography (best high-budget production grade ≥ A) ─────────────
  // Rewards studios that invest in high-budget Movie or Series productions.
  if (companyEligible) {
    const cinemaProds = yearHistory.filter(h =>
      (h.type === 'movie' || h.type === 'series') &&
      typeof h.budget === 'number' && h.budget >= 1.5 &&
      isGradeAtLeast(h.grade, 'A')
    )
    if (cinemaProds.length >= 1) {
      const best = cinemaProds.reduce((a, b) => getExcellenceScore(b) > getExcellenceScore(a) ? b : a)
      playerWin('best_cinematography', {
        name: companyName, company: companyName,
        title: best.title,
        extra: `Grade: ${best.grade} · Budget: ${best.budget}× · Excellence: ${getExcellenceScore(best)}/100`,
      })
    } else rivalWin('best_cinematography', false)
  } else rivalWin('best_cinematography', false)

  // ── Fan Favorite Ship (production with highest audience chemistry ≥ 70) ─────
  // Rewards chemistry-focused gameplay over pure stat optimisation.
  if (companyEligible) {
    const shipProds = yearHistory.filter(h => (h.chemScore ?? 0) >= 70)
    if (shipProds.length >= 1) {
      const best = shipProds.reduce((a, b) => (b.chemScore ?? 0) > (a.chemScore ?? 0) ? b : a)
      const leadIds = best.leadIds ?? best.castIds ?? []
      const actor1  = (state.actors ?? []).find(a => a.id === leadIds[0])
      const actor2  = (state.actors ?? []).find(a => a.id === leadIds[1])
      playerWin('fan_favorite_ship', {
        name: companyName, company: companyName,
        actor1Id:   actor1?.id, actor2Id: actor2?.id,
        actor1Name: actor1 ? actorDisplayName(actor1) : 'Unknown',
        actor2Name: actor2 ? actorDisplayName(actor2) : 'Unknown',
        chemScore:  Math.round(best.chemScore ?? 0),
        title:      best.title,
        extra:      `Ship Chemistry: ${Math.round(best.chemScore ?? 0)}`,
      })
    } else {
      const rival  = pickRivalCompany(rivals, false)
      const a1Name = pickRivalActorName(usedActorNames)
      const a2Name = pickRivalActorName(usedActorNames)
      results.push({ awardId: 'fan_favorite_ship', winner: { isPlayer: false, name: rival.name, company: rival.name, actor1Name: a1Name, actor2Name: a2Name, chemScore: Math.round(72 + Math.random() * 20) } })
    }
  } else {
    const rival  = pickRivalCompany(rivals, false)
    const a1Name = pickRivalActorName(usedActorNames)
    const a2Name = pickRivalActorName(usedActorNames)
    results.push({ awardId: 'fan_favorite_ship', winner: { isPlayer: false, name: rival.name, company: rival.name, actor1Name: a1Name, actor2Name: a2Name, chemScore: Math.round(72 + Math.random() * 20) } })
  }

  // ── Series Of The Year (best series with grade S+) ─────────────────────────
  if (companyEligible) {
    const splusSeries = yearHistory.filter(h => h.type === 'series' && h.grade === 'S+')
    if (splusSeries.length >= 1) {
      const best = splusSeries.reduce((a, b) => getExcellenceScore(b) > getExcellenceScore(a) ? b : a)
      playerWin('series_of_year', { name: companyName, company: companyName, title: best.title, extra: `Excellence: ${getExcellenceScore(best)}/100` })
    } else rivalWin('series_of_year', true)
  } else rivalWin('series_of_year', true)

  // ── Movie Of The Year (best movie with grade S+) ───────────────────────────
  if (companyEligible) {
    const splusMovies = yearHistory.filter(h => h.type === 'movie' && h.grade === 'S+')
    if (splusMovies.length >= 1) {
      const best = splusMovies.reduce((a, b) => getExcellenceScore(b) > getExcellenceScore(a) ? b : a)
      playerWin('movie_of_year', { name: companyName, company: companyName, title: best.title, extra: `Excellence: ${getExcellenceScore(best)}/100` })
    } else rivalWin('movie_of_year', true)
  } else rivalWin('movie_of_year', true)

  // ── Actor Of The Year ─────────────────────────────────────────────────────
  // Requires: tier ≥ Popular AND ≥2 productions (any role) with grade ≥ S this year.
  // Score: normalized (0–160 scale). Rivals use AotY range [85, 120] — the toughest in the game.
  // Consecutive-win penalty: −20% if the same actor won last year (academy wants fresh talent).
  const AOT_ELIGIBLE_TIERS = new Set(['Popular', 'Worldwide'])
  const lastAotYWinner     = state.flags?.lastAotYWinner ?? null

  const yearAotYActors = (state.actors ?? []).filter(a =>
    isActorEligible(a) &&
    AOT_ELIGIBLE_TIERS.has(a.tier) &&
    yearCastIds.has(a.id) &&
    countActorProductions(a.id, yearHistory, 'S') >= 2
  )

  function aotYScore(actor) {
    const base = actorNormalizedScore(actor, yearHistory, 5)
    // Consecutive-win penalty softened from −20% to −10% to preserve legendary eras
    return lastAotYWinner && actor.name === lastAotYWinner ? base * 0.9 : base
  }

  const bestAoY      = yearAotYActors.length > 0
    ? yearAotYActors.reduce((best, a) => aotYScore(a) > aotYScore(best) ? a : best, yearAotYActors[0])
    : null
  const userAoYScore = bestAoY ? aotYScore(bestAoY) : -1

  const top3Rivals = rivals.slice(0, 3)
  let bestRivalAoY = -1, bestRivalAoYIdx = 0
  top3Rivals.forEach((r, idx) => {
    const s = rivalActorScore('AotY', r.score, year)
    if (s > bestRivalAoY) { bestRivalAoY = s; bestRivalAoYIdx = idx }
  })

  if (bestAoY && userAoYScore >= bestRivalAoY) {
    playerWin('actor_of_year', { name: actorDisplayName(bestAoY), company: companyName, actorName: actorDisplayName(bestAoY), actorId: bestAoY.id })
  } else if (top3Rivals.length > 0) {
    const rival     = top3Rivals[bestRivalAoYIdx] ?? top3Rivals[0]
    const actorName = pickRivalActorName(usedActorNames)
    results.push({ awardId: 'actor_of_year', winner: { isPlayer: false, name: rival.name, company: rival.name, actorName } })
  } else {
    rivalWin('actor_of_year', true)
  }

  // ── Production Of The Year (best series or movie with grade S+) ─────────────
  if (companyEligible) {
    const splusSM = yearHistory.filter(h => (h.type === 'series' || h.type === 'movie') && h.grade === 'S+')
    if (splusSM.length >= 1) {
      const best = splusSM.reduce((a, b) => getExcellenceScore(b) > getExcellenceScore(a) ? b : a)
      playerWin('production_of_year', { name: companyName, company: companyName, title: best.title, extra: `Excellence: ${getExcellenceScore(best)}/100` })
    } else rivalWin('production_of_year', true)
  } else rivalWin('production_of_year', true)

  // ── BL Of The Year (best overall production with grade S+) ─────────────────
  if (companyEligible) {
    const splusAll = yearHistory.filter(h => h.grade === 'S+')
    if (splusAll.length >= 1) {
      const best = splusAll.reduce((a, b) => getExcellenceScore(b) > getExcellenceScore(a) ? b : a)
      playerWin('bl_of_year', { name: companyName, company: companyName, title: best.title, extra: `Excellence: ${getExcellenceScore(best)}/100` })
    } else rivalWin('bl_of_year', true)
  } else rivalWin('bl_of_year', true)

  // ── Best Production Company (this year: ≥2 A, ≥2 S, ≥1 S+) ────────────────
  if (companyEligible) {
    const gradeA  = yearHistory.filter(h => h.grade === 'A').length
    const gradeS  = yearHistory.filter(h => h.grade === 'S').length
    const gradeSP = yearHistory.filter(h => h.grade === 'S+').length
    if (gradeA >= 2 && gradeS >= 2 && gradeSP >= 1) {
      playerWin('best_company', { name: companyName, company: companyName })
    } else rivalWin('best_company', true)
  } else rivalWin('best_company', true)

  return { results, userWins, year }
}

// ─── Stat effects ─────────────────────────────────────────────────────────────
/**
 * Calculate reputation / popularity / fame deltas for the awards outcome.
 * scale = 1 + (wins - 1) * 0.5, min 1
 */
export function calcAttendanceEffects(attended, userWins) {
  const wins  = userWins.length
  const scale = Math.max(1, 1 + (wins - 1) * 0.5)
  if (attended && wins > 0)  return { repDelta: Math.round(8 * scale),  popDelta: Math.round(15000 * scale), fameDelta: Math.round(10 * scale) }
  if (attended && wins === 0) return { repDelta: -10, popDelta: 0,       fameDelta: 0 }
  if (!attended && wins > 0) return { repDelta: Math.round(4 * scale),  popDelta: Math.round(8000 * scale),  fameDelta: Math.round(5  * scale) }
  return { repDelta: -5, popDelta: -5000, fameDelta: 0 }
}

// ─── "Lacking area" for zero-win message ─────────────────────────────────────
export function getLackingArea(state, week) {
  const yearHistory = getYearHistory(state.history, week)
  if (!yearHistory.length) return 'production quality'

  const best = yearHistory.reduce((b, h) => (GRADE_RANK[h.grade] ?? 99) < (GRADE_RANK[b] ?? 99) ? h.grade : b, 'F')
  if ((GRADE_RANK[best] ?? 99) > (GRADE_RANK['B'] ?? 99)) return 'production quality'

  const avgScore    = yearHistory.reduce((s, h) => s + (h.score ?? 0), 0) / yearHistory.length
  if (avgScore < 70) return 'overall production scores'

  const perfectCombos = yearHistory.filter(h => h.comboResult?.label === 'PERFECT').length
  if (perfectCombos < 2) return 'genre–theme synergy'

  const highChem = yearHistory.filter(h => (h.chemScore ?? 0) >= 80).length
  if (highChem < 1) return 'actor chemistry'

  return 'pushing for S+ ratings'
}
