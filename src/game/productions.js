/**
 * productions.js — Production types, cost formulas, progress logic
 * Prompt 4: new type/schedule/platform/rating schema, combo system, title pool, CP name.
 */
import { getThemeComboResult, getTypeThemeBonus } from './themes.js'

// ─── Production types ─────────────────────────────────────────────────────────
export const PROD_TYPES = {
  mini_series: { label: 'Mini Series', icon: '📺', episodes: 8,  baseCost: 4300,  xpMult: 1.25, chemistryMult: 1.25 },
  series:      { label: 'Series',      icon: '🎭', episodes: 12, baseCost: 9000,  xpMult: 1.00, chemistryMult: 1.00 },
  movie:       { label: 'Movie',       icon: '🎬', episodes: 1,  baseCost: 19000, xpMult: 0.90, chemistryMult: 0.90 },
}

// ─── Schedules (production duration & quality multiplier) ─────────────────────
// Rebalanced to enforce strategic tradeoffs and reduce 12m dominance.
export const SCHEDULES = [
  { id: '3m',  label: '3 Months',  weeks: 12, qMult: 0.90 },
  { id: '6m',  label: '6 Months',  weeks: 24, qMult: 1.02 },
  { id: '12m', label: '12 Months', weeks: 48, qMult: 1.18 },
]

// ─── Platforms ────────────────────────────────────────────────────────────────
export const PLATFORMS = [
  { id: 'tv',        label: 'TV',        icon: '📡', reachMult: 1.15, revMult: 0.82, costMult: 0.85, repMult: 1.12, popMult: 0.95, revenueVariance: 0.05, blocksR: true  },
  { id: 'streaming', label: 'Streaming', icon: '📱', reachMult: 0.95, revMult: 1.38, costMult: 1.20, repMult: 0.96, popMult: 1.05, revenueVariance: 0.22, blocksR: false },
]

// ─── Ratings ─────────────────────────────────────────────────────────────────
export const RATINGS = [
  { id: 'pg',   label: 'PG',    popMult: 1.05 },
  { id: 'pg13', label: 'PG-13', popMult: 1.00 },
  { id: 'r',    label: 'R',     popMult: 0.98 },   // TV blocks R
]

const PG_FRIENDLY_GENRES = new Set(['School', 'Comedy', 'Slice of Life'])
const MATURE_GENRES = new Set(['Psychological', 'Thriller', 'Horror', 'Crime', 'Omegaverse', 'Post-Apocalyptic'])

export function getRatingFit(genre, rating) {
  if (rating === 'pg') return { audienceBonus: PG_FRIENDLY_GENRES.has(genre) ? 5 : 0, fanBonus: 0, socialBonus: 0, isMatureFit: false }
  if (rating === 'r') {
    const isMatureFit = MATURE_GENRES.has(genre)
    return { audienceBonus: isMatureFit ? 8 : genre === 'School' ? -8 : 0, fanBonus: isMatureFit ? 0.65 : 0, socialBonus: genre === 'School' ? -1.5 : 0, isMatureFit }
  }
  return { audienceBonus: 0, fanBonus: 0, socialBonus: 0, isMatureFit: false }
}

// ─── Genres (22 total) ────────────────────────────────────────────────────────
export const GENRES = [
  'Romance', 'Comedy', 'Slice of Life', 'School', 'Office',
  'Action', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Thriller', 'Historical', 'Sci-Fi', 'Sports', 'Crime',
  'Music', 'Idol', 'Psychological', 'Omegaverse', 'Supernatural',
  'Post-Apocalyptic', 'Coming-of-Age',
]

