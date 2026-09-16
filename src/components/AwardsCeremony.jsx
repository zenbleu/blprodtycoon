/**
 * AwardsCeremony.jsx — Cinematic BL Awards Night
 * Phases: opening → (for each award: major-title? → award) → summary
 * Minor awards: no cinematic title, clean card reveal
 * Major awards: cinematic title card with gold shimmer → reveal with portrait
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useGame, A, pushEventLog } from '../game/state.jsx'
import {
  AWARD_DEFS,
  calcAttendanceEffects,
  getLackingArea,
  getYearHistory,
} from '../game/awards.js'
import { SFX } from '../game/audio.js'
import { triggerConfetti } from './Confetti.jsx'
import { ActorPortrait } from './ActorRoster.jsx'
import { PORTRAIT_COLORS, NEW_TALENT_POOL, actorDisplayName } from '../game/actors.js'

const BASE = import.meta.env.BASE_URL

// Inject ceremony CSS (keyframes + utility classes)
if (typeof document !== 'undefined') {
  const id = 'awards-css'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @keyframes awards-fade-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes gold-shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes particle-rise {
        0%   { opacity: 0.9; transform: translateY(0) scale(1); }
        100% { opacity: 0;   transform: translateY(-80px) scale(0.5); }
      }
      @keyframes pulse-gold {
        0%, 100% { opacity: 0.7; }
        50%       { opacity: 1; }
      }
      @keyframes award-icon-drop {
        0%   { opacity: 0; transform: scale(0.3) rotate(-15deg); }
        60%  { transform: scale(1.15) rotate(3deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes winner-slide {
        from { opacity: 0; transform: translateX(-18px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes announcer-fade {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .shimmer-text {
        background: linear-gradient(
          90deg,
          #FFD700 0%, #FFF5C3 35%, #FFD700 50%, #FFF5C3 65%, #FFD700 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gold-shimmer 2.4s linear infinite;
      }
    `
    document.head.appendChild(s)
  }
}

// Animation speed multiplier (slow = longer delays)
function useAnimMult() {
  const { state } = useGame()
  const speed = state.settings?.animSpeed ?? 'normal'
  return { slow: 1.8, normal: 1.0, fast: 0.4 }[speed] ?? 1.0
}

// ─── Gold Particles ────────────────────────────────────────────────────────────
function GoldParticles({ count = 18 }) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    key: i,
    left:  `${5 + (i * 94 / count)}%`,
    delay: `${(i * 0.28) % 2.5}s`,
    dur:   `${1.8 + (i % 4) * 0.4}s`,
    size:  4 + (i % 3) * 3,
  })), [count])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.key} style={{
          position:        'absolute',
          bottom:          '15%',
          left:            p.left,
          width:           p.size,
          height:          p.size,
          borderRadius:    '50%',
          background:      'radial-gradient(circle, #FFD700, #FFC200)',
          boxShadow:       '0 0 4px #FFD700',
          animation:       `particle-rise ${p.dur} ${p.delay} ease-out infinite`,
        }} />
      ))}
    </div>
  )
}

// ─── Rival portrait fallback (uses free agents pool or color block) ─────────
function RivalPortrait({ actorName, size = 72 }) {
  const { state } = useGame()

  const unsignedTalents = useMemo(() => {
    const signedPoolIds = new Set(
      state.actors.filter(a => a.poolId).map(a => a.poolId)
    )
    return NEW_TALENT_POOL.filter(nt => !signedPoolIds.has(nt.poolId))
  }, [state.actors])

  // Try to find a free-agent portrait for flavour
  const poolEntry = useMemo(() => {
    if (!unsignedTalents.length) return null
    // Deterministic pick based on name
    const idx = Array.from(actorName).reduce((s, c) => s + c.charCodeAt(0), 0)
    return unsignedTalents[idx % unsignedTalents.length]
  }, [actorName, unsignedTalents])

  const [imgFailed, setImgFailed] = useState(false)
  const fallbackColor = PORTRAIT_COLORS[
    Array.from(actorName).reduce((s, c) => s + c.charCodeAt(0), 0) % PORTRAIT_COLORS.length
  ]

  const src = poolEntry?.portraitFile
    ? `${BASE}images/pool/${poolEntry.portraitFile}`
    : null

  return (
    <div style={{
      width: size, height: size,
      borderRadius: 4,
      overflow: 'hidden',
      background: fallbackColor,
      position: 'relative',
      flexShrink: 0,
      border: '2px solid var(--shadow)',
    }}>
      {src && !imgFailed && (
        <img
          src={src}
          alt={actorName}
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            imageRendering: 'pixelated', filter: 'brightness(0.88)' }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.34,
        color: 'rgba(0,0,0,0.45)',
        fontFamily: 'inherit',
        fontWeight: 'bold',
      }}>
        {(!src || imgFailed) ? actorName[0] : null}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AwardsCeremony() {
  const { state, dispatch } = useGame()
  const { awardsData, awardsPhase } = state
  const animMult = useAnimMult()

  // 'opening' | 'major-title' | 'award' | 'summary'
  const [phase, setPhase]             = useState(awardsPhase === 'summary' ? 'summary' : 'opening')
  const [awardIdx, setAwardIdx]       = useState(0)
  const [winnerVisible, setWinnerVisible] = useState(false)
  const [titleVisible, setTitleVisible]   = useState(false)
  const [openingReady, setOpeningReady]   = useState(false)
  const timerRef        = useRef(null)
  const announceRef     = useRef(null)
  const [announcerPhase, setAnnouncerPhase] = useState(null) // null|'part1'|'part2'|'done'

  if (!awardsData) return null

  const { results = [], userWins = [], year: relativeYear } = awardsData
  const startYear = state.startYear ?? 2026
  const year      = startYear + relativeYear - 1
  const attended  = awardsData.attended ?? false
  const resultMap = Object.fromEntries(results.map(r => [r.awardId, r]))

  const currentAward  = AWARD_DEFS[awardIdx]
  const currentResult = resultMap[currentAward?.id]
  const isPlayerWin   = userWins.includes(currentAward?.id)
  const isLast        = awardIdx >= AWARD_DEFS.length - 1
  const isMajor       = currentAward?.category === 'major'

  // Free agents for rival portraits
  const freeAgents = state.freeAgentsPool ?? []

  // Opening fade-in ready
  useEffect(() => {
    const t = setTimeout(() => setOpeningReady(true), 180)
    return () => clearTimeout(t)
  }, [])

  // Auto-advance major-title → award
  useEffect(() => {
    if (phase !== 'major-title') return
    setTitleVisible(false)
    const t1 = setTimeout(() => setTitleVisible(true), 80)
    const t2 = setTimeout(() => {
      setPhase('award')
      setWinnerVisible(false)
    }, Math.round(2600 * animMult))
    timerRef.current = t2
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase, awardIdx])

  function clearTimer() { if (timerRef.current) clearTimeout(timerRef.current) }
  function clearAnnounce() { if (announceRef.current) clearTimeout(announceRef.current) }

  // ── Announcer phase auto-advance ─────────────────────────────────────────
  useEffect(() => {
    if (!announcerPhase || announcerPhase === 'done') return
    clearAnnounce()

    const ms = (s) => Math.round(s * 1000 * animMult)
    const reveal = () => {
      setAnnouncerPhase('done')
      setWinnerVisible(true)
      if (isPlayerWin) {
        triggerConfetti(isLast ? 1.5 : 0.6)
        SFX.success && SFX.success()
      }
    }

    if (!isMajor) {
      // Minor: "And the winner for [category] goes to…" → 3 s → reveal
      announceRef.current = setTimeout(reveal, ms(3))
    } else if (isLast) {
      // Last: "To present our final…" (3 s) → "The winner for [category] is…" (2 s) → reveal
      if (announcerPhase === 'part1') {
        announceRef.current = setTimeout(() => setAnnouncerPhase('part2'), ms(3))
      } else if (announcerPhase === 'part2') {
        announceRef.current = setTimeout(reveal, ms(2))
      }
    } else {
      // Major (not last): "And now…" (2 s) → "…goes to…" (3 s) → reveal
      if (announcerPhase === 'part1') {
        announceRef.current = setTimeout(() => setAnnouncerPhase('part2'), ms(2))
      } else if (announcerPhase === 'part2') {
        announceRef.current = setTimeout(reveal, ms(3))
      }
    }

    return clearAnnounce
  }, [announcerPhase, isMajor, isLast, animMult])

  function getAnnouncerText() {
    const label = currentAward?.label ?? 'this award'
    if (!isMajor) return `And the winner for ${label} goes to…`
    if (isLast) {
      if (announcerPhase === 'part1') return 'To present our final and most prestigious award of the night…'
      return `The winner for ${label} is…`
    }
    // major, not last
    if (announcerPhase === 'part1') return `And now, the moment you have all been waiting for. The winner for ${label}…`
    return '…goes to…'
  }

  // ── Leave handler ────────────────────────────────────────────────────────
  function handleLeave() {
    clearTimer()
    clearAnnounce()
    SFX.click()
    const effects = calcAttendanceEffects(attended, userWins)
    if (effects.repDelta !== 0) dispatch({ type: A.ADD_REPUTATION, amount: effects.repDelta })
    if (effects.popDelta !== 0) dispatch({ type: A.SET_POPULARITY, value: Math.max(0, state.popularity + effects.popDelta) })
    if (effects.fameDelta > 0) {
      const yearH     = getYearHistory(state.history, state.week)
      const castIdSet = new Set(yearH.flatMap(h => h.castIds ?? []))
      state.actors
        .filter(a => a.signed && castIdSet.has(a.id))
        .forEach(a => dispatch({ type: A.UPDATE_ACTOR, id: a.id, patch: { fame: (a.fame ?? 0) + effects.fameDelta } }))
    }
    if (userWins.length > 0) dispatch({ type: A.ADD_AWARD, amount: userWins.length })
    pushEventLog(dispatch,
      `🏆 BL Awards Year ${year}: ${userWins.length} award(s) won. Rep ${effects.repDelta >= 0 ? '+' : ''}${effects.repDelta}`,
      userWins.length > 0 ? 'gold' : 'red', state.week)
    if (userWins.length > 0) triggerConfetti(userWins.length >= 3 ? 2.0 : 1.0)
    dispatch({ type: A.PUSH_MODAL, modal: buildResultModal(awardsData, state) })
    dispatch({ type: A.CLEAR_AWARDS })
  }

  // ── Award progression ────────────────────────────────────────────────────
  function handleReveal() {
    SFX.modal()
    setAnnouncerPhase('part1')
  }

  function handleNext() {
    clearTimer()
    clearAnnounce()
    SFX.click()
    setAnnouncerPhase(null)
    if (isLast) {
      setPhase('summary')
      return
    }
    const nextIdx  = awardIdx + 1
    const nextDef  = AWARD_DEFS[nextIdx]
    setAwardIdx(nextIdx)
    setWinnerVisible(false)
    if (nextDef?.category === 'major') {
      setPhase('major-title')
    } else {
      setPhase('award')
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // OPENING PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'opening') {
    return (
      <div style={S.fullscreen}>
        <GoldParticles count={22} />
        <div style={{
          ...S.openingContent,
          opacity:   openingReady ? 1 : 0,
          transform: openingReady ? 'none' : 'translateY(20px)',
          transition: `opacity ${0.9 * animMult}s ease, transform ${0.9 * animMult}s ease`,
        }}>
          {/* Divider top */}
          <div style={S.divider} />

          {/* Title */}
          <div className="shimmer-text" style={S.openingTitle}>BL AWARDS</div>
          <div style={S.openingYear}>{year}</div>

          {/* Divider bottom */}
          <div style={S.divider} />

          <div style={{ fontSize: 7, color: 'var(--lav)', letterSpacing: 2, marginTop: 12, marginBottom: 28 }}>
            {state.companyName ?? 'Your Studio'}
          </div>

          {/* Start button */}
          <button
            style={S.startBtn}
            onClick={() => {
              SFX.confirm && SFX.confirm()
              // First award: major → cinematic title, minor → straight to award
              setAwardIdx(0)
              setWinnerVisible(false)
              if (AWARD_DEFS[0]?.category === 'major') {
                setPhase('major-title')
              } else {
                setPhase('award')
              }
            }}
          >
            ▶ START AWARDS NIGHT
          </button>

          <button style={S.ghostSmall} onClick={() => setPhase('summary')}>
            📋 Skip to Summary
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAJOR TITLE CARD
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'major-title') {
    return (
      <div style={S.fullscreen}>
        <GoldParticles count={30} />
        <div style={{
          ...S.majorTitleContent,
          opacity:   titleVisible ? 1 : 0,
          transform: titleVisible ? 'none' : 'scale(0.92)',
          transition: `opacity ${0.6 * animMult}s ease, transform ${0.6 * animMult}s ease`,
        }}>
          <div style={S.majorDividerTop} />
          <div style={{ fontSize: 22, marginBottom: 10, animation: 'pulse-gold 2s ease-in-out infinite' }}>
            {currentAward?.icon}
          </div>
          <div className="shimmer-text" style={S.majorTitleLabel}>
            {currentAward?.label?.toUpperCase()}
          </div>
          <div style={S.majorDividerBottom} />
          <div style={{ fontSize: 7, color: 'var(--gold)', letterSpacing: 3, marginTop: 14,
            animation: 'pulse-gold 1.8s ease-in-out infinite' }}>
            ⭐ MAIN AWARD ⭐
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AWARD REVEAL PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'award') {
    const progressPct = ((awardIdx + 1) / AWARD_DEFS.length) * 100

    return (
      <div style={S.fullscreen}>
        {isMajor && <GoldParticles count={14} />}

        {/* Progress bar */}
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
        </div>
        <div style={S.progressLabel}>
          {awardIdx + 1} / {AWARD_DEFS.length}
          {isMajor && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>⭐ MAIN AWARD</span>}
        </div>

        {/* Award card */}
        <div style={{
          ...S.awardCard,
          borderColor: isMajor ? 'var(--gold)' : 'var(--shadow)',
          boxShadow: isMajor ? '0 0 32px rgba(255,215,0,0.18), 4px 4px 0 var(--shadow)' : '4px 4px 0 var(--shadow)',
        }}>
          {/* Icon + label */}
          <div style={{
            fontSize: isMajor ? 54 : 40,
            animation: 'award-icon-drop 0.5s ease both',
          }}>
            {currentAward?.icon}
          </div>
          <div style={{
            fontSize: isMajor ? 11 : 9,
            letterSpacing: 1.5,
            textAlign: 'center',
            ...(isMajor ? { className: 'shimmer-text' } : { color: 'var(--white)' }),
          }}>
            {isMajor
              ? <span className="shimmer-text">{currentAward?.label?.toUpperCase()}</span>
              : currentAward?.label}
          </div>

          {/* Category badge */}
          <div style={{
            fontSize: 6, letterSpacing: 2,
            color: isMajor ? 'var(--gold)' : 'var(--lav)',
            border: `1px solid ${isMajor ? 'var(--gold)' : 'var(--shadow)'}`,
            padding: '3px 10px',
          }}>
            {isMajor ? '⭐ MAIN AWARD' : 'AWARD'}
          </div>

          {!winnerVisible && !announcerPhase ? (
            <button style={S.revealBtn} onClick={handleReveal}>
              🎭 REVEAL WINNER
            </button>
          ) : !winnerVisible ? (
            <div key={announcerPhase} style={{
              padding: '22px 28px',
              background: 'rgba(0,0,0,0.55)',
              border: `1px solid ${isMajor ? 'var(--gold)' : 'var(--lav)'}`,
              borderRadius: 10,
              textAlign: 'center',
              animation: 'announcer-fade 0.4s ease both',
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontSize: isMajor ? 18 : 16,
                color: isMajor ? 'var(--gold)' : 'var(--white)',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
                lineHeight: 1.5,
              }}>
                {getAnnouncerText()}
              </span>
            </div>
          ) : (
            <div style={{
              ...S.winnerCard,
              borderColor: isPlayerWin ? 'var(--gold)' : 'var(--lav)',
              animation: 'winner-slide 0.4s ease both',
            }}>
              {isPlayerWin && (
                <div style={S.playerBadge}>🏆 YOUR STUDIO WINS!</div>
              )}
              <AwardWinnerDisplay
                result={currentResult}
                award={currentAward}
                isPlayer={isPlayerWin}
                actors={state.actors}
                freeAgents={freeAgents}
              />
              <button
                style={{ ...S.nextBtn, background: isLast ? 'var(--pink)' : isMajor ? '#7B4FDB' : 'var(--lav)' }}
                onClick={handleNext}
              >
                {isLast ? '📋 VIEW FULL SUMMARY →' : 'NEXT AWARD →'}
              </button>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div style={S.bottomRow}>
          <button style={S.ghostBtn} onClick={() => { clearTimer(); setPhase('summary') }}>
            📋 Skip to Summary
          </button>
          <button style={{ ...S.ghostBtn, color: 'var(--red)' }} onClick={handleLeave}>
            🚪 Leave
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY PHASE
  // ════════════════════════════════════════════════════════════════════════════
  const minorAwards = AWARD_DEFS.filter(a => a.category === 'minor')
  const majorAwards = AWARD_DEFS.filter(a => a.category === 'major')

  return (
    <div style={S.fullscreen}>
      {/* Header */}
      <div style={S.summaryHeader}>
        <div className="shimmer-text" style={{ fontSize: 11, letterSpacing: 2 }}>
          BL AWARDS — YEAR {year}
        </div>
        <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 4 }}>
          {state.companyName ?? 'Your Studio'}
          {userWins.length > 0 && (
            <span style={{ color: 'var(--gold)', marginLeft: 10 }}>
              🏆 {userWins.length} / {AWARD_DEFS.length} Won
            </span>
          )}
          {!attended && (
            <span style={{ color: 'var(--lav)', marginLeft: 10 }}>· Watched from home</span>
          )}
        </div>
      </div>

      {/* List */}
      <div style={S.summaryScroll}>
        <div style={S.sectionHead}>— AWARDS —</div>
        {minorAwards.map(award => (
          <SummaryRow
            key={award.id}
            award={award}
            result={resultMap[award.id]}
            isPlayer={userWins.includes(award.id)}
          />
        ))}
        <div style={{ ...S.sectionHead, marginTop: 16, color: 'var(--gold)' }}>
          ⭐ MAIN AWARDS ⭐
        </div>
        {majorAwards.map(award => (
          <SummaryRow
            key={award.id}
            award={award}
            result={resultMap[award.id]}
            isPlayer={userWins.includes(award.id)}
          />
        ))}
      </div>

      {/* Leave */}
      <div style={S.leaveBar}>
        <button style={S.leaveBtn} onClick={handleLeave}>
          🚪 LEAVE THE CEREMONY
        </button>
      </div>
    </div>
  )
}

// ─── Award winner display inside the ceremony card ────────────────────────────
function AwardWinnerDisplay({ result, award, isPlayer, actors, freeAgents }) {
  if (!result) {
    return (
      <div style={{ color: 'var(--gray)', fontSize: 8, textAlign: 'center' }}>
        No eligible candidates this year.
      </div>
    )
  }
  const { winner } = result
  const nameColor  = isPlayer ? 'var(--gold)' : 'var(--white)'

  if (award.kind === 'actor') {
    const portraitActor = isPlayer
      ? actors.find(a => a.id === winner.actorId || a.name === winner.actorName || a.name === winner.name)
      : null

    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* Portrait */}
        <div style={{ position: 'relative' }}>
          {portraitActor ? (
            <ActorPortrait actor={portraitActor} size={88} />
          ) : (
            <RivalPortrait
              actorName={winner.actorName ?? winner.name ?? '?'}
              size={88}
            />
          )}
          {isPlayer && (
            <div style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--gold)', color: 'var(--bg-deep)',
              fontSize: 5, padding: '2px 8px', letterSpacing: 1, whiteSpace: 'nowrap',
            }}>
              ★ WINNER ★
            </div>
          )}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, color: nameColor, marginBottom: 3 }}>
            {winner.actorName ?? winner.name}
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)' }}>{winner.company}</div>
        </div>
      </div>
    )
  }

  if (award.kind === 'chemistry') {
    const actor1 = isPlayer
      ? actors.find(a => a.id === winner.actor1Id)
      : null
    const actor2 = isPlayer
      ? actors.find(a => a.id === winner.actor2Id)
      : null
    const chemScore = winner.chemScore ?? 0

    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {isPlayer && (
          <div style={{
            fontSize: 8, color: 'var(--bg-deep)',
            background: 'var(--gold)', padding: '4px 12px',
            letterSpacing: 1, textAlign: 'center', width: '100%', boxSizing: 'border-box',
          }}>
            ★ WINNER ★
          </div>
        )}
        {/* Two actors side by side */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {actor1 ? (
              <ActorPortrait actor={actor1} size={72} />
            ) : (
              <RivalPortrait actorName={winner.actor1Name ?? '?'} size={72} />
            )}
            <div style={{ fontSize: 8, color: nameColor, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {actor1 ? actorDisplayName(actor1) : (winner.actor1Name ?? '?')}
            </div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--pink)' }}>💕</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {actor2 ? (
              <ActorPortrait actor={actor2} size={72} />
            ) : (
              <RivalPortrait actorName={winner.actor2Name ?? '?'} size={72} />
            )}
            <div style={{ fontSize: 8, color: nameColor, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {actor2 ? actorDisplayName(actor2) : (winner.actor2Name ?? '?')}
            </div>
          </div>
        </div>
        {/* Chemistry level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 'bold' }}>💕 {chemScore}</span>
          <span style={{ fontSize: 7, color: 'var(--lav)' }}>Chemistry Level</span>
        </div>
        <div style={{ fontSize: 7, color: 'var(--lav)' }}>{winner.company}</div>
      </div>
    )
  }

  if (award.kind === 'production') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
        <div style={{ fontSize: 12, color: nameColor, marginBottom: 4, lineHeight: 1.5 }}>
          {winner.title ?? winner.name}
        </div>
        <div style={{ fontSize: 7, color: 'var(--lav)' }}>{winner.company}</div>
        {winner.extra && (
          <div style={{ fontSize: 7, color: 'var(--pink)', marginTop: 4 }}>{winner.extra}</div>
        )}
      </div>
    )
  }

  // Company award
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
      <div style={{ fontSize: 14, color: nameColor, marginBottom: 4 }}>{winner.name}</div>
    </div>
  )
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ award, result, isPlayer }) {
  const winner = result?.winner
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      border: `2px solid ${isPlayer ? 'var(--gold)' : 'var(--shadow)'}`,
      background: isPlayer ? 'rgba(255,215,0,0.07)' : 'var(--bg-inset)',
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{award.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 2 }}>{award.label}</div>
        {winner ? (
          <>
            <div style={{
              fontSize: 9, color: isPlayer ? 'var(--gold)' : 'var(--white)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {award.kind === 'actor'
                ? (winner.actorName ?? winner.name)
                : award.kind === 'chemistry'
                  ? `${winner.actor1Name ?? '?'} & ${winner.actor2Name ?? '?'}`
                  : (winner.title ?? winner.name)}
            </div>
            <div style={{ fontSize: 7, color: 'var(--lav)' }}>
              {winner.company}
              {winner.extra && (
                <span style={{ color: 'var(--pink)', marginLeft: 8 }}>{winner.extra}</span>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 7, color: 'var(--gray)' }}>No eligible candidates</div>
        )}
      </div>
      {isPlayer && <span style={{ fontSize: 16, flexShrink: 0 }}>🏆</span>}
    </div>
  )
}

// ─── Result modal builder ─────────────────────────────────────────────────────
function buildResultModal(awardsData, state) {
  const wins  = awardsData?.userWins ?? []
  const total = AWARD_DEFS.length
  const relativeYear = awardsData?.year ?? 1
  const startYear = state.startYear ?? 2026
  const year = relativeYear === '?' ? '?' : (startYear + relativeYear - 1)
  let title, message

  if (wins.length === total) {
    title   = 'History has been made! 🌟'
    message = `You completely swept EVERY SINGLE AWARD this Year ${year} season! 🏆\n\nAn absolute masterpiece of a performance that left the entire industry speechless.\n\nYou have officially set the high standard in BL Industry—everyone else is just living in your shadow! 👑`
  } else if (wins.length >= 3) {
    title   = 'Congratulations! 🎉'
    message = `You have won ${wins.length} awards this Year ${year} season! ✨\n\nYour hard work and dedication have officially set a new standard in BL industry.\n\nKeep up the incredible momentum!`
  } else if (wins.length >= 1) {
    const names = wins.map(id => AWARD_DEFS.find(a => a.id === id)?.label ?? id)
    const list  = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names.at(-1)
    title   = 'Congratulations! 🎉'
    message = `You have won ${list} this Year ${year} season! ⚔️\n\nA beautiful performance, but you must keep up the momentum to stay the ultimate power couple next time.\n\nThe competition is fierce, and your rivals are closing in—don't let your guard down!`
  } else {
    const lacking = getLackingArea(state, state.week)
    title   = `The Year ${year} BL Awards Night has come to an end.`
    message = `Unfortunately, you didn't take home any trophies this time. 💔\n\nDon't lose heart—the fans are still cheering for your story! 📣\n\nWork on your ${lacking} and show them who truly rules the charts! 🔥`
  }

  return { type: 'generic', data: { title, message, isAwardMessage: true } }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  fullscreen: {
    position: 'fixed', inset: 0,
    background: 'var(--bg-deep)',
    display: 'flex', flexDirection: 'column',
    zIndex: 9000, fontFamily: 'inherit',
    overflow: 'hidden',
  },

  // ── Opening ──
  openingContent: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px', position: 'relative', zIndex: 1,
  },
  openingTitle: {
    fontSize: 'clamp(14px, 4vw, 22px)',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 10,
  },
  openingYear: {
    fontSize: 'clamp(11px, 3vw, 16px)',
    color: 'rgba(255,215,0,0.7)',
    letterSpacing: 4,
    marginBottom: 10,
    textAlign: 'center',
  },
  divider: {
    width: '100%', maxWidth: 320,
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
    margin: '10px 0',
  },
  startBtn: {
    fontSize: 10, padding: '16px 32px',
    background: 'var(--pink)',
    color: 'var(--bg-deep)',
    border: '2px solid #8A2B52',
    cursor: 'pointer', letterSpacing: 2,
    boxShadow: '0 5px 0 #8A2B52, 0 0 24px rgba(255,107,157,0.4)',
    marginBottom: 14,
  },
  ghostSmall: {
    fontSize: 7, padding: '8px 16px',
    color: 'var(--lav)', background: 'transparent',
    border: '1px solid var(--shadow)', cursor: 'pointer',
  },

  // ── Major title card ──
  majorTitleContent: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px', position: 'relative', zIndex: 1, gap: 10,
  },
  majorTitleLabel: {
    fontSize: 'clamp(11px, 3.5vw, 16px)',
    letterSpacing: 4,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  majorDividerTop: {
    width: '100%', maxWidth: 300, height: 2,
    background: 'linear-gradient(90deg, transparent, var(--gold) 40%, #fff8dc 60%, var(--gold), transparent)',
    marginBottom: 8,
  },
  majorDividerBottom: {
    width: '100%', maxWidth: 300, height: 2,
    background: 'linear-gradient(90deg, transparent, var(--gold) 40%, #fff8dc 60%, var(--gold), transparent)',
    marginTop: 8,
  },

  // ── Award card ──
  progressTrack: {
    height: 3, background: 'var(--shadow)', flexShrink: 0,
  },
  progressFill: {
    height: '100%', background: 'var(--gold)',
    transition: 'width 0.5s ease',
  },
  progressLabel: {
    textAlign: 'center', fontSize: 7, color: 'var(--lav)',
    padding: '5px 0 0', flexShrink: 0,
  },
  awardCard: {
    margin: '10px 14px',
    padding: '18px 14px',
    border: '2px solid',
    background: 'var(--bg-panel)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10,
    flexShrink: 0,
    overflowY: 'auto',
    maxHeight: 'calc(100dvh - 140px)',
  },
  revealBtn: {
    fontSize: 9, padding: '13px 26px',
    background: 'var(--pink)', color: 'var(--bg-deep)',
    border: '2px solid #8A2B52', cursor: 'pointer',
    letterSpacing: 1, width: '100%', textAlign: 'center',
  },
  winnerCard: {
    width: '100%', padding: '14px 12px',
    border: '2px solid', background: 'var(--bg-inset)',
    display: 'flex', flexDirection: 'column',
    gap: 12, alignItems: 'center',
  },
  playerBadge: {
    fontSize: 8, color: 'var(--bg-deep)',
    background: 'var(--gold)', padding: '4px 12px',
    letterSpacing: 1, textAlign: 'center',
    width: '100%', boxSizing: 'border-box',
  },
  nextBtn: {
    width: '100%', fontSize: 9, padding: '12px',
    color: 'var(--bg-deep)', border: 'none',
    cursor: 'pointer', letterSpacing: 1, textAlign: 'center',
  },
  bottomRow: {
    display: 'flex', gap: 10, padding: '0 14px 14px',
    justifyContent: 'center', flexShrink: 0, marginTop: 'auto',
  },
  ghostBtn: {
    fontSize: 8, padding: '10px 14px',
    color: 'var(--lav)', background: 'transparent',
    border: '1px solid var(--shadow)', cursor: 'pointer',
  },

  // ── Summary ──
  summaryHeader: {
    padding: '14px 16px 10px',
    borderBottom: '2px solid var(--gold)',
    background: 'linear-gradient(180deg,rgba(255,215,0,0.08) 0%,transparent 100%)',
    textAlign: 'center', flexShrink: 0,
  },
  summaryScroll: {
    flex: 1, overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  sectionHead: {
    fontSize: 7, color: 'var(--lav)',
    textAlign: 'center', letterSpacing: 2,
    padding: '4px 0 6px',
    borderBottom: '1px solid var(--shadow)',
  },
  leaveBar: {
    padding: '10px 14px 18px', flexShrink: 0,
    borderTop: '2px solid var(--shadow)',
  },
  leaveBtn: {
    width: '100%', fontSize: 10, padding: '13px',
    background: 'var(--pink)', color: 'var(--bg-deep)',
    border: '2px solid #8A2B52', cursor: 'pointer',
    textAlign: 'center', letterSpacing: 1,
  },
}
