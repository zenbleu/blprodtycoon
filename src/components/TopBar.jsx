/**
 * TopBar.jsx — Sticky header: company name (rename), stats, week, last saved.
 * Prompt 3: company name is click-to-rename inline, money animates, stats scroll on mobile.
 * NEXT WEEK button moved to Sidebar.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useGame, A } from '../game/state.jsx'
import { fmtMoney, fmtPop, calcRank } from '../game/ranking.js'
import { SFX } from '../game/audio.js'
import { getGameTierByRank, getNextGameTierByRank, getNextTierRankThreshold } from '../game/tiers.js'

// Ease-out cubic
function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

export default function TopBar() {
  const { state, dispatch } = useGame()

  // ── Animated money counter ─────────────────────────────────────────────────
  const [displayMoney, setDisplayMoney] = useState(state.money)
  const prevMoneyRef  = useRef(state.money)
  const animFrameRef  = useRef(null)

  useEffect(() => {
    const from  = prevMoneyRef.current
    const to    = state.money
    if (from === to) return

    const start    = performance.now()
    const duration = 600

    cancelAnimationFrame(animFrameRef.current)
    function step(now) {
      const t = Math.min((now - start) / duration, 1)
      setDisplayMoney(Math.round(from + (to - from) * easeOut(t)))
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        prevMoneyRef.current = to
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [state.money])

  // ── Inline company rename ──────────────────────────────────────────────────
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(state.companyName)
  const nameRef = useRef(null)

  function startRename() {
    SFX.click()
    setNameInput(state.companyName)
    setRenaming(true)
    setTimeout(() => nameRef.current?.select(), 30)
  }

  function commitRename() {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== state.companyName) {
      dispatch({ type: A.SET_COMPANY_NAME, name: trimmed })
    }
    setRenaming(false)
  }

  function handleNameKey(e) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') setRenaming(false)
  }

  // ── Year computation ─────────────────────────────────────────────────────
  const startYear  = state.startYear ?? 2024
  const currentYear = startYear + Math.floor((state.week - 1) / 52)

  // ── Rank, tier & last-saved ───────────────────────────────────────────────
  const rank         = calcRank(state.reputation, state.popularity)
  const gameTier     = getGameTierByRank(state.numericRank ?? 50)
  const nextTierData = getNextGameTierByRank(state.numericRank ?? 50)
  const nextThresh   = getNextTierRankThreshold(state.numericRank ?? 50)
  const savedTime = state.lastSaved
    ? new Date(state.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header style={styles.bar}>
      {/* Company name — click to rename */}
      <div style={styles.companyWrap}>
        {renaming ? (
          <input
            ref={nameRef}
            value={nameInput}
            maxLength={28}
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleNameKey}
            style={styles.nameInput}
          />
        ) : (
          <button
            onClick={startRename}
            title="Click to rename studio"
            style={styles.companyBtn}
          >
            {state.companyName}
            <span style={styles.editHint}>✏️</span>
          </button>
        )}
        <div style={styles.yearBadge}>{currentYear}</div>
        {savedTime && (
          <div style={styles.savedHint}>saved {savedTime}</div>
        )}
      </div>

      {/* Stats — horizontal scroll on mobile */}
      <div style={styles.statsScroll}>
        <Stat label="₩"    value={fmtMoney(displayMoney)} color="var(--gold)"  />
        <Stat label="REP"  value={state.reputation}        color="var(--pink)"  />
        <Stat label="POP"  value={fmtPop(state.popularity)} color="var(--blue)" />
        <Stat label="RANK" value={rank.id}                  color={rank.color} small />
        <Stat label="WK"   value={state.week}               color="var(--lav)"  />
        <TierStat tier={gameTier} nextThresh={nextThresh} numericRank={state.numericRank ?? 50} />
      </div>
    </header>
  )
}

function Stat({ label, value, color, small }) {
  return (
    <div style={styles.statWrap}>
      <span style={styles.statLbl}>{label}</span>
      <span style={{ ...styles.statVal, color, fontSize: small ? 8 : 11 }}>{value}</span>
    </div>
  )
}

// Tier display: shows current tier and rank needed for next tier
function TierStat({ tier, nextThresh, numericRank }) {
  const tierColors = {
    rookie:    'var(--lav)',
    rising:    'var(--blue)',
    popular:   'var(--pink)',
    worldwide: 'var(--gold)',
  }
  const color = tierColors[tier.id] ?? 'var(--lav)'
  return (
    <div style={{ ...styles.statWrap, minWidth: 60 }}>
      <span style={styles.statLbl}>TIER</span>
      <span style={{ ...styles.statVal, color, fontSize: 8, whiteSpace: 'nowrap' }}>
        {tier.label}
      </span>
      {nextThresh !== null ? (
        <span style={{ fontSize: 5, color: 'var(--gray)', marginTop: 1, whiteSpace: 'nowrap' }}>
          need rank #{nextThresh}
        </span>
      ) : (
        <span style={{ fontSize: 5, color: 'var(--gold)', marginTop: 1 }}>✦ MAX</span>
      )}
    </div>
  )
}

const styles = {
  bar: {
    display:      'flex',
    alignItems:   'center',
    gap:          8,
    background:   'var(--bg-deep)',
    borderBottom: '3px solid var(--pink)',
    padding:      '6px 10px',
    position:     'sticky',
    top:          0,
    zIndex:       50,
    minHeight:    'var(--topbar-h)',
    flexWrap:     'nowrap',
    overflow:     'hidden',
  },
  companyWrap: {
    display:       'flex',
    flexDirection: 'column',
    flexShrink:    0,
    maxWidth:      110,
  },
  companyBtn: {
    display:       'flex',
    alignItems:    'center',
    gap:           4,
    background:    'transparent',
    border:        'none',
    boxShadow:     'none',
    color:         'var(--pink)',
    fontSize:      8,
    padding:       '2px 0',
    minHeight:     'auto',
    minWidth:      'auto',
    borderBottom:  '1px dashed var(--pink-dim)',
    cursor:        'pointer',
    overflow:      'hidden',
    whiteSpace:    'nowrap',
    textOverflow:  'ellipsis',
    maxWidth:      110,
  },
  editHint: {
    fontSize:  10,
    opacity:   0.5,
    flexShrink: 0,
  },
  nameInput: {
    fontSize:   8,
    color:      'var(--pink)',
    background: 'var(--bg-inset)',
    border:     '2px solid var(--gold)',
    padding:    '3px 5px',
    width:      110,
    minHeight:  'auto',
    fontFamily: 'inherit',
  },
  yearBadge: {
    fontSize:    8,
    color:       'var(--gold)',
    fontFamily:  'inherit',
    letterSpacing: 1,
    marginTop:   2,
    textShadow:  '0 0 8px rgba(255,215,0,0.5)',
  },
  savedHint: {
    fontSize:    6,
    color:       'var(--gray)',
    marginTop:   2,
    whiteSpace:  'nowrap',
  },
  statsScroll: {
    display:    'flex',
    gap:        10,
    flex:       1,
    overflowX:  'auto',
    alignItems: 'center',
    // hide scrollbar visually but keep scrollable
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  statWrap: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'flex-start',
    flexShrink:    0,
    minWidth:      44,
  },
  statLbl: {
    fontSize:     6,
    color:        'var(--lav)',
    letterSpacing: 1,
  },
  statVal: {
    fontSize:   11,
    fontFamily: 'inherit',
  },
}
