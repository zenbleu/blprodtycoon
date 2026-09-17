import { useState } from 'react'
import { useGame } from './state.jsx'
import { advanceWeekPipeline } from './weekAdvance.js'
import { SFX, resumeAudio } from './audio.js'

export function useWeekAdvance() {
  const { state, dispatch } = useGame()
  const [advancing, setAdvancing] = useState(false)

  async function advanceWeek() {
    if (advancing) return
    resumeAudio()
    SFX.nextTurn()
    setAdvancing(true)
    try {
      await advanceWeekPipeline({ state, dispatch })
    } finally {
      setAdvancing(false)
    }
  }

  return { advanceWeek, advancing }
}