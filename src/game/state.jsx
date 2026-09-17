/**
 * state.jsx — Central game state via React Context
 * Prompt 7: rivals, numeric rank, bulk sign
 */
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { initActor, ACTOR_DATA, initChemistry } from './actors.js'
import { SAVE_SCHEMA_VERSION, createSaveData } from './save.js'
import { A, gameReducer } from './stateCore.js'

export { A, gameReducer } from './stateCore.js'

// ─── Initial State ────────────────────────────────────────────────────────────
export const INITIAL_STATE = {
  schemaVersion:  SAVE_SCHEMA_VERSION,
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

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)
  const saveTimer = useRef(null)
  useEffect(() => {
    if (!state.started) return
    clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => { try { localStorage.setItem('bl_tycoon_save', JSON.stringify(createSaveData(state))); dispatch({ type: A.MARK_SAVED, ts: Date.now() }) } catch (e) { console.warn('Auto-save failed:', e) } }, 1000)
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