export const GENRE_DETAILS = {
  Romance: {
    tier: 'Starter',
    difficulty: 1,
    qualityBonus: 0.0,
    criticExpectations: 1,
    cost: 'Low',
    costMult: 0.8,
    identity: 'Emotional & Accessible',
  },
  School: {
    tier: 'Starter',
    difficulty: 1,
    qualityBonus: 0.0,
    criticExpectations: 1,
    cost: 'Low',
    costMult: 0.8,
    identity: 'Youth & Nostalgic',
  },
  Office: {
    tier: 'Starter',
    difficulty: 1,
    qualityBonus: 0.0,
    criticExpectations: 1,
    cost: 'Low',
    costMult: 0.8,
    identity: 'Mature Relationships',
  },
  Music: {
    tier: 'C',
    difficulty: 2,
    qualityBonus: 0.02,
    criticExpectations: 2,
    cost: 'Medium',
    costMult: 1.0,
    identity: 'Artistic Expression',
  },
  Sports: {
    tier: 'C',
    difficulty: 2,
    qualityBonus: 0.02,
    criticExpectations: 2,
    cost: 'Medium',
    costMult: 1.0,
    identity: 'Competition & Growth',
  },
  'Slice of Life': {
    tier: 'B',
    difficulty: 2,
    qualityBonus: 0.04,
    criticExpectations: 2,
    cost: 'Low',
    costMult: 0.8,
    identity: 'Character-Driven',
  },
  Comedy: {
    tier: 'B',
    difficulty: 2,
    qualityBonus: 0.04,
    criticExpectations: 2,
    cost: 'Medium',
    costMult: 1.0,
    identity: 'Lighthearted Entertainment',
  },
  Horror: {
    tier: 'A',
    difficulty: 4,
    qualityBonus: 0.07,
    criticExpectations: 4,
    cost: 'High',
    costMult: 1.25,
    identity: 'Fear & Suspense',
  },
  Fantasy: {
    tier: 'A',
    difficulty: 3,
    qualityBonus: 0.07,
    criticExpectations: 3,
    cost: 'High',
    costMult: 1.25,
    identity: 'Worldbuilding',
  },
  Action: {
    tier: 'A',
    difficulty: 3,
    qualityBonus: 0.07,
    criticExpectations: 3,
    cost: 'High',
    costMult: 1.25,
    identity: 'Spectacle & Excitement',
  },
  Crime: {
    tier: 'A',
    difficulty: 3,
    qualityBonus: 0.07,
    criticExpectations: 3,
    cost: 'Medium',
    costMult: 1.0,
    identity: 'Investigation',
  },
  Idol: {
    tier: 'A',
    difficulty: 3,
    qualityBonus: 0.07,
    criticExpectations: 3,
    cost: 'Medium',
    costMult: 1.0,
    identity: 'Performance & Fame',
  },
  Mystery: {
    tier: 'A',
    difficulty: 3,
    qualityBonus: 0.07,
    criticExpectations: 3,
    cost: 'Medium',
    costMult: 1.0,
    identity: 'Puzzle Solving',
  },
  Historical: {
    tier: 'S',
    difficulty: 4,
    qualityBonus: 0.10,
    criticExpectations: 4,
    cost: 'High',
    costMult: 1.25,
    identity: 'Period Authenticity',
  },
  Supernatural: {
    tier: 'S',
    difficulty: 4,
    qualityBonus: 0.10,
    criticExpectations: 4,
    cost: 'High',
    costMult: 1.25,
    identity: 'Paranormal Elements',
  },
  Psychological: {
    tier: 'S',
    difficulty: 5,
    qualityBonus: 0.10,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'Mind Games',
  },
  Omegaverse: {
    tier: 'S',
    difficulty: 5,
    qualityBonus: 0.10,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'High-Risk Niche',
  },
  'Post-Apocalyptic': {
    tier: 'S',
    difficulty: 5,
    qualityBonus: 0.10,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'Survival & Hope',
  },
  'Sci-Fi': {
    tier: 'S+',
    difficulty: 5,
    qualityBonus: 0.13,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'Innovation & Concepts',
  },
  Thriller: {
    tier: 'S+',
    difficulty: 5,
    qualityBonus: 0.13,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'Tension & Pace',
  },
  Drama: {
    tier: 'S+',
    difficulty: 5,
    qualityBonus: 0.13,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'Emotional Depth',
  },
  'Coming-of-Age': {
    tier: 'S+',
    difficulty: 5,
    qualityBonus: 0.13,
    criticExpectations: 5,
    cost: 'Very High',
    costMult: 1.5,
    identity: 'Personal Growth',
  },
}

