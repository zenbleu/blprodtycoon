/**
 * actors.js — Actor data, stat helpers, status logic
 * 20 actors across 4 tiers: Rookie / Rising Star / Popular / Worldwide
 * Full spec: Prompt 2
 */

// ─── Skill keys (8 skills per Prompt 2) ──────────────────────────────────────
export const SKILL_KEYS = ['act', 'sing', 'dance', 'visual', 'lang', 'comedy', 'art', 'fitness']

export const SKILL_LABELS = {
  act:     'ACT',
  sing:    'SING',
  dance:   'DANCE',
  visual:  'VIS',
  lang:    'LANG',
  comedy:  'COM',
  art:     'ART',
  fitness: 'FIT',
}

// Backward-compat aliases used by older components
export const STAT_KEYS   = SKILL_KEYS
export const STAT_LABELS = SKILL_LABELS

// ─── 29 Characteristics pool ─────────────────────────────────────────────────
export const ALL_CHARACTERISTICS = [
  'Cute','Adorable','Innocent','Sweet','Playful','Charming','Handsome','Elegant',
  'Gentleman','Mature','Sexy','Charismatic','Confident','Bold','Stylish','Cool',
  'Cold','Serious','Quiet','Calm','Chic','Cheerful','Energetic','Sunshine',
  'Friendly','Optimistic','Funny','Positive','Unique',
]

// ─── Tier configuration ───────────────────────────────────────────────────────
export const TIER_STATS = {
  'Rookie':      { skillMin: 10, skillMax: 30, signMin: 100,  signMax: 300,  trainGain: 10, unlockRank: 101 },
  'Rising Star': { skillMin: 30, skillMax: 55, signMin: 400,  signMax: 800,  trainGain: 7,  unlockRank: 75  },
  'Popular':     { skillMin: 55, skillMax: 80, signMin: 1000, signMax: 2000, trainGain: 5,  unlockRank: 45  },
  'Worldwide':   { skillMin: 80, skillMax: 95, signMin: 3000, signMax: 5000, trainGain: 3,  unlockRank: 15  },
}

export const TIER_UNLOCK_RANK = {
  'Rookie': 101, 'Rising Star': 75, 'Popular': 45, 'Worldwide': 15,
}

export const TIER_ORDER = ['Rookie', 'Rising Star', 'Popular', 'Worldwide']

// Tier display colours
export const TIER_COLOR = {
  'Rookie':      '#9B86C4',
  'Rising Star': '#6BC5FF',
  'Popular':     '#FF6B9D',
  'Worldwide':   '#FFD700',
}

// ─── Portrait fallback colours (used when image fails to load) ────────────────
export const PORTRAIT_COLORS = [
  '#FF6B9D','#6BC5FF','#FFD700','#5CE1A0','#C792EA','#FF9F68',
  '#7BE0D4','#F26D6D','#A8E063','#B28DFF','#FF85AC','#68C5FF',
  '#E8C468','#6BFFB8','#FF6BD5','#8AB4FF','#FFC46B','#6BFFD4',
  '#D58AFF','#9DFF6B',
]

