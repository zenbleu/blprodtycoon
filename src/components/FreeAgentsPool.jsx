/**
 * FreeAgentsPool.jsx — Free Agents Pool (3.4)
 * Type A: Ex-actors from original 20 who left (2× stats, re-sign cost)
 * Type B: New talent (5 per tier, normal stats, standard sign cost)
 */
import React, { useMemo, useState } from 'react'
import { useGame, A, pushToast, pushEventLog } from '../game/state.jsx'
import { TIER_COLOR, moodEmoji, NEW_TALENT_POOL, TIER_ORDER, startHoneymoon, HONEYMOON_NEW_RECRUIT_WEEKS, HONEYMOON_RESIGN_WEEKS } from '../game/actors.js'
import { SFX } from '../game/audio.js'
import { fmtMoney } from '../game/ranking.js'
import { ActorPortrait } from './ActorRoster.jsx'

const BASE = import.meta.env.BASE_URL

export default function FreeAgentsPool() {
  const { state, dispatch } = useGame()
  const [pendingSign, setPendingSign] = useState(null)  // { kind, data }

  const week = state.week
  // Sign cost penalty: +40% for 8 weeks after a Studio Reputation Crisis
  const signCostMult = (state.flags?.signCostPenaltyUntilWeek ?? 0) > week ? 1.4 : 1.0
  const effCost = (base) => Math.round(base * signCostMult)

  // ── Ex-actors (Type A) ────────────────────────────────────────────────────
  const exActors = useMemo(() => {
    return (state.freeAgentsPool ?? [])
      .filter(e => e.type === 'ex_actor' && !e.permanentlyGone && e.availableWeek <= week)
      .sort((a, b) => a.availableWeek - b.availableWeek)
  }, [state.freeAgentsPool, week])

  const exActorsCooling = useMemo(() => {
    return (state.freeAgentsPool ?? [])
      .filter(e => e.type === 'ex_actor' && !e.permanentlyGone && e.availableWeek > week)
  }, [state.freeAgentsPool, week])

  // ── New talent (Type B) — filter by unlocked tiers ──────────────────────
  const newTalent = useMemo(() => {
    const signedPoolIds = new Set(
      state.actors.filter(a => a.poolId).map(a => a.poolId)
    )
    const returnedPoolIds = new Set(
      (state.freeAgentsPool ?? [])
        .filter(e => e.type === 'new_talent')
        .map(e => e.poolId)
    )

    return NEW_TALENT_POOL.filter(nt => {
      if (!state.unlockedTiers.includes(nt.tier)) return false
      if (signedPoolIds.has(nt.poolId)) return false
      // Check if they've been returned to pool as permanently gone
      const poolEntry = (state.freeAgentsPool ?? []).find(e => e.poolId === nt.poolId)
      if (poolEntry?.permanentlyGone) return false
      return true
    })
  }, [state.actors, state.freeAgentsPool, state.unlockedTiers])

  // ── New talent returned to pool (Type B, idleReturnCount ≥ 1) ────────────
  const returnedTalent = useMemo(() => {
    return (state.freeAgentsPool ?? [])
      .filter(e => e.type === 'new_talent' && !e.permanentlyGone)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [state.freeAgentsPool])

  function doSignExActor(entry) {
    const cost = effCost(entry.signCost)
    if (state.money < cost) {
      SFX.fail()
      pushToast(dispatch, `Need ${fmtMoney(cost)} to re-sign ${entry.name}.`, 'red')
      return
    }
    SFX.confirm()
    dispatch({ type: A.UPDATE_ACTOR, id: entry.originalActorId, patch: {
      signed:     true,
      status:     'available',
      happiness:  80,
      loyalty:    50,
      idleWeeks:  0,
      ...startHoneymoon({ happiness: 80 }, week, HONEYMOON_RESIGN_WEEKS),
    } })
    dispatch({ type: A.ADD_MONEY, amount: -cost })
    dispatch({ type: A.REMOVE_FREE_AGENT, poolId: entry.poolId })
    pushEventLog(dispatch,
      `🎉 Re-signed ${entry.name} from Free Agents Pool! (₩${cost.toLocaleString()})`,
      'pink', week,
    )
    pushToast(dispatch, `Welcome back, ${entry.name}!`, 'green')
  }

  function doSignNewTalent(nt) {
    const cost = effCost(nt.signCost)
    if (state.money < cost) {
      SFX.fail()
      pushToast(dispatch, `Need ${fmtMoney(cost)} to sign ${nt.name}.`, 'red')
      return
    }
    SFX.confirm()
    const newId = Date.now()
    const newActor = {
      id:             newId,
      name:           nt.name,
      tier:           nt.tier,
      signCost:       nt.signCost,
      skills:         { ...nt.skills },
      characteristics: [...(nt.characteristics ?? [])],
      signed:         true,
      status:         'available',
      happiness:      80,
      loyalty:        65,
      idleWeeks:      0,
      injuredWeeks:   0,
      completedProds: 0,
      awards:         0,
      fame:           0,
      retainerOwed:   nt.tier === 'Worldwide' ? 150 : 0,
      chemistry_map:  {},
      assignedTo:     null,
      level:          1,
      exp:            0,
      isNewTalent:    true,
      poolId:         nt.poolId,
      portraitFile:   nt.portraitFile ?? null,
      idleReturnCount: 0,
      ...startHoneymoon({ happiness: 80 }, week, HONEYMOON_NEW_RECRUIT_WEEKS),
    }
    dispatch({ type: A.SET_ACTORS, actors: [...state.actors, newActor] })
    dispatch({ type: A.ADD_MONEY, amount: -cost })
    pushEventLog(dispatch,
      `✨ Signed new talent ${nt.name} (${nt.tier}) from Free Agents Pool!`,
      'pink', week,
    )
    pushToast(dispatch, `${nt.name} signed! New talent joins the roster.`, 'green')
  }

  function doSignReturnedTalent(entry) {
    const cost = effCost(entry.signCost)
    if (state.money < cost) {
      SFX.fail()
      pushToast(dispatch, `Need ${fmtMoney(cost)} to re-sign ${entry.name}.`, 'red')
      return
    }
    SFX.confirm()
    const newId = Date.now()
    const newActor = {
      id:             newId,
      name:           entry.name,
      tier:           entry.tier,
      signCost:       entry.signCost,
      skills:         { ...entry.skills },
      characteristics: [...(entry.characteristics ?? [])],
      signed:         true,
      status:         'available',
      happiness:      80,
      loyalty:        50,
      idleWeeks:      0,
      injuredWeeks:   0,
      completedProds: 0,
      awards:         0,
      fame:           0,
      retainerOwed:   entry.tier === 'Worldwide' ? 150 : 0,
      chemistry_map:  {},
      assignedTo:     null,
      level:          1,
      exp:            0,
      isNewTalent:    true,
      poolId:         entry.poolId,
      portraitFile:   entry.portraitFile ?? null,
      idleReturnCount: entry.idleReturnCount + 1,
      ...startHoneymoon({ happiness: 80 }, week, HONEYMOON_RESIGN_WEEKS),
    }
    dispatch({ type: A.SET_ACTORS, actors: [...state.actors, newActor] })
    dispatch({ type: A.ADD_MONEY, amount: -cost })
    dispatch({ type: A.REMOVE_FREE_AGENT, poolId: entry.poolId })
    pushEventLog(dispatch,
      `🔄 Re-signed ${entry.name} from Free Agents Pool!`, 'pink', week,
    )
    pushToast(dispatch, `${entry.name} re-signed!`, 'green')
  }

  function handleSignExActor(entry)       { setPendingSign({ kind: 'ex',       data: entry }) }
  function handleSignNewTalent(nt)        { setPendingSign({ kind: 'new',      data: nt    }) }
  function handleSignReturnedTalent(entry){ setPendingSign({ kind: 'returned', data: entry }) }

  function confirmSign() {
    if (!pendingSign) return
    if (pendingSign.kind === 'ex')       doSignExActor(pendingSign.data)
    if (pendingSign.kind === 'new')      doSignNewTalent(pendingSign.data)
    if (pendingSign.kind === 'returned') doSignReturnedTalent(pendingSign.data)
    setPendingSign(null)
  }

  const hasAnything = exActors.length + newTalent.length + returnedTalent.length + exActorsCooling.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div className="panel" style={{ padding: '12px 14px' }}>
        <div className="panel-title" style={{ marginBottom: 6 }}>🌟 FREE AGENTS POOL</div>
        <div style={{ fontSize: 7, color: 'var(--lav)' }}>
          Former studio talent and emerging actors between contracts.
        </div>
      </div>

      {!hasAnything && (
        <div style={{ fontSize: 8, color: 'var(--gray)', textAlign: 'center', padding: 32 }}>
          No agents available yet. Unlock higher tiers or wait for ex-actors to appear.
        </div>
      )}

      {/* ── Ex-Actors (Type A) — Available ────────────────────────────────── */}
      {exActors.length > 0 && (
        <div className="panel">
          <div className="panel-title">💔 EX-ACTORS (FORMER ROSTER)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exActors.map(entry => (
              <ExActorCard key={entry.poolId} entry={entry} onResign={() => handleSignExActor(entry)} canAfford={state.money >= entry.signCost} />
            ))}
          </div>
        </div>
      )}

      {/* ── Ex-Actors — Cooling down ──────────────────────────────────────── */}
      {exActorsCooling.length > 0 && (
        <div className="panel" style={{ opacity: 0.6 }}>
          <div className="panel-title" style={{ color: 'var(--gray)' }}>⏳ EX-ACTORS (COOLING DOWN)</div>
          <div style={{ fontSize: 7, color: 'var(--gray)', marginBottom: 8 }}>These actors will appear in the pool after their waiting period.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {exActorsCooling.map(entry => (
              <div key={entry.poolId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--shadow)' }}>
                <div style={{ width: 36, height: 36, background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>😶</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: 'var(--gray)' }}>Former: {entry.name}</div>
                  <div style={{ fontSize: 7, color: 'var(--gray)' }}>Available in {entry.availableWeek - week} week{entry.availableWeek - week !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── New Talent (Type B) by tier ───────────────────────────────────── */}
      {TIER_ORDER.filter(t => state.unlockedTiers.includes(t)).map(tier => {
        const tierActors = newTalent.filter(nt => nt.tier === tier)
        if (!tierActors.length) return null
        return (
          <div key={tier} className="panel">
            <div className="panel-title" style={{ color: TIER_COLOR[tier] }}>
              ✨ NEW TALENT — {tier.toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tierActors.map(nt => (
                <NewTalentCard key={nt.poolId} nt={nt} onSign={() => handleSignNewTalent(nt)} canAfford={state.money >= nt.signCost} />
              ))}
            </div>
          </div>
        )
      })}

      {/* ── Returned New Talent ───────────────────────────────────────────── */}
      {returnedTalent.length > 0 && (
        <div className="panel">
          <div className="panel-title">🔄 RETURNED TALENT</div>
          <div style={{ fontSize: 7, color: 'var(--gold)', marginBottom: 8 }}>
            ⚠️ These actors returned to the pool after going idle. Sign them again — a second return means they leave permanently.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {returnedTalent.map(entry => (
              <NewTalentCard key={entry.poolId} nt={entry} isReturned onSign={() => handleSignReturnedTalent(entry)} canAfford={state.money >= entry.signCost} />
            ))}
          </div>
        </div>
      )}

      {/* ── Sign Confirmation Modal ────────────────────────────────────────── */}
      {pendingSign && (
        <div style={styles.modalOverlay} onClick={() => setPendingSign(null)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>✍️ CONFIRM SIGNING</div>
            <div style={styles.modalBody}>
              <div style={{ fontSize: 9, color: 'var(--white)', marginBottom: 8 }}>
                Are you sure you want to sign
              </div>
              <div style={{ fontSize: 11, color: 'var(--pink)', marginBottom: 4 }}>
                {pendingSign.data.name}
              </div>
              <div style={{ fontSize: 8, color: 'var(--lav)', marginBottom: 12 }}>
                {pendingSign.data.tier}
              </div>
              <div style={{ fontSize: 8, color: 'var(--gold)', marginBottom: 16 }}>
                This will cost{' '}
                <span style={{ fontSize: 10, color: 'var(--gold)' }}>
                  {fmtMoney(pendingSign.data.signCost)}
                </span>
              </div>
              <div style={{ fontSize: 7, color: state.money >= pendingSign.data.signCost ? 'var(--green)' : 'var(--red)', marginBottom: 16 }}>
                Your balance: {fmtMoney(state.money)}
                {state.money < pendingSign.data.signCost && ' — Insufficient funds'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...styles.signBtn, flex: 1, opacity: state.money >= pendingSign.data.signCost ? 1 : 0.5 }}
                onClick={confirmSign}
                disabled={state.money < pendingSign.data.signCost}
              >
                ✅ CONFIRM
              </button>
              <button
                style={{ ...styles.cancelBtn, flex: 1 }}
                onClick={() => setPendingSign(null)}
              >
                ✖ CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Ex-Actor Card ────────────────────────────────────────────────────────────
function ExActorCard({ entry, onResign, canAfford }) {
  const tierColor = TIER_COLOR[entry.tier] ?? 'var(--lav)'
  return (
    <div style={styles.card}>
      {/* Portrait (original actor portrait) */}
      <div style={styles.portrait}>
        <ActorPortrait actor={{ id: entry.originalActorId, name: entry.name }} size={60} />
        <div style={{ ...styles.typeBadge, background: 'rgba(255,84,112,0.2)', color: 'var(--red)', border: '1px solid var(--red)' }}>
          FORMER
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: 'var(--pink)', marginBottom: 3 }}>
          Former: {entry.name}
        </div>
        <div style={{ fontSize: 7, color: tierColor, marginBottom: 4 }}>{entry.tier}</div>
        <div style={{ fontSize: 7, color: 'var(--gold)', marginBottom: 4 }}>
          ⚡ 2× Boosted Stats (in-pool)
        </div>
        {/* Top 4 skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {Object.entries(entry.skills ?? {}).slice(0, 4).map(([k, v]) => (
            <span key={k} style={styles.statChip}>{k.toUpperCase()} {v}</span>
          ))}
        </div>
        <div style={{ fontSize: 7, color: 'var(--lav)' }}>
          Pool: {entry.weeksInPool}wk / 24wk · Re-sign: <span style={{ color: 'var(--gold)' }}>{fmtMoney(entry.signCost)}</span>
        </div>
      </div>
      <button
        style={{ ...styles.signBtn, opacity: canAfford ? 1 : 0.5 }}
        onClick={onResign}
        disabled={!canAfford}
      >
        🔄 RE-SIGN
      </button>
    </div>
  )
}

// ─── New Talent Card ──────────────────────────────────────────────────────────
function NewTalentCard({ nt, onSign, canAfford, isReturned }) {
  const tierColor = TIER_COLOR[nt.tier] ?? 'var(--lav)'
  return (
    <div style={styles.card}>
      {/* Portrait — use pool portrait if available, fallback to star icon */}
      <div style={styles.portrait}>
        {nt.portraitFile ? (
          <ActorPortrait actor={{ id: 0, name: nt.name ?? '?', portraitFile: nt.portraitFile }} size={60} />
        ) : (
          <div style={{
            width: 60, height: 60,
            background: 'var(--bg-inset)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, border: '2px solid var(--shadow)',
          }}>
            🌟
          </div>
        )}
        <div style={{ ...styles.typeBadge, background: 'rgba(107,197,255,0.15)', color: 'var(--blue)', border: '1px solid var(--blue)' }}>
          {isReturned ? 'RETURNED' : 'NEW'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: 'var(--white)', marginBottom: 3 }}>
          {nt.name ?? '???'}
        </div>
        <div style={{ fontSize: 7, color: tierColor, marginBottom: 4 }}>{nt.tier} · New Talent</div>
        {/* Top 4 skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {Object.entries(nt.skills ?? {}).filter(([k]) => k !== 'act2').slice(0, 4).map(([k, v]) => (
            <span key={k} style={styles.statChip}>{k.toUpperCase()} {v}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
          {(nt.characteristics ?? []).map(c => (
            <span key={c} style={styles.traitChip}>{c}</span>
          ))}
        </div>
        {isReturned && (
          <div style={{ fontSize: 7, color: 'var(--gold)' }}>
            ⚠️ 2nd return = permanent removal
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ fontSize: 7, color: 'var(--gold)' }}>{fmtMoney(nt.signCost)}</div>
        <button
          style={{ ...styles.signBtn, opacity: canAfford ? 1 : 0.5 }}
          onClick={onSign}
          disabled={!canAfford}
        >
          ✍️ SIGN
        </button>
      </div>
    </div>
  )
}

const styles = {
  card: {
    display:    'flex',
    gap:        10,
    padding:    '10px 0',
    borderBottom: '1px solid var(--shadow)',
    alignItems: 'flex-start',
  },
  portrait: {
    position:   'relative',
    flexShrink: 0,
  },
  typeBadge: {
    position:   'absolute',
    bottom:     -8,
    left:       0,
    right:      0,
    fontSize:   5,
    textAlign:  'center',
    padding:    '1px 2px',
    letterSpacing: 0.5,
  },
  statChip: {
    fontSize:   6,
    padding:    '2px 5px',
    background: 'rgba(107,197,255,0.1)',
    border:     '1px solid var(--blue)',
    color:      'var(--blue)',
  },
  traitChip: {
    fontSize:   5,
    padding:    '2px 4px',
    background: 'var(--bg-inset)',
    border:     '1px solid var(--pink-dim)',
    color:      'var(--lav)',
  },
  signBtn: {
    fontSize:   7,
    padding:    '6px 10px',
    minHeight:  'auto',
    background: 'var(--pink)',
    color:      'var(--bg-inset)',
    border:     'none',
    boxShadow:  '2px 2px 0 #8A2B52',
    cursor:     'pointer',
    whiteSpace: 'nowrap',
  },
  cancelBtn: {
    fontSize:   7,
    padding:    '6px 10px',
    minHeight:  'auto',
    background: 'var(--bg-inset)',
    color:      'var(--lav)',
    border:     '1px solid var(--shadow)',
    cursor:     'pointer',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.75)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         999,
    padding:        16,
  },
  modalBox: {
    background:   'var(--bg-deep, #120A24)',
    border:       '2px solid var(--pink)',
    padding:      24,
    maxWidth:     320,
    width:        '100%',
    boxShadow:    '0 0 40px rgba(255,107,157,0.4)',
    textAlign:    'center',
  },
  modalTitle: {
    fontSize:     10,
    color:        'var(--pink)',
    letterSpacing: 2,
    marginBottom: 16,
  },
  modalBody: {
    borderBottom: '1px solid var(--shadow)',
    marginBottom: 16,
    paddingBottom: 4,
  },
}
