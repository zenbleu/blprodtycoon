/**
 * ModalSystem.jsx — Global modal queue renderer
 * Prompt 8: slide-up animation, queue badge, confetti on awards/rankUp
 */
import React, { useState, useEffect, useRef } from 'react'
import { useGame, A } from '../game/state.jsx'
import { fmtMoney } from '../game/ranking.js'
import { SFX } from '../game/audio.js'
import { TIER_COLOR } from '../game/actors.js'
import { triggerConfetti } from './Confetti.jsx'
import { ActorPortrait } from './ActorRoster.jsx'

export default function ModalSystem() {
  const { state, dispatch } = useGame()
  const [modal] = state.modalQueue
  const queueLen  = state.modalQueue.length
  const prevModal = useRef(null)

  // Play SFX and fire confetti on every new modal
  useEffect(() => {
    if (!modal) return
    // Only react when the modal id/type actually changes
    const key = modal.type + JSON.stringify(modal.data?.label ?? modal.data?.title ?? '')
    if (prevModal.current === key) return
    prevModal.current = key

    // Choose sound based on type
    if (modal.type === 'rankUp') {
      SFX.levelUp()
      triggerConfetti(1.2)
    } else if (modal.type === 'productionResult' && modal.data?.eval?.awarded) {
      SFX.award()
      triggerConfetti(1.5)
    } else if (
      modal.type === 'event' &&
      typeof modal.data?.label === 'string' &&
      modal.data.label.includes('VICTORY')
    ) {
      SFX.success()
      triggerConfetti(0.8)
    } else {
      SFX.modal()
    }
  }, [modal])

  if (!modal) return null

  function dismiss() {
    SFX.click()
    dispatch({ type: A.POP_MODAL })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && dismiss()}>

      {/* Queue counter badge */}
      {queueLen > 1 && (
        <div style={{
          position:    'fixed',
          top:         12,
          right:       12,
          background:  'var(--pink)',
          color:       'var(--bg-deep)',
          fontSize:    7,
          padding:     '4px 8px',
          zIndex:      100001,
          border:      '2px solid #8A2B52',
          boxShadow:   '2px 2px 0 var(--shadow)',
          pointerEvents: 'none',
        }}>
          {queueLen - 1} MORE ▼
        </div>
      )}

      {modal.type === 'productionResult' && (
        <ProductionResultModal data={modal.data} onClose={dismiss} />
      )}
      {modal.type === 'rankUp' && (
        <RankUpModal data={modal.data} onClose={dismiss} />
      )}
      {modal.type === 'event' && (
        <EventModal data={modal.data} onClose={dismiss} dispatch={dispatch} state={state} />
      )}
      {modal.type === 'generic' && (
        <GenericModal data={modal.data} onClose={dismiss} />
      )}
      {modal.type === 'audition' && (
        <AuditionModal data={modal.data} onClose={dismiss} dispatch={dispatch} state={state} />
      )}
      {modal.type === 'actorQuitNotice' && (
        <ActorQuitNoticeModal data={modal.data} onClose={dismiss} />
      )}
      {modal.type === 'actorBurnLetter' && (
        <ActorBurnLetterModal data={modal.data} onClose={dismiss} />
      )}
    </div>
  )
}

