/**
 * themes.js — Theme system (29 themes, unlock progression, combo tables)
 * Redesigned in Phase 2 & 3:
 *   - Renamed old themes: Power Imbalance -> Age Gap, Comedy Relief -> Healing, Curse/Magic -> Magic
 *   - Implemented the full compatibility lookup table & hidden score thresholds
 */

// ─── All 29 themes by category ────────────────────────────────────────────────
export const THEMES = [
  // Romance (10)
  'Slow Burn', 'Forbidden Love', 'Friends-to-Lovers', 'Enemies-to-Lovers',
  'Fake Relationship', 'Secret Romance', 'Soulmates', 'Love Triangle',
  'Unrequited Love', 'Second Chance',
  // Story Twists / Supernatural (7)
  'Time Travel', 'Reincarnation', 'Amnesia', 'Body Swap',
  'Magic', 'Possession', 'Fate / Prophecy',
  // Character Dynamics (6)
  'Mentor-Student', 'Boss-Employee', 'Rivals', 'Found Family', 'Age Gap', 'Star-Crossed',
  // Tone / Vibe (6)
  'Healing', 'Angst', 'Fluffy', 'Dark', 'Bittersweet', 'Wholesome',
]

export const THEME_CATEGORIES = {
  'Romance':            ['Slow Burn', 'Forbidden Love', 'Friends-to-Lovers', 'Enemies-to-Lovers',
                         'Fake Relationship', 'Secret Romance', 'Soulmates',
                         'Love Triangle', 'Unrequited Love', 'Second Chance'],
  'Story Twists':       ['Time Travel', 'Reincarnation', 'Amnesia', 'Body Swap',
                         'Magic', 'Possession', 'Fate / Prophecy'],
  'Character Dynamics': ['Mentor-Student', 'Boss-Employee', 'Rivals',
                         'Found Family', 'Age Gap', 'Star-Crossed'],
  'Tone / Vibe':        ['Healing', 'Angst', 'Fluffy', 'Dark', 'Bittersweet', 'Wholesome'],
}

// ─── Starter themes (unlocked by default) ─────────────────────────────────────
export const DEFAULT_THEMES = [
  'Slow Burn', 'Friends-to-Lovers', 'Enemies-to-Lovers', 'Soulmates', 'Forbidden Love',
]

// ─── Grade-based unlock table ─────────────────────────────────────────────────
// Mirrors GENRE_UNLOCK_BY_GRADE in productions.js
export const THEME_UNLOCK_BY_GRADE = {
  C:    ['Second Chance', 'Love Triangle', 'Healing', 'Fluffy', 'Boss-Employee'],
  B:    ['Unrequited Love', 'Secret Romance', 'Amnesia', 'Wholesome', 'Rivals'],
  A:    ['Fake Relationship', 'Time Travel', 'Mentor-Student', 'Angst', 'Found Family'],
  S:    ['Reincarnation', 'Body Swap', 'Age Gap', 'Bittersweet', 'Magic'],
  'S+': ['Possession', 'Fate / Prophecy', 'Dark', 'Star-Crossed'],
}

// Productions-at-grade required before that grade's themes unlock
export const THEME_UNLOCK_COUNTS = {
  C:    3,
  B:    3,
  A:    4,
  S:    3,
  'S+': 2,
}

// ─── Theme emoji map ──────────────────────────────────────────────────────────
export const THEME_EMOJI = {
  'Slow Burn':                 '🔥',
  'Forbidden Love':            '🚫',
  'Friends-to-Lovers':         '🤝',
  'Enemies-to-Lovers':         '⚔️',
  'Fake Relationship':         '💍',
  'Secret Romance':            '🤫',
  'Soulmates':                 '👥',
  'Love Triangle':             '▲',
  'Unrequited Love':           '💔',
  'Second Chance':             '🔄',
  'Time Travel':               '⌛',
  'Reincarnation':             '♾️',
  'Amnesia':                   '💭',
  'Body Swap':                 '🔀',
  'Magic':                     '🪄',
  'Possession':                '👻',
  'Fate / Prophecy':           '🔮',
  'Mentor-Student':            '📖',
  'Boss-Employee':             '🏢',
  'Rivals':                    '⚡',
  'Found Family':              '💞',
  'Age Gap':                   '⚖️',
  'Star-Crossed':              '💫',
  'Healing':                   '🩹',
  'Angst':                     '😰',
  'Fluffy':                    '🌸',
  'Dark':                      '🌑',
  'Bittersweet':               '🍫',
  'Wholesome':                 '🌻',
}