// Default genres + what each grade unlocks (count-based — see GENRE_UNLOCK_COUNTS)
export const DEFAULT_GENRES   = ['Romance', 'School', 'Office', 'Comedy']
export const GENRE_UNLOCK_BY_GRADE = {
  C:    ['Music', 'Sports'],
  B:    ['Slice of Life', 'Comedy'],
  A:    ['Horror', 'Fantasy', 'Action', 'Crime', 'Idol', 'Mystery'],
  S:    ['Historical', 'Supernatural', 'Psychological', 'Omegaverse', 'Post-Apocalyptic'],
  'S+': ['Sci-Fi', 'Thriller', 'Drama', 'Coming-of-Age'],
}
// Productions-at-grade required to unlock that grade's genre group
export const GENRE_UNLOCK_COUNTS = {
  C:    3,
  B:    3,
  A:    4,
  S:    3,
  'S+': 2,
}

export const GENRE_EMOJI = {
  Romance:        '💕',
  Comedy:         '😂',
  'Slice of Life':'🌸',
  School:         '📚',
  Office:         '💼',
  Action:         '⚔️',
  Drama:          '🎭',
  Fantasy:        '🧙',
  Horror:         '👻',
  Mystery:        '🔍',
  Thriller:       '😱',
  Historical:     '🏯',
  'Sci-Fi':       '🚀',
  Sports:         '⚽',
  Crime:          '🔫',
  Music:          '🎵',
  Idol:           '🌟',
  Psychological:  '🧠',
  Omegaverse:         '🐺',
  Supernatural:       '🌙',
  'Post-Apocalyptic': '☢️',
  'Coming-of-Age':    '🌱',
}

// ─── Story origin ─────────────────────────────────────────────────────────────
// Original projects offer greater creative upside; adaptations trade that ceiling for consistency.
export const STORY_TYPES = [
  { id: 'original',   label: 'Original',   scoreMod: +6, revenueVariance: 0.10 },
  { id: 'adaptation', label: 'Adaptation', scoreMod: +1, revenueVariance: 0.04 },
]

// ─── Title suggestion pool ────────────────────────────────────────────────────
export const TITLE_POOL = [
  'Love on Set', 'Two Hearts One Script', 'Beyond the Curtain',
  'Our Secret Stage', 'The Leading Man', 'Autumn Leads',
  'Spotlight Romance', 'Behind the Scenes', 'Chemistry',
  'The Perfect Take', 'Falling for the Lead', 'Studio Crush',
  'Off-Script', 'The Last Episode', 'Summer Wrap',
  'Breaking the Fourth Wall', 'Candid Camera Heart', 'Under the Lights',
  'Scene Partners', 'Overtime Together', 'Final Cut',
  'The Method Actor', 'Love in the Edit', 'Golden Hour',
]

// ─── CP (couple) name generator ───────────────────────────────────────────────
export function genCpName(name1, name2) {
  if (!name1 || !name2) return ''
  const a = (name1.trim().split(' ')[0])   // take first name
  const b = (name2.trim().split(' ')[0])
  const half1 = a.slice(0, Math.ceil(a.length / 2))
  const half2 = b.slice(Math.floor(b.length / 2))
  return half1 + half2
}

