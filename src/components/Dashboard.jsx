/**
 * Dashboard.jsx — Home screen
 * Prompt 4: lead actor portraits on active cards, phase badges, star ratings,
 *           combo indicator, Event Log panel (color-coded, newest-first).
 */
import React, { useRef, useEffect, useState } from 'react'
import { useGame } from '../game/state.jsx'
import { fmtMoney, fmtPop, calcRank, rankProgress } from '../game/ranking.js'
import { PROD_TYPES, SCHEDULES, PLATFORMS, scoreToStars } from '../game/productions.js'
import { ActorPortrait } from './ActorRoster.jsx'
import { actorDisplayName } from '../game/actors.js'
import { SFX } from '../game/audio.js'

// ── Roster alert helpers ──────────────────────────────────────────────────────
function loyaltyLabel(loyalty) {
  if (loyalty > 75) return 'High'
  if (loyalty > 50) return 'Moderate'
  if (loyalty > 25) return 'Low'
  if (loyalty > 10) return 'Critical'
  return 'LEAVING!'
}

function buildRosterAlerts(actors) {
  const alerts = []
  for (const a of actors) {
    if (!a.signed || a.status !== 'available') continue
    const h    = a.happiness ?? 70
    const l    = a.loyalty   ?? 60
    const idle = a.idleWeeks ?? 0
    const name = actorDisplayName(a)
    const loyLvl = loyaltyLabel(l)
    let severity = 0, message = '', color = 'var(--gold)'

    // Emergency warning at ≤10 Loyalty — always shown for available actors
    if (l <= 10) {
      severity = 4
      message  = `‼️ FINAL WARNING‼️: ${name} is walking out! 🤬 (Loyalty: ${loyLvl}) ⚠️`
      color    = 'var(--red)'
    } else if (idle >= 1 && h < 25) {
      // Angry (0–24) AND actually been idle at least 1 week
      severity = 3
      message  = `❗ROSTER IDLE❗ ${name} is angry after ${idle} week${idle !== 1 ? 's' : ''} with no work! 😢 Cast them before they quit! (Loyalty: ${loyLvl}) 📢`
      color    = '#FF5470'
    } else if (idle >= 1 && h < 50) {
      // Sad (25–49) AND actually been idle at least 1 week
      severity = 2
      message  = `${name} feels forgotten after ${idle} week${idle !== 1 ? 's' : ''}! 😠 Keep them acting or loyalty will drop! (Loyalty: ${loyLvl}) 📉`
      color    = '#FF9F68'
    } else if (idle >= 1 && h < 75) {
      // Neutral (50–74) AND actually been idle at least 1 week
      severity = 1
      message  = `Roster idle: Keep ${name} acting! 😐 It has been ${idle} week${idle !== 1 ? 's' : ''}. (Loyalty: ${loyLvl}) ⏳`
      color    = 'var(--gold)'
    }

    if (severity > 0) alerts.push({ actor: a, severity, message, color })
  }
  return alerts.sort((x, y) => y.severity - x.severity)
}

function RosterAlertsPanel({ alerts }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? alerts : alerts.slice(0, 3)
  const hidden  = alerts.length - 3

  return (
    <div className="panel" style={{ border: '2px solid var(--red)', padding: '10px 12px' }}>
      <div className="panel-title" style={{ color: 'var(--red)', marginBottom: 8 }}>⚠️ ROSTER ALERTS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map(({ actor, message, color }) => (
          <div key={actor.id} style={{
            fontSize: 7, color, lineHeight: 1.8,
            padding: '5px 8px',
            background: 'rgba(0,0,0,0.25)',
            borderLeft: `3px solid ${color}`,
          }}>
            {message}
          </div>
        ))}
      </div>
      {!expanded && hidden > 0 && (
        <button
          style={{ fontSize: 7, marginTop: 8, padding: '4px 10px', color: 'var(--lav)' }}
          onClick={() => setExpanded(true)}
        >
          ▼ Show {hidden} more
        </button>
      )}
      {expanded && alerts.length > 3 && (
        <button
          style={{ fontSize: 7, marginTop: 8, padding: '4px 10px', color: 'var(--lav)' }}
          onClick={() => setExpanded(false)}
        >
          ▲ Show less
        </button>
      )}
    </div>
  )
}

const PHASE_LABEL = {
  filming:   { text: 'FILMING',   color: 'var(--blue)'  },
  wrap:      { text: 'WRAP!',     color: 'var(--gold)'  },
  releasing: { text: 'RELEASING', color: 'var(--pink)'  },
  done:      { text: 'DONE',      color: 'var(--green)' },
}

const LOG_COLOR = {
  green: 'var(--green)',
  red:   'var(--red)',
  gold:  'var(--gold)',
  pink:  'var(--pink)',
  '':    'var(--lav)',
}

