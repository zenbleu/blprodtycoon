/**
 * ActorRoster.jsx — Grid of all actors with status, tier, mood & quick stats
 * Updated for Prompt 2: 8 skills, characteristics, chemistry_map, mood emoji.
 */
import React, { useState } from 'react'
import { useGame } from '../game/state.jsx'
import { SKILL_LABELS, SKILL_KEYS, STATUS_LABEL, STATUS_COLOR, TIER_COLOR, moodEmoji, portraitUrl, PORTRAIT_COLORS, actorDisplayName } from '../game/actors.js'
import { getChem, chemTier } from '../game/chemistry.js'
import { SFX } from '../game/audio.js'

const BASE = import.meta.env.BASE_URL

const FILTER_OPTIONS = ['ALL', 'AVAILABLE', 'FILMING', 'LOCKED']

// Skills to show as mini bars on the card (top 4 most game-relevant)
const CARD_SKILLS = ['act', 'visual', 'sing', 'dance']

export default function ActorRoster({ openProfile }) {
  const { state } = useGame()
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch]   = useState('')

  const signed = state.actors.filter(a => a.signed)
  const locked = state.actors.filter(a => !a.signed)

  const filtered = state.actors.filter(a => {
    const matchSearch = !search || actorDisplayName(a).toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'AVAILABLE') return a.signed && a.status === 'available'
    if (filter === 'FILMING')   return a.signed && a.status === 'filming'
    if (filter === 'LOCKED')    return !a.signed
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div className="panel" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            ⭐ ACTORS
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)', flex: 1 }}>
            {signed.length} signed · {locked.length} locked
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ minWidth: 100, fontSize: 8, padding: '6px 8px', minHeight: 36, width: 'auto', flex: '0 0 auto' }}
          />
        </div>
        <div className="seg" style={{ marginTop: 10 }}>
          {FILTER_OPTIONS.map(f => (
            <button key={f} type="button"
              className={filter === f ? 'sel' : ''}
              style={{ fontSize: 7, padding: '6px 8px' }}
              onClick={() => { SFX.click(); setFilter(f) }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ fontSize: 8, color: 'var(--gray)', textAlign: 'center', padding: 32 }}>
          No actors found.
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map(a => (
            <ActorCard
              key={a.id}
              actor={a}
              allActors={state.actors}
              onClick={() => { SFX.click(); openProfile(a.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ActorCard({ actor, allActors, onClick }) {
  const isLocked  = !actor.signed
  const status    = actor.status ?? (isLocked ? 'locked' : 'available')
  const borderColor = STATUS_COLOR[status] ?? 'var(--gray)'
  const tierColor   = TIER_COLOR[actor.tier] ?? 'var(--lav)'
  const mood        = isLocked ? '' : moodEmoji(actor.happiness ?? 70)

  // Best chemistry partner (for quick display)
  const bestChem = isLocked ? null : (() => {
    let best = null, bestVal = -1
    for (const other of allActors) {
      if (other.id === actor.id || !other.signed) continue
      const val = getChem(actor, other.id)
      if (val > bestVal) { bestVal = val; best = { actor: other, val } }
    }
    return bestVal >= 30 ? best : null
  })()

  return (
    <button
      onClick={onClick}
      style={{ ...styles.card, borderColor }}
    >
      {/* Portrait */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ActorPortrait actor={actor} size={72} isLocked={isLocked} />
        {/* Tier badge */}
        <div style={{ ...styles.tierBadge, color: tierColor }}>
          {actor.tier === 'Rising Star' ? 'RISING' : actor.tier?.toUpperCase()}
        </div>
      </div>

      {/* Info */}
      <div style={styles.info}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isLocked ? '???' : actorDisplayName(actor)}
          </span>
          {!isLocked && <span style={{ fontSize: 14 }}>{mood}</span>}
        </div>

        {/* Status */}
        <div style={{ fontSize: 7, color: borderColor, marginBottom: 6 }}>
          {STATUS_LABEL[status]}
        </div>

        {!isLocked && (
          <>
            {/* Skill bars */}
            {CARD_SKILLS.map(key => (
              <MiniBar
                key={key}
                label={SKILL_LABELS[key]}
                value={actor.skills?.[key] ?? 0}
              />
            ))}

            {/* Characteristics */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
              {(actor.characteristics ?? []).map(c => (
                <span key={c} style={styles.chip}>{c}</span>
              ))}
            </div>

            {/* Best chemistry hint */}
            {bestChem && (() => {
              const tier = chemTier(bestChem.val)
              return (
                <div style={{ fontSize: 6, color: tier.color, marginTop: 5 }}>
                  {tier.emoji} {actorDisplayName(bestChem.actor)} {bestChem.val}
                </div>
              )
            })()}
          </>
        )}

        {isLocked && (
          <div style={{ fontSize: 7, color: 'var(--gray)', marginTop: 4 }}>
            Unlock at Rank #{actor.tier === 'Rising Star' ? 39 : actor.tier === 'Popular' ? 24 : 9}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Shared portrait component with fallback colour ───────────────────────────
export function ActorPortrait({ actor, size = 64, isLocked = false, style: extraStyle }) {
  const [imgFailed, setImgFailed] = useState(false)
  const padded    = String(actor.id).padStart(2, '0')
  // Pool talent actors carry a portraitFile field; use pool portrait dir
  const src = actor.portraitFile
    ? `${BASE}images/pool/${actor.portraitFile}`
    : `${BASE}images/actors-portraits/Actor_${padded}.jpg`
  const fallback  = PORTRAIT_COLORS[(actor.id - 1) % PORTRAIT_COLORS.length]
  const initials  = (actor.name ?? '?')[0]

  return (
    <div style={{
      width: size, height: size,
      borderRadius: 4,
      overflow: 'hidden',
      background: fallback,
      position: 'relative',
      flexShrink: 0,
      imageRendering: 'pixelated',
      ...extraStyle,
    }}>
      {!imgFailed && (
        <img
          src={src}
          alt={actor.name}
          onError={() => setImgFailed(true)}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            imageRendering: 'pixelated',
            display: 'block',
            filter: isLocked ? 'brightness(0) opacity(0.5)' : 'none',
          }}
        />
      )}
      {imgFailed && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.35,
          color: 'rgba(0,0,0,0.5)',
          fontFamily: 'inherit',
        }}>
          {isLocked ? '?' : initials}
        </div>
      )}
    </div>
  )
}

function MiniBar({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
      <span style={{ fontSize: 6, color: 'var(--lav)', width: 24, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-inset)', border: '1px solid var(--shadow)' }}>
        <div style={{ width: `${value}%`, height: '100%', background: 'var(--pink)', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 6, color: 'var(--white)', width: 18, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  card: {
    display:    'flex',
    gap:        10,
    background: 'var(--bg-panel)',
    padding:    12,
    cursor:     'pointer',
    textAlign:  'left',
    boxShadow:  '4px 4px 0 rgba(0,0,0,0.35)',
    alignItems: 'flex-start',
    border:     '3px solid var(--gray)',
    transition: 'transform 0.12s ease',
  },
  info: { flex: 1, minWidth: 0 },
  tierBadge: {
    position:   'absolute',
    bottom:     -8,
    left:       0,
    right:      0,
    fontSize:   5,
    textAlign:  'center',
    background: 'var(--bg-deep)',
    padding:    '1px 2px',
    letterSpacing: 0.5,
  },
  chip: {
    fontSize:   5,
    padding:    '2px 4px',
    background: 'var(--bg-inset)',
    border:     '1px solid var(--pink-dim)',
    color:      'var(--lav)',
    borderRadius: 2,
    lineHeight: 1.4,
  },
}
