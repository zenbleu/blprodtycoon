/**
 * TitleScreen.jsx — Intro / new game / continue / settings screen
 * Prompt 3: animated bg, gold/pink glow title, SETTINGS button, fade-out on start.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useGame, A } from '../game/state.jsx'
import { initActor, ACTOR_DATA, initChemistry } from '../game/actors.js'
import { initAudio, SFX } from '../game/audio.js'

export default function TitleScreen() {
  const { dispatch } = useGame()
  const [phase, setPhase]             = useState('title')   // 'title' | 'newgame' | 'settings'
  const [companyName, setCompanyName] = useState('GMMTV')
  const [startYear, setStartYear]     = useState(2026)
  const [yearMinMsg, setYearMinMsg]   = useState(false)
  const [blink, setBlink]             = useState(true)
  const [hasSave, setHasSave]         = useState(false)
  const [fading, setFading]           = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const inputRef                      = useRef(null)

  useEffect(() => {
    const save = localStorage.getItem('bl_tycoon_save')
    console.log("TitleScreen useEffect save detected:", !!save, save);
    setHasSave(!!save)
    const t = setInterval(() => setBlink(b => !b), 600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (phase === 'newgame') inputRef.current?.focus()
  }, [phase])

  function handleLoad() {
    initAudio()
    SFX.confirm()
    try {
      const raw = localStorage.getItem('bl_tycoon_save')
      if (!raw) return
      const save = JSON.parse(raw)
      setFading(true)
      setTimeout(() => dispatch({ type: A.LOAD_SAVE, saveData: save }), 400)
    } catch {
      alert('Save data corrupted.')
    }
  }

  function executeNewGame() {
    SFX.success()
    const rawActors = ACTOR_DATA.map(initActor)
    const actors    = initChemistry(rawActors)
    setFading(true)
    setTimeout(() => {
      dispatch({
        type: A.START_GAME,
        companyName: companyName.trim() || 'GMMTV',
        startYear:   Math.max(2020, startYear || 2026),
        actors,
      })
    }, 400)
  }

  function handleNewGame(e) {
    e.preventDefault()
    console.log("handleNewGame called. hasSave is:", hasSave);
    if (hasSave) {
      console.log("hasSave is true, showing warning modal");
      SFX.click()
      setShowWarningModal(true)
    } else {
      console.log("hasSave is false, executing new game directly");
      executeNewGame()
    }
  }

  // ── Settings mini-screen ───────────────────────────────────────────────────
  if (phase === 'settings') {
    return (
      <div style={styles.wrap}>
        <div style={{ ...styles.box, gap: 20 }}>
          <div style={styles.bigTitle}>SETTINGS</div>
          <div style={{ fontSize: 8, color: 'var(--lav)', lineHeight: 2.5, textAlign: 'left', width: '100%' }}>
            <div>Audio, scanlines and speed are available in-game via the Settings screen.</div>
          </div>
          <button
            style={{ ...styles.menuBtn, width: '100%' }}
            onClick={() => { SFX.click(); setPhase('title') }}
          >
            ← BACK
          </button>
          <div style={styles.ver}>v1.0 · mobile edition</div>
        </div>
      </div>
    )
  }

  // ── New game name entry ────────────────────────────────────────────────────
  if (phase === 'newgame') {
    return (
      <div style={{ ...styles.wrap, opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease' }}>
        {showWarningModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}>
            <div style={{
              background: 'var(--bg-panel, #1F1338)',
              border: '3px solid var(--pink, #FF6B9D)',
              padding: '24px 16px',
              maxWidth: 320,
              width: '100%',
              boxShadow: '0 0 20px rgba(255,107,157,0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <div style={{
                fontSize: 10,
                color: 'var(--pink, #FF6B9D)',
                letterSpacing: 2,
                fontWeight: 'bold',
                textAlign: 'center',
              }}>
                ⚠️ WARNING
              </div>
              <div style={{
                fontSize: 8,
                color: '#FFFFFF',
                lineHeight: 1.8,
                textAlign: 'center',
              }}>
                Are you sure you want to start a new game?<br /><br />All your progress will be lost
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ flex: 1, fontSize: 8, padding: '12px 8px', textAlign: 'center' }}
                  onClick={() => {
                    setShowWarningModal(false);
                    executeNewGame();
                  }}
                >
                  YES
                </button>
                <button
                  type="button"
                  style={{ flex: 1, fontSize: 8, padding: '12px 8px', textAlign: 'center' }}
                  onClick={() => {
                    SFX.click();
                    setShowWarningModal(false);
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={styles.box}>
          <div style={styles.bigTitle}>BL PRODUCTION<br />TYCOON</div>
          <div style={styles.subtitle}>— NEW STUDIO —</div>

          <form onSubmit={handleNewGame} style={{ width: '100%', marginTop: 8 }}>
            <div className="field">
              <label>STUDIO NAME</label>
              <input
                ref={inputRef}
                type="text"
                value={companyName}
                maxLength={28}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="GMMTV"
                style={{ fontSize: 10 }}
              />
            </div>
            <div className="field">
              <label>START YEAR</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                width: '100%',
              }}>
                <button
                  type="button"
                  style={styles.yearStepBtn}
                  onClick={() => {
                    if (startYear <= 2020) {
                      setYearMinMsg(true)
                      setTimeout(() => setYearMinMsg(false), 2000)
                    } else {
                      setStartYear(y => y - 1)
                      setYearMinMsg(false)
                    }
                  }}
                >{'<'}</button>
                <div style={styles.yearDisplay}>{startYear}</div>
                <button
                  type="button"
                  style={styles.yearStepBtn}
                  onClick={() => { setStartYear(y => y + 1); setYearMinMsg(false) }}
                >{'>'}</button>
              </div>
              {yearMinMsg && (
                <div style={{ fontSize: 7, color: 'var(--red)', marginTop: 4, letterSpacing: 1 }}>
                  Minimum year: 2020
                </div>
              )}
              <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 4 }}>
                Changes cannot be undone..
              </div>
            </div>
            <div style={styles.startRow}>
              <button type="submit" className="btn-primary" style={styles.bigBtn}>
                🎬 BEGIN!
              </button>
              <button type="button" onClick={() => { SFX.click(); setPhase('title') }}
                style={{ fontSize: 8, padding: '10px 14px' }}>
                ← BACK
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ── Main title screen ──────────────────────────────────────────────────────
  return (
    <div style={{
      ...styles.wrap,
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.4s ease',
    }}>
      {/* Animated background layer */}
      <div style={styles.animBg} aria-hidden="true" />

      <div style={styles.box}>
        {/* Clapperboard icon with glow */}
        <div style={styles.deco}>🎬</div>

        {/* Title with gold/pink glow */}
        <div style={styles.bigTitle}>
          BL<br />PRODUCTION<br />TYCOON
        </div>

        <div style={styles.tagline}>
          produce love · manage stars<br />build the dream
        </div>

        {/* Blinking prompt */}
        <div style={{ ...styles.blinkText, opacity: blink ? 1 : 0 }}>
          ▶ TAP TO START ◀
        </div>

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button
            className="btn-primary"
            style={styles.menuBtn}
            onClick={() => { initAudio(); SFX.click(); setPhase('newgame') }}
          >
            🆕 NEW GAME
          </button>

          {hasSave && (
            <button style={styles.menuBtn} onClick={handleLoad}>
              💾 CONTINUE
            </button>
          )}

          <button
            style={{ ...styles.menuBtn, fontSize: 8, padding: '10px 12px' }}
            onClick={() => { SFX.click(); setPhase('settings') }}
          >
            ⚙️ SETTINGS
          </button>
        </div>

        <div style={styles.ver}>
          v1.0 · mobile edition · Press Start 2P font
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight:      '100dvh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'radial-gradient(ellipse at 50% 40%, #3D2860 0%, #1F1338 70%)',
    padding:        16,
    position:       'relative',
    overflow:       'hidden',
  },
  animBg: {
    position:   'absolute',
    inset:      0,
    background: 'radial-gradient(ellipse at 30% 60%, rgba(255,107,157,0.12) 0%, transparent 60%), ' +
                'radial-gradient(ellipse at 70% 30%, rgba(107,197,255,0.10) 0%, transparent 50%)',
    animation:  'title-pulse 6s ease-in-out infinite',
    pointerEvents: 'none',
  },
  box: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            16,
    maxWidth:       380,
    width:          '100%',
    textAlign:      'center',
    position:       'relative',
    zIndex:         1,
  },
  deco: {
    fontSize:   52,
    filter:     'drop-shadow(0 0 20px #FF6B9D) drop-shadow(0 0 40px rgba(255,107,157,0.4))',
    animation:  'float 3s ease-in-out infinite',
  },
  bigTitle: {
    fontSize:    22,
    color:       '#FF6B9D',
    lineHeight:  1.5,
    textShadow:  '3px 3px 0 #120A24, 0 0 30px rgba(255,107,157,0.7), 0 0 60px rgba(255,107,157,0.3)',
    letterSpacing: 2,
    animation:   'title-glow 4s ease-in-out infinite',
  },
  subtitle: {
    fontSize:     9,
    color:        '#9B86C4',
    letterSpacing: 4,
  },
  tagline: {
    fontSize:   8,
    color:      '#9B86C4',
    lineHeight: 2,
  },
  blinkText: {
    fontSize:     9,
    color:        '#FFD700',
    letterSpacing: 2,
    transition:   'opacity 0.1s',
    textShadow:   '0 0 10px rgba(255,215,0,0.6)',
  },
  btnRow: {
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
    width:         '100%',
    marginTop:     8,
  },
  menuBtn: {
    textAlign: 'center',
    width:     '100%',
    fontSize:  10,
    padding:   '14px 12px',
  },
  startRow: {
    display:    'flex',
    gap:        10,
    marginTop:  16,
    alignItems: 'center',
  },
  bigBtn: {
    flex:      1,
    textAlign: 'center',
    fontSize:  11,
    padding:   '16px 12px',
  },
  ver: {
    fontSize: 6,
    color:    '#6E6390',
    marginTop: 4,
    lineHeight: 2,
  },
  yearStepBtn: {
    background:    'var(--bg-inset, #1F1338)',
    border:        '2px solid #9B86C4',
    color:         '#FFD700',
    fontSize:      11,
    padding:       '10px 16px',
    cursor:        'pointer',
    lineHeight:    1,
    flexShrink:    0,
  },
  yearDisplay: {
    flex:          1,
    textAlign:     'center',
    fontSize:      11,
    color:         '#FFFFFF',
    background:    'var(--bg-inset, #1F1338)',
    border:        '2px solid #9B86C4',
    borderLeft:    'none',
    borderRight:   'none',
    padding:       '10px 8px',
    letterSpacing: 2,
  },
}

// Inject title screen animations once
if (typeof document !== 'undefined') {
  const id = 'title-screen-css'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @keyframes title-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.6; }
      }
      @keyframes title-glow {
        0%, 100% { text-shadow: 3px 3px 0 #120A24, 0 0 30px rgba(255,107,157,0.7), 0 0 60px rgba(255,107,157,0.3); }
        50%       { text-shadow: 3px 3px 0 #120A24, 0 0 40px rgba(255,107,157,1),   0 0 80px rgba(255,215,0,0.4); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-8px); }
      }
    `
    document.head.appendChild(s)
  }
}
