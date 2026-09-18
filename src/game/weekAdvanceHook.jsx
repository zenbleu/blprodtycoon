import { useEffect, useRef, useState } from 'react'
import { useGame, A } from './state.jsx'
import { advanceWeekPipeline } from './weekAdvance.js'
import { SFX, resumeAudio } from './audio.js'

// App renders both desktop and mobile week controls. Keep them from entering
// the same pipeline at once, especially while auto-advance is ticking.
let weekAdvanceInFlight = false

export function useWeekAdvance() {
  const { state, dispatch } = useGame()
  const [advancing, setAdvancing] = useState(false)
  const mountedRef = useRef(true)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  async function advanceWeek() {
    if (advancing || weekAdvanceInFlight) return false
    weekAdvanceInFlight = true
    resumeAudio()
    SFX.nextTurn()
    if (mountedRef.current) setAdvancing(true)
    try {
      await advanceWeekPipeline({ state: stateRef.current, dispatch })
      return true
    } catch (error) {
      console.error('Week advance failed:', error)
      dispatch({
        type: A.PUSH_TOAST,
        toast: {
          message: 'Week advance failed. Your current week is unchanged; please try again.',
          variant: 'error',
        },
      })
      return false
    } finally {
      weekAdvanceInFlight = false
      if (mountedRef.current) setAdvancing(false)
    }
  }

  // Avoid setting local hook state after a screen unmounts during a modal flow.
  useEffect(() => () => {
    mountedRef.current = false
  }, [])

  return { advanceWeek, advancing }
}