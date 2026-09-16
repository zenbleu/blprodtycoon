/**
 * App.jsx — Root game app, screen routing
 * Prompt 8: Confetti mounted, settings → body class wiring
 */
import React, { useState, useEffect } from 'react'
import { GameProvider, useGame } from './game/state.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import TitleScreen from './components/TitleScreen.jsx'
import TopBar from './components/TopBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import { useWeekAdvance } from './game/weekAdvance.js'
import Dashboard from './components/Dashboard.jsx'
import ProductionForm from './components/ProductionForm.jsx'
import ActorRoster from './components/ActorRoster.jsx'
import ActorProfile from './components/ActorProfile.jsx'
import Settings from './components/Settings.jsx'
import CompanyStatus from './components/CompanyStatus.jsx'
import FreeAgentsPool from './components/FreeAgentsPool.jsx'
import ModalSystem from './components/ModalSystem.jsx'
import Confetti from './components/Confetti.jsx'
import AwardsCeremony from './components/AwardsCeremony.jsx'
import { setSfxEnabled } from './game/audio.js'

function GameApp() {
  const { state } = useGame()
  const [screen, setScreen]             = useState('dashboard')
  const [profileActor, setProfileActor] = useState(null)
  const { advanceWeek, advancing } = useWeekAdvance()

  // ── Wire settings → body classes + audio ─────────────────────────────────
  useEffect(() => {
    const b = document.body
    // Scanlines
    b.classList.toggle('no-scanlines', !state.settings?.scanlines)
    // Animation speed
    b.classList.remove('anim-slow', 'anim-fast')
    if (state.settings?.animSpeed === 'slow') b.classList.add('anim-slow')
    if (state.settings?.animSpeed === 'fast') b.classList.add('anim-fast')
    // SFX
    setSfxEnabled(state.settings?.sfxOn !== false)
  }, [state.settings?.scanlines, state.settings?.animSpeed, state.settings?.sfxOn])

  // ── Lock body scroll when a modal is open ─────────────────────────────────
  // Must be declared BEFORE the early return so hook count is stable across renders
  useEffect(() => {
    document.body.classList.toggle('modal-open', (state.modalQueue?.length ?? 0) > 0)
    return () => document.body.classList.remove('modal-open')
  }, [state.modalQueue?.length])

  if (!state.started) return <TitleScreen />

  // BL Awards ceremony takes over the full screen when active
  if (state.awardsPhase) return <AwardsCeremony />

  const openProfile = (actorId) => {
    setProfileActor(actorId)
    setScreen('profile')
  }
  const closeProfile = () => {
    setProfileActor(null)
    setScreen('actors')
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':    return <Dashboard setScreen={setScreen} />
      case 'actors':       return <ActorRoster openProfile={openProfile} />
      case 'profile':      return <ActorProfile actorId={profileActor} onBack={closeProfile} />
      case 'company':      return <CompanyStatus setScreen={setScreen} />
      case 'freeagents':   return <FreeAgentsPool />
      case 'settings':     return <Settings />
      default:             return <Dashboard setScreen={setScreen} />
    }
  }

  return (
    <div className="app-layout">
      <TopBar />
      <div className="mobile-next-week-container">
        <button
          className="btn-primary"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '10px',
            letterSpacing: '2px',
            animation: advancing ? 'none' : 'pulse-glow 2s ease-in-out infinite',
            opacity: advancing ? 0.7 : 1,
            boxShadow: '0 4px 0 #8A2B52',
          }}
          onClick={advanceWeek}
          disabled={advancing}
        >
          {advancing ? '⏳ WAIT...' : '▶ NEXT WEEK'}
        </button>
      </div>
      <div className="app-body">
        <Sidebar currentScreen={screen} setScreen={setScreen} />
        <main className="app-main">
          {/* Always mounted — preserves all form state across tab switches.
              Only resets after a successful "Add to Line-up" submission. */}
          <div style={{ display: screen === 'produce' ? 'contents' : 'none' }}>
            <ProductionForm setScreen={setScreen} />
          </div>
          {screen !== 'produce' && renderScreen()}
        </main>
      </div>
      <ModalSystem />
      <Confetti />
    </div>
  )
}

export default function App() {
  const [appLoading, setAppLoading] = useState(true)
  // Stable ref so LoadingScreen's timer effect never restarts due to prop identity change
  const onLoadComplete = React.useRef(() => setAppLoading(false)).current
  return (
    <>
      {appLoading && (
        <LoadingScreen onComplete={onLoadComplete} />
      )}
      <GameProvider>
        <GameApp />
      </GameProvider>
    </>
  )
}
