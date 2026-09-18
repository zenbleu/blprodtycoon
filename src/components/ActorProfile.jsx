/**
 * ActorProfile.jsx — Detailed actor page with full stats, chemistry map, filmography
 * Updated for Prompt 2: 8 skills, characteristics, chemistry_map, mood emoji.
 */
import React, { useMemo, useState, useCallback } from 'react'
import { useGame, A } from '../game/state.jsx'
import {
  SKILL_KEYS, SKILL_LABELS, STATUS_LABEL, STATUS_COLOR, TIER_COLOR,
  moodEmoji, actorDisplayName, checkTierPromotion, TIER_PROMOTION_REQ, xpToNextLevel,
} from '../game/actors.js'
import { getChem, chemTier, bondKey } from '../game/chemistry.js'
import { SFX } from '../game/audio.js'
import { ActorPortrait } from './ActorRoster.jsx'

export default function ActorProfile({ actorId, onBack }) {
  const { state, dispatch } = useGame()
  const actor = state.actors.find(a => a.id === actorId)

  // ── Fixed CP Contract data ──
  const fixedCP = useMemo(() => {
    if (!actor) return null
    return (state.fixedCPs ?? []).find(([a, b]) => a === actor.id || b === actor.id)
  }, [state.fixedCPs, actor])

  const fixedCPPartner = useMemo(() => {
    if (!fixedCP || !actor) return null
    const partnerId = fixedCP[0] === actor.id ? fixedCP[1] : fixedCP[0]
    return state.actors.find(a => a.id === partnerId)
  }, [fixedCP, state.actors, actor])

  const fixedCPName = useMemo(() => {
    if (!fixedCP) return ''
    const key = bondKey(fixedCP[0], fixedCP[1])
    return (state.fixedCPNames ?? {})[key] ?? ''
  }, [fixedCP, state.fixedCPNames])

  const successfulCPProductionsCount = useMemo(() => {
    if (!fixedCPPartner || !actor) return 0
    return state.history.filter(h => {
      const hasActor = (h.castIds ?? []).includes(actor.id)
      const hasPartner = (h.castIds ?? []).includes(fixedCPPartner.id)
      const isHighRated = ['B', 'A', 'S', 'S+'].includes(h.grade)
      return hasActor && hasPartner && isHighRated
    }).length
  }, [fixedCPPartner, state.history, actor])

  // ── Inline name editor state ──────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false)
  const [draftName,   setDraftName]   = useState('')

  const openEdit = useCallback(() => {
    setDraftName(actorDisplayName(actor))
    setEditingName(true)
  }, [actor])

  const saveName = useCallback(() => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== actor.name) {
      dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { customName: trimmed } })
    } else if (!trimmed) {
      dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { customName: null } })
    }
    setEditingName(false)
  }, [draftName, actor, dispatch])

  const cancelEdit = useCallback(() => setEditingName(false), [])

  const resetName = useCallback(() => {
    dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { customName: null } })
    setEditingName(false)
  }, [actor, dispatch])

  if (!actor) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onBack}>← BACK</button>
        <p style={{ marginTop: 16, color: 'var(--red)', fontSize: 9 }}>Actor not found.</p>
      </div>
    )
  }

  const isLocked   = !actor.signed
  const status     = actor.status ?? (isLocked ? 'locked' : 'available')
  const tierColor  = TIER_COLOR[actor.tier] ?? 'var(--lav)'
  const mood       = moodEmoji(actor.happiness ?? 70)
  const promotion  = checkTierPromotion(actor, state.history)
  const promotionReq = TIER_PROMOTION_REQ[actor.tier]

  // Productions this actor appeared in
  const appearances = useMemo(
    () => state.history.filter(h => h.castIds?.includes(actor.id)),
    [state.history, actor.id]
  )

  // 3.1: Chemistry only shown when actor is filming; only show CP partner
  const isFilming = actor.status === 'filming'

  const cpChemInfo = useMemo(() => {
    if (!isFilming) return null
    // Find their active production
    const activeProd = state.productions.find(
      p => p.status === 'active' && (p.castIds ?? []).includes(actor.id)
    )
    if (!activeProd) return null
    const leadIds = activeProd.leadIds ?? []
    // Find the partner (other lead)
    const partnerId = leadIds.find(id => id !== actor.id)
    if (!partnerId) return { partner: null, val: 0 }
    const partner = state.actors.find(a => a.id === partnerId)
    if (!partner) return { partner: null, val: 0 }
    return { partner, val: getChem(actor, partner.id) }
  }, [actor, state.actors, state.productions, isFilming])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Back button */}
      <button
        onClick={() => { SFX.click(); onBack() }}
        style={{ fontSize: 8, padding: '8px 12px', alignSelf: 'flex-start' }}
      >
        ← BACK TO ROSTER
      </button>

      {/* ── Identity panel ── */}
      <div className="panel">
        <div style={styles.identityRow}>
          {/* Portrait */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ActorPortrait actor={actor} size={120} isLocked={isLocked}
              style={{ border: `3px solid ${isLocked ? 'var(--gray)' : tierColor}` }}
            />
            {actor.tier === 'Worldwide' && !isLocked && (
              <div style={styles.wwGlow} />
            )}
          </div>

          <div style={styles.identityInfo}>
            {/* Name + mood + inline editor */}
            {editingName && !isLocked ? (
              <div style={{ marginBottom: 8 }}>
                <input
                  autoFocus
                  type="text"
                  value={draftName}
                  maxLength={24}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit() }}
                  style={{ fontSize: 11, padding: '5px 8px', width: '100%', marginBottom: 4, color: 'var(--pink)', background: 'var(--bg-inset)', border: '2px solid var(--pink)', outline: 'none' }}
                />
                {actor.customName && (
                  <div style={{ fontSize: 6, color: 'var(--gray)', marginBottom: 4 }}>
                    Original name: {actor.name}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={{ fontSize: 7, padding: '4px 10px', background: 'var(--pink)', color: '#000' }} onClick={saveName}>✓ SAVE</button>
                  <button style={{ fontSize: 7, padding: '4px 10px' }} onClick={cancelEdit}>✕ CANCEL</button>
                  {actor.customName && (
                    <button style={{ fontSize: 7, padding: '4px 10px', color: 'var(--gray)' }} onClick={resetName}>↺ RESET</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: isLocked ? 'var(--gray)' : 'var(--pink)' }}>
                  {isLocked ? '???' : actorDisplayName(actor)}
                </span>
                {!isLocked && <span style={{ fontSize: 20 }}>{mood}</span>}
                {!isLocked && (
                  <button
                    onClick={openEdit}
                    title="Edit name"
                    style={{ fontSize: 10, padding: '2px 6px', marginLeft: 2, background: 'transparent', border: '1px solid var(--shadow)', color: 'var(--lav)', cursor: 'pointer' }}
                  >✏️</button>
                )}
              </div>
            )}

            {/* Tier badge */}
            <div style={{ fontSize: 8, color: tierColor, marginBottom: 6 }}>
              {actor.tier}
              {actor.tier === 'Worldwide' && (
                <span style={{ color: 'var(--gold)', marginLeft: 6 }}>★ $150/wk retainer</span>
              )}
            </div>

            {/* Characteristics */}
            {!isLocked && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {(actor.characteristics ?? []).map(c => (
                  <span key={c} className="tag-chip">{c}</span>
                ))}
              </div>
            )}

            {/* Status */}
            <div style={{ fontSize: 8, color: STATUS_COLOR[status] ?? 'var(--gray)', marginBottom: 6 }}>
              {STATUS_LABEL[status]}
            </div>

            {/* Productions count + awards */}
            {!isLocked && (
              <div style={{ fontSize: 7, color: 'var(--gold)' }}>
                {appearances.length} production{appearances.length !== 1 ? 's' : ''}
                {(actor.awards ?? 0) > 0 && ` · ${actor.awards} 🏆`}
              </div>
            )}

            {/* Locked info */}
            {isLocked && (
              <div style={{ fontSize: 7, color: 'var(--gray)', marginTop: 4 }}>
                Appears at Audition Weeks<br />
                Sign cost: ₩{(actor.signCost ?? 0).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats panel ── */}
      {!isLocked && (
        <div className="panel">
          <div className="panel-title">📊 SKILLS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            {SKILL_KEYS.map(key => (
              <SkillBar
                key={key}
                label={SKILL_LABELS[key]}
                value={actor.skills?.[key] ?? 0}
                tier={actor.tier}
              />
            ))}
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 8 }}>
            Sign cost: ₩{(actor.signCost ?? 0).toLocaleString()}
          </div>
        </div>
      )}

      {!isLocked && (
        <div className="panel">
          <div className="panel-title">📈 CAREER PROGRESS</div>
          <div style={styles.progressIntro}>
            Productions build this actor’s career. XP raises level; fame, grades, awards, happiness, and loyalty
            determine when the next tier promotion becomes available.
          </div>
          <div style={styles.careerGrid}>
            <CareerStat label="LEVEL" value={actor.level ?? 1} color="var(--blue)" />
            <CareerStat label="XP" value={(actor.exp ?? 0).toLocaleString()} color="var(--lav)" />
            <CareerStat label="FAME" value={(actor.fame ?? 0).toLocaleString()} color="var(--gold)" />
            <CareerStat label="LOYALTY" value={`${actor.loyalty ?? 0}/100`} color="var(--pink)" />
            <CareerStat label="HAPPINESS" value={`${actor.happiness ?? 0}/100`} color="var(--green)" />
          </div>
          {promotionReq ? (
            <>
              <div style={{ fontSize: 7, color: 'var(--gold)', marginTop: 10 }}>
                NEXT: {promotionReq.nextTier}
              </div>
              <div style={styles.requirementList}>
                {promotion.unmet.map(item => <span key={item} style={{ color: 'var(--lav)' }}>□ {item}</span>)}
                {promotion.unmet.length === 0 && (
                  <span style={{ color: 'var(--green)' }}>✓ All requirements met — advance a week to resolve the promotion.</span>
                )}
              </div>
              <div style={{ fontSize: 6.5, color: 'var(--gray)', marginTop: 6 }}>
                Current level {actor.level ?? 1} · next XP step {xpToNextLevel(actor.level ?? 1).toLocaleString()}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 7, color: 'var(--gold)', marginTop: 9 }}>
              ✦ Worldwide is the maximum actor tier.
            </div>
          )}
        </div>
      )}

      {/* ── Chemistry panel — 3.1: only visible when actor is actively filming ── */}
      {!isLocked && isFilming && (
        <div className="panel">
          <div className="panel-title">💕 CHEMISTRY (ON-SET)</div>
          {cpChemInfo?.partner ? (() => {
            const { partner, val } = cpChemInfo
            const tier = chemTier(val)
            return (
              <div>
                <div style={styles.chemRow}>
                  <ActorPortrait actor={partner} size={32} isLocked={!partner.signed} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 7, color: 'var(--white)', marginBottom: 3 }}>
                      {actorDisplayName(partner)} (CP Partner)
                    </div>
                    <div style={styles.chemTrack}>
                      <div style={{ ...styles.chemFill, width: `${val}%`, background: tier.color }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 8, color: tier.color, flexShrink: 0, textAlign: 'right' }}>
                    <div>{tier.emoji} {val}</div>
                    <div style={{ fontSize: 6 }}>{tier.label}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, fontSize: 7, color: 'var(--lav)' }}>
                  ★ Chemistry grows through filming together. Revealed fully after production.
                </div>
              </div>
            )
          })() : (
            <div style={{ fontSize: 8, color: 'var(--gray)', padding: '8px 0' }}>
              No CP assigned for current production.
            </div>
          )}
        </div>
      )}
      {!isLocked && !isFilming && (
        <div className="panel" style={{ opacity: 0.55 }}>
          <div className="panel-title">💕 CHEMISTRY</div>
          <div style={{ fontSize: 7, color: 'var(--gray)', padding: '6px 0' }}>
            Chemistry details are only visible while this actor is in an active production.
          </div>
        </div>
      )}

      {/* ── Fixed CP Contract Panel ── */}
      {!isLocked && fixedCPPartner && (
        <div className="panel" style={{ border: '2px solid var(--pink)', background: 'rgba(255,107,157,0.03)' }}>
          <div className="panel-title" style={{ color: 'var(--pink)' }}>💞 COUPLE PAIRING (FIXED CP) STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ActorPortrait actor={fixedCPPartner} size={48} isLocked={!fixedCPPartner.signed} />
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 9, color: 'var(--white)', fontWeight: 'bold' }}>
                CP Partner: {actorDisplayName(fixedCPPartner)}
              </div>
              {fixedCPName && (
                <div style={{ fontSize: 8, color: 'var(--pink)', marginTop: 2 }}>
                  CP Name: &quot;{fixedCPName}&quot;
                </div>
              )}
              <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 4 }}>
                Successful high-rated productions completed together:
                <span style={{ color: 'var(--gold)', marginLeft: 4, fontWeight: 'bold' }}>
                  {successfulCPProductionsCount} / 3
                </span>
              </div>
              <div style={{ fontSize: 6.5, color: 'var(--gray)', marginTop: 4, lineHeight: 1.4 }}>
                *Requires 3 productions with grade B or higher to negotiate an amicable graduation contract (resetting to Unfixed with zero penalties).
              </div>
            </div>

            {/* Action button */}
            <div style={{ flexShrink: 0, marginTop: 4 }}>
              <button
                type="button"
                disabled={successfulCPProductionsCount < 3}
                onClick={() => {
                  SFX.confirm()
                  dispatch({ type: A.GRADUATE_FIXED_CP, pair: [actor.id, fixedCPPartner.id] })
                  dispatch({
                    type: A.PUSH_MODAL,
                    modal: {
                      type: 'generic',
                      data: {
                        title: '🎉 AMICABLE GRADUATION!',
                        message: `The beloved couple "${fixedCPName || `${actor.name} & ${fixedCPPartner.name}`}" has amicably graduated! Fans celebrate their past work while being extremely excited for their individual paths. They are now free to pair with other actors with ZERO loyalty or reputation penalty!`,
                      }
                    }
                  })
                }}
                className={successfulCPProductionsCount >= 3 ? 'btn-primary' : ''}
                style={{
                  fontSize: 8,
                  padding: '8px 12px',
                  cursor: successfulCPProductionsCount >= 3 ? 'pointer' : 'not-allowed',
                  opacity: successfulCPProductionsCount >= 3 ? 1 : 0.5,
                }}
              >
                🎉 Coordinate Graduation Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Downtime Activity Panel (Con 4) ── */}
      {!isLocked && actor.status !== 'filming' && (
        <div className="panel" style={{ border: '2px solid var(--blue)', background: 'rgba(107,197,255,0.03)' }}>
          <div className="panel-title" style={{ color: 'var(--blue)' }}>🏃 DOWNTIME ACTIVITY</div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 8, lineHeight: 1.4 }}>
            Assign idle actors to downtime activities to maintain morale or grow skills.
          </div>
          <div className="seg" style={{ gap: 6, display: 'flex', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={!actor.subActivity ? 'sel' : ''}
              onClick={() => {
                SFX.click();
                dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { subActivity: null } })
              }}
              style={{ fontSize: 7.5, padding: '6px 10px', flex: '1 1 auto' }}
            >
              Default (Idle Decay)
            </button>
            <button
              type="button"
              className={actor.subActivity === 'training' ? 'sel' : ''}
              onClick={() => {
                SFX.click();
                dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { subActivity: 'training' } })
              }}
              style={{ fontSize: 7.5, padding: '6px 10px', flex: '1 1 auto' }}
            >
              🏫 Acting Masterclass (−₩150/wk)
            </button>
            <button
              type="button"
              className={actor.subActivity === 'fan_meeting' ? 'sel' : ''}
              onClick={() => {
                SFX.click();
                dispatch({ type: A.UPDATE_ACTOR, id: actor.id, patch: { subActivity: 'fan_meeting' } })
              }}
              style={{ fontSize: 7.5, padding: '6px 10px', flex: '1 1 auto' }}
            >
              🤝 Fan Meeting (−₩250/wk)
            </button>
          </div>
          <div style={{ fontSize: 6.5, color: 'var(--gray)', marginTop: 6, lineHeight: 1.4 }}>
            {actor.subActivity === 'training' && "★ Training active: Morale +2/wk · ACT Skill +0.2/wk · Deducts ₩150 each week."}
            {actor.subActivity === 'fan_meeting' && "★ Fan Meeting active: Morale +4/wk · Loyalty +1/wk · Deducts ₩250 each week."}
            {!actor.subActivity && "★ Idle active: Happiness decay based on tier · Loyalty decline if happiness is Sad or Angry."}
          </div>
        </div>
      )}

      {/* ── Filmography ── */}
      {appearances.length > 0 && (
        <div className="panel">
          <div className="panel-title">🎬 FILMOGRAPHY</div>
          {appearances.map(h => (
            <FilmRow key={h.id} record={h} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Skill bar with tier-coloured fill ────────────────────────────────────────
function SkillBar({ label, value, tier }) {
  const fillColor =
    tier === 'Worldwide'   ? 'var(--gold)'  :
    tier === 'Popular'     ? 'var(--pink)'  :
    tier === 'Rising Star' ? 'var(--blue)'  :
    'var(--lav)'

  return (
    <div className="stat-bar-wrap">
      <span className="bar-label" style={{ width: 28 }}>{label}</span>
      <div className="bar-track" style={{ flex: 1 }}>
        <div className="bar-fill" style={{ width: `${value}%`, background: fillColor }} />
      </div>
      <span className="bar-val">{value}</span>
    </div>
  )
}

function FilmRow({ record }) {
  const gradeColor = {
    'S+': '#FFD700', S: '#FFD700', A: '#5CE1A0',
     B: '#6BC5FF',  C: '#9B86C4', D: '#FF5470', F: '#FF5470',
  }
  return (
    <div style={styles.filmRow}>
      <span style={{ color: gradeColor[record.grade] ?? 'var(--white)', fontSize: 12, width: 24 }}>
        {record.grade}
      </span>
      <span style={{ flex: 1, fontSize: 8, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {record.title}
      </span>
      <span style={{ fontSize: 7, color: 'var(--lav)', flexShrink: 0 }}>Wk{record.weekCompleted}</span>
    </div>
  )
}

const styles = {
  identityRow: {
    display:  'flex',
    gap:      14,
    flexWrap: 'wrap',
  },
  identityInfo: {
    flex:    1,
    minWidth: 140,
  },
  wwGlow: {
    position:   'absolute',
    inset:      -4,
    borderRadius: 6,
    boxShadow:  '0 0 18px rgba(255,215,0,0.5)',
    pointerEvents: 'none',
  },
  chemRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        8,
    padding:    '3px 0',
    borderBottom: '1px solid var(--shadow)',
  },
  chemTrack: {
    height:     6,
    background: 'var(--bg-inset)',
    border:     '1px solid var(--shadow)',
  },
  chemFill: {
    height:     '100%',
    transition: 'width 0.3s',
  },
  filmRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        10,
    padding:    '5px 0',
    borderBottom: '1px solid var(--shadow)',
  },
  progressIntro: {
    fontSize: 7,
    color: 'var(--lav)',
    lineHeight: 1.7,
    marginBottom: 8,
  },
  careerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 5,
  },
  requirementList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    marginTop: 6,
    fontSize: 6.5,
    lineHeight: 1.5,
  },
}

function CareerStat({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--shadow)', padding: 6, minWidth: 0 }}>
      <div style={{ fontSize: 5.5, color: 'var(--lav)' }}>{label}</div>
      <div style={{ fontSize: 7.5, color, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )
}
