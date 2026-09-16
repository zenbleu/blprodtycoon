/**
 * Sidebar.jsx — Navigation + NEXT WEEK button
 * Prompt 3:
 *   Desktop: left sidebar with dominant NEXT WEEK (pink, pulsing) at top
 *   Mobile: bottom tab bar + floating NEXT WEEK FAB above it
 */
import React, { useState, useEffect, useRef } from 'react'
import { useGame } from '../game/state.jsx'
import { useWeekAdvance } from '../game/weekAdvance.js'
import { SFX } from '../game/audio.js'

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',      icon: '🏠', shortLabel: 'HOME' },
  { id: 'produce',    label: 'New Production', icon: '🎬', shortLabel: 'MAKE' },
  { id: 'actors',     label: 'Actors',         icon: '⭐', shortLabel: 'CAST' },
  { id: 'freeagents', label: 'Free Agents',    icon: '🌟', shortLabel: 'POOL' },
  { id: 'company',    label: 'Company Status', icon: '🏢', shortLabel: 'CO'   },
  { id: 'settings',   label: 'Settings',       icon: '⚙️', shortLabel: 'SET'  },
]

export default function Sidebar({ currentScreen, setScreen }) {
  const { state }                  = useGame()
  const { advanceWeek, advancing } = useWeekAdvance()
  const [autoAdvance, setAutoAdvance] = useState(false)
  const autoTimerRef = useRef(null)

  // Auto-advance: keep ticking weeks until a modal appears or the player stops it.
  // Stops immediately when anything needs player input (modal queue, advancing lock).
  useEffect(() => {
    clearTimeout(autoTimerRef.current)
    if (!autoAdvance || advancing) return
    // Stop if modals are waiting
    if ((state.modalQueue ?? []).length > 0) {
      setAutoAdvance(false)
      return
    }
    autoTimerRef.current = setTimeout(() => {
      advanceWeek()
    }, 400)
    return () => clearTimeout(autoTimerRef.current)
  }, [autoAdvance, advancing, state.modalQueue?.length, state.week])

  function toggleAutoAdvance() {
    SFX.click()
    setAutoAdvance(prev => !prev)
  }

  function navigate(id) {
    SFX.click()
    setScreen(id)
  }

  const activeProdCount = state.productions.filter(p => p.status === 'active').length

  return (
    <>
      {/* ─── Desktop sidebar ─────────────────────────────────────────────── */}
      <nav style={styles.sidebar} aria-label="Main navigation">
        {/* NEXT WEEK — dominant button */}
        <button
          className="btn-primary"
          style={{
            ...styles.nextWeekBtn,
            animation: advancing ? 'none' : 'pulse-glow 2s ease-in-out infinite',
            opacity: advancing ? 0.6 : 1,
          }}
          onClick={advanceWeek}
          disabled={advancing}
          aria-label="Advance one week"
        >
          {advancing ? '⏳ WAIT...' : '▶ NEXT WEEK'}
        </button>

        {/* Auto-advance toggle */}
        <button
          type="button"
          onClick={toggleAutoAdvance}
          style={{
            width: '100%',
            fontSize: 7,
            padding: '8px 10px',
            textAlign: 'center',
            background: autoAdvance ? 'var(--green)' : 'var(--bg-inset)',
            color: autoAdvance ? 'var(--bg-deep)' : 'var(--lav)',
            border: `2px solid ${autoAdvance ? 'var(--green)' : 'var(--shadow)'}`,
            boxShadow: 'none',
            letterSpacing: 1,
          }}
          aria-pressed={autoAdvance}
          title="Skip forward automatically until a decision is needed"
        >
          {autoAdvance ? '⏩ AUTO: ON — tap to stop' : '⏩ AUTO-ADVANCE'}
        </button>

        {/* Nav items */}
        <div style={styles.sideInner}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              style={{
                ...styles.navBtn,
                ...(currentScreen === item.id ? styles.navActive : {}),
              }}
              aria-current={currentScreen === item.id ? 'page' : undefined}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
              {item.id === 'produce' && activeProdCount > 0 && (
                <span style={styles.badge}>{activeProdCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Footer stats */}
        <div style={styles.sideFooter}>
          <FooterStat label="ACTIVE" value={`${activeProdCount} prod.`} color="var(--green)" />
          <FooterStat label="HISTORY" value={`${state.history.length} done`} color="var(--pink)" />
          <FooterStat label="ACTORS" value={`${state.actors.filter(a => a.signed).length} signed`} color="var(--lav)" />
        </div>
      </nav>

      {/* ─── Mobile bottom tab bar ───────────────────────────────────────── */}
      <nav style={styles.bottomNav} aria-label="Bottom navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            style={{
              ...styles.bottomBtn,
              ...(currentScreen === item.id ? styles.bottomActive : {}),
            }}
            aria-current={currentScreen === item.id ? 'page' : undefined}
          >
            <span style={styles.bottomIcon}>{item.icon}</span>
            <span style={styles.bottomLabel}>{item.shortLabel}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

function FooterStat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 6, color: 'var(--lav)' }}>{label}</span>
      <span style={{ fontSize: 8, color }}>{value}</span>
    </div>
  )
}