// ── Production Result — Four Critics ─────────────────────────────────────────
function ProductionResultModal({ data, onClose }) {
  const { prod, eval: ev, score, revenue } = data
  const [tab, setTab] = useState('critics')    // 'critics' | 'fans' | 'social'

  const hasCritics = ev.critics?.length === 4
  const awarded    = ev.awarded
  const avgStars   = ev.avgStars ?? 0

  return (
    <div className="modal-box" style={{ maxHeight: '90dvh', overflowY: 'auto', padding: 0 }}>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>🎬 FINAL CRITIQUE</div>

      </div>

      <div style={{ padding: '0 14px 14px' }}>

        {/* Production title & grade */}
        <div style={styles.gradeRow}>
          <div>
            <div style={{ fontSize: 8, color: 'var(--lav)', marginBottom: 2 }}>{prod.title}</div>
            <div style={{ fontSize: 14, color: ev.color }}>{ev.grade} — {ev.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <StarDisplay stars={avgStars} />
            <div style={{ fontSize: 7, color: 'var(--lav)' }}>{avgStars}/5 avg</div>
          </div>
        </div>

        {/* Awards banner */}
        {awarded && (
          <div style={styles.awardBanner}>
            🏆 INDUSTRY AWARD — Studio earns +10 rep · +₩3,000 · cast awarded!
          </div>
        )}

        {/* Tabs */}
        {hasCritics && (
          <div className="seg" style={{ marginBottom: 12 }}>
            {[
              { id: 'critics', label: '📝 Critics' },
              { id: 'fans',    label: '💬 Reviews' },
              { id: 'social',  label: '📱 Social'  },
            ].map(t => (
              <button key={t.id} type="button"
                className={tab === t.id ? 'sel' : ''}
                style={{ fontSize: 7, flex: 1, textAlign: 'center' }}
                onClick={() => { SFX.click(); setTab(t.id) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Critics tab ── */}
        {tab === 'critics' && hasCritics && (
          <div style={styles.criticsGrid}>
            {ev.critics.map(c => (
              <CriticCard key={c.id} critic={c} />
            ))}
          </div>
        )}

        {/* ── Fan reviews tab ── */}
        {tab === 'fans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(ev.fanReviews ?? []).map((r, i) => (
              <div key={i} style={styles.reviewCard}>
                <div style={{ fontSize: 7, color: 'var(--lav)', lineHeight: 2 }}>{r}</div>
              </div>
            ))}
            {(!ev.fanReviews || ev.fanReviews.length === 0) && (
              <div style={{ fontSize: 8, color: 'var(--gray)', textAlign: 'center', padding: '16px 0' }}>
                No fan reviews yet.
              </div>
            )}
          </div>
        )}

        {/* ── Social posts tab ── */}
        {tab === 'social' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(ev.socialPosts ?? []).map((p, i) => (
              <div key={i} style={styles.socialCard}>
                <div style={{ fontSize: 7, color: 'var(--white)', lineHeight: 2 }}>{p}</div>
              </div>
            ))}
            {(!ev.socialPosts || ev.socialPosts.length === 0) && (
              <div style={{ fontSize: 8, color: 'var(--gray)', textAlign: 'center', padding: '16px 0' }}>
                Nothing trending yet.
              </div>
            )}
          </div>
        )}

        {/* Fallback — no critics data */}
        {!hasCritics && (
          <div style={{ fontSize: 8, color: 'var(--lav)', textAlign: 'center', fontStyle: 'italic', marginBottom: 16, lineHeight: 2 }}>
            {ev.criticQuote}
          </div>
        )}

        {/* ── Stats bar ── */}
        <div style={styles.statsBar}>
          <Stat label="SCORE"    value={`${score}/100`}          color="var(--pink)"  />
          <Stat label="REVENUE"  value={fmtMoney(revenue)}       color="var(--gold)"  />
          <Stat label="REP Δ"    value={delta(ev.repDelta)}      color={ev.repDelta >= 0 ? 'var(--green)' : 'var(--red)'} />
          <Stat label="POP Δ"    value={`+${(ev.popDelta ?? 0).toLocaleString()}`} color="var(--blue)" />
          <Stat label="XP"       value={`+${ev.xpPerActor ?? 0}/actor`} color="var(--lav)" />
        </div>

        {/* Details */}
        <div style={styles.detailRow}>
          <span style={{ color: 'var(--lav)' }}>Genre:</span> {prod.genre}
          {prod.cpName && <> · <span style={{ color: 'var(--pink)' }}>♥ {prod.cpName}</span></>}
          {prod.platform && <> · <span style={{ color: 'var(--lav)' }}>{prod.platform.toUpperCase()}</span></>}
        </div>

        <button className="btn-primary" style={styles.closeBtn} onClick={onClose}>
          ▶ CONTINUE
        </button>
      </div>
    </div>
  )
}

// ─── Critic card ──────────────────────────────────────────────────────────────
function CriticCard({ critic }) {
  const starColor = critic.stars >= 4 ? 'var(--gold)' : critic.stars >= 3 ? 'var(--pink)' : 'var(--gray)'
  return (
    <div style={styles.criticCard}>
      <div style={styles.criticHeader}>
        <span style={{ fontSize: 18 }}>{critic.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, color: 'var(--white)' }}>{critic.name}</div>
          <div style={{ fontSize: 6, color: 'var(--lav)' }}>{critic.role}</div>
        </div>
      </div>
      <StarDisplay stars={critic.stars} color={starColor} size={18} />
      <div style={{ fontSize: 6, color: 'var(--gray)', marginTop: 6, fontStyle: 'italic', lineHeight: 1.8 }}>
        {critic.quote}
      </div>
    </div>
  )
}

