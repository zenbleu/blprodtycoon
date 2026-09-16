/**
 * CompanyStatus.jsx — Company overview panel
 * Prompt 7: added numeric rank + rival leaderboard
 */
import React, { useState } from 'react'
import { useGame } from '../game/state.jsx'
import { fmtMoney, fmtPop, fmtScore, calcRank, rankProgress, RANKS, buildLeaderboard, playerScore } from '../game/ranking.js'
import { TIER_COLOR } from '../game/actors.js'
import { SFX } from '../game/audio.js'

// Convert #RRGGBB to "R,G,B" for rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default function CompanyStatus({ setScreen }) {
  const { state } = useGame()
  const rank      = calcRank(state.reputation, state.popularity)
  const progress  = rankProgress(state.reputation, state.popularity)
  const nextRank  = RANKS[RANKS.findIndex(r => r.id === rank.id) + 1] ?? null

  const [showFullBoard, setShowFullBoard] = useState(false)
  const signedActors   = state.actors.filter(a => a.signed)
  const filmingActors  = signedActors.filter(a => a.status === 'filming')
  const activeProds    = state.productions.filter(p => p.status === 'active')

  const leaderboard  = buildLeaderboard(state)
  const ps           = playerScore(state)
  const numRank      = state.numericRank ?? 50
  const displayRows  = showFullBoard ? leaderboard : [
    ...leaderboard.slice(0, 5),
    ...(numRank > 5 ? [leaderboard.find(e => e.isPlayer)].filter(Boolean) : []),
  ]

  // Tier breakdown of signed actors
  const byTier = ['Rookie', 'Rising Star', 'Popular', 'Worldwide'].map(tier => ({
    tier,
    count: signedActors.filter(a => a.tier === tier).length,
    color: TIER_COLOR[tier],
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Studio identity ── */}
      <div className="panel">
        <div className="panel-title">🏢 {state.companyName}</div>
        <div style={styles.grid2}>
          <BigStat label="TREASURY"    value={fmtMoney(state.money)}        color="var(--gold)" />
          <BigStat label="REPUTATION"  value={`${state.reputation}/100`}    color="var(--pink)" />
          <BigStat label="POPULARITY"  value={fmtPop(state.popularity)}     color="var(--blue)" />
          <BigStat label="WEEK"        value={`#${state.week}`}             color="var(--lav)"  />
          <BigStat label="AWARDS"      value={state.awards ?? 0}            color="var(--gold)" />
          <BigStat label="PRODUCTIONS" value={state.history.length}         color="var(--green)" />
        </div>
      </div>

      {/* ── Current rank + progress ── */}
      <div className="panel">
        <div className="panel-title">🏆 RANK STATUS</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: rank.color }}>{rank.label}</span>
          {nextRank && (
            <span style={{ fontSize: 7, color: 'var(--lav)' }}>
              Next: <span style={{ color: nextRank.color }}>{nextRank.label}</span>
            </span>
          )}
        </div>
        <div style={styles.rankTrack}>
          <div style={{ ...styles.rankFill, width: `${progress * 100}%`, background: rank.color }} />
        </div>
        <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 6 }}>
          {Math.round(progress * 100)}% progress to next rank
        </div>
        {nextRank && (
          <div style={{ fontSize: 7, color: 'var(--gray)', marginTop: 4 }}>
            Needs: REP {nextRank.repMin} · POP {fmtPop(nextRank.popMin)}
          </div>
        )}
      </div>

      {/* ── Roster summary ── */}
      <div className="panel">
        <div className="panel-title">⭐ ROSTER ({signedActors.length} signed)</div>
        <div style={styles.tierRow}>
          {byTier.map(({ tier, count, color }) => (
            <div key={tier} style={styles.tierCell}>
              <span style={{ fontSize: 7, color }}>{tier === 'Rising Star' ? 'RISING' : tier.toUpperCase()}</span>
              <span style={{ fontSize: 16, color }}>{count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <Chip label={`${filmingActors.length} filming`}  color="var(--blue)"  />
          <Chip label={`${signedActors.filter(a => a.status === 'available').length} available`} color="var(--green)" />
          <Chip label={`${signedActors.filter(a => a.status === 'resting').length} resting`}    color="var(--gold)"  />
          <Chip label={`${signedActors.filter(a => a.status === 'injured').length} injured`}    color="var(--red)"   />
        </div>
        <button
          style={{ marginTop: 12, fontSize: 8, padding: '8px 12px', width: '100%', textAlign: 'center' }}
          onClick={() => { SFX.click(); setScreen('actors') }}
        >
          ⭐ VIEW FULL ROSTER →
        </button>
      </div>

      {/* ── Numeric rank + leaderboard ── */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            📊 INDUSTRY RANKING
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: numRank <= 9 ? '#FFD700' : numRank <= 24 ? '#FF6B9D' : 'var(--lav)' }}>
              #{numRank}
            </div>
            <div style={{ fontSize: 6, color: 'var(--gray)' }}>of 50 studios</div>
          </div>
        </div>
        <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 8 }}>
          Your score: <span style={{ color: 'var(--gold)' }}>{fmtScore(ps)}</span>
          <span style={{ color: 'var(--gray)', marginLeft: 8 }}>rep×2 + pop×0.8 + awards×20 + revenue÷3000</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayRows.map(entry => (
            <div key={entry.id} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '5px 7px',
              background:   entry.isPlayer ? 'rgba(255,107,157,0.12)' : 'transparent',
              border:       entry.isPlayer ? '1px solid var(--pink-dim)' : '1px solid transparent',
            }}>
              <span style={{
                fontSize:   7,
                color:      entry.rank <= 3 ? 'var(--gold)' : 'var(--gray)',
                minWidth:   20,
                flexShrink: 0,
              }}>
                #{entry.rank}
              </span>
              <span style={{
                fontSize:  7,
                flex:      1,
                color:     entry.isPlayer ? 'var(--pink)' : 'var(--white)',
                overflow:  'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {entry.isPlayer ? `★ ${entry.name}` : entry.name}
              </span>
              <span style={{ fontSize: 7, color: 'var(--lav)', flexShrink: 0 }}>
                {fmtScore(entry.score)}
              </span>
            </div>
          ))}
        </div>

        {!showFullBoard && leaderboard.length > 6 && (
          <button
            onClick={() => { SFX.click(); setShowFullBoard(true) }}
            style={{ marginTop: 8, fontSize: 7, padding: '6px 10px', width: '100%', textAlign: 'center' }}
          >
            SHOW ALL 50 STUDIOS ↓
          </button>
        )}
        {showFullBoard && (
          <button
            onClick={() => { SFX.click(); setShowFullBoard(false) }}
            style={{ marginTop: 8, fontSize: 7, padding: '6px 10px', width: '100%', textAlign: 'center' }}
          >
            COLLAPSE ↑
          </button>
        )}

        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: 'Rising Star', rank: 39, color: '#6BC5FF' },
            { label: 'Popular',     rank: 24, color: '#FF6B9D' },
            { label: 'Worldwide',   rank: 9,  color: '#FFD700' },
          ].map(t => (
            <div key={t.label} style={{
              fontSize: 6, padding: '3px 7px',
              background: numRank <= t.rank ? `rgba(${hexToRgb(t.color)},0.15)` : 'var(--bg-inset)',
              border: `1px solid ${numRank <= t.rank ? t.color : 'var(--shadow)'}`,
              color: numRank <= t.rank ? t.color : 'var(--gray)',
            }}>
              #{t.rank} {t.label} {numRank <= t.rank ? '✓' : `(need #${t.rank})`}
            </div>
          ))}
        </div>
      </div>

      {/* ── Active productions ── */}
      <div className="panel">
        <div className="panel-title">🎬 ACTIVE PRODUCTIONS ({activeProds.length})</div>
        {activeProds.length === 0 ? (
          <div style={{ fontSize: 8, color: 'var(--gray)', padding: '10px 0' }}>
            No productions running.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeProds.map(p => (
              <div key={p.id} style={styles.prodRow}>
                <span style={{ fontSize: 9, color: 'var(--white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </span>
                <span style={{ fontSize: 7, color: 'var(--lav)', flexShrink: 0 }}>{p.weeksLeft}wk left</span>
              </div>
            ))}
          </div>
        )}
        <button
          className="btn-primary"
          style={{ marginTop: 12, fontSize: 8, padding: '10px 12px', width: '100%', textAlign: 'center' }}
          onClick={() => { SFX.click(); setScreen('produce') }}
        >
          🎬 NEW PRODUCTION
        </button>
      </div>

    </div>
  )
}

function BigStat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 6, color: 'var(--lav)', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color }}>{value}</span>
    </div>
  )
}

function Chip({ label, color }) {
  return (
    <span style={{
      fontSize: 7, padding: '3px 7px',
      background: 'var(--bg-inset)',
      border: `1px solid ${color}`,
      color,
    }}>
      {label}
    </span>
  )
}

const styles = {
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginTop: 4,
  },
  rankTrack: {
    height:     10,
    background: 'var(--bg-inset)',
    border:     '2px solid var(--shadow)',
  },
  rankFill: {
    height:     '100%',
    transition: 'width 0.5s ease',
  },
  tierRow: {
    display:       'flex',
    justifyContent: 'space-between',
    gap:           8,
  },
  tierCell: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    flex:          1,
    gap:           4,
    padding:       '8px 4px',
    background:    'var(--bg-inset)',
    border:        '1px solid var(--shadow)',
  },
  prodRow: {
    display:    'flex',
    gap:        8,
    alignItems: 'center',
    padding:    '6px 0',
    borderBottom: '1px solid var(--shadow)',
  },
}