// ─── 20 Actor base definitions (Prompt 2 spec) ────────────────────────────────
export const ACTOR_DATA = [
  // ── ROOKIE (actor_01-05 · skills 10-30) ─────────────────────────────────────
  {
    id: 1,  name: 'Aiden',  tier: 'Rookie',      signCost: 180,
    skills: { act:22, sing:15, dance:18, visual:25, lang:12, comedy:20, art:14, fitness:19 },
    characteristics: ['Cute','Sweet','Playful'],
  },
  {
    id: 2,  name: 'Ren',    tier: 'Rookie',      signCost: 150,
    skills: { act:18, sing:24, dance:14, visual:22, lang:16, comedy:12, art:26, fitness:15 },
    characteristics: ['Quiet','Innocent','Calm'],
  },
  {
    id: 3,  name: 'Jun',    tier: 'Rookie',      signCost: 220,
    skills: { act:25, sing:13, dance:22, visual:17, lang:19, comedy:28, art:11, fitness:24 },
    characteristics: ['Cheerful','Friendly','Optimistic'],
  },
  {
    id: 4,  name: 'Kaito',  tier: 'Rookie',      signCost: 250,
    skills: { act:16, sing:26, dance:12, visual:30, lang:14, comedy:15, art:19, fitness:13 },
    characteristics: ['Handsome','Charming','Elegant'],
  },
  {
    id: 5,  name: 'Rain',   tier: 'Rookie',      signCost: 200,
    skills: { act:20, sing:17, dance:28, visual:16, lang:23, comedy:16, art:12, fitness:29 },
    characteristics: ['Unique','Cool','Bold'],
  },

  // ── RISING STAR (actor_06-10 · skills 30-55) ─────────────────────────────────
  {
    id: 6,  name: 'Kentaro', tier: 'Rising Star', signCost: 600,
    skills: { act:52, sing:38, dance:42, visual:50, lang:33, comedy:35, art:40, fitness:46 },
    characteristics: ['Handsome','Mature','Serious'],
  },
  {
    id: 7,  name: 'Ryul',    tier: 'Rising Star', signCost: 700,
    skills: { act:48, sing:32, dance:36, visual:44, lang:53, comedy:30, art:38, fitness:40 },
    characteristics: ['Cool','Charismatic','Confident'],
  },
  {
    id: 8,  name: 'Sora',    tier: 'Rising Star', signCost: 550,
    skills: { act:38, sing:52, dance:50, visual:42, lang:35, comedy:46, art:30, fitness:48 },
    characteristics: ['Cheerful','Energetic','Sunshine'],
  },
  {
    id: 9,  name: 'Haru',    tier: 'Rising Star', signCost: 480,
    skills: { act:44, sing:36, dance:30, visual:54, lang:31, comedy:40, art:48, fitness:33 },
    characteristics: ['Adorable','Gentleman','Sweet'],
  },
  {
    id: 10, name: 'Rei',     tier: 'Rising Star', signCost: 750,
    skills: { act:50, sing:40, dance:44, visual:36, lang:47, comedy:30, art:32, fitness:42 },
    characteristics: ['Cold','Serious','Stylish'],
  },

  // ── POPULAR (actor_11-15 · skills 55-80) ─────────────────────────────────────
  {
    id: 11, name: 'Kai',   tier: 'Popular', signCost: 1500,
    skills: { act:75, sing:65, dance:72, visual:80, lang:58, comedy:62, art:55, fitness:76 },
    characteristics: ['Charming','Sexy','Confident'],
  },
  {
    id: 12, name: 'Tian',  tier: 'Popular', signCost: 1800,
    skills: { act:65, sing:78, dance:68, visual:75, lang:80, comedy:57, art:62, fitness:63 },
    characteristics: ['Elegant','Stylish','Chic'],
  },
  {
    id: 13, name: 'Shin',  tier: 'Popular', signCost: 1200,
    skills: { act:80, sing:60, dance:58, visual:68, lang:62, comedy:76, art:65, fitness:72 },
    characteristics: ['Bold','Charismatic','Energetic'],
  },
  {
    id: 14, name: 'Yuan',  tier: 'Popular', signCost: 1600,
    skills: { act:70, sing:72, dance:76, visual:78, lang:74, comedy:55, art:64, fitness:68 },
    characteristics: ['Handsome','Elegant','Mature'],
  },
  {
    id: 15, name: 'Minho', tier: 'Popular', signCost: 1400,
    skills: { act:62, sing:80, dance:66, visual:72, lang:64, comedy:78, art:58, fitness:67 },
    characteristics: ['Funny','Positive','Friendly'],
  },

  // ── WORLDWIDE (actor_16-20 · skills 80-95) ─────────────────────────────────────
  {
    id: 16, name: 'Theo',  tier: 'Worldwide', signCost: 4000,
    skills: { act:93, sing:85, dance:88, visual:95, lang:80, comedy:83, art:86, fitness:91 },
    characteristics: ['Charismatic','Sexy','Confident'],
  },
  {
    id: 17, name: 'Jay',   tier: 'Worldwide', signCost: 4500,
    skills: { act:88, sing:95, dance:94, visual:90, lang:92, comedy:82, art:80, fitness:86 },
    characteristics: ['Cool','Stylish','Unique'],
  },
  {
    id: 18, name: 'Felix', tier: 'Worldwide', signCost: 3500,
    skills: { act:90, sing:83, dance:95, visual:92, lang:88, comedy:87, art:84, fitness:94 },
    characteristics: ['Energetic','Cheerful','Sunshine'],
  },
  {
    id: 19, name: 'Eliot', tier: 'Worldwide', signCost: 4200,
    skills: { act:95, sing:87, dance:82, visual:90, lang:93, comedy:80, art:89, fitness:84 },
    characteristics: ['Mature','Serious','Calm'],
  },
  {
    id: 20, name: 'Leon',  tier: 'Worldwide', signCost: 3800,
    skills: { act:85, sing:92, dance:86, visual:95, lang:82, comedy:90, art:93, fitness:88 },
    characteristics: ['Handsome','Gentleman','Charming'],
  },
]