// ─── Star display ─────────────────────────────────────────────────────────────
function StarDisplay({ stars, color = 'var(--gold)', size = 14 }) {
  const full  = Math.floor(stars)
  const half  = (stars % 1) >= 0.5 ? 1 : 0
  const empty = Math.max(0, 5 - full - half)
  return (
    <span style={{ fontSize: size, color, letterSpacing: 1, lineHeight: 1 }}>
      {'★'.repeat(full)}
      {half ? <span style={{ opacity: 0.6 }}>★</span> : null}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(empty)}</span>
    </span>
  )
}

// ── Rank Up ───────────────────────────────────────────────────────────────────
function RankUpModal({ data, onClose }) {
  const { rank } = data
  return (
    <div className="modal-box" style={{ textAlign: 'center' }}>
      <div className="modal-title">🏆 RANK UP!</div>

      <div style={{ fontSize: 32, margin: '16px 0' }}>🎉</div>
      <div style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 8 }}>STUDIO STATUS INCREASED</div>
      <div style={{ fontSize: 14, color: rank.color, marginBottom: 20 }}>{rank.label}</div>
      <div style={{ fontSize: 8, color: 'var(--lav)', marginBottom: 20 }}>
        Your reputation and reach have grown.<br />New opportunities await!
      </div>
      <button className="btn-gold" style={styles.closeBtn} onClick={onClose}>✨ AMAZING!</button>
    </div>
  )
}

// ── Random Event ──────────────────────────────────────────────────────────────
function EventModal({ data, onClose, dispatch, state }) {
  function choose(choice) {
    SFX.confirm()
    try { choice.effect(state, dispatch) } catch (e) { console.error(e) }
    onClose()
  }
  return (
    <div className="modal-box">
      <div className="modal-title">{data.label ?? '📰 EVENT'}</div>
      <div style={{ fontSize: 8, color: 'var(--white)', lineHeight: 2, marginBottom: 16 }}>
        {data.message}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(data.choices ?? []).map((c, i) => (
          <button key={i} style={{ textAlign: 'center', fontSize: 8, padding: '12px' }} onClick={() => choose(c)}>
            {c.label}
          </button>
        ))}
        {(!data.choices || data.choices.length === 0) && (
          <button className="btn-primary" style={styles.closeBtn} onClick={onClose}>OK</button>
        )}
      </div>
    </div>
  )
}

// ── Generic ───────────────────────────────────────────────────────────────────
function GenericModal({ data, onClose }) {
  const isAward = data.isAwardMessage;
  return (
    <div className="modal-box" style={isAward ? { textAlign: 'center' } : {}}>
      <div className="modal-title" style={isAward ? { textAlign: 'center', width: '100%', fontSize: '13px' } : {}}>
        {data.title ?? 'Notice'}
      </div>

      <div style={{
        fontSize: isAward ? 11 : 8,
        color: 'var(--white)',
        lineHeight: 2,
        marginBottom: 16,
        whiteSpace: 'pre-line',
        textAlign: isAward ? 'center' : 'left'
      }}>
        {data.message}
      </div>
      <button className="btn-primary" style={styles.closeBtn} onClick={onClose}>OK</button>
    </div>
  )
}