export default function Dashboard({ setScreen }) {
  const { state } = useGame()
  const rank        = calcRank(state.reputation, state.popularity)
  const progress    = rankProgress(state.reputation, state.popularity)
  const active       = state.productions.filter(p => p.status === 'active')
  const rosterAlerts = buildRosterAlerts(state.actors)
  const recent      = [...state.history].reverse().slice(0, 6)
  const weekInYear  = ((state.week - 1) % 52) + 1
  const currentYear = Math.ceil(state.week / 52)
  const calendarYear = (state.startYear ?? 2026) + currentYear - 1
  const showAwardsBanner = weekInYear >= 49 && weekInYear <= 51

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {showAwardsBanner && (
        <div style={styles.awardsBanner}>
          <span style={{ fontSize: 18 }}>✨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: 1 }}>
              BL AWARDS NIGHT — YEAR {calendarYear}
            </div>
            <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 2 }}>
              {52 - weekInYear} week{52 - weekInYear === 1 ? '' : 's'} until the ceremony. Prepare your studio!
            </div>
          </div>
          <span style={{ fontSize: 18 }}>🏆</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">📊 STUDIO STATUS</div>
        <div style={styles.statsGrid}>
          <BigStat label="MONEY"      value={fmtMoney(state.money)}     color="var(--gold)" />
          <BigStat label="REPUTATION" value={`${state.reputation}/100`} color="var(--pink)" />
          <BigStat label="POPULARITY" value={fmtPop(state.popularity)}  color="var(--blue)" />
          <BigStat label="WEEK"       value={`#${state.week}`}          color="var(--lav)"  />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={styles.rankRow}>
            <span style={{ color: rank.color, fontSize: 9 }}>{rank.label}</span>
            <span style={{ fontSize: 7, color: 'var(--lav)' }}>
              {Math.round(progress * 100)}% to next rank
            </span>
          </div>
          <div style={styles.rankTrack}>
            <div style={{ ...styles.rankFill, width: `${progress * 100}%`, background: rank.color }} />
          </div>
        </div>
      </div>

      {rosterAlerts.length > 0 && (
        <RosterAlertsPanel alerts={rosterAlerts} />
      )}

      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            🎬 ACTIVE ({active.length})
          </div>
          <button
            className="btn-primary"
            style={{ fontSize: 7, padding: '6px 10px' }}
            onClick={() => { SFX.click(); setScreen('produce') }}
          >
            + NEW
          </button>
        </div>
        {active.length === 0 ? (
          <div style={styles.empty}>
            No productions running.
            <button
              style={{ fontSize: 8, padding: '6px 10px', display: 'block', margin: '8px auto 0' }}
              onClick={() => { SFX.click(); setScreen('produce') }}
            >
              Start one →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map(p => (
              <ActiveProdCard key={p.id} prod={p} actors={state.actors} />
            ))}
          </div>
        )}
      </div>

      <div style={styles.actionRow}>
        <button style={styles.actionBtn} onClick={() => { SFX.click(); setScreen('actors') }}>
          ⭐ ACTORS
        </button>
        <button style={styles.actionBtn} onClick={() => { SFX.click(); setScreen('company') }}>
          🏢 COMPANY
        </button>
      </div>

      {recent.length > 0 && (
        <div className="panel">
          <div className="panel-title">🏆 RECENT RESULTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map(h => <CompletedRow key={h.id} record={h} />)}
          </div>
        </div>
      )}

      {(state.eventLog?.length ?? 0) > 0 && (
        <EventLogPanel log={state.eventLog} />
      )}

    </div>
  )
}