// ─── Initialize a single actor with runtime fields ─────────────────────────────
// Rookies start signed; all other tiers require audition (Prompt 7).
// All actors start at Happy emoji state (3.5 spec).
export function initActor(data) {
  const isSigned = data.tier === 'Rookie'
  return {
    ...data,
    signed:         isSigned,
    status:         isSigned ? 'available' : 'locked',   // available | filming | resting | injured | locked
    happiness:      rndInt(78, 90),   // start at Happy (≥75) — 3.5 spec
    loyalty:        rndInt(55, 85),   // hidden from player
    idleWeeks:      0,
    injuredWeeks:   0,
    completedProds: 0,
    awards:         0,
    fame:           0,
    retainerOwed:   data.tier === 'Worldwide' ? 150 : 0,
    chemistry_map:  {},  // filled by initChemistry() after all actors are created
    // Legacy compat
    assignedTo:     null,
    level:          1,
    exp:            0,
    // Free-agent tracking
    isNewTalent:    false,
    poolId:         null,
    idleReturnCount: 0,
    // Contract Honeymoon — starting Rookies enter with a full new-recruit honeymoon
    honeymoonStartWeek: isSigned ? 1 : 0,
    honeymoonWeeks:     isSigned ? HONEYMOON_NEW_RECRUIT_WEEKS : 0,
  }
}

// ─── Tier-gap chemistry multipliers (applied at initChemistry time) ───────────
// Same-tier pairs get full random base + full shared-trait contribution.
// Each tier gap step reduces both components — cross-tier sparks are rarer.
const TIER_GAP_MULTS = [
  { random: 1.00, trait: 1.00 },   // gap 0 — same tier
  { random: 0.80, trait: 0.90 },   // gap 1 — e.g. Rookie × Rising Star
  { random: 0.60, trait: 0.78 },   // gap 2 — e.g. Rookie × Popular
  { random: 0.40, trait: 0.65 },   // gap 3 — e.g. Rookie × Worldwide
]

// ─── Build chemistry maps for all actors ──────────────────────────────────────
// Formula: base = random(0-30)×gapMult + (shared × 20)×traitMult, capped 0-100
// Must be called AFTER all actors are initActor'd.
export function initChemistry(actors) {
  const result = actors.map(a => ({ ...a, chemistry_map: {} }))
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i]
      const b = result[j]
      const shared = a.characteristics.filter(c => b.characteristics.includes(c)).length
      const gap    = Math.abs(TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
      const mult   = TIER_GAP_MULTS[Math.min(gap, 3)]
      const randomPart = Math.round(rndInt(0, 30) * mult.random)
      const traitPart  = Math.round(shared * 20 * mult.trait)
      const base   = clamp(randomPart + traitPart, 0, 100)
      result[i].chemistry_map[b.id] = base
      result[j].chemistry_map[a.id] = base
    }
  }
  return result
}

// ─── Status display ───────────────────────────────────────────────────────────
export const STATUS_LABEL = {
  available: '✅ FREE',
  filming:   '🎬 FILMING',
  resting:   '😴 RESTING',
  injured:   '🤕 INJURED',
  locked:    '🔒 LOCKED',
}