// ── Audition ──────────────────────────────────────────────────────────────────
function AuditionModal({ data, onClose, dispatch, state }) {
  const { candidates } = data
  // Track which actor IDs have been signed from this modal (local optimistic state)
  const [signedIds, setSignedIds] = React.useState([])

  const unsigned = candidates.filter(a => !signedIds.includes(a.id) && !state.actors.find(sa => sa.id === a.id && sa.signed))

  // Sign cost penalty: +40% for 8 weeks after a Studio Reputation Crisis
  const signCostMult = (state.flags?.signCostPenaltyUntilWeek ?? 0) > state.week ? 1.4 : 1.0
  const effCost = (base) => Math.round(base * signCostMult)

  function signOne(actor) {
    SFX.confirm()
    const cost = effCost(actor.signCost)
    if (state.money < cost) {
      dispatch({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
        title: '💸 INSUFFICIENT FUNDS',
        message: `You need ₩${cost.toLocaleString()} to sign ${actor.name}.`,
      } } })
      return
    }
    dispatch({ type: A.SIGN_ACTOR, id: actor.id, cost })
    setSignedIds(prev => [...prev, actor.id])
  }

  function signAll() {
    SFX.success()
    const eligible = unsigned
    if (!eligible.length) return
    const total = Math.round(eligible.reduce((s, a) => s + effCost(a.signCost), 0) * 0.7)
    if (state.money < total) {
      dispatch({ type: A.PUSH_MODAL, modal: { type: 'generic', data: {
        title: '💸 INSUFFICIENT FUNDS',
        message: `You need ₩${total.toLocaleString()} (30% off) to sign all ${eligible.length} actors.`,
      } } })
      return
    }
    dispatch({ type: A.BULK_SIGN, pairs: eligible.map(a => ({ id: a.id, cost: effCost(a.signCost) })) })
    setSignedIds(prev => [...prev, ...eligible.map(a => a.id)])
  }

  const bulkTotal = Math.round(unsigned.reduce((s, a) => s + effCost(a.signCost), 0) * 0.7)

  return (
    <div className="modal-box" style={{ maxHeight: '92dvh', overflowY: 'auto', padding: 0 }}>
      {/* Header */}
      <div style={{ ...styles.header, position: 'sticky', top: 0, zIndex: 2 }}>
        <div style={styles.headerTitle}>🎭 AUDITION WEEK</div>

      </div>

      <div style={{ padding: '10px 14px 14px' }}>
        <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 12, lineHeight: 2 }}>
          Actors seeking contracts this week. Sign now or wait for the next audition round.
        </div>

        {/* Candidate cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          {candidates.map(actor => {
            const alreadySigned = signedIds.includes(actor.id) ||
              state.actors.find(a => a.id === actor.id && a.signed)
            const canAfford     = state.money >= effCost(actor.signCost)
            return (
              <div key={actor.id} style={{
                ...auStyles.card,
                borderColor: alreadySigned ? 'var(--green)' : 'var(--shadow)',
                opacity: alreadySigned ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Tier dot */}
                  <div style={{ ...auStyles.tierDot, background: TIER_COLOR[actor.tier] ?? '#aaa' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--white)' }}>{actor.name}</div>
                    <div style={{ fontSize: 7, color: TIER_COLOR[actor.tier] ?? 'var(--lav)' }}>
                      {actor.tier}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 8, color: 'var(--gold)' }}>
                      ₩{effCost(actor.signCost).toLocaleString()}
                      {signCostMult > 1 && <span style={{ fontSize: 6, color: 'var(--red)', marginLeft: 4 }}>+40% crisis</span>}
                    </div>
                  </div>
                </div>

                {/* Top 4 skills */}
                <div style={auStyles.skills}>
                  {Object.entries(actor.skills ?? {}).slice(0, 4).map(([k, v]) => (
                    <div key={k} style={auStyles.skillItem}>
                      <span style={{ fontSize: 6, color: 'var(--lav)' }}>{k.toUpperCase()}</span>
                      <span style={{ fontSize: 8, color: 'var(--pink)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Sign button */}
                {alreadySigned ? (
                  <div style={{ fontSize: 8, color: 'var(--green)', textAlign: 'center', padding: '8px 0' }}>
                    ✓ SIGNED
                  </div>
                ) : (
                  <button
                    onClick={() => signOne(actor)}
                    disabled={!canAfford}
                    style={{
                      width: '100%', textAlign: 'center', fontSize: 8, padding: '10px',
                      marginTop: 6,
                      opacity: canAfford ? 1 : 0.45,
                    }}
                  >
                    {canAfford ? `✍️ SIGN (₩${effCost(actor.signCost).toLocaleString()})` : '💸 INSUFFICIENT FUNDS'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Bulk sign */}
        {unsigned.length >= 2 && (
          <button
            className="btn-gold"
            onClick={signAll}
            disabled={state.money < bulkTotal}
            style={{ ...styles.closeBtn, marginBottom: 8, opacity: state.money >= bulkTotal ? 1 : 0.45 }}
          >
            💕 SIGN ALL {unsigned.length} — ₩{bulkTotal.toLocaleString()} (30% OFF)
          </button>
        )}

        <button onClick={onClose} style={{ ...styles.closeBtn, fontSize: 8 }}>
          PASS THIS WEEK
        </button>
      </div>
    </div>
  )
}

// ── Actor Quit Notice ─────────────────────────────────────────────────────────
function ActorQuitNoticeModal({ data, onClose }) {
  const { state } = useGame()
  const actor = state.actors.find(a => a.id === data.actorId)

  return (
    <div className="modal-box" style={{ textAlign: 'center' }}>
      <div className="modal-title" style={{ color: 'var(--red)' }}>💥 ACTOR QUIT</div>


      {actor && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 8px' }}>
          <ActorPortrait actor={actor} size={80} style={{ border: '3px solid var(--red)' }} />
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 6 }}>
        {data.actorName}
      </div>
      <div style={{ fontSize: 8, color: 'var(--white)', lineHeight: 2, marginBottom: 8 }}>
        has <strong>QUIT</strong> the studio after {data.idleWeeks} week{data.idleWeeks !== 1 ? 's' : ''} benched.
        <br />(Loyalty: 0)
      </div>
      <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 20, lineHeight: 1.9 }}>
        They will return to the Free Agents Pool at <strong>Week {data.returnWeek}</strong>.
        <br />Re-sign cost will be 3× the original.
      </div>

      <button className="btn-primary" style={styles.closeBtn} onClick={onClose}>
        CONFIRM
      </button>
    </div>
  )
}

// ── Actor Burn Letter ─────────────────────────────────────────────────────────
function ActorBurnLetterModal({ data, onClose }) {
  return (
    <div className="modal-box">
      <div className="modal-title">🧳 {data.actorName} — FAREWELL</div>


      <div style={{
        fontSize: 8,
        color: 'var(--white)',
        lineHeight: 2.2,
        marginBottom: 20,
        fontStyle: 'italic',
        background: 'var(--bg-inset)',
        padding: '14px',
        border: '1px solid var(--shadow)',
        borderLeft: '3px solid var(--red)',
        whiteSpace: 'pre-line',
      }}>
        {data.letterText}
      </div>

      <button className="btn-primary" style={styles.closeBtn} onClick={onClose}>
        NOTED
      </button>
    </div>
  )
}

const auStyles = {
  card: {
    background:  'var(--bg-inset)',
    border:      '2px solid',
    padding:     '10px 12px',
  },
  tierDot: {
    width:        10,
    height:       10,
    borderRadius: '50%',
    flexShrink:   0,
  },
  skills: {
    display:             'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:                 6,
    margin:              '8px 0 0',
  },
  skillItem: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            2,
    background:     'var(--bg-deep)',
    padding:        '4px 2px',
  },
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
      <span style={{ fontSize: 6, color: 'var(--lav)' }}>{label}</span>
      <span style={{ fontSize: 9, color }}>{value}</span>
    </div>
  )
}

