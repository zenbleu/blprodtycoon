/**
 * tiers.js — Game-week-based tier scaling system (Prompt 8)
 * Tier is determined by current game week, not company rank.
 * All balance modifiers are centralised here.
 */

export const GAME_TIERS = [
  {
    id: 'rookie',
    label: 'Rookie',
    minWeek: 0,
    maxWeek: 19,
    // CP events
    cpEventFreq: 0.30,         // was 0.50 — fewer CP events at rookie stage
    declineChemPenalty: -5,   // spec: even Rookie should feel -5 chem on decline
    declineRepPenalty: 0,
    tierPopMult: 1.0,          // tricky event pop scaling
    // Idle penalties — more lenient for rookies so actors stay happy longer
    idleHappinessThreshold: 52,
    idleLoyaltyThreshold: 60,
    penaltyTickRate: 8,
    // Financial
    freePaidRatio: 0.80,      // 80% free events
    productionCostMod: 0.70,  // −30%
    revenueMod: 1.20,         // +20%
    negotiateMod: 0.50,       // −50% cost
    // Reviews
    repLossCap: -5,           // max rep loss per review
    reviewStarBonus: 0,       // no artificial bonus — let weak actors show natural results
    // CP breakup
    cpBreakupThreshold: 5,
    // Free agents
    resignCostMult: 1.0,
  },
  {
    id: 'rising',
    label: 'Rising Star',
    minWeek: 20,
    maxWeek: 49,
    cpEventFreq: 0.45,
    declineChemPenalty: -5,
    declineRepPenalty: -5,
    tierPopMult: 1.2,
    idleHappinessThreshold: 32,
    idleLoyaltyThreshold: 48,
    penaltyTickRate: 6,
    freePaidRatio: 0.70,
    productionCostMod: 0.85,
    revenueMod: 1.10,
    negotiateMod: 0.75,
    repLossCap: -10,
    reviewStarBonus: 0.1,
    cpBreakupThreshold: 10,
    resignCostMult: 1.25,
  },
  {
    id: 'popular',
    label: 'Popular',
    minWeek: 50,
    maxWeek: 99,
    cpEventFreq: 0.40,
    declineChemPenalty: -8,
    declineRepPenalty: -10,
    tierPopMult: 1.5,
    idleHappinessThreshold: 28,
    idleLoyaltyThreshold: 42,
    penaltyTickRate: 5,
    freePaidRatio: 0.60,
    productionCostMod: 1.0,
    revenueMod: 1.0,
    negotiateMod: 1.0,
    repLossCap: -15,
    reviewStarBonus: 0,
    cpBreakupThreshold: 15,
    resignCostMult: 1.50,
  },
  {
    id: 'worldwide',
    label: 'Worldwide',
    minWeek: 100,
    maxWeek: Infinity,
    cpEventFreq: 0.35,
    declineChemPenalty: -15,
    declineRepPenalty: -15,
    tierPopMult: 2.0,
    idleHappinessThreshold: 24,
    idleLoyaltyThreshold: 36,
    penaltyTickRate: 4,
    freePaidRatio: 0.50,
    productionCostMod: 1.10,
    revenueMod: 1.0,
    negotiateMod: 1.25,
    repLossCap: -20,
    reviewStarBonus: 0,
    cpBreakupThreshold: 20,
    resignCostMult: 2.0,
  },
]

/** Returns the tier config for the given game week (legacy — week-based). */
export function getGameTier(week) {
  return GAME_TIERS.find(t => week >= t.minWeek && week <= t.maxWeek) ?? GAME_TIERS[0]
}

/** Returns the next tier config by week (or null if at max tier). */
export function getNextGameTier(week) {
  const idx = GAME_TIERS.findIndex(t => week >= t.minWeek && week <= t.maxWeek)
  return idx >= 0 && idx < GAME_TIERS.length - 1 ? GAME_TIERS[idx + 1] : null
}

/**
 * Rank-based tier lookup — expanded to 101-slot leaderboard.
 * Tier progression gates (out of 100 rivals + player = 101 total):
 *   Rookie      → rank 76–101  (rank > 75)
 *   Rising Star → rank 46–75   (rank ≤ 75)
 *   Popular     → rank 16–45   (rank ≤ 45)
 *   Worldwide   → rank 1–15    (rank ≤ 15)
 * Matches TIER_UNLOCK_RANK in actors.js exactly.
 */
export function getGameTierByRank(numericRank) {
  if (numericRank <= 15) return GAME_TIERS[3]  // Worldwide
  if (numericRank <= 45) return GAME_TIERS[2]  // Popular
  if (numericRank <= 75) return GAME_TIERS[1]  // Rising Star
  return GAME_TIERS[0]                          // Rookie
}

/** Returns the next tier config by rank, or null at Worldwide. */
export function getNextGameTierByRank(numericRank) {
  const current = getGameTierByRank(numericRank)
  const idx     = GAME_TIERS.findIndex(t => t.id === current.id)
  return idx >= 0 && idx < GAME_TIERS.length - 1 ? GAME_TIERS[idx + 1] : null
}

/** Numeric rank threshold at which the next tier unlocks (for TopBar display). */
export function getNextTierRankThreshold(numericRank) {
  if (numericRank <= 15) return null  // already at max (Worldwide)
  if (numericRank <= 45) return 15    // Popular → Worldwide
  if (numericRank <= 75) return 45    // Rising Star → Popular
  return 75                           // Rookie → Rising Star
}