export const STATUS_COLOR = {
  available: 'var(--pink)',
  filming:   'var(--blue)',
  resting:   'var(--gold)',
  injured:   'var(--red)',
  locked:    'var(--gray)',
}

// ─── Display name — respects player's custom rename, falls back to original ────
export function actorDisplayName(actor) {
  return (actor && actor.customName) ? actor.customName : (actor?.name ?? '')
}

// ─── Mood emoji — surface of the hidden happiness stat ────────────────────────
export function moodEmoji(happiness) {
  if (happiness >= 75) return '😊'
  if (happiness >= 50) return '😐'
  if (happiness >= 25) return '😠'
  return '😢'
}

// ─── Portrait URL helper ──────────────────────────────────────────────────────
export function portraitUrl(actorId, base = '') {
  const padded = String(actorId).padStart(2, '0')
  return `${base}images/actors-portraits/Actor_${padded}.jpg`
}

// ─── Can be assigned to a production ─────────────────────────────────────────
export function canAssign(actor) {
  return actor.signed && actor.status === 'available'
}

// ─── Contract Honeymoon ───────────────────────────────────────────────────────
// HONEYMOON_*_WEEKS: grace period after signing where an actor's happiness
// cannot drop from being idle and loyalty cannot drop from happiness.
export const HONEYMOON_NEW_RECRUIT_WEEKS = 4   // brand-new actor
export const HONEYMOON_RESIGN_WEEKS      = 2   // re-signed former actor (Free Agents Pool)

// Returns a patch that starts a honeymoon at `currentWeek` lasting `weeks`.
export function startHoneymoon(actor, currentWeek, weeks) {
  return {
    honeymoonStartWeek: currentWeek ?? (actor.honeymoonStartWeek ?? 0),
    honeymoonWeeks:     weeks,
    happiness:          Math.max(actor.happiness ?? 80, 80),  // enter at Happy
  }
}

// True while the contract honeymoon is still active for `actor` at `currentWeek`.
export function isHoneymoonActive(actor, currentWeek) {
  const weeks = actor.honeymoonWeeks ?? 0
  if (weeks <= 0) return false
  const start = actor.honeymoonStartWeek ?? 0
  return (currentWeek ?? 0) < start + weeks
}

// ─── Happiness state bands (must match moodEmoji) ─────────────────────────────
//   Happy   ≥ 75   😊
//   Neutral 50–74  😐
//   Sad     25–49  😠   ← loyalty decline begins
//   Angry   0–24   😢   ← loyalty decline accelerates
export const HAPPY_MIN = 75
export const NEUTRAL_MIN = 50
export const SAD_MIN = 25

// Per-week idle happiness decay, scaled by actor tier.
// Higher-tier actors have greater expectations and sour faster.
const IDLE_HAPPINESS_DECAY_BY_TIER = {
  'Rookie':      3,
  'Rising Star': 4,
  'Popular':     5,
  'Worldwide':   6,
}