const styles = {
  /* ── Desktop sidebar ─────────────────────────────────────────────────────── */
  sidebar: {
    width:          'var(--sidebar-w)',
    flexShrink:     0,
    background:     'var(--bg-panel)',
    borderRight:    '3px solid var(--shadow)',
    padding:        '12px 10px',
    display:        'flex',
    flexDirection:  'column',
    gap:            10,
    overflowY:      'auto',
  },

  nextWeekBtn: {
    width:        '100%',
    textAlign:    'center',
    fontSize:     11,
    padding:      '16px 10px',
    letterSpacing: 1,
    flexShrink:   0,
    /* pulse-glow keyframe defined below */
  },

  sideInner: {
    display:       'flex',
    flexDirection: 'column',
    gap:           4,
    flex:          1,
  },

  navBtn: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    width:      '100%',
    textAlign:  'left',
    fontSize:   8,
    padding:    '10px 8px',
    background: 'transparent',
    border:     '2px solid transparent',
    boxShadow:  'none',
    color:      'var(--lav)',
    minHeight:  44,
    position:   'relative',
  },
  navActive: {
    background: 'var(--bg-inset)',
    border:     '2px solid var(--pink-dim)',
    color:      'var(--pink)',
    boxShadow:  '2px 2px 0 var(--shadow)',
  },
  navIcon:  { fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 },
  navLabel: { fontSize: 8, flex: 1 },

  badge: {
    background:   'var(--pink)',
    color:        'var(--bg-inset)',
    fontSize:     7,
    padding:      '1px 5px',
    borderRadius: 8,
    flexShrink:   0,
  },

  sideFooter: {
    borderTop:  '2px solid var(--shadow)',
    paddingTop: 8,
    display:    'flex',
    flexDirection: 'column',
    gap:        5,
  },

  /* ── Mobile FAB ──────────────────────────────────────────────────────────── */
  fab: {
    display:      'none',  // shown via media query
    position:     'fixed',
    bottom:       'calc(var(--bottom-nav-h) + 10px)',
    left:         '50%',
    transform:    'translateX(-50%)',
    zIndex:       110,
    fontSize:     10,
    padding:      '12px 24px',
    whiteSpace:   'nowrap',
    boxShadow:    '0 4px 16px rgba(255,107,157,0.5), 0 5px 0 #8A2B52',
  },

  /* ── Mobile bottom nav ───────────────────────────────────────────────────── */
  bottomNav: {
    display:    'none',    // shown via media query
    position:   'fixed',
    bottom:     0,
    left:       0,
    right:      0,
    height:     'var(--bottom-nav-h)',
    background: 'var(--bg-deep)',
    borderTop:  '3px solid var(--pink)',
    zIndex:     100,
  },
  bottomBtn: {
    flex:           1,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
    background:     'transparent',
    border:         'none',
    boxShadow:      'none',
    color:          'var(--gray)',
    padding:        '4px 2px',
    minHeight:      'var(--bottom-nav-h)',
    fontSize:       6,
  },
  bottomActive: {
    color:       'var(--pink)',
    background:  'rgba(255,107,157,0.08)',
    borderTop:   '3px solid var(--pink)',
  },
  bottomIcon:  { fontSize: 18 },
  bottomLabel: { fontSize: 6, letterSpacing: 1 },
}

// Inject responsive + animation CSS
if (typeof document !== 'undefined') {
  const id = 'sidebar-css'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 5px 0 #8A2B52, 0 0 0px rgba(255,107,157,0); }
        50%       { box-shadow: 0 5px 0 #8A2B52, 0 0 22px rgba(255,107,157,0.65); }
      }

      /* Mobile: hide sidebar, show bottom nav + FAB */
      @media (max-width: 759px) {
        nav[aria-label="Main navigation"]  { display: none !important; }
        nav[aria-label="Bottom navigation"]{ display: flex !important; }
        .next-week-fab {
          display: block !important;
          position: fixed;
          bottom: calc(var(--bottom-nav-h) + 10px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 110;
          font-size: 10px;
          padding: 12px 24px;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(255,107,157,0.5), 0 5px 0 #8A2B52;
        }
      }

      /* Desktop: show sidebar, hide FAB + bottom nav */
      @media (min-width: 760px) {
        nav[aria-label="Bottom navigation"] { display: none !important; }
        .next-week-fab { display: none !important; }
      }

      /* Hide scrollbar on stats scroll row */
      .stats-scroll::-webkit-scrollbar { display: none; }
    `
    document.head.appendChild(s)
  }
}