function ActiveProdCard({ prod, actors }) {
  const typeInfo  = PROD_TYPES[prod.type] ?? {}
  const sched     = SCHEDULES.find(s => s.id === prod.schedule)
  const platIcon  = prod.platform === 'streaming' ? '📱' : '📡'
  const phaseInfo = PHASE_LABEL[prod.phase] ?? PHASE_LABEL.filming
  const leadIds   = prod.leadIds?.length ? prod.leadIds : prod.castIds?.slice(0, 2) ?? []
  const leads     = actors.filter(a => leadIds.includes(a.id))

  return (
    <div style={styles.prodCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{typeInfo.icon ?? '🎬'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {prod.title}
            </span>
            <span style={{ ...styles.phaseBadge, color: phaseInfo.color, borderColor: phaseInfo.color }}>
              {phaseInfo.text}
            </span>
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 2 }}>
            {typeInfo.label} · {platIcon} · {prod.genre}
            {prod.cpName && <span style={{ color: 'var(--pink)' }}> · ♥ {prod.cpName}</span>}
          </div>
        </div>
      </div>
      {leads.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          {leads.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ActorPortrait actor={a} size={36} />
              <span style={{ fontSize: 7, color: 'var(--lav)' }}>{actorDisplayName(a).split(' ')[0]}</span>
            </div>
          ))}
          {prod.comboResult && (
            <div style={{ marginLeft: 6, fontSize: 7, color: prod.comboResult.color }}>
              {prod.comboResult.emoji} {prod.comboResult.fitLabel || prod.comboResult.label}
            </div>
          )}
        </div>
      )}
      {prod.phase === 'filming' && (
        <>
          <div style={styles.progTrack}>
            <div style={{ ...styles.progFill, width: `${prod.progressPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'var(--lav)', marginTop: 3 }}>
            <span>{prod.progressPct}% filmed</span>
            <span>{prod.weeksLeft}wk left</span>
          </div>
        </>
      )}
      {prod.phase === 'releasing' && (
        <div style={{ fontSize: 8, color: 'var(--pink)' }}>
          Ep {prod.episodesReleased ?? 0} / {prod.episodesTotal} released
          {(prod.episodeRatings?.length ?? 0) > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--gold)' }}>
              Avg rating: {(prod.episodeRatings.reduce((a,b) => a+b, 0) / prod.episodeRatings.length).toFixed(1)}/10
            </span>
          )}
        </div>
      )}
      {prod.phase === 'wrap' && prod.comboResult && (
        <div style={{ fontSize: 8, color: prod.comboResult.color }}>
          {prod.comboResult.emoji} {prod.genre} × {prod.theme || '—'}: {prod.comboResult.fitLabel || prod.comboResult.label}
        </div>
      )}
      {sched && (
        <div style={{ fontSize: 6, color: 'var(--gray)', marginTop: 4 }}>
          {sched.label} schedule · q×{sched.qMult}
        </div>
      )}
    </div>
  )
}

function CompletedRow({ record }) {
  const gradeColor = {
    'S+': '#FFD700', S: '#FFD700', A: '#5CE1A0',
     B: '#6BC5FF',   C: '#9B86C4', D: '#FF5470', F: '#FF5470',
  }
  const stars = scoreToStars(record.score ?? 0)

  return (
    <div style={styles.histRow}>
      <span style={{ color: gradeColor[record.grade] ?? 'var(--lav)', fontSize: 13, width: 28, flexShrink: 0 }}>
        {record.grade}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 8, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.title}
        </div>
        <div style={{ fontSize: 7, color: 'var(--gold)' }}>{stars}</div>
        {record.genre && (
          <div style={{ fontSize: 6, color: 'var(--lav)' }}>{record.genre} · Wk{record.weekCompleted}</div>
        )}
      </div>
      <span style={{ fontSize: 8, color: 'var(--gold)', flexShrink: 0, textAlign: 'right' }}>
        {record.revenue ? fmtMoney(record.revenue) : '—'}
      </span>
    </div>
  )
}

function EventLogPanel({ log }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [log.length])
  return (
    <div className="panel">
      <div className="panel-title">📋 EVENT LOG</div>
      <div ref={scrollRef} style={styles.logScroll}>
        {log.map(entry => (
          <div key={entry.id} style={styles.logEntry}>
            {entry.week != null && (
              <span style={styles.logWeek}>Wk{entry.week}</span>
            )}
            <span style={{ color: LOG_COLOR[entry.variant] ?? 'var(--lav)', fontSize: 7, flex: 1 }}>
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BigStat({ label, value, color }) {
  return (
    <div style={styles.bigStat}>
      <span style={{ fontSize: 7, color: 'var(--lav)', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color }}>{value}</span>
    </div>
  )
}

const styles = {
  awardsBanner: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '2px solid var(--gold)', background: 'linear-gradient(90deg,rgba(255,215,0,0.10) 0%,rgba(255,215,0,0.04) 100%)', animation: 'pulse 2.5s ease-in-out infinite' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
  bigStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  rankRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rankTrack: { height: 10, background: 'var(--bg-inset)', border: '2px solid var(--shadow)' },
  rankFill: { height: '100%', transition: 'width 0.5s ease' },
  empty: { fontSize: 8, color: 'var(--gray)', textAlign: 'center', padding: '20px 0', lineHeight: 2.5 },
  actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  actionBtn: { textAlign: 'center', fontSize: 9, padding: '14px 8px' },
  prodCard: { background: 'var(--bg-inset)', padding: 10, border: '2px solid var(--shadow)' },
  phaseBadge: { fontSize: 7, padding: '2px 5px', border: '1px solid', letterSpacing: 0.5, flexShrink: 0 },
  progTrack: { height: 8, background: 'var(--bg-deep)', border: '1px solid var(--shadow)' },
  progFill: { height: '100%', background: 'var(--pink)', transition: 'width 0.4s ease' },
  histRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--shadow)' },
  logScroll: { maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
  logEntry: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', borderBottom: '1px solid var(--shadow)' },
  logWeek: { fontSize: 6, color: 'var(--gray)', flexShrink: 0, minWidth: 24 },
}