// ─── Weekly actor tick (called on NEXT WEEK) ──────────────────────────────────
// Happiness-driven loyalty: loyalty begins declining once happiness reaches Sad
// and declines much faster once happiness reaches Angry.
// tier: result of getGameTier(week) — pass from weekAdvance.
// currentWeek: the week this tick runs for (drives honeymoon expiry).
export function weeklyActorTick(actor, tier, currentWeek) {
  const patch = {}
  const week = currentWeek ?? 0
  const honeymoon = isHoneymoonActive(actor, week)

  if (actor.status === 'filming') {
    // Slight happiness drain while working hard
    patch.happiness = clamp((actor.happiness ?? 70) - 2, 0, 100)
    // +5 loyalty per week while in active production
    patch.loyalty = clamp((actor.loyalty ?? 60) + 5, 0, 100)
    patch.activeFilmingWeeks = (actor.activeFilmingWeeks ?? 0) + 1
    // If actor was Happy before going idle, restore to Happy after 4 filming weeks
    if (actor.wasHappyBeforeIdle && (actor.activeFilmingWeeks ?? 0) >= 4) {
      patch.happiness = Math.max(patch.happiness ?? 0, 80)
      patch.wasHappyBeforeIdle = false
    }
  } else if (actor.status === 'resting') {
    patch.happiness = clamp((actor.happiness ?? 70) + 5, 0, 100)
    patch.idleWeeks = 0
    patch.activeFilmingWeeks = 0
  } else if (actor.status === 'available') {
    const idle = (actor.idleWeeks ?? 0) + 1
    patch.idleWeeks = idle
    patch.activeFilmingWeeks = 0
    let h = actor.happiness ?? 70
    let l = actor.loyalty ?? 60

    if (actor.subActivity === 'training') {
      patch.happiness = Math.min(100, h + 2)
      const actSkill = actor.skills?.act ?? 0
      patch.skills = {
        ...(actor.skills ?? {}),
        act: Number(Math.min(95, actSkill + 0.2).toFixed(1))
      }
    } else if (actor.subActivity === 'fan_meeting') {
      patch.happiness = Math.min(100, h + 4)
      patch.loyalty = Math.min(100, l + 1)
    } else {
      if (honeymoon) {
        // Contract Honeymoon: happiness cannot decrease from being idle,
        // and loyalty cannot decrease from happiness.
        patch.happiness = Math.round(h)
      } else {
        // ── Idle happiness decay — scales by actor's own tier ──────────────
        const decay = IDLE_HAPPINESS_DECAY_BY_TIER[actor.tier] ?? 3
        h = clamp(h - decay, 0, 100)
        patch.happiness = Math.round(h)

        // ── Loyalty decline driven by happiness state ──────────────────────
        // Sad (25–49): loyalty begins to decline.
        // Angry (0–24): loyalty declines much faster.
        if (h < NEUTRAL_MIN) {
          const loyaltyDrop = h < SAD_MIN ? 8 : 4   // Angry: 8, Sad: 4
          l = clamp(l - loyaltyDrop, 0, 100)
          patch.loyalty = Math.round(l)
        }
      }
    }
  } else if (actor.status === 'injured') {
    const weeks = Math.max(0, (actor.injuredWeeks ?? 1) - 1)
    patch.injuredWeeks = weeks
    if (weeks === 0) patch.status = 'available'
  }

  return patch
}