// ─── Theme compatibility masterlist ───────────────────────────────────────────
const THEME_COMPAT_MAP = {
  'Slow Burn': {
    perfect: ['Romance', 'School', 'Office', 'Slice of Life', 'Drama', 'Coming-of-Age'],
    good: ['Historical', 'Fantasy', 'Sports', 'Mystery'],
    acceptable: ['Crime', 'Supernatural'],
    poor: ['Horror', 'Post-Apocalyptic'],
  },
  'Friends-to-Lovers': {
    perfect: ['School', 'Slice of Life', 'Sports', 'Music', 'Romance'],
    good: ['Office', 'Coming-of-Age'],
    acceptable: ['Historical'],
    poor: ['Horror', 'Crime'],
  },
  'Enemies-to-Lovers': {
    perfect: ['Action', 'Crime', 'Fantasy', 'School', 'Office'],
    good: ['Historical', 'Thriller'],
    acceptable: ['Sports'],
    poor: ['Slice of Life'],
  },
  'Forbidden Love': {
    perfect: ['Historical', 'Office', 'Fantasy', 'Omegaverse', 'Drama'],
    good: ['School', 'Supernatural'],
    acceptable: ['Mystery'],
    poor: ['Sports'],
  },
  'Fake Relationship': {
    perfect: ['Office', 'Comedy', 'Romance', 'Idol'],
    good: ['School', 'Slice of Life'],
    acceptable: ['Drama'],
    poor: ['Horror'],
  },
  'Secret Romance': {
    perfect: ['Office', 'Idol', 'School', 'Historical'],
    good: ['Crime', 'Fantasy'],
    acceptable: ['Mystery'],
    poor: ['Post-Apocalyptic'],
  },
  'Soulmates': {
    perfect: ['Fantasy', 'Supernatural', 'Omegaverse', 'Romance'],
    good: ['Drama', 'Historical'],
    acceptable: ['School'],
    poor: ['Crime'],
  },
  'Love Triangle': {
    perfect: ['School', 'Idol', 'Romance', 'Drama'],
    good: ['Office'],
    acceptable: ['Slice of Life'],
    poor: ['Horror'],
  },
  'Second Chance': {
    perfect: ['Drama', 'Romance', 'Office', 'Historical'],
    good: ['Fantasy'],
    acceptable: ['Slice of Life'],
    poor: ['Horror'],
  },
  'Unrequited Love': {
    perfect: ['Drama', 'School', 'Romance', 'Coming-of-Age'],
    good: ['Office'],
    acceptable: ['Sports'],
    poor: ['Action'],
  },
  'Time Travel': {
    perfect: ['Sci-Fi', 'Fantasy', 'Historical'],
    good: ['Drama', 'Mystery'],
    acceptable: ['Romance'],
    poor: ['Sports'],
  },
  'Reincarnation': {
    perfect: ['Fantasy', 'Historical', 'Supernatural'],
    good: ['Drama'],
    acceptable: ['Romance'],
    poor: ['Crime'],
  },
  'Amnesia': {
    perfect: ['Drama', 'Mystery', 'Thriller'],
    good: ['Romance'],
    acceptable: ['Crime'],
    poor: ['Sports'],
  },
  'Body Swap': {
    perfect: ['Comedy', 'Fantasy', 'School'],
    good: ['Romance'],
    acceptable: ['Office'],
    poor: ['Horror'],
  },
  'Magic': {
    perfect: ['Fantasy', 'Supernatural', 'Historical'],
    good: ['Sci-Fi'],
    acceptable: ['Romance'],
    poor: ['Crime'],
  },
  'Possession': {
    perfect: ['Horror', 'Supernatural', 'Psychological'],
    good: ['Mystery'],
    acceptable: ['Fantasy'],
    poor: ['Sports'],
  },
  'Fate / Prophecy': {
    perfect: ['Fantasy', 'Historical', 'Supernatural'],
    good: ['Drama'],
    acceptable: ['Romance'],
    poor: ['Crime'],
  },
}

export function getThemeRating(genre, theme) {
  if (!theme) return 'good'

  const normGenre = genre.trim()
  const normTheme = theme.trim()

  const dynamics = ['Boss-Employee', 'Mentor-Student', 'Rivals', 'Found Family', 'Age Gap', 'Star-Crossed']
  if (dynamics.includes(normTheme)) {
    const perfects = ['Office', 'School', 'Sports', 'Drama', 'Coming-of-Age', 'Crime', 'Action', 'Fantasy', 'Historical']
    const poors = ['Horror', 'Post-Apocalyptic', 'Sci-Fi']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }

  if (normTheme === 'Fluffy') {
    const perfects = ['Romance', 'School', 'Comedy', 'Slice of Life', 'Office']
    const poors = ['Horror', 'Post-Apocalyptic', 'Thriller', 'Drama', 'Psychological', 'Crime', 'Action']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }
  if (normTheme === 'Healing') {
    const perfects = ['Drama', 'Slice of Life', 'Sports', 'Coming-of-Age', 'Romance']
    const poors = ['Horror', 'Thriller', 'Psychological']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }
  if (normTheme === 'Angst') {
    const perfects = ['Drama', 'Historical', 'Omegaverse', 'Psychological', 'Thriller']
    const poors = ['Comedy', 'Slice of Life']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }
  if (normTheme === 'Dark') {
    const perfects = ['Horror', 'Crime', 'Psychological', 'Thriller', 'Post-Apocalyptic']
    const poors = ['Comedy', 'Slice of Life', 'Romance', 'School', 'Office']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }
  if (normTheme === 'Bittersweet') {
    const perfects = ['Drama', 'Historical', 'Romance', 'Fantasy', 'Coming-of-Age']
    const poors = ['Comedy']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }
  if (normTheme === 'Wholesome') {
    const perfects = ['School', 'Slice of Life', 'Sports', 'Music', 'Romance']
    const poors = ['Horror', 'Thriller', 'Psychological']
    if (perfects.includes(normGenre)) return 'perfect'
    if (poors.includes(normGenre)) return 'poor'
    return 'good'
  }

  const mapped = THEME_COMPAT_MAP[normTheme]
  if (mapped) {
    if (mapped.perfect.includes(normGenre)) return 'perfect'
    if (mapped.good.includes(normGenre))    return 'good'
    if (mapped.acceptable && mapped.acceptable.includes(normGenre)) return 'acceptable'
    if (mapped.poor.includes(normGenre))    return 'poor'
  }

  return 'good'
}