// ─── Genre × Type combo system ────────────────────────────────────────────────
// Existing 5 genres unchanged. New genres follow same tier: 1.5=PERFECT, 1.0=GOOD, 0.6=BAD FIT
const COMBO_TABLE = {
  mini_series: {
    // ── Original 5 (unchanged) ──
    Romance: 1.5, Comedy: 1.5, School: 1.5, 'Slice of Life': 1.0, Office: 0.6,
    // ── New genres ──
    Action:        1.0,  // action works in any format
    Drama:         1.0,
    Fantasy:       1.0,
    Horror:        1.5,  // horror miniseries hit hard
    Mystery:       1.5,  // tight mystery perfect for short run
    Thriller:      1.0,
    Historical:    0.6,  // historical needs long runtime & budget
    'Sci-Fi':      1.0,
    Sports:        1.5,  // underdog sport arcs suit mini
    Crime:         1.5,  // crime anthologies thrive as mini
    Music:         1.5,  // music biopics & idol arcs suit mini
    Idol:          1.5,  // idol stories shine in compact format
    Psychological: 1.5,  // slow-burn tension perfect for mini
    Omegaverse:          1.5,  // fan-favorite; best in tight format
    'Post-Apocalyptic':  1.0,  // intense but world-building needs space
    'Coming-of-Age':     1.5,  // personal growth arcs suit compact format
  },
  series: {
    // ── Original 5 (unchanged) ──
    Romance: 1.5, Office: 1.5, Comedy: 1.0, 'Slice of Life': 1.0, School: 0.6,
    // ── New genres ──
    Action:        1.5,  // action series are prestige TV
    Drama:         1.5,  // dramas shine in long format
    Fantasy:       1.5,  // world-building needs full series
    Horror:        1.0,
    Mystery:       1.5,  // season-long mysteries are gripping
    Thriller:      1.5,  // slow-burn thriller = binge gold
    Historical:    1.5,  // historical epics need long runtime
    'Sci-Fi':      1.5,  // sci-fi lore needs room to breathe
    Sports:        1.0,
    Crime:         1.5,  // procedural crime thrives as series
    Music:         1.0,
    Idol:          1.5,  // idol journey suits a full season
    Psychological: 1.5,
    Omegaverse:          1.0,
    'Post-Apocalyptic':  1.5,  // epic world-building thrives in long series
    'Coming-of-Age':     1.5,  // full coming-of-age journey needs a season
  },
  movie: {
    // ── Original 5 (unchanged) ──
    Romance: 1.5, 'Slice of Life': 1.5, School: 1.0, Comedy: 1.0, Office: 0.6,
    // ── New genres ──
    Action:        1.5,  // action movies are box office gold
    Drama:         1.0,
    Fantasy:       1.0,
    Horror:        1.5,  // horror films are a classic format
    Mystery:       1.0,
    Thriller:      1.5,  // thriller films build great tension
    Historical:    1.0,
    'Sci-Fi':      1.5,  // sci-fi spectacle needs the big screen
    Sports:        1.0,
    Crime:         1.0,
    Music:         1.0,
    Idol:          0.6,  // idol story too short for full arc in film
    Psychological: 1.0,
    Omegaverse:          0.6,  // too niche & complex for film format
    'Post-Apocalyptic':  1.5,  // cinematic spectacle suits the big screen
    'Coming-of-Age':     1.0,  // works in film, but series format is richer
  },
}

export function getComboResult(type, genre) {
  const mult = COMBO_TABLE[type]?.[genre] ?? 1.0
  if (mult >= 1.5) return { label: 'PERFECT', mult: 1.5, emoji: '✨', color: 'var(--gold)' }
  if (mult <= 0.6) return { label: 'BAD FIT', mult: 0.6, emoji: '💔', color: 'var(--red)'  }
  return              { label: 'GOOD',     mult: 1.0, emoji: '💕', color: 'var(--green)' }
}

// ─── Legacy budget tiers (kept for backward compat) ───────────────────────────
export const BUDGET_TIERS = [
  { id: 'min',    label: 'Min',    mult: 0.5 },
  { id: 'standard', label: 'Standard', mult: 1.0 },
  { id: 'max',    label: 'Max',    mult: 2.0 },
]

// ─── Cost formula ─────────────────────────────────────────────────────────────
// costMod: tier-based production cost modifier (default 1.0 = no change)
export function calcCost(type, budgetMult, scheduleId, castSize, costMod = 1.0, genre = 'Romance', platform = 'tv') {
  const t = PROD_TYPES[type]
  const s = SCHEDULES.find(sc => sc.id === scheduleId)
  if (!t || !s) return 0
  const genreCostMult = GENRE_DETAILS[genre]?.costMult ?? 1.0
  const platformCostMult = PLATFORMS.find(p => p.id === platform)?.costMult ?? 1.0
  const base     = t.baseCost * budgetMult * genreCostMult
  const weekCost = base * 0.055 * s.weeks
  const castCost = castSize * 1500 * budgetMult * genreCostMult
  return Math.round((base + weekCost + castCost) * costMod * platformCostMult)
}