// ─── New Talent Pool (Type B free agents) — 5 per tier ────────────────────────
export const NEW_TALENT_POOL = [
  // Rookie new talents
  { poolId: 'nt_r01', tier: 'Rookie',      name: 'Jinu',   signCost: 160,
    portraitFile: 'Jinu_Rookie.jpg',
    skills: { act:20, sing:18, dance:16, visual:24, lang:14, comedy:18, art:16, fitness:20 },
    characteristics: ['Cheerful','Friendly','Optimistic'] },
  { poolId: 'nt_r02', tier: 'Rookie',      name: 'Maki',   signCost: 140,
    portraitFile: 'Maki_Rookie.jpg',
    skills: { act:17, sing:22, dance:20, visual:18, lang:18, comedy:14, art:24, fitness:16 },
    characteristics: ['Calm','Innocent','Sweet'] },
  { poolId: 'nt_r03', tier: 'Rookie',      name: 'Jihoon', signCost: 200,
    portraitFile: 'Jihoon_Rookie.jpg',
    skills: { act:24, sing:14, dance:26, visual:16, lang:20, comedy:26, art:12, fitness:22 },
    characteristics: ['Playful','Energetic','Unique'] },
  { poolId: 'nt_r04', tier: 'Rookie',      name: 'Jaemin', signCost: 230,
    portraitFile: 'Jaemin_Rookie.jpg',
    skills: { act:15, sing:28, dance:13, visual:28, lang:12, comedy:16, art:20, fitness:14 },
    characteristics: ['Handsome','Elegant','Charming'] },
  { poolId: 'nt_r05', tier: 'Rookie',      name: 'Yoshi',  signCost: 190,
    portraitFile: 'Yoshi_Rookie.jpg',
    skills: { act:19, sing:16, dance:25, visual:15, lang:22, comedy:15, art:13, fitness:28 },
    characteristics: ['Bold','Cool','Confident'] },

  // Rising Star new talents
  { poolId: 'nt_rs01', tier: 'Rising Star', name: 'Justin',  signCost: 580,
    portraitFile: 'Justin_Rising_star.jpg',
    skills: { act:50, sing:36, dance:44, visual:48, lang:32, comedy:38, art:42, fitness:46 },
    characteristics: ['Mature','Serious','Stylish'] },
  { poolId: 'nt_rs02', tier: 'Rising Star', name: 'Haruto',  signCost: 650,
    portraitFile: 'Haruto_Rising_star.jpg',
    skills: { act:46, sing:34, dance:38, visual:42, lang:50, comedy:32, art:36, fitness:42 },
    characteristics: ['Charismatic','Confident','Cool'] },
  { poolId: 'nt_rs03', tier: 'Rising Star', name: 'Yichen',  signCost: 530,
    portraitFile: 'Yichen_Rising_star.jpg',
    skills: { act:36, sing:50, dance:48, visual:40, lang:36, comedy:44, art:32, fitness:46 },
    characteristics: ['Energetic','Sunshine','Cheerful'] },
  { poolId: 'nt_rs04', tier: 'Rising Star', name: 'Woojin',  signCost: 460,
    portraitFile: 'Woojin_Rising_star.jpg',
    skills: { act:42, sing:34, dance:32, visual:52, lang:30, comedy:38, art:46, fitness:34 },
    characteristics: ['Adorable','Gentleman','Sweet'] },
  { poolId: 'nt_rs05', tier: 'Rising Star', name: 'Hyunjin', signCost: 720,
    portraitFile: 'Hyunjin_Rising_star.jpg',
    skills: { act:48, sing:42, dance:46, visual:34, lang:45, comedy:32, art:30, fitness:44 },
    characteristics: ['Cold','Quiet','Unique'] },

  // Popular new talents
  { poolId: 'nt_p01', tier: 'Popular',     name: 'Keonho',  signCost: 1400,
    portraitFile: 'Keonho_Popular.jpg',
    skills: { act:73, sing:63, dance:70, visual:78, lang:56, comedy:60, art:54, fitness:74 },
    characteristics: ['Sexy','Confident','Bold'] },
  { poolId: 'nt_p02', tier: 'Popular',     name: 'Jake',    signCost: 1700,
    portraitFile: 'Jake_Popular.jpg',
    skills: { act:63, sing:76, dance:66, visual:73, lang:78, comedy:55, art:60, fitness:61 },
    characteristics: ['Chic','Elegant','Stylish'] },
  { poolId: 'nt_p03', tier: 'Popular',     name: 'Chen',    signCost: 1150,
    portraitFile: 'Chen_Popular.jpg',
    skills: { act:78, sing:58, dance:56, visual:66, lang:60, comedy:74, art:65, fitness:70 },
    characteristics: ['Energetic','Charismatic','Cheerful'] },
  { poolId: 'nt_p04', tier: 'Popular',     name: 'Sehun',   signCost: 1550,
    portraitFile: 'Sehun_Popular.jpg',
    skills: { act:68, sing:70, dance:74, visual:76, lang:72, comedy:53, art:62, fitness:66 },
    characteristics: ['Handsome','Mature','Calm'] },
  { poolId: 'nt_p05', tier: 'Popular',     name: 'Jaehyun', signCost: 1350,
    portraitFile: 'Jaehyun_Popular.jpg',
    skills: { act:60, sing:78, dance:64, visual:70, lang:62, comedy:76, art:56, fitness:65 },
    characteristics: ['Playful','Friendly','Positive'] },

  // Worldwide new talents
  { poolId: 'nt_w01', tier: 'Worldwide',   name: 'Ace',    signCost: 3800,
    portraitFile: 'Ace_Wordwide.jpg',
    skills: { act:91, sing:83, dance:86, visual:93, lang:78, comedy:81, art:84, fitness:89 },
    characteristics: ['Charismatic','Bold','Unique'] },
  { poolId: 'nt_w02', tier: 'Worldwide',   name: 'Haoran', signCost: 4200,
    portraitFile: 'Haoran_Worldwide.jpg',
    skills: { act:86, sing:93, dance:92, visual:88, lang:90, comedy:80, art:78, fitness:84 },
    characteristics: ['Stylish','Cool','Confident'] },
  { poolId: 'nt_w03', tier: 'Worldwide',   name: 'Jeno',   signCost: 3300,
    portraitFile: 'Jeno_Worldwide.jpg',
    skills: { act:88, sing:81, dance:93, visual:90, lang:86, comedy:85, art:82, fitness:92 },
    characteristics: ['Energetic','Sunshine','Optimistic'] },
  { poolId: 'nt_w04', tier: 'Worldwide',   name: 'Zen',    signCost: 4000,
    portraitFile: 'Zen_Worldwide.jpg',
    skills: { act:93, sing:85, dance:80, visual:88, lang:91, comedy:78, art:87, fitness:82 },
    characteristics: ['Elegant','Mature','Calm'] },
  { poolId: 'nt_w05', tier: 'Worldwide',   name: 'Akira',  signCost: 3600,
    portraitFile: 'Akira_Wordwide.jpg',
    skills: { act:83, sing:90, dance:84, visual:93, lang:80, comedy:88, art:91, fitness:86 },
    characteristics: ['Charming','Handsome','Sexy'] },
]

