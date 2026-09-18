/**
 * stateCore.js — React-free action constants and reducer.
 *
 * Keeping the reducer separate lets developer simulations drive the exact same
 * state transitions as the UI without requiring a browser or JSX loader.
 */
import { generateRivals } from './ranking.js'
import { startHoneymoon, HONEYMOON_NEW_RECRUIT_WEEKS } from './actors.js'
import { migrateSaveData } from './save.js'

export const A = {
  START_GAME: 'START_GAME', ADVANCE_WEEK: 'ADVANCE_WEEK', SET_MONEY: 'SET_MONEY',
  ADD_MONEY: 'ADD_MONEY', SET_REPUTATION: 'SET_REPUTATION', ADD_REPUTATION: 'ADD_REPUTATION',
  SET_POPULARITY: 'SET_POPULARITY', SET_RANK: 'SET_RANK', SET_NUMERIC_RANK: 'SET_NUMERIC_RANK',
  ADD_AWARD: 'ADD_AWARD', INCREMENT_PRODS_COMPLETED: 'INCREMENT_PRODS_COMPLETED',
  UNLOCK_TIER: 'UNLOCK_TIER', UPDATE_ACTOR: 'UPDATE_ACTOR', SET_ACTORS: 'SET_ACTORS',
  SIGN_ACTOR: 'SIGN_ACTOR', ADD_PRODUCTION: 'ADD_PRODUCTION', UPDATE_PRODUCTION: 'UPDATE_PRODUCTION',
  COMPLETE_PRODUCTION: 'COMPLETE_PRODUCTION', PUSH_MODAL: 'PUSH_MODAL', POP_MODAL: 'POP_MODAL',
  PUSH_TOAST: 'PUSH_TOAST', DISMISS_TOAST: 'DISMISS_TOAST', PUSH_EVENT: 'PUSH_EVENT',
  RESOLVE_EVENT: 'RESOLVE_EVENT', PUSH_EVENT_LOG: 'PUSH_EVENT_LOG', ADD_FIXED_CP: 'ADD_FIXED_CP',
  REMOVE_FIXED_CP: 'REMOVE_FIXED_CP', GRADUATE_FIXED_CP: 'GRADUATE_FIXED_CP', UPDATE_RIVALS: 'UPDATE_RIVALS', BULK_SIGN: 'BULK_SIGN',
  SET_COMPANY_NAME: 'SET_COMPANY_NAME', SET_SETTINGS: 'SET_SETTINGS', SET_FLAG: 'SET_FLAG',
  LOAD_SAVE: 'LOAD_SAVE', MARK_SAVED: 'MARK_SAVED', ADD_FREE_AGENT: 'ADD_FREE_AGENT',
  REMOVE_FREE_AGENT: 'REMOVE_FREE_AGENT', UPDATE_FREE_AGENT: 'UPDATE_FREE_AGENT',
  INIT_FREE_AGENTS: 'INIT_FREE_AGENTS', UNLOCK_GENRES: 'UNLOCK_GENRES', DISCOVER_GENRE: 'DISCOVER_GENRE',
  INCREMENT_GRADE_COUNT: 'INCREMENT_GRADE_COUNT', SET_FIXED_CP_NAME: 'SET_FIXED_CP_NAME',
  SET_GENRE_TRENDS: 'SET_GENRE_TRENDS', UNLOCK_THEMES: 'UNLOCK_THEMES',
  SET_AWARDS_DATA: 'SET_AWARDS_DATA', SET_AWARDS_PHASE: 'SET_AWARDS_PHASE', CLEAR_AWARDS: 'CLEAR_AWARDS',
}

