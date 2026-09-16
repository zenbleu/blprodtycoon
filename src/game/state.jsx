/**
 * state.jsx — Central game state via React Context
 * Prompt 7: rivals, numeric rank, bulk sign
 */
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { generateRivals } from './ranking.js'
import { initActor, ACTOR_DATA, initChemistry, startHoneymoon, HONEYMOON_NEW_RECRUIT_WEEKS } from './actors.js'

// ─── Initial State ────────────────────────────────────────────────────────────
export const INITIAL_STATE = {
  started:       false,
  companyName:   'Studio Sakura',
  startYear:     2024,
  week:          1,
  money:         50000,
  reputation:    0,
  popularity:    0,
  rank:          'INDIE',
  numericRank:   101,
  awards:        0,
  unlockedTiers: ['Rookie'],
  unlockedGenres: ['Romance', 'School', 'Office', 'Comedy'],
  unlockedMilestones: ['Romance', 'School', 'Office', 'Comedy'],
  unlockedThemes: ['Slow Burn', 'Friends-to-Lovers', 'Enemies-to-Lovers', 'Soulmates', 'Forbidden Love'],
  actors:        initChemistry(ACTOR_DATA.map(initActor)),
  productions:   [],
  history:       [],
  events:        [],
  eventLog:      [],
  modalQueue:    [],
  toasts:        [],
  fixedCPs:      [],
  fixedCPNames:  {},
  freeAgentsPool: [],
  gradeCounts:   {},
  genreTrends:   [],
  rivals:        [],
  awardsPhase:   null,
  awardsData:    null,
  productionsCompleted: 0,
  settings: { sfxOn: true, scanlines: true, animSpeed: 'normal' },
  flags:         {},
  lastSaved:     null,
}

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

function gameReducer(state, action) {
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
    case A.UNLOCK_GENRES: { const c = state.unlockedMilestones ?? ['Romance', 'School', 'Office']; const i = (action.genres ?? []).filter(g => !c.includes(g)); if (!i.length) return state; return { ...state, unlockedMilestones: [...c, ...i] } }
    case A.DISCOVER_GENRE: { const c = state.unlockedGenres ?? ['Romance', 'School', 'Office']; if (c.includes(action.genre)) return state; return { ...state, unlockedGenres: [...c, action.genre] } }
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
      const [x, y] = action.pair;
      return {
        ...state,
        fixedCPs: (state.fixedCPs ?? []).filter(([a, b]) => !((a === x && b === y) || (a === y && b === x))),
        eventLog: [{ id: Date.now(), message: "🎉 The beloved couple has graduated! Fans celebrate their past work while excited for individual careers.", variant: 'gold' }, ...state.eventLog]
      };
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
      // Migration: ensure Comedy is in unlocked genres for old saves that started with only 3
      const _savedMilestones = action.saveData.unlockedMilestones ?? action.saveData.unlockedGenres ?? ['Romance', 'School', 'Office']
      const _savedGenres = action.saveData.unlockedGenres ?? ['Romance', 'School', 'Office']
      const _migratedMilestones = _savedMilestones.includes('Comedy') ? _savedMilestones : [..._savedMilestones, 'Comedy']
      const _migratedGenres = _savedGenres.includes('Comedy') ? _savedGenres : [..._savedGenres, 'Comedy']
      return { ...action.saveData, started: action.saveData.started !== undefined ? action.saveData.started : true, startYear: action.saveData.startYear ?? 2024, eventLog: action.saveData.eventLog ?? [], fixedCPs: action.saveData.fixedCPs ?? [], freeAgentsPool: action.saveData.freeAgentsPool ?? [], rivals: action.saveData.rivals?.length ? action.saveData.rivals : generateRivals(), productionsCompleted: action.saveData.productionsCompleted ?? 0, gradeCounts: action.saveData.gradeCounts ?? {}, fixedCPNames: action.saveData.fixedCPNames ?? {}, genreTrends: action.saveData.genreTrends ?? [], unlockedGenres: _migratedGenres, unlockedMilestones: _migratedMilestones, unlockedThemes: action.saveData.unlockedThemes ?? ['Slow Burn', 'Friends-to-Lovers', 'Enemies-to-Lovers', 'Soulmates', 'Forbidden Love'], awardsPhase: null, awardsData: null }
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

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)
  const saveTimer = useRef(null)
  useEffect(() => {
    if (!state.started) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { try { localStorage.setItem('bl_tycoon_save', JSON.stringify(state)); dispatch({ type: A.MARK_SAVED, ts: Date.now() }) } catch (e) { console.warn('Auto-save failed:', e) } }, 1000)
    return () => clearTimeout(saveTimer.current)
  }, [state])
  return React.createElement(GameContext.Provider, { value: { state, dispatch } }, children)
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

export function pushToast(dispatch, message, variant = '') {
  dispatch({ type: A.PUSH_TOAST, toast: { message, variant } })
}

export function pushModal(dispatch, modal) {
  dispatch({ type: A.PUSH_MODAL, modal })
}

export function pushEventLog(dispatch, message, variant = '', week = null) {
  dispatch({ type: A.PUSH_EVENT_LOG, entry: { id: Date.now() + Math.random(), message, variant, week } })
}