// ─── Revenue formula ──────────────────────────────────────────────────────────
// revenueMod: tier-based revenue modifier (default 1.0 = no change)
export function calcRevenue(audienceScore, budgetMult, type, platform, revenueMod = 1.0, story) {
  let realPlatform = platform
  let realMod = revenueMod
  let realStory = story
  if (typeof platform !== 'string') {
    // legacy call support: calcRevenue(score, budgetMult, type, reputation, platform, comboMult, revenueMod)
    realPlatform = arguments[4]
    realMod = arguments[6] ?? 1.0
    realStory = undefined
  }
  const t  = PROD_TYPES[type]
  const pf = PLATFORMS.find(p => p.id === realPlatform)
  if (!t) return 0
  const baseRevenue = t.baseCost * budgetMult * 3.5
  // Soft logarithmic damping above audienceScore 85 to prevent infinite late-game cash.
  // Below 85: standard exponential curve. Above 85: linear growth at a much gentler rate.
  const cappedAudience = Math.min(audienceScore, 85)
  const overCap = Math.max(0, audienceScore - 85)
  const scoreMult = Math.pow(cappedAudience / 100, 1.3) * (1 + overCap * 0.008)
  const storyVariance = STORY_TYPES.find(st => st.id === realStory)?.revenueVariance ?? 0
  const variance = Math.min(0.35, (pf?.revenueVariance ?? 0) + storyVariance)
  const performanceMult = 1 + (Math.random() * 2 - 1) * variance
  const platMult    = pf?.revMult ?? 1.0
  return Math.round(baseRevenue * scoreMult * platMult * performanceMult * realMod)
}

// ─── Studio quality multiplier (production experience curve) ─────────────────
// Represents the studio learning its workflow: first few productions execute
// at reduced quality regardless of actor skill, improving with experience.
function studioQualityMult(productionsCompleted) {
  if (productionsCompleted <  2) return 0.75   // greenhorn — floor raised from 0.65 so early C/B grades are achievable
  if (productionsCompleted <  4) return 0.83   // finding the rhythm
  if (productionsCompleted <  7) return 0.90   // getting confident
  if (productionsCompleted < 10) return 0.96   // near-professional
  return 1.0                                   // fully experienced (reached at prod 10, was prod 15)
}