function delta(n) {
  return `${n >= 0 ? '+' : ''}${n}`
}

const styles = {
  header: {
    display:        'flex',
    alignItems:     'center',
    padding:        '12px 14px 10px',
    borderBottom:   '2px solid var(--shadow)',
    position:       'sticky',
    top:            0,
    background:     'var(--bg-panel)',
    zIndex:         2,
  },
  headerTitle: {
    fontSize: 10,
    color:    'var(--pink)',
  },
  gradeRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    margin:         '12px 0 10px',
  },
  awardBanner: {
    background:   'rgba(255,215,0,0.12)',
    border:       '2px solid var(--gold)',
    color:        'var(--gold)',
    fontSize:     7,
    padding:      '7px 10px',
    textAlign:    'center',
    marginBottom: 12,
    lineHeight:   2,
  },
  criticsGrid: {
    display:               'grid',
    gridTemplateColumns:   'repeat(2, 1fr)',
    gap:                   10,
    marginBottom:          12,
  },
  criticCard: {
    background:  'var(--bg-inset)',
    border:      '2px solid var(--shadow)',
    padding:     '8px 10px',
    display:     'flex',
    flexDirection: 'column',
    gap:         4,
  },
  criticHeader: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        6,
    marginBottom: 4,
  },
  reviewCard: {
    background: 'var(--bg-inset)',
    border:     '1px solid var(--shadow)',
    padding:    '8px 10px',
    borderLeft: '3px solid var(--pink)',
  },
  socialCard: {
    background: 'var(--bg-inset)',
    border:     '1px solid var(--shadow)',
    padding:    '8px 10px',
    borderLeft: '3px solid var(--blue)',
  },
  statsBar: {
    display:      'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap:          8,
    textAlign:    'center',
    background:   'var(--bg-inset)',
    padding:      10,
    border:       '2px solid var(--shadow)',
    margin:       '12px 0 8px',
  },
  detailRow: {
    fontSize: 7,
    color:    'var(--white)',
    marginBottom: 12,
  },
  closeBtn: {
    width:     '100%',
    textAlign: 'center',
    fontSize:  10,
    padding:   14,
  },
}

// Inject responsive CSS for critic grid on mobile
if (typeof document !== 'undefined') {
  const id = 'critic-modal-css'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @media (max-width: 480px) {
        .critics-grid-2col { grid-template-columns: 1fr !important; }
      }
    `
    document.head.appendChild(s)
  }
}