// Alias kept for TopBar compat
export const weeklyActorRecovery = weeklyActorTick

// ─── XP / level ───────────────────────────────────────────────────────────────
export function grantExp(actor, amount) {
  return { exp: (actor.exp ?? 0) + (amount ?? 0), level: actor.level ?? 1 }
}

export function xpToNextLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.4))
}

// ─── Tier Promotion System ─────────────────────────────────────────────────────
// Grade rank helper (local — avoids circular import from awards.js)
const _GRADE_RANK = { F: 0, D: 1, C: 2, B: 3, A: 4, S: 5, 'S+': 6 }
function _gradeAtLeast(grade, min) {
  return (_GRADE_RANK[grade] ?? -1) >= (_GRADE_RANK[min] ?? 99)
}

/**
 * Promotion requirements for each tier transition.
 * Difficulty: Rookie→Rising Star = medium, Rising Star→Popular = hard, Popular→Worldwide = extreme.
 * All numeric thresholds are checked against live actor fields + their production history.
 */
export const TIER_PROMOTION_REQ = {
  'Rookie': {          // ─── Medium ──────────────────────────────────────────
    nextTier:       'Rising Star',
    fame:           2_000,         // accumulated fame
    exp:            300,           // XP earned from productions
    completedProds: 3,             // total productions finished
    gradeAMin:      1,             // ≥1 production graded A or better
    gradeSMin:      0,             // (no S requirement at this tier)
    gradeSPMin:     0,
    awardsMin:      0,             // no award required yet
    happiness:      55,
    loyalty:        50,
  },
  'Rising Star': {     // ─── Hard ────────────────────────────────────────────
    nextTier:       'Popular',
    fame:           9_000,
    exp:            900,
    completedProds: 5,
    gradeAMin:      2,             // ≥2 graded A+ OR ≥1 graded S+
    gradeSMin:      1,             // satisfies if gradeA < 2
    gradeSPMin:     0,
    awardsMin:      1,             // at least one industry award
    happiness:      65,
    loyalty:        60,
  },
  'Popular': {         // ─── Extreme ─────────────────────────────────────────
    nextTier:       'Worldwide',
    fame:           38_000,
    exp:            2_500,
    completedProds: 8,
    gradeAMin:      0,             // (A grade not enough here)
    gradeSMin:      3,             // ≥3 graded S+ OR ≥1 graded S+
    gradeSPMin:     1,             // satisfies if gradeSCount < 3
    awardsMin:      3,
    happiness:      75,
    loyalty:        70,
  },
}

// Skill boost applied to every skill on promotion (random per-skill, capped at new tier's skillMax)
const _SKILL_BOOST_RANGE = {
  'Rookie':      { min: 15, max: 22 },   // → Rising Star
  'Rising Star': { min: 12, max: 18 },   // → Popular
  'Popular':     { min: 15, max: 25 },   // → Worldwide
}

/**
 * Check if an actor is ready for a tier promotion.
 * Returns { eligible: bool, nextTier: string|null, met: string[], unmet: string[] }.
 * Pass the full state.history array so grade checks can scan the actor's past productions.
 */