// ─── Score formula ────────────────────────────────────────────────────────────
export function calcScore(production, castActors, chemistryBonus = 0, productionsCompleted = 0) {
  if (!castActors.length) return 0

  const { type, budget, schedule, story, genre } = production
  const budgetMult = typeof budget === 'number' ? budget : 1.0
  const s = SCHEDULES.find(sc => sc.id === schedule)
  const qMult = s?.qMult ?? 1.0
  const weights = statWeightsByType(type)
  const storyMod = STORY_TYPES.find(st => st.id === story)?.scoreMod ?? 0

  let statScore = 0
  for (const actor of castActors) {
    let actorScore = 0
    for (const [stat, w] of Object.entries(weights)) {
      actorScore += (actor.skills?.[stat] ?? actor.stats?.[stat] ?? 0) * w
    }
    statScore += actorScore
  }
  statScore = statScore / castActors.length

  // Diminishing returns curve for budget to avoid dominant blockbuster strategies
  const budgetMod  = 0.80 + Math.sqrt(Math.max(0, budgetMult - 0.5)) * 0.22
  const sqMult     = studioQualityMult(productionsCompleted)
  // Chemistry modifier as a multiplicative factor (0.85 - 1.05) and a small flat contribution (+0 to +10)
  // This prevents chemistry from single-handedly carrying a low-skill production
  const chemMod    = 0.85 + (chemistryBonus / 10) * 0.20
  const baseRaw    = (statScore * budgetMod * qMult * chemMod + chemistryBonus * 1.0 + storyMod) * sqMult

  // Genre-based Redesign metrics (Difficulty execution penalty & Risk variance)
  const genreDetails = GENRE_DETAILS[genre] ?? {}
  const difficulty = genreDetails.difficulty ?? 1
  const diffPenaltyMult = 1.0 - (difficulty - 1) * 0.04
  const riskVariance = (difficulty - 1) * 0.02 * (Math.random() - 0.5)

  // Mitigate high RNG difficulty risks based on existing strategic factors (Con 3):
  // 1. Studio experience (productionsCompleted): up to 50% risk reduction at 10+ productions.
  const experienceBonus = Math.min(0.50, productionsCompleted * 0.05);
  // 2. Production quality (baseRaw): up to 35% risk reduction above 40 quality.
  const qualityDampBonus = Math.min(0.35, Math.max(0, baseRaw - 40) / 100);

  const strategicDampeningFactor = experienceBonus + qualityDampBonus; // total up to 85% dampening

  // Dampen the random risk variance:
  const dampenedRiskVariance = riskVariance * (1.0 - strategicDampeningFactor);

  // Apply difficulty and risk modifiers
  const modifiedRaw = baseRaw * (diffPenaltyMult + dampenedRiskVariance)

  // Apply Quality Bonus
  const qualityBonus = genreDetails.qualityBonus ?? 0
  const raw = modifiedRaw * (1.0 + qualityBonus)

  return Math.round(Math.max(0, Math.min(100, raw)))
}

// ─── Stat weights by type ─────────────────────────────────────────────────────
function statWeightsByType(type) {
  switch (type) {
    case 'mini_series':
      return { act:0.35, visual:0.20, comedy:0.20, sing:0.10, dance:0.08, lang:0.04, art:0.02, fitness:0.01 }
    case 'series':
      return { act:0.40, visual:0.20, comedy:0.15, sing:0.10, dance:0.08, lang:0.04, art:0.02, fitness:0.01 }
    case 'movie':
      return { act:0.45, visual:0.25, comedy:0.10, dance:0.08, sing:0.07, lang:0.03, art:0.01, fitness:0.01 }
    // Legacy types (for old saves)
    case 'drama':
      return { act:0.35, visual:0.20, comedy:0.15, sing:0.10, dance:0.10, lang:0.05, art:0.03, fitness:0.02 }
    case 'variety':
      return { comedy:0.30, dance:0.25, sing:0.20, visual:0.15, act:0.05, lang:0.03, art:0.01, fitness:0.01 }
    default:
      return { act:0.30, visual:0.25, comedy:0.15, sing:0.12, dance:0.10, lang:0.04, art:0.02, fitness:0.02 }
  }
}

// ─── Popularity delta ─────────────────────────────────────────────────────────
export function popularityDeltaByPlatform(score, platform, rating) {
  const pf  = PLATFORMS.find(p => p.id === platform)
  const rat = RATINGS.find(r => r.id === rating)
  const basePop = Math.round((score / 100) * 500)
  return Math.round(basePop * (pf?.reachMult ?? 1) * (rat?.popMult ?? 1))
}

// ─── Star rating helper ───────────────────────────────────────────────────────
export function scoreToStars(score) {
  const n = Math.round((score / 100) * 5)
  return '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 5 - n))
}

