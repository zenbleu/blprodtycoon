import { TIER_ORDER } from './actors.js'

/**
 * chemistry.js — Pair chemistry system
 *
 * Storage: actor.chemistry_map[otherActorId] = 0-100
 *
 * Formulas (Prompt 2 spec):
 *   base  = random(0-30) + (shared characteristics × 20)  ← set at initChemistry()
 *   live  = base + (shared_prods × 2) + ((avg_happiness - 60) × 0.15)
 *
 * Chemistry deltas at wrap:
 *   +5   successful production
 *   +10  both leads happy (happiness > 70) at wrap
 *   -15  scandal on set
 *   -20  forced while unhappy (happiness < 30)
 *   +1.5 per filming week (+2.5 for Fixed CPs)
 */

// ─── Chemistry tiers ──────────────────────────────────────────────────────────
export const CHEM_TIERS = [
  { min: 0,  label: 'Strangers',  color: '#6E6390', emoji: '❓' },
  { min: 10, label: 'Colleagues', color: '#9B86C4', emoji: '🤝' },
  { min: 30, label: 'Friends',    color: '#6BC5FF', emoji: '😊' },
  { min: 60, label: 'Close',      color: '#5CE1A0', emoji: '💚' },
  { min: 80, label: 'BL Pair!',   color: '#FF6B9D', emoji: '💕' },
  { min: 95, label: 'Legendary',  color: '#FFD700', emoji: '💖' },
]

export function chemTier(val) {
  let tier = CHEM_TIERS[0]
  for (const t of CHEM_TIERS) {
    if (val >= t.min) tier = t
  }
  return tier
}

export function chemLabel(val) {
  const t = chemTier(val)
  return { txt: t.label, color: t.color, emoji: t.emoji }
}

// ─── Pair key (order-independent) ─────────────────────────────────────────────
export function bondKey(idA, idB) {
  const [lo, hi] = [idA, idB].sort((a, b) => a - b)
  return `${lo}_${hi}`
}

// ─── Raw stored chemistry ─────────────────────────────────────────────────────
export function getChem(actor, otherId) {
  return actor.chemistry_map?.[otherId] ?? 0
}

// Alias for legacy callers
export function getBond(actor, otherId) {
  return getChem(actor, otherId)
}

// ─── Live chemistry (adds happiness factor + shared-production bonus) ──────────
// sharedProds = number of productions these two actors have completed together
export function liveChemistry(a, b, sharedProds = 0) {
  const base      = getChem(a, b.id)
  const prodBonus = sharedProds * 2
  const mood      = (((a.happiness ?? 70) + (b.happiness ?? 70)) / 2 - 60) * 0.15
  return clamp(Math.round(base + prodBonus + mood), 0, 100)
}

// ─── Chemistry bonus for production score (0–10) ──────────────────────────────
export function calcChemistryBonus(actors) {
  if (actors.length < 2) return 0
  let total = 0, pairs = 0
  for (let i = 0; i < actors.length; i++) {
    for (let j = i + 1; j < actors.length; j++) {
      total += getChem(actors[i], actors[j].id)
      pairs++
    }
  }
  if (pairs === 0) return 0
  return Math.round((total / pairs / 100) * 10)
}

// ─── Wrap chemistry deltas ─────────────────────────────────────────────────────
// Returns array of { delta, reason } objects for display in wrap modal.
export function calcWrapDeltas(production, a1, a2) {
  const deltas = []
  const filmingWeeks = production.weeksTotal ?? 0
  const isFixed      = production.fixedCP ?? false

  // Per-week filming chemistry growth
  const weekGain = Math.round((filmingWeeks * (isFixed ? 2.5 : 1.5)) * 10) / 10
  deltas.push({ delta: weekGain, reason: `+${weekGain} filming weeks` })

  // Successful production
  deltas.push({ delta: 5, reason: '+5 successful production' })

  // Both leads happy at wrap
  if ((a1.happiness ?? 70) > 70 && (a2.happiness ?? 70) > 70) {
    deltas.push({ delta: 10, reason: '+10 both leads happy on set' })
  }

  // Scandal on set
  if (production.scandal) {
    deltas.push({ delta: -15, reason: '-15 scandal on set' })
  }

  // Forced while unhappy
  if ((a1.happiness ?? 70) < 30 || (a2.happiness ?? 70) < 30) {
    deltas.push({ delta: -20, reason: '-20 forced to work while unhappy' })
  }

  return deltas
}

// ─── Soft-cap: gains above 75 apply at 35% rate ───────────────────────────────
// This prevents chemistry from racing to 100 after only a few productions.
function applyChemCap(current, delta) {
  if (delta <= 0) return clamp(current + delta, 0, 100)   // losses are unaffected
  const CAP_THRESHOLD = 75
  const REDUCED_RATE  = 0.35
  if (current >= CAP_THRESHOLD) {
    // Entire gain is above cap — apply at reduced rate
    return clamp(current + delta * REDUCED_RATE, 0, 100)
  }
  if (current + delta > CAP_THRESHOLD) {
    // Split gain: part below cap (full rate) + part above cap (reduced rate)
    const belowPart = CAP_THRESHOLD - current
    const abovePart = delta - belowPart
    return clamp(CAP_THRESHOLD + abovePart * REDUCED_RATE, 0, 100)
  }
  return clamp(current + delta, 0, 100)
}

// ─── Apply a net chemistry delta to a pair ────────────────────────────────────
// Returns partial actor patches: { [idA]: { chemistry_map }, [idB]: { chemistry_map } }
export function applyChemistryDelta(actorA, actorB, delta) {
  const cur    = getChem(actorA, actorB.id)
  const newVal = Math.round(applyChemCap(cur, delta))
  return {
    [actorA.id]: { chemistry_map: { ...actorA.chemistry_map, [actorB.id]: newVal } },
    [actorB.id]: { chemistry_map: { ...actorB.chemistry_map, [actorA.id]: newVal } },
  }
}

// Tier-gap weekly filming gain multipliers (same table design as initChemistry)
const TIER_GAP_FILM_MULT = [1.00, 0.92, 0.84, 0.75]

// ─── Legacy: calcBondGrowth / applyBondDeltas (used by weekAdvance) ──────────
// Applies a tier-gap multiplier so cross-tier pairs grow chemistry more slowly.
export function calcBondGrowth(castActors, score, growthMult = 1) {
  const base   = 3 + Math.round(score / 20)
  const deltas = {}
  for (let i = 0; i < castActors.length; i++) {
    for (let j = i + 1; j < castActors.length; j++) {
      const a = castActors[i], b = castActors[j]
      const gap      = Math.abs(TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
      const filmMult = TIER_GAP_FILM_MULT[Math.min(gap, 3)]
      const d        = Math.round((base + Math.floor(Math.random() * 3)) * filmMult * growthMult)
      deltas[a.id] ??= {}; deltas[b.id] ??= {}
      deltas[a.id][b.id] = (deltas[a.id][b.id] ?? 0) + d
      deltas[b.id][a.id] = (deltas[b.id][a.id] ?? 0) + d
    }
  }
  return deltas
}

// Returns the updated chemistry_map for the given actor.
export function applyBondDeltas(actor, deltas) {
  if (!deltas[actor.id]) return actor.chemistry_map ?? {}
  const map = { ...(actor.chemistry_map ?? {}) }
  for (const [otherId, delta] of Object.entries(deltas[actor.id])) {
    map[otherId] = Math.round(applyChemCap(map[otherId] ?? 0, delta))
  }
  return map
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
