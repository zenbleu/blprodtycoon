/**
 * save.js — Save schema validation, versioning, and migrations.
 *
 * Keep this module free of React and game-side effects so save compatibility can
 * be tested independently from the UI and reducer.
 */

export const SAVE_SCHEMA_VERSION = 2

const DEFAULT_GENRES = ['Romance', 'School', 'Office', 'Comedy']
const DEFAULT_MILESTONES = ['Romance', 'School', 'Office', 'Comedy']
const DEFAULT_THEMES = ['Slow Burn', 'Friends-to-Lovers', 'Enemies-to-Lovers', 'Soulmates', 'Forbidden Love']
const DEFAULT_TIERS = ['Rookie']
const DEFAULT_SETTINGS = { sfxOn: true, scanlines: true, animSpeed: 'normal' }

export function isSaveData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (!Number.isInteger(value.week) || value.week < 1) return false
  if (value.schemaVersion != null && (
    !Number.isInteger(value.schemaVersion) ||
    value.schemaVersion < 1 ||
    value.schemaVersion > SAVE_SCHEMA_VERSION
  )) return false
  return true
}

/**
 * Upgrade an imported or autosaved state to the current save shape.
 * Unknown fields are preserved so forward-compatible metadata is not lost.
 */
export function migrateSaveData(saveData) {
  if (!isSaveData(saveData)) {
    throw new Error('Invalid or unsupported save data')
  }

  const savedMilestones = Array.isArray(saveData.unlockedMilestones)
    ? saveData.unlockedMilestones
    : Array.isArray(saveData.unlockedGenres) ? saveData.unlockedGenres : DEFAULT_MILESTONES
  const savedGenres = Array.isArray(saveData.unlockedGenres)
    ? saveData.unlockedGenres
    : DEFAULT_GENRES

  return {
    ...saveData,
    schemaVersion: SAVE_SCHEMA_VERSION,
    started: saveData.started !== undefined ? Boolean(saveData.started) : true,
    startYear: saveData.startYear ?? 2024,
    eventLog: Array.isArray(saveData.eventLog) ? saveData.eventLog : [],
    events: Array.isArray(saveData.events) ? saveData.events : [],
    modalQueue: Array.isArray(saveData.modalQueue) ? saveData.modalQueue : [],
    toasts: Array.isArray(saveData.toasts) ? saveData.toasts : [],
    flags: saveData.flags && typeof saveData.flags === 'object' ? saveData.flags : {},
    fixedCPs: Array.isArray(saveData.fixedCPs) ? saveData.fixedCPs : [],
    freeAgentsPool: Array.isArray(saveData.freeAgentsPool) ? saveData.freeAgentsPool : [],
    productions: Array.isArray(saveData.productions) ? saveData.productions : [],
    history: Array.isArray(saveData.history) ? saveData.history : [],
    actors: Array.isArray(saveData.actors) ? saveData.actors : [],
    rivals: Array.isArray(saveData.rivals) ? saveData.rivals : [],
    unlockedTiers: Array.isArray(saveData.unlockedTiers) && saveData.unlockedTiers.length
      ? saveData.unlockedTiers
      : DEFAULT_TIERS,
    productionsCompleted: saveData.productionsCompleted ?? 0,
    gradeCounts: saveData.gradeCounts ?? {},
    fixedCPNames: saveData.fixedCPNames ?? {},
    genreTrends: Array.isArray(saveData.genreTrends) ? saveData.genreTrends : [],
    unlockedGenres: savedGenres.includes('Comedy') ? savedGenres : [...savedGenres, 'Comedy'],
    unlockedMilestones: savedMilestones.includes('Comedy') ? savedMilestones : [...savedMilestones, 'Comedy'],
    unlockedThemes: Array.isArray(saveData.unlockedThemes) ? saveData.unlockedThemes : DEFAULT_THEMES,
    awardsPhase: null,
    awardsData: null,
    weekSummary: saveData.weekSummary ?? null,
    settings: { ...DEFAULT_SETTINGS, ...(saveData.settings ?? {}) },
    saveStatus: 'idle',
    saveError: null,
  }
}

export function createSaveData(state) {
  return {
    ...state,
    schemaVersion: SAVE_SCHEMA_VERSION,
  }
}