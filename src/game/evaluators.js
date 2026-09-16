/**
 * evaluators.js — End-of-production evaluation & feedback
 * Prompt 5: integrates the four critics into the final evaluation.
 */
import { runAllCritics } from './critics.js'
import { calcRevenue, getRatingFit, PLATFORMS, PROD_TYPES, RATINGS } from './productions.js'

// ─── Score → grade (F/D/C/B/A/S/S+ scale) ────────────────────────────────────
export function scoreGrade(score) {
  if (score >= 98) return { grade: 'S+', label: 'LEGENDARY', color: '#FF85E1' }
  if (score >= 90) return { grade: 'S',  label: 'PERFECT',   color: '#FFD700' }
  if (score >= 75) return { grade: 'A',  label: 'GREAT',     color: '#5CE1A0' }
  if (score >= 60) return { grade: 'B',  label: 'GOOD',      color: '#6BC5FF' }
  if (score >= 50) return { grade: 'C',  label: 'NEUTRAL',   color: '#9B86C4' }
  if (score >= 40) return { grade: 'D',  label: 'BAD',       color: '#FF8C42' }
  return                  { grade: 'F',  label: 'TERRIBLE',  color: '#FF5470' }
}

// ─── Popularity impact ────────────────────────────────────────────────────────
export function popularityDelta(audienceScore, revenue, prodPerformance, type, platform, rating, genre) {
  const typePop = {
    mini_series: 0.9, series: 1.2, movie: 1.5,
    // legacy
    drama: 1.2, variety: 0.8, cf: 0.6, web: 0.9, concert: 1.3,
  }
  const platformInfo = PLATFORMS.find(p => p.id === platform)
  const ratingInfo = RATINGS.find(r => r.id === rating)
  const ratingFit = getRatingFit(genre, rating)
  const basePop = (audienceScore * 0.4 + prodPerformance * 0.6) * 5
  const revBonus = Math.min(2.0, 1.0 + revenue / 100000)
  const typeMult = typePop[type] ?? 1.0
  const matureStreamingMult = platform === 'streaming' && ratingFit.isMatureFit ? 1.20 : 1.0
  return Math.round(basePop * revBonus * typeMult * (platformInfo?.popMult ?? 1.0) * (ratingInfo?.popMult ?? 1.0) * matureStreamingMult)
}

// ─── Actor XP awards ─────────────────────────────────────────────────────────
export function castXpAward(score, weeksTotal, type) {
  const xpMult = PROD_TYPES[type]?.xpMult ?? 1
  return Math.round(((score / 100) * 40 + (weeksTotal ?? 1) * 3) * xpMult)
}

// ─── Legacy critic quote (kept for backward compat / generic modal fallback) ──
const CRITIC_LINES = {
  'S+': ['「Transcendent. A new benchmark for the genre.」', '「Once in a decade — this is THAT work.」'],
  'S':  ['「A flawless production. Every frame breathes with intention.」', '「Instant classic. Award circuit guaranteed.」'],
  'A':  ['「Sharp, confident, and deeply moving in places.」', '「Audiences will talk about this for weeks.」'],
  'B':  ['「Solid, competent work. Fans will be satisfied.」', '「A crowd-pleaser that delivers on its promises.」'],
  'C':  ['「Mediocre pacing drags an otherwise decent concept.」', '「Watchable, but forgettable by next week.」'],
  'D':  ['「An unfortunate misfire. Better luck next season.」', '「Troubled production shows in every scene.」'],
  'F':  ['「A catastrophe. Questions are being asked at the top.」', '「The internet has not been kind.」'],
}

export function criticQuote(grade) {
  const lines = CRITIC_LINES[grade] ?? CRITIC_LINES['C']
  return lines[Math.floor(Math.random() * lines.length)]
}

// ─── Full evaluation summary ──────────────────────────────────────────────────
/**
 * Run all four critics and produce the complete evaluation report.
 * @param {object} args
 * @param {object} args.production
 * @param {number} args.score        — hidden Production Score (0-100)
 * @param {number} [args.revenue]    — optional pre-calculated revenue
 * @param {number} args.reputation
 * @param {Array}  args.castActors   — actor objects
 * @param {number} args.chemValue    — lead pair chemistry 0-100
 */
export function evaluateProduction({ production, score, revenue, reputation, castActors = [], chemValue = 0, tier, genreTrends = [] }) {
  const productionScore = score

  // 1. Critic Reviews (Phase 6)
  const critiqueResult = runAllCritics(production, castActors, chemValue, productionScore, tier, genreTrends)
  const criticScore = critiqueResult.finalScore

  // 2. Audience Reception (Phase 6)
  const isTrending = (genreTrends ?? []).includes(production.genre)
  const trendBonus = isTrending ? 8 : 0
  // Adaptations reward stable audience reception, offset by professional critic penalties
  const adaptationAudienceBonus = production.story === 'adaptation' ? 6 : 0
  const ratingFit = getRatingFit(production.genre, production.rating)
  const audienceScore = Math.min(100, Math.max(0, Math.round(productionScore * 0.4 + criticScore * 0.55 + trendBonus + adaptationAudienceBonus + ratingFit.audienceBonus)))

  // 3. Revenue (Phase 6)
  const budgetMult = typeof production.budget === 'number' ? production.budget : 1.0
  const calculatedRevenue = calcRevenue(audienceScore, budgetMult, production.type, production.platform ?? 'tv', tier?.revenueMod ?? 1.0, production.story)
  const finalRevenue = revenue !== undefined ? revenue : calculatedRevenue

  // 4. Studio Popularity (Phase 6)
  const popDelta = popularityDelta(audienceScore, finalRevenue, productionScore, production.type, production.platform, production.rating, production.genre)
  const platformRepMult = PLATFORMS.find(p => p.id === production.platform)?.repMult ?? 1

  const { grade, label, color } = scoreGrade(criticScore)

  return {
    grade,
    label,
    color,
    score:         criticScore,     // authoritative final critic-averaged score
    baseScore:     productionScore, // hidden skill-based score
    productionScore,                // hidden skill-based score
    criticScore,                    // critic reviews score
    audienceScore,                  // audience reception score
    revenue:       finalRevenue,    // revenue
    criticQuote:   criticQuote(grade),

    // Critic-derived deltas
    repDelta:      Math.round(critiqueResult.repDelta * platformRepMult),
    popDelta,
    xpPerActor:    castXpAward(criticScore, production.weeksTotal, production.type),

    // Four critics detail
    critics:       critiqueResult.critics,
    avgStars:      critiqueResult.avgStars,
    awarded:       critiqueResult.awarded,
    controversy:   critiqueResult.controversy,
    fanReviews:    critiqueResult.fanReviews,
    socialPosts:   critiqueResult.socialPosts,
  }
}