export function checkTierPromotion(actor, history) {
  const req = TIER_PROMOTION_REQ[actor.tier]
  if (!req) return { eligible: false, nextTier: null, met: [], unmet: [] }  // Worldwide — max tier

  const actorHistory  = (history ?? []).filter(h => (h.castIds ?? []).includes(actor.id))
  const gradeACount   = actorHistory.filter(h => _gradeAtLeast(h.grade, 'A')).length
  const gradeSCount   = actorHistory.filter(h => _gradeAtLeast(h.grade, 'S')).length
  const gradeSPCount  = actorHistory.filter(h => h.grade === 'S+').length

  // Build individual pass/fail checks
  const checks = [
    {
      ok:    (actor.fame ?? 0) >= req.fame,
      label: `Fame ≥ ${req.fame.toLocaleString()}`,
    },
    {
      ok:    (actor.exp ?? 0) >= req.exp,
      label: `XP ≥ ${req.exp}`,
    },
    {
      ok:    (actor.completedProds ?? 0) >= req.completedProds,
      label: `${req.completedProds}+ productions completed`,
    },
    {
      ok:    (actor.happiness ?? 0) >= req.happiness,
      label: `Happiness ≥ ${req.happiness}`,
    },
    {
      ok:    (actor.loyalty ?? 0) >= req.loyalty,
      label: `Loyalty ≥ ${req.loyalty}`,
    },
  ]

  // Grade condition — each tier uses a different combination
  if (req.gradeAMin > 0 && req.gradeSMin > 0) {
    // Rising Star→Popular: gradeA≥2 OR gradeS≥1
    checks.push({
      ok:    gradeACount >= req.gradeAMin || gradeSCount >= req.gradeSMin,
      label: `${req.gradeAMin}× Grade A+  or  ${req.gradeSMin}× Grade S+`,
    })
  } else if (req.gradeAMin > 0) {
    checks.push({
      ok:    gradeACount >= req.gradeAMin,
      label: `${req.gradeAMin}× Grade A+ production(s)`,
    })
  }
  if (req.gradeSMin > 0 && req.gradeAMin === 0) {
    // Popular→Worldwide: gradeS≥3 OR gradeS+≥1
    checks.push({
      ok:    gradeSCount >= req.gradeSMin || gradeSPCount >= req.gradeSPMin,
      label: `${req.gradeSMin}× Grade S  or  ${req.gradeSPMin}× Grade S+`,
    })
  }
  if (req.awardsMin > 0) {
    checks.push({
      ok:    (actor.awards ?? 0) >= req.awardsMin,
      label: `${req.awardsMin}+ industry award(s)`,
    })
  }

  const met   = checks.filter(c => c.ok).map(c => c.label)
  const unmet = checks.filter(c => !c.ok).map(c => c.label)
  return { eligible: unmet.length === 0, nextTier: req.nextTier, met, unmet }
}

/**
 * Build the UPDATE_ACTOR patch that applies a tier promotion.
 * Boosts every skill toward the new tier's range and gives a happiness/loyalty bump.
 */
export function applyTierPromotion(actor) {
  const req = TIER_PROMOTION_REQ[actor.tier]
  if (!req) return {}

  const boost     = _SKILL_BOOST_RANGE[actor.tier] ?? { min: 10, max: 15 }
  const nextStats = TIER_STATS[req.nextTier] ?? TIER_STATS['Worldwide']

  const newSkills = {}
  for (const key of SKILL_KEYS) {
    const current  = actor.skills?.[key] ?? 0
    const inc      = rndInt(boost.min, boost.max)
    newSkills[key] = Math.min(nextStats.skillMax, current + inc)
  }

  return {
    tier:      req.nextTier,
    skills:    newSkills,
    // Promotion boosts morale
    happiness: Math.min(100, (actor.happiness ?? 70) + 10),
    loyalty:   Math.min(100, (actor.loyalty   ?? 60) + 15),
  }
}

// ─── Stat accessor (now reads from actor.skills) ──────────────────────────────
export function effectiveStat(actor, key) {
  return actor.skills?.[key] ?? actor.stats?.[key] ?? 0
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function rndInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