// ─── Create a new production record ──────────────────────────────────────────
export function createProduction({
  type, title, genre, theme, budget, schedule,
  platform, rating, story, castIds, leadIds,
  cpName, weekStarted, weekScheduled, genreMultiplier,
}) {
  const s = SCHEDULES.find(sc => sc.id === schedule) ?? SCHEDULES[1]
  const t = PROD_TYPES[type]
  return {
    id:               Date.now(),
    type,
    title,
    genre,
    theme:            theme          ?? '',    // narrative theme (e.g. 'Slow Burn')
    budget,           // number: budgetMult (0.5–2.5)
    schedule,         // '3m' | '6m' | '12m'
    platform:         platform ?? 'tv',
    rating:           rating   ?? 'pg13',
    story:            story    ?? 'original',
    castIds:          castIds  ?? [],
    leadIds:          leadIds  ?? [],
    cpName:           cpName   ?? '',
    status:           'active',
    phase:            'filming',  // 'filming' | 'wrap' | 'releasing' | 'done'
    weeksTotal:       s.weeks,
    weeksLeft:        s.weeks,
    progressPct:      0,
    qMult:            s.qMult,
    episodesTotal:    t?.episodes ?? 1,
    episodesReleased: 0,
    episodeRatings:   [],
    viewerCount:      0,
    comboResult:      null,       // computed at wrap
    scandal:          false,
    weekStarted:      weekStarted    ?? null,
    weekScheduled:    weekScheduled  ?? null,  // global week when filming actually begins
    genreMultiplier:  genreMultiplier ?? 1,    // 2 if 2× slot bonus was applied
  }
}

// ─── Advance production by one week ──────────────────────────────────────────
export function tickProduction(production) {
  const { phase } = production

  if (phase === 'filming') {
    const weeksLeft   = Math.max(0, production.weeksLeft - 1)
    const progressPct = Math.round(
      ((production.weeksTotal - weeksLeft) / production.weeksTotal) * 100
    )
    if (weeksLeft === 0) {
      const genreTypeCombo  = getComboResult(production.type, production.genre)
      // Pass whether the 2x slot multiplier was applied
      const isMultiplied = (production.genreMultiplier ?? 1) > 1
      const themeComboResult = getThemeComboResult(production.genre, production.theme, isMultiplied)
      const typeThemeBonus   = getTypeThemeBonus(production.type, production.theme)

      const hasTheme = !!production.theme
      const rawMult  = hasTheme
        ? (genreTypeCombo.mult + themeComboResult.mult) / 2 + typeThemeBonus
        : genreTypeCombo.mult

      const finalMult = Math.round(Math.min(2.5, Math.max(0.4, rawMult)) * 100) / 100

      const label = themeComboResult.label ?? 'GOOD'
      const emoji = themeComboResult.emoji ?? '💕'
      const color = themeComboResult.color ?? 'var(--green)'
      const fitLabel = themeComboResult.fitLabel ?? 'Good Fit'
      const comboResult = { label, mult: finalMult, emoji, color, fitLabel }

      return { weeksLeft: 0, progressPct: 100, phase: 'wrap', comboResult, status: 'active' }
    }
    return { weeksLeft, progressPct, phase: 'filming', status: 'active' }
  }

  if (phase === 'wrap') {
    // Wrap → releasing: one episode begins
    return { phase: 'releasing', episodesReleased: 0, status: 'active' }
  }

  if (phase === 'releasing') {
    const ep        = (production.episodesReleased ?? 0) + 1
    const rating    = rollEpisodeRating(production)
    const epRatings = [...(production.episodeRatings ?? []), rating]
    const viewers   = rollViewers(production, rating, ep)
    if (ep >= production.episodesTotal) {
      return { phase: 'done', episodesReleased: ep, episodeRatings: epRatings, viewerCount: viewers, status: 'completed' }
    }
    return { phase: 'releasing', episodesReleased: ep, episodeRatings: epRatings, viewerCount: viewers, status: 'active' }
  }

  return { status: 'completed' }
}

function rollEpisodeRating(production) {
  const comboMult = production.comboResult?.mult ?? 1.0
  const base = 4 + Math.random() * 4          // 4–8 base
  return Math.round(Math.min(10, Math.max(1, base * comboMult)))
}

function rollViewers(production, rating, ep) {
  const pf    = PLATFORMS.find(p => p.id === production.platform)
  const reach = pf?.reachMult ?? 1.0
  const momentum = 1 + (ep - 1) * 0.1        // slight growth each ep
  const base = 50000 + Math.random() * 100000
  return Math.round(base * reach * momentum * rating / 7)
}