/**
 * Returns combo result for genre × theme pairing.
 * Phase 3: Hidden Compatibility Score and Genre Synergy Score
 */
export function getThemeComboResult(genre, theme, hasMultiplier = false) {
  if (!theme) return { label: 'NONE', mult: 1.0, emoji: '—', color: 'var(--gray)' }

  const rating = getThemeRating(genre, theme)
  let score = 70
  if (rating === 'perfect') score = 100
  else if (rating === 'good') score = 70
  else if (rating === 'acceptable') score = 40
  else if (rating === 'poor') score = 0

  let fit = 'Good Fit'
  if (score >= 80) fit = 'Perfect Fit'
  else if (score >= 40) fit = 'Good Fit'
  else fit = 'Bad Fit'

  // Apply 2x multiplier upgrades
  if (hasMultiplier) {
    if (fit === 'Bad Fit') fit = 'Good Fit'
    else if (fit === 'Good Fit') fit = 'Perfect Fit'
    else if (fit === 'Perfect Fit') fit = 'Enhanced Perfect'
  }

  let synergy = 1.0
  let label = 'GOOD'
  let emoji = '💕'
  let color = 'var(--green)'

  if (fit === 'Bad Fit') {
    synergy = 0.9
    label = 'BAD FIT'
    emoji = '💔'
    color = 'var(--red)'
  } else if (fit === 'Good Fit') {
    synergy = 1.0
    label = 'GOOD'
    emoji = '💕'
    color = 'var(--green)'
  } else if (fit === 'Perfect Fit') {
    synergy = 1.1
    label = 'PERFECT'
    emoji = '✨'
    color = 'var(--gold)'
  } else if (fit === 'Enhanced Perfect') {
    synergy = 1.2
    label = 'PERFECT' // shown as Perfect Fit to players per spec
    emoji = '✨'
    color = 'var(--gold)'
  }

  return { label, mult: synergy, emoji, color, fitLabel: fit === 'Enhanced Perfect' ? 'Perfect Fit' : fit }
}

// ─── Type × Theme secondary bonus ────────────────────────────────────────────
const TYPE_THEME_BONUS = {
  mini_series: {
    'Amnesia':       0.05, 'Fluffy':       0.05, 'Healing':        0.05,
    'Angst':         0.05, 'Bittersweet':  0.05, 'Slow Burn':      0.05,
  },
  series: {
    'Slow Burn':          0.05, 'Rivals':           0.05, 'Found Family':  0.05,
    'Reincarnation':      0.05, 'Age Gap':          0.05, 'Enemies-to-Lovers': 0.05,
  },
  movie: {
    'Dark':          0.05, 'Fate / Prophecy':  0.05, 'Soulmates':  0.05,
    'Magic':         0.05, 'Time Travel':      0.05, 'Star-Crossed': 0.05,
  },
}

/** Returns the additive type×theme bonus (0, 0.05, or 0.10). */
export function getTypeThemeBonus(type, theme) {
  if (!theme) return 0
  return TYPE_THEME_BONUS[type]?.[theme] ?? 0
}

// ─── Theme tier levels (for future theme-mastery display) ─────────────────────
export const THEME_TIERS = [
  { min: 0,  label: 'Untested',  color: '#6E6390', emoji: '—'  },
  { min: 10, label: 'Familiar',  color: '#9B86C4', emoji: '📝' },
  { min: 30, label: 'Practiced', color: '#6BC5FF', emoji: '✍️' },
  { min: 60, label: 'Skilled',   color: '#5CE1A0', emoji: '📚' },
  { min: 80, label: 'Signature', color: '#FF6B9D', emoji: '🎯' },
  { min: 95, label: 'Iconic',    color: '#FFD700', emoji: '🏆' },
]

export function themeTier(val) {
  let tier = THEME_TIERS[0]
  for (const t of THEME_TIERS) { if (val >= t.min) tier = t }
  return tier
}

export function themeLabel(val) {
  const t = themeTier(val)
  return { txt: t.label, color: t.color, emoji: t.emoji }
}
