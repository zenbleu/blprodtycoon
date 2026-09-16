/**
 * ranking.js — Studio rank system + rival leaderboard
 * Prompt 7: 49 rival companies, numeric rank (1–50), showdown every 10 weeks
 */

// ─── Label ranks (reputation + popularity milestones) ────────────────────────
export const RANKS = [
  { id: 'INDIE',      label: 'Indie Studio',    repMin: 0,   popMin: 0,       color: '#9B86C4' },
  { id: 'RISING',     label: 'Rising Star',      repMin: 20,  popMin: 5000,    color: '#6BC5FF' },
  { id: 'REGIONAL',   label: 'Regional Name',    repMin: 35,  popMin: 30000,   color: '#5CE1A0' },
  { id: 'NATIONAL',   label: 'National Studio',  repMin: 50,  popMin: 120000,  color: '#FF6B9D' },
  { id: 'PREMIER',    label: 'Premier House',    repMin: 65,  popMin: 400000,  color: '#FF6B9D' },
  { id: 'LEGENDARY',  label: 'Legendary Studio', repMin: 80,  popMin: 1200000, color: '#FFD700' },
]

export function calcRank(reputation, popularity) {
  let current = RANKS[0]
  for (const r of RANKS) {
    if (reputation >= r.repMin && popularity >= r.popMin) current = r
  }
  return current
}

export function rankProgress(reputation, popularity) {
  const idx = RANKS.findIndex(r => r.id === calcRank(reputation, popularity).id)
  if (idx >= RANKS.length - 1) return 1
  const next   = RANKS[idx + 1]
  const repPct = Math.min(reputation / next.repMin, 1)
  const popPct = Math.min(popularity / next.popMin, 1)
  return Math.min((repPct + popPct) / 2, 1)
}

// ─── 99 rival studio names ────────────────────────────────────────────────────
const RIVAL_NAME_POOL = [
  // Weak starters
  'Starlight Fansubs', 'Pink Noodle Films', 'Rookies United', 'Sakura Amateur BL',
  'Peach Blossom Co.', 'Clover Leaf Studio', 'Tiny Wave Media', 'Dusk Hour Films',
  'Sunflower Indie BL', 'Morning Dew Studio',
  'Daydream Indie Films', 'Cherry Blossom BL', 'Rainbow Debut Studio', 'Pastel Sky Media',
  'Novice Heart Films', 'First Step BL Co.', 'Gentle Breeze Studio', 'Wandering Star Films',
  'Petal Drop Media', 'Fresh Bloom BL',
  // Rising competition
  'Azure Crescent Media', 'Silver Petal Films', 'Jade Moon BL', 'Lotus Gate Studios',
  'Crimson Thread Co.', 'Velvet Sky Films', 'Neon Lantern BL', 'Crystal Arc Media',
  'Twilight Bloom Studio', 'Indigo River Films', 'Ember Coast BL', 'Sapphire Wind Media',
  'Autumn Haze BL', 'Mirror Lake Films', 'Copper Bell Media', 'Frosted Peak Studio',
  'Willow Stream BL', 'Glacier Point Films', 'Amber Dusk Media', 'Terra Nova BL',
  'Pacific Rim Studio', 'Coral Tide Films', 'Drift Wood BL', 'Moonlit Shore Media',
  'Harbor Light Films', 'Canyon Echo BL', 'Prairie Wind Studio',
  // National players
  'Moonrise Productions', 'Diamond Crest BL', 'Horizon Gate Films', 'Ivory Tower Media',
  'Vermillion Peak Studios', 'Golden Thread BL', 'Opal Wave Films', 'Celestial Gate Media',
  'Aurora Summit Studio', 'Storm Blossom BL',
  'Radiant Arc Films', 'Sterling Cross BL', 'Cobalt Peak Media', 'Prism Gate Studio',
  'Thunder Heart BL', 'Iron Blossom Films', 'Obsidian Sky Media', 'Platinum Wave BL',
  'Granite Peak Studio', 'Onyx River Films', 'Topaz Crown BL', 'Beryl Summit Media',
  // Premier studios
  'Pinnacle BL Studios', 'Dynasty Rose Films', 'Eclipse Crown Media', 'Zenith Wave BL',
  'Meridian Star Productions', 'Nexus Heart Films', 'Apex Blossom Studio', 'Crown Jewel BL',
  'Sovereign Media Group',
  'Imperial BL Studios', 'Colosseum Heart Films', 'Prestige Wave BL', 'Vanguard Star Media',
  'Dominion BL Films', 'Citadel Heart Studio', 'Paramount BL Group', 'Fortress Crown Media',
  // Elite rivals
  'Legend Arc Productions', 'Titan BL Entertainment', 'Olympus Heart Films',
  'Celestia Grand Media', 'Apex Dynasty BL', 'Nova Crown Studios',
  'Empire Heart Productions', 'Grandeur BL Films', 'Ultimate Star Media',
  'Immortal BL Studios', 'Transcendent Heart Films', 'Infinite Crown Media',
  'Absolute Star BL', 'Eternal Dynasty Films',
]

// ─── Generate 99 rivals with seeded scores ────────────────────────────────────
// Score distribution covers the full player progression arc.
// player score at start ≈ 20  (rep 10 × 2 = 20, rest 0)  → rank #101 of 100
// player score at Legendary ≈ 950,000 (ceiling of rival pool)
export function generateRivals() {
  return RIVAL_NAME_POOL.map((name, i) => {
    // exponential spread (exponent 2.0): more rivals in mid-range, harder top end
    const t     = i / 98                 // 0 → 1 across 99 rivals
    const score = Math.round(100 + Math.pow(t, 2.0) * 950000)
    return { id: i + 1, name, score }
  }).sort(() => Math.random() - 0.5)    // shuffle so tiers aren't grouped by name
}

// ─── Player score formula (spec: rep×2 + pop×0.8 + awards×20 + revenue/3000) ─
export function playerScore(state) {
  const totalRevenue = (state.history ?? []).reduce((s, h) => s + (h.revenue ?? 0), 0)
  return Math.round(
    state.reputation * 2 +
    state.popularity * 0.8 +
    (state.awards ?? 0) * 20 +
    totalRevenue / 3000,
  )
}

// ─── Numeric rank: position among player + 49 rivals (1 = best) ──────────────
export function computeNumericRank(state) {
  const ps          = playerScore(state)
  const rivalsAbove = (state.rivals ?? []).filter(r => r.score > ps).length
  return rivalsAbove + 1
}

// ─── Leaderboard: all 50 entries sorted, with player identified ──────────────
export function buildLeaderboard(state) {
  const ps = playerScore(state)
  const entries = [
    { id: 'player', name: state.companyName, score: ps, isPlayer: true },
    ...(state.rivals ?? []).map(r => ({
      id:       r.id,
      name:     r.name,
      score:    r.score,
      isPlayer: false,
    })),
  ]
  return entries
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function fmtPop(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function fmtMoney(n) {
  if (n < 0) return `-₩${Math.abs(n).toLocaleString()}`
  return `₩${n.toLocaleString()}`
}

export function fmtScore(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
