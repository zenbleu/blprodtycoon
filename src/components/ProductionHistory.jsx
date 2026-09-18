/**
 * ProductionHistory.jsx — Searchable full release history.
 */
import React, { useMemo, useState } from 'react'
import { useGame } from '../game/state.jsx'
import { fmtMoney, fmtPop } from '../game/ranking.js'
import { PROD_TYPES, scoreToStars } from '../game/productions.js'
import { SFX } from '../game/audio.js'

const GRADE_COLORS = {
  'S+': 'var(--gold)', S: 'var(--gold)', A: 'var(--green)',
  B: 'var(--blue)', C: 'var(--lav)', D: 'var(--red)', F: 'var(--red)',
}

export default function ProductionHistory() {
  const { state } = useGame()
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('all')
  const [genre, setGenre] = useState('all')
  const [sort, setSort] = useState('newest')

  const genres = useMemo(
    () => [...new Set(state.history.map(item => item.genre).filter(Boolean))].sort(),
    [state.history],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...state.history]
      .filter(item => grade === 'all' || item.grade === grade)
      .filter(item => genre === 'all' || item.genre === genre)
      .filter(item => !normalized || item.title?.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === 'score') return (b.score ?? 0) - (a.score ?? 0)
        if (sort === 'revenue') return (b.revenue ?? 0) - (a.revenue ?? 0)
        return (b.weekCompleted ?? 0) - (a.weekCompleted ?? 0)
      })
  }, [state.history, grade, genre, query, sort])

  function clearFilters() {
    SFX.click()
    setQuery('')
    setGrade('all')
    setGenre('all')
    setSort('newest')
  }

  return (
    <div style={styles.page}>
      <div className="panel">
        <div className="panel-title">📚 PRODUCTION HISTORY</div>
        <div style={styles.summary}>
          {state.history.length} completed production{state.history.length === 1 ? '' : 's'} ·
          showing {filtered.length}
        </div>
        <div style={styles.filters}>
          <input
            aria-label="Search production titles"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search titles…"
            style={styles.search}
          />
          <select aria-label="Filter by grade" value={grade} onChange={e => setGrade(e.target.value)} style={styles.select}>
            <option value="all">All grades</option>
            {['S+', 'S', 'A', 'B', 'C', 'D', 'F'].map(value => <option key={value} value={value}>{value} grade</option>)}
          </select>
          <select aria-label="Filter by genre" value={genre} onChange={e => setGenre(e.target.value)} style={styles.select}>
            <option value="all">All genres</option>
            {genres.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Sort production history" value={sort} onChange={e => setSort(e.target.value)} style={styles.select}>
            <option value="newest">Newest first</option>
            <option value="score">Highest score</option>
            <option value="revenue">Highest revenue</option>
          </select>
          {(query || grade !== 'all' || genre !== 'all' || sort !== 'newest') && (
            <button type="button" onClick={clearFilters} style={styles.clear}>CLEAR</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel" style={styles.empty}>
          {state.history.length === 0
            ? 'Your first release will appear here after it completes.'
            : 'No productions match these filters.'}
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map(record => <HistoryCard key={record.id ?? `${record.title}-${record.weekCompleted}`} record={record} />)}
        </div>
      )}
    </div>
  )
}

function HistoryCard({ record }) {
  const type = PROD_TYPES[record.type]
  const score = record.score ?? 0
  return (
    <article className="panel" style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.title}>{type?.icon ?? '🎬'} {record.title}</div>
          <div style={styles.meta}>
            Week {record.weekCompleted ?? '—'} · {type?.label ?? record.type ?? 'Production'} · {record.genre ?? 'Unknown genre'}
            {record.platform ? ` · ${record.platform}` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: GRADE_COLORS[record.grade] ?? 'var(--lav)', fontSize: 14 }}>{record.grade ?? '—'}</div>
          <div style={{ color: 'var(--gold)', fontSize: 8 }}>{scoreToStars(score)}</div>
        </div>
      </div>
      <div style={styles.metricGrid}>
        <Metric label="SCORE" value={`${score}/100`} color={GRADE_COLORS[record.grade] ?? 'var(--pink)'} />
        <Metric label="REVENUE" value={fmtMoney(record.revenue ?? 0)} color="var(--gold)" />
        <Metric label="AUDIENCE" value={record.audienceScore != null ? `${record.audienceScore}/100` : '—'} color="var(--blue)" />
        <Metric label="CHEMISTRY" value={record.chemScore != null ? `${Math.round(record.chemScore)}/100` : '—'} color="var(--pink)" />
        <Metric label="POP Δ" value={record.popDelta != null ? `+${fmtPop(record.popDelta)}` : '—'} color="var(--blue)" />
      </div>
    </article>
  )
}

function Metric({ label, value, color }) {
  return <div style={styles.metric}><span>{label}</span><strong style={{ color }}>{value}</strong></div>
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 14 },
  summary: { color: 'var(--lav)', fontSize: 7, marginBottom: 10 },
  filters: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' },
  search: { flex: '1 1 180px', minWidth: 140, fontSize: 8, padding: '8px 9px' },
  select: { flex: '1 1 120px', minWidth: 110, fontSize: 7, padding: '8px 7px', color: 'var(--white)', background: 'var(--bg-inset)', border: '2px solid var(--shadow)', fontFamily: 'inherit' },
  clear: { fontSize: 7, padding: '8px 9px', color: 'var(--lav)' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { color: 'var(--gray)', fontSize: 8, textAlign: 'center', padding: 24 },
  card: { padding: 11 },
  cardHeader: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  title: { color: 'var(--white)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { color: 'var(--lav)', fontSize: 6.5, lineHeight: 1.7, marginTop: 3 },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 5 },
  metric: { background: 'var(--bg-inset)', padding: '6px 4px', minWidth: 0, textAlign: 'center' },
}