export function gameReducer(state, action) {
  switch (action.type) {
    case A.START_GAME:
      return { ...state, started: true, companyName: action.companyName ?? state.companyName, startYear: action.startYear ?? state.startYear ?? 2024, actors: action.actors ?? state.actors, rivals: state.rivals?.length ? state.rivals : generateRivals() }
    case A.ADVANCE_WEEK: return { ...state, week: state.week + 1 }
    case A.SET_MONEY: return { ...state, money: action.amount }
    case A.ADD_MONEY: return { ...state, money: state.money + action.amount }
    case A.SET_REPUTATION: return { ...state, reputation: clamp(action.value, 0, 100) }
    case A.ADD_REPUTATION: return { ...state, reputation: clamp(state.reputation + action.amount, 0, 100) }
    case A.SET_POPULARITY: return { ...state, popularity: Math.max(0, action.value) }
    case A.SET_RANK: return { ...state, rank: action.rank }
    case A.SET_NUMERIC_RANK: return { ...state, numericRank: action.rank }
    case A.ADD_AWARD: return { ...state, awards: state.awards + (action.amount ?? 1) }
    case A.INCREMENT_PRODS_COMPLETED: return { ...state, productionsCompleted: (state.productionsCompleted ?? 0) + (action.count ?? 1) }
    case A.UNLOCK_TIER: if (state.unlockedTiers.includes(action.tier)) return state; return { ...state, unlockedTiers: [...state.unlockedTiers, action.tier] }
    case A.UNLOCK_GENRES: {
      const currentGenres = state.unlockedGenres ?? ['Romance', 'School', 'Office']
      const currentMilestones = state.unlockedMilestones ?? currentGenres
      const additions = (action.genres ?? []).filter(g => !currentGenres.includes(g))
      if (!additions.length) return state
      return {
        ...state,
        unlockedGenres: [...currentGenres, ...additions],
        // Keep the legacy milestone collection synchronized for slot-machine
        // discovery and older saves that still read this field.
        unlockedMilestones: [...new Set([...currentMilestones, ...additions])],
      }
    }
    case A.DISCOVER_GENRE: {
      const currentGenres = state.unlockedGenres ?? ['Romance', 'School', 'Office']
      if (currentGenres.includes(action.genre)) return state
      return {
        ...state,
        unlockedGenres: [...currentGenres, action.genre],
        unlockedMilestones: [...new Set([...(state.unlockedMilestones ?? currentGenres), action.genre])],
      }
    }
    case A.SET_ACTORS: return { ...state, actors: action.actors }
    case A.UPDATE_ACTOR: return { ...state, actors: state.actors.map(a => { if (a.id !== action.id) return a; const u = { ...a, ...action.patch }; if (action.patch.status === 'injured' && a.status !== 'injured') u.injuredThisYear = (a.injuredThisYear ?? 0) + 1; if (action.patch.signed === false && a.signed === true) u.hasLeft = true; return u }) }
    case A.SIGN_ACTOR: return { ...state, money: state.money - action.cost, actors: state.actors.map(a => a.id === action.id ? { ...a, signed: true, status: 'available', ...startHoneymoon(a, state.week, HONEYMOON_NEW_RECRUIT_WEEKS) } : a) }
    case A.ADD_PRODUCTION: return { ...state, productions: [...state.productions, action.production] }
    case A.UPDATE_PRODUCTION: return { ...state, productions: state.productions.map(p => p.id === action.id ? { ...p, ...action.patch } : p) }
    case A.COMPLETE_PRODUCTION: return { ...state, productions: state.productions.filter(p => p.id !== action.id), history: [...state.history, action.record] }
    case A.PUSH_MODAL: return { ...state, modalQueue: [...state.modalQueue, action.modal] }
    case A.POP_MODAL: return { ...state, modalQueue: state.modalQueue.slice(1) }
    case A.PUSH_TOAST: return { ...state, toasts: [...state.toasts.slice(-4), { id: Date.now() + Math.random(), ...action.toast }] }
    case A.DISMISS_TOAST: return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case A.PUSH_EVENT: return { ...state, events: [...state.events, action.event] }
    case A.RESOLVE_EVENT: return { ...state, events: state.events.filter(e => e.id !== action.id) }
    case A.PUSH_EVENT_LOG: return { ...state, eventLog: [action.entry, ...(state.eventLog ?? [])].slice(0, 80) }
    case A.ADD_FIXED_CP: { const [x, y] = action.pair; const without = (state.fixedCPs ?? []).filter(([a, b]) => a !== x && b !== x && a !== y && b !== y); if (without.some(([a, b]) => (a === x && b === y) || (a === y && b === x))) return state; return { ...state, fixedCPs: [...without, [x, y]] } }
    case A.REMOVE_FIXED_CP: { const [x, y] = action.pair; return { ...state, fixedCPs: (state.fixedCPs ?? []).filter(([a, b]) => !((a === x && b === y) || (a === y && b === x))) } }
    case A.GRADUATE_FIXED_CP: {
      const [x, y] = action.pair
      return {
        ...state,
        fixedCPs: (state.fixedCPs ?? []).filter(([a, b]) => !((a === x && b === y) || (a === y && b === x))),
        eventLog: [{ id: Date.now(), message: '🎉 The beloved couple has graduated! Fans celebrate their past work while excited for individual careers.', variant: 'gold' }, ...state.eventLog],
      }
    }
    case A.UPDATE_RIVALS: return { ...state, rivals: (state.rivals ?? []).map(r => r.id === action.id ? { ...r, score: Math.max(0, r.score + action.scoreDelta) } : r) }
    case A.BULK_SIGN: { const discounted = Math.round(action.pairs.reduce((s, p) => s + p.cost, 0) * 0.7); return { ...state, money: state.money - discounted, actors: state.actors.map(a => { const m = action.pairs.find(p => p.id === a.id); return m ? { ...a, signed: true, status: 'available', ...startHoneymoon(a, state.week, HONEYMOON_NEW_RECRUIT_WEEKS) } : a }) } }
    case A.SET_COMPANY_NAME: return { ...state, companyName: action.name }
    case A.SET_SETTINGS: return { ...state, settings: { ...state.settings, ...action.patch } }
    case A.SET_FLAG: return { ...state, flags: { ...state.flags, [action.key]: action.value } }
    case A.ADD_FREE_AGENT: { const pool = state.freeAgentsPool ?? []; if (pool.some(e => e.poolId === action.entry.poolId)) return state; return { ...state, freeAgentsPool: [...pool, action.entry] } }
    case A.REMOVE_FREE_AGENT: return { ...state, freeAgentsPool: (state.freeAgentsPool ?? []).filter(e => e.poolId !== action.poolId) }
    case A.UPDATE_FREE_AGENT: return { ...state, freeAgentsPool: (state.freeAgentsPool ?? []).map(e => e.poolId === action.poolId ? { ...e, ...action.patch } : e) }
    case A.INIT_FREE_AGENTS: return { ...state, freeAgentsPool: action.pool }
    case A.LOAD_SAVE: {
      const migrated = migrateSaveData(action.saveData)
      return { ...migrated, rivals: migrated.rivals?.length ? migrated.rivals : generateRivals() }
    }
    case A.MARK_SAVED: return { ...state, lastSaved: action.ts }
    case A.INCREMENT_GRADE_COUNT: return { ...state, gradeCounts: { ...(state.gradeCounts ?? {}), [action.grade]: ((state.gradeCounts ?? {})[action.grade] ?? 0) + 1 } }
    case A.SET_FIXED_CP_NAME: return { ...state, fixedCPNames: { ...(state.fixedCPNames ?? {}), [action.key]: action.name } }
    case A.SET_GENRE_TRENDS: return { ...state, genreTrends: action.trends }
    case A.UNLOCK_THEMES: { const c = state.unlockedThemes ?? ['Slow Burn', 'Friends-to-Lovers', 'Enemies-to-Lovers', 'Soulmates', 'Forbidden Love']; const i = (action.themes ?? []).filter(t => !c.includes(t)); if (!i.length) return state; return { ...state, unlockedThemes: [...c, ...i] } }
    case A.SET_AWARDS_DATA: return { ...state, awardsData: action.data }
    case A.SET_AWARDS_PHASE: return { ...state, awardsPhase: action.phase, awardsData: state.awardsData ? { ...state.awardsData, attended: action.attended ?? false } : state.awardsData }
    case A.CLEAR_AWARDS: return { ...state, awardsPhase: null, awardsData: null }
    default: return state
  }
}

export function pushToast(dispatch, message, variant = '') {
  dispatch({ type: A.PUSH_TOAST, toast: { message, variant } })
}

export function pushEventLog(dispatch, message, variant = '', week = null) {
  dispatch({ type: A.PUSH_EVENT_LOG, entry: { id: Date.now() + Math.random(), message, variant, week } })
}

function clamp(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value))
}