/**
 * ProductionForm.jsx — Create a new production
 * Prompt 4: Lead1/Lead2 dropdowns, CP name, chemistry preview, schedule/platform/rating/story,
 *           title auto-suggest, budget slider, live cost preview.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useGame, A, pushToast } from '../game/state.jsx'
import {
  PROD_TYPES, SCHEDULES, PLATFORMS, RATINGS, GENRES, GENRE_EMOJI, STORY_TYPES,
  BUDGET_TIERS, TITLE_POOL, calcCost, createProduction,
  getComboResult, DEFAULT_GENRES,
} from '../game/productions.js'
import {
  THEMES, THEME_CATEGORIES, THEME_EMOJI, THEME_UNLOCK_BY_GRADE, DEFAULT_THEMES,
  getThemeComboResult, getTypeThemeBonus,
} from '../game/themes.js'
import { getGameTierByRank } from '../game/tiers.js'
import { calcChemistryBonus, chemTier, getChem, bondKey } from '../game/chemistry.js'
import { canAssign, moodEmoji, actorDisplayName } from '../game/actors.js'
import { fmtMoney } from '../game/ranking.js'
import { SFX } from '../game/audio.js'
import { ActorPortrait } from './ActorRoster.jsx'

const BASE = import.meta.env.BASE_URL

const DEFAULT_BUDGET = 1.0
const BUDGET_MIN     = 0.5
const BUDGET_MAX     = 3.0  // Prompt 3: increased from 2.5

// 5.1: Pick 3 random title suggestions fresh on each component mount
function pickRandomTitles() {
  const shuffled = [...TITLE_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

// Fixed CP signing cost: 30% of average sign cost of both leads
function fixedCpCost(lead1, lead2) {
  if (!lead1 || !lead2) return 0
  return Math.round(((lead1.signCost ?? 200) + (lead2.signCost ?? 200)) * 0.3)
}

// ─── Refined Unlock Requirements Utility (Category A & B) ───────────────────
export function getUnlockRequirements(id, gradeCounts, gameTier) {
  const getCount = (g) => gradeCounts?.[g] ?? 0
  const isRising  = ['rising', 'popular', 'worldwide'].includes(gameTier.id)
  const isPopular = ['popular', 'worldwide'].includes(gameTier.id)

  switch (id) {
    // --- Category A: Creative Growth (Ratings-only) ---
    case 'select_genre':
      return [
        { text: `Earn 3 C-Rated Productions (${getCount('C')}/3)`, met: getCount('C') >= 3 },
        { text: `Earn 3 B-Rated Productions (${getCount('B')}/3)`, met: getCount('B') >= 3 },
        { text: `Earn 2 A-Rated Productions (${getCount('A')}/2)`, met: getCount('A') >= 2 },
      ]
    case 'adaptation':
      return [
        { text: `Earn 3 C-Rated Productions (${getCount('C')}/3)`, met: getCount('C') >= 3 },
        { text: `Earn 3 B-Rated Productions (${getCount('B')}/3)`, met: getCount('B') >= 3 },
        { text: `Earn 2 A-Rated Productions (${getCount('A')}/2)`, met: getCount('A') >= 2 },
      ]
    case '6m':
      return [
        { text: `Earn 2 C-Rated Productions (${getCount('C')}/2)`, met: getCount('C') >= 2 },
        { text: `Earn 2 B-Rated Productions (${getCount('B')}/2)`, met: getCount('B') >= 2 },
      ]
    case 'max_budget':
      return [
        { text: `Earn 2 C-Rated Productions (${getCount('C')}/2)`, met: getCount('C') >= 2 },
        { text: `Earn 2 B-Rated Productions (${getCount('B')}/2)`, met: getCount('B') >= 2 },
        { text: `Earn 1 A-Rated Production (${getCount('A')}/1)`, met: getCount('A') >= 1 },
      ]

    // --- Category B: Studio Growth (Company Tier AND Ratings) ---
    case 'series':
      return [
        { text: 'Reach Rising Star Studio Tier', met: isRising },
        { text: `Earn 2 C-Rated Productions (${getCount('C')}/2)`, met: getCount('C') >= 2 },
        { text: `Earn 1 B-Rated Production (${getCount('B')}/1)`, met: getCount('B') >= 1 },
      ]
    case 'movie':
      return [
        { text: 'Reach Popular Studio Tier', met: isPopular },
        { text: `Earn 2 A-Rated Productions (${getCount('A')}/2)`, met: getCount('A') >= 2 },
        { text: `Earn 1 S-Rated Production (${getCount('S')}/1)`, met: getCount('S') >= 1 },
        { text: `Earn 1 S+-Rated Production (${getCount('S+')}/1)`, met: getCount('S+') >= 1 },
      ]
    case 'streaming':
      return [
        { text: 'Reach Rising Star Studio Tier', met: isRising },
        { text: `Earn 2 C-Rated Productions (${getCount('C')}/2)`, met: getCount('C') >= 2 },
        { text: `Earn 2 B-Rated Productions (${getCount('B')}/2)`, met: getCount('B') >= 2 },
        { text: `Earn 1 A-Rated Production (${getCount('A')}/1)`, met: getCount('A') >= 1 },
      ]
    case '12m':
      return [
        { text: 'Reach Popular Studio Tier', met: isPopular },
        { text: `Earn 3 C-Rated Productions (${getCount('C')}/3)`, met: getCount('C') >= 3 },
        { text: `Earn 2 B-Rated Productions (${getCount('B')}/2)`, met: getCount('B') >= 2 },
        { text: `Earn 2 A-Rated Productions (${getCount('A')}/2)`, met: getCount('A') >= 2 },
      ]
    case 'custom_budget':
      return [
        { text: 'Reach Popular Studio Tier', met: isPopular },
        { text: `Earn 3 C-Rated Productions (${getCount('C')}/3)`, met: getCount('C') >= 3 },
        { text: `Earn 3 B-Rated Productions (${getCount('B')}/3)`, met: getCount('B') >= 3 },
        { text: `Earn 2 A-Rated Productions (${getCount('A')}/2)`, met: getCount('A') >= 2 },
        { text: `Earn 2 S-Rated Productions (${getCount('S')}/2)`, met: getCount('S') >= 2 },
      ]
    default:
      return []
  }
}

// ─── UX Checklist Component for Locked Features ──────────────────────────────
export function UnlockRequirementsList({ label, icon, requirements }) {
  const allMet = requirements.every(r => r.met)
  if (allMet) return null

  return (
    <div style={styles.reqBlock}>
      <div style={styles.reqHeader}>
        <span>{icon} {label} Requirements</span>
      </div>
      <div style={styles.reqList}>
        {requirements.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '7.5px', color: r.met ? 'var(--green)' : 'var(--lav)' }}>
            <span style={{ fontSize: '9px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' }}>{r.met ? '✓' : '□'}</span>
            <span style={{ textDecoration: r.met ? 'line-through' : 'none', opacity: r.met ? 0.6 : 1 }}>
              {r.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProductionForm({ setScreen }) {
  const { state, dispatch } = useGame()

  // Prompt 1: tier now rank-based
  const gameTier = getGameTierByRank(state.numericRank ?? 50)

  // ── Year / week calculations (Prompt 1 — Start Year System) ─────────────────
  const startYear        = state.startYear ?? 2024
  const currentYear      = startYear + Math.floor((state.week - 1) / 52)
  const weekInYear       = ((state.week - 1) % 52) + 1           // 1–52 within current year
  const yearStartGlobal  = (currentYear - startYear) * 52 + 1    // global week of year start

  // ── Form state ──────────────────────────────────────────────────────────────
  const [prodType,  setProdType]  = useState('mini_series')
  const [title,     setTitle]     = useState('')
  const [genre,     setGenre]     = useState('Romance')
  const [story,     setStory]     = useState('original')
  const [schedule,  setSchedule]  = useState('3m')
  const [platform,  setPlatform]  = useState('tv')
  const [rating,    setRating]    = useState('pg13')
  const [budgetMult,setBudgetMult]= useState(DEFAULT_BUDGET)
  const [lead1Id,   setLead1Id]   = useState('')
  const [lead2Id,   setLead2Id]   = useState('')
  const [cpName,    setCpName]    = useState('')
  const [cpEdited,  setCpEdited]  = useState(false)
  const [showChem,  setShowChem]  = useState(true)
  const [cpFixed,       setCpFixed]       = useState(false)
  const [showGenrePick, setShowGenrePick] = useState(false)  // genre select modal
  const [showSlotMachine, setShowSlotMachine] = useState(false)  // random genre modal
  const [theme,         setTheme]         = useState('Slow Burn')  // narrative theme
  const [showThemePick, setShowThemePick] = useState(false)        // theme select modal

  // Slot machine spin tracking — persists across cancel/reopen to prevent spin cheat
  const [slotSpinsUsed, setSlotSpinsUsed] = useState(0)
  const [bonusSpins,    setBonusSpins]    = useState(0)
  // 2× genre multiplier from slot — applied at production wrap
  const [genreMultiplier, setGenreMultiplier] = useState(1)

  // Prompt 2 — Year Lineup: start week within the current year (1–52)
  const [startWeekInYear, setStartWeekInYear] = useState(weekInYear)

  // 5.1: Randomized title suggestions (fresh on mount, never change during session)
  const [titleSuggestions] = useState(pickRandomTitles)

  const titleRef = useRef(null)

  // Available actors (signed + available)
  const availableActors = useMemo(
    () => state.actors.filter(canAssign),
    [state.actors]
  )

  // Auto-generate CP name when leads change
  const lead1 = state.actors.find(a => a.id === Number(lead1Id))
  const lead2 = state.actors.find(a => a.id === Number(lead2Id))

  // CP name lock — computed early (before useEffect) so the hook can reference them
  // storedCPName is only non-null when a name was previously submitted for a Fixed CP pair
  const fixedCPKey   = lead1 && lead2 ? bondKey(lead1.id, lead2.id) : null
  const storedCPName = fixedCPKey ? ((state.fixedCPNames ?? {})[fixedCPKey] ?? null) : null
  const cpNameLocked = !!storedCPName

  useEffect(() => {
    if (cpNameLocked && storedCPName) {
      setCpName(storedCPName)
      setCpEdited(false)
    } else if (!cpEdited) {
      setCpName('')
    }
  }, [lead1Id, lead2Id, cpEdited, cpNameLocked, storedCPName])

  // Prompt 5: CP auto-fill — when a lead with a fixed CP is selected,
  // automatically fill the partner slot.
  const [lead2FixedLocked, setLead2FixedLocked] = useState(false)
  const [lead1FixedLocked, setLead1FixedLocked] = useState(false)

  // ── Unlock Criteria Checks ──────────────────────────────────────────────────
  const getGradeCount = (g) => state.gradeCounts?.[g] ?? 0

  const isTypeUnlocked = (id) => {
    if (id === 'mini_series') return true
    return getUnlockRequirements(id, state.gradeCounts, gameTier).every(r => r.met)
  }

  const isSelectGenreUnlocked = getUnlockRequirements('select_genre', state.gradeCounts, gameTier).every(r => r.met)

  const isStoryUnlocked = (id) => {
    if (id === 'original') return true
    return getUnlockRequirements(id, state.gradeCounts, gameTier).every(r => r.met)
  }

  const isScheduleUnlocked = (id) => {
    if (id === '3m') return true
    return getUnlockRequirements(id, state.gradeCounts, gameTier).every(r => r.met)
  }

  const isPlatformUnlocked = (id) => {
    if (id === 'tv') return true
    return getUnlockRequirements(id, state.gradeCounts, gameTier).every(r => r.met)
  }

  const isMaxBudgetUnlocked = getUnlockRequirements('max_budget', state.gradeCounts, gameTier).every(r => r.met)
  const isCustomBudgetUnlocked = getUnlockRequirements('custom_budget', state.gradeCounts, gameTier).every(r => r.met)

  const isBudgetPickUnlocked = (v) => {
    if (v <= 1.0) return true
    if (v === 2.0) return isMaxBudgetUnlocked
    return true
  }

  function findFixedPartner(actorId) {
    if (!actorId) return null
    const id = Number(actorId)
    for (const [x, y] of (state.fixedCPs ?? [])) {
      if (x === id) return y
      if (y === id) return x
    }
    return null
  }

  function handleLead1Change(v) {
    SFX.click()
    setCpEdited(false)
    const partner = findFixedPartner(v)
    if (partner) {
      // Fixed CP: fill both slots, lock lead2
      setLead1Id(v)
      setLead1FixedLocked(false)
      setLead2Id(String(partner))
      setLead2FixedLocked(true)
    } else {
      // No fixed CP: if lead2 was previously auto-locked, reset it
      setLead1Id(v)
      setLead1FixedLocked(false)
      if (lead2FixedLocked) {
        setLead2Id('')
      }
      setLead2FixedLocked(false)
    }
  }

  function handleLead2Change(v) {
    SFX.click()
    setCpEdited(false)
    const partner = findFixedPartner(v)
    if (partner) {
      // Fixed CP: fill both slots, lock lead1
      setLead2Id(v)
      setLead2FixedLocked(false)
      setLead1Id(String(partner))
      setLead1FixedLocked(true)
    } else {
      // No fixed CP: if lead1 was previously auto-locked, reset it
      setLead2Id(v)
      setLead2FixedLocked(false)
      if (lead1FixedLocked) {
        setLead1Id('')
      }
      setLead1FixedLocked(false)
    }
  }

  // Cast: leads + any additional from the cast pool
  const castIds = useMemo(() => {
    const ids = []
    if (lead1Id) ids.push(Number(lead1Id))
    if (lead2Id && lead2Id !== lead1Id) ids.push(Number(lead2Id))
    return ids
  }, [lead1Id, lead2Id])

  const castActors = useMemo(
    () => state.actors.filter(a => castIds.includes(a.id)),
    [state.actors, castIds]
  )

  // Chemistry data
  const chemValue = useMemo(() => {
    if (!lead1 || !lead2) return 0
    return getChem(lead1, lead2.id)
  }, [lead1, lead2])

  const chemInfo = chemTier(chemValue)

  const sharedTraits = useMemo(() => {
    if (!lead1 || !lead2) return []
    return (lead1.characteristics ?? []).filter(c =>
      (lead2.characteristics ?? []).includes(c)
    )
  }, [lead1, lead2])

  // TV blocks R rating
  const effectiveRating = platform === 'tv' && rating === 'r' ? 'pg13' : rating

  // Combo preview — genre×type only (theme combo revealed after filming)
  const combo = getComboResult(prodType, genre)

  // Genre trends: cap to current tier's count so display & slot machine stay in sync
  const TREND_COUNTS_BY_TIER = { rookie: 3, rising: 4, popular: 5, worldwide: 6 }
  const displayedGenreTrends = (state.genreTrends ?? []).slice(0, TREND_COUNTS_BY_TIER[gameTier.id] ?? 3)

  // Cost & affordability
  const cost     = calcCost(prodType, budgetMult, schedule, castIds.length, gameTier.productionCostMod, genre, platform)
  const schedInfo  = SCHEDULES.find(s => s.id === schedule)
  const platInfo   = PLATFORMS.find(p => p.id === platform)
  const typeInfo   = PROD_TYPES[prodType]

  // ── Prompt 2: Year Lineup validation ─────────────────────────────────────
  const schedWeeks       = schedInfo?.weeks ?? 12
  // Clamp startWeekInYear to valid range whenever schedule changes
  const clampedStart     = Math.max(weekInYear, Math.min(startWeekInYear, 52))
  const lineupEndWeek    = clampedStart + schedWeeks - 1   // last week used in year
  const actualFitsInYear = lineupEndWeek <= 52
  const canFitInYear     = true; // Always allow starting!
  const minScheduleWeeks = 12  // 3M is shortest
  const anySlotLeft      = true; // Always allow scheduling!

  // Global week when filming actually begins (converts year-relative → global)
  const weekScheduled = yearStartGlobal + clampedStart - 1

  // ── Genre reuse warning — 13-week cooldown from wrap/completion ──────────
  // Only completed productions (in state.history, which has weekCompleted) count.
  // In-progress productions that are still filming/airing are intentionally excluded
  // so the cooldown starts from the moment the previous production wrapped.
  const REUSE_COOLDOWN_WEEKS = 13
  const isGenreReused = (state.history ?? []).some(h =>
    h.genre === genre &&
    h.weekCompleted != null &&
    (state.week - h.weekCompleted) <= REUSE_COOLDOWN_WEEKS
  )

  // 3.2: Fixed CP is only allowed if avg chemistry ≥ 20
  const avgChem = lead1 && lead2 ? Math.round((chemValue) ) : 0
  const fixedCpAllowed = lead1 && lead2 && avgChem >= 20
  const fixedCpPrice   = fixedCpCost(lead1, lead2)
  // Disable Fixed CP option if this pair is already a Fixed CP
  const alreadyFixedCP = lead1 && lead2 && (state.fixedCPs ?? []).some(
    ([x, y]) => (x === lead1.id && y === lead2.id) || (x === lead2.id && y === lead1.id)
  )
  const isEffectivelyFixed = alreadyFixedCP || (cpFixed && fixedCpAllowed)
  const totalCost     = cost + (cpFixed && fixedCpAllowed && !alreadyFixedCP ? fixedCpPrice : 0)
  const canAffordTotal = state.money >= totalCost

  function handleSubmit(e) {
    e.preventDefault()
    if (!canAffordTotal) { SFX.fail(); return }
    if (!title.trim()) {
      SFX.fail()
      pushToast(dispatch, 'Please enter a title.', 'red')
      return
    }
    if (!lead1Id) {
      SFX.fail()
      pushToast(dispatch, 'Select at least one lead actor.', 'red')
      return
    }
    // Prompt 2: Year lineup validation
    if (!canFitInYear) {
      SFX.fail()
      pushToast(dispatch, 'Not enough weeks left this year. Choose an earlier start week or shorter schedule.', 'red')
      return
    }

    SFX.confirm()

    const prod = createProduction({
      type:      prodType,
      title:     title.trim(),
      genre,
      budget:    budgetMult,
      schedule,
      platform,
      rating:    effectiveRating,
      story,
      castIds,
      leadIds:   castIds.slice(0, 2),
      cpName,
      weekStarted:     state.week,
      weekScheduled:   weekScheduled,
      theme:           theme,
      genreMultiplier: genreMultiplier,
      // Already-fixed pairs get fixedCP:true automatically (no extra fee charged).
      // New fixed CP contracts require the toggle + chemistry ≥ 20.
      fixedCP:   alreadyFixedCP || (cpFixed && fixedCpAllowed),
    })

    dispatch({ type: A.ADD_PRODUCTION, production: prod })
    dispatch({ type: A.ADD_MONEY, amount: -totalCost })

    // Register new Fixed CP pair if user opted in (3.2). Already-fixed pairs are
    // kept as-is — no need to re-register them.
    if (!alreadyFixedCP && cpFixed && fixedCpAllowed && lead1 && lead2) {
      dispatch({ type: A.ADD_FIXED_CP, pair: [lead1.id, lead2.id] })
    }

    // Save Fixed CP name (locks it for this pair going forward)
    if (isEffectivelyFixed && fixedCPKey) {
      dispatch({ type: A.SET_FIXED_CP_NAME, key: fixedCPKey, name: cpName })
    }

    for (const id of castIds) {
      dispatch({ type: A.UPDATE_ACTOR, id, patch: { assignedTo: prod.id, status: 'filming' } })
    }

    const fixedMsg = alreadyFixedCP
      ? ' 💕 Fixed CP production!'
      : (cpFixed && fixedCpAllowed ? ' 💕 Fixed CP registered!' : '')
    pushToast(dispatch, `"${prod.title}" production started!${fixedMsg}`, 'green')

    // Reset form — only here, after a confirmed submission (not on tab switch)
    setProdType('mini_series')
    setTitle('')
    setGenre('Romance')
    setStory('original')
    setSchedule('3m')
    setPlatform('tv')
    setRating('pg13')
    setBudgetMult(DEFAULT_BUDGET)
    setLead1Id('')
    setLead2Id('')
    setCpName('')
    setCpEdited(false)
    setShowChem(true)
    setCpFixed(false)
    setTheme('Slow Burn')
    setLead1FixedLocked(false)
    setLead2FixedLocked(false)
    setSlotSpinsUsed(0)
    setBonusSpins(0)
    setGenreMultiplier(1)
    setStartWeekInYear(((state.week - 1) % 52) + 1)

    setScreen('dashboard')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Year Line-Up Panel (Prompt 2) ─────────────────────────────────── */}
      <div className="panel">
        <div className="panel-title">📅 {currentYear} LINE-UP PRODUCTION</div>

        {/* Week summary */}
        <div style={styles.lineupSummary}>
          <span style={{ color: 'var(--lav)' }}>Year Week</span>
          <span style={{ color: 'var(--white)', fontWeight: 'bold' }}>{weekInYear} / 52</span>
          <span style={{ color: 'var(--lav)' }}>Used</span>
          <span style={{ color: 'var(--pink)', fontWeight: 'bold' }}>
            {/* Count weeks occupied by scheduled/filming productions this year */}
            {(() => {
              let used = 0
              for (const p of state.productions) {
                if (!p.weekScheduled) continue
                const pStartInYear = p.weekScheduled - yearStartGlobal + 1
                if (pStartInYear < 1 || pStartInYear > 52) continue
                const pWeeks = SCHEDULES.find(s => s.id === p.schedule)?.weeks ?? 0
                used += Math.min(pWeeks, 52 - pStartInYear + 1)
              }
              return used
            })()} wk
          </span>
          <span style={{ color: 'var(--lav)' }}>Remaining</span>
          <span style={{ color: anySlotLeft ? 'var(--green)' : 'var(--red)', fontWeight: 'bold' }}>
            {52 - weekInYear + 1} wk
          </span>
        </div>

        {/* 52-week timeline */}
        <LineupTimeline
          weekInYear={weekInYear}
          productions={state.productions}
          yearStartGlobal={yearStartGlobal}
          previewStart={anySlotLeft ? clampedStart : null}
          previewWeeks={schedWeeks}
          onWeekClick={w => { if (w >= weekInYear) setStartWeekInYear(w) }}
        />

        {/* Insufficient weeks warning */}
        {!anySlotLeft && (
          <div style={styles.lineupError}>
            Insufficient weeks remaining this year. Wait for next year to schedule new productions.
          </div>
        )}
      </div>

      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-title">🎬 NEW PRODUCTION</div>

        <div className="field">
          <label>PRODUCTION TITLE</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            maxLength={48}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter a title…"
            required
          />
        </div>

        {/* Type */}
        <div className="field">
          <label>TYPE</label>
          <div className="seg">
            {Object.entries(PROD_TYPES).map(([id, t]) => {
              const unlocked = isTypeUnlocked(id);
              return (
                <button key={id} type="button"
                  className={prodType === id ? 'sel' : ''}
                  onClick={() => { SFX.click(); setProdType(id) }}
                  disabled={!unlocked}
                  style={!unlocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' } : {}}
                >
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 4 }}>
            {typeInfo?.episodes} episode{typeInfo?.episodes !== 1 ? 's' : ''} · {prodType === 'mini_series' ? 'fast XP & chemistry growth' : prodType === 'series' ? 'balanced reviews and returns' : 'high investment, prestige, and reward'}
          </div>
          {!isTypeUnlocked('series') && (
            <UnlockRequirementsList
              label="Series"
              icon="🎭"
              requirements={getUnlockRequirements('series', state.gradeCounts, gameTier)}
            />
          )}
          {!isTypeUnlocked('movie') && (
            <UnlockRequirementsList
              label="Movie"
              icon="🎬"
              requirements={getUnlockRequirements('movie', state.gradeCounts, gameTier)}
            />
          )}
        </div>

        {/* Genre */}
        <div className="field">
          <label>GENRE</label>

          {/* Genre Trends */}
          {displayedGenreTrends.length > 0 && (() => {
            const trendColors = ['#FF6B9D','#6BC5FF','#FFD700','#5CE1A0','#DA70D6','#FF8C42']
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 6, color: 'var(--lav)', letterSpacing: 1 }}>TRENDS:</span>
                {displayedGenreTrends.map((g, i) => (
                  <div key={g} style={{
                    background:   genre === g ? trendColors[i % trendColors.length] : 'var(--bg-inset)',
                    border:       `2px solid ${trendColors[i % trendColors.length]}`,
                    color:        genre === g ? 'var(--bg-deep)' : 'var(--white)',
                    fontSize:     6,
                    padding:      '2px 5px',
                    display:      'inline-flex',
                    alignItems:   'center',
                    gap:          3,
                    letterSpacing: 0.5,
                  }}>
                    <span style={{ fontSize: 9 }}>{GENRE_EMOJI[g] ?? '🎬'}</span>
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Selected genre display */}
          <div style={styles.genreDisplay}>
            <span style={{ fontSize: 16 }}>{GENRE_EMOJI[genre] ?? '🎬'}</span>
            <span style={{ fontSize: 10, color: 'var(--white)', fontWeight: 'bold' }}>{genre}</span>
          </div>
          {/* Two action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button"
              style={{
                ...styles.genreBtn,
                ...(!isSelectGenreUnlocked ? { opacity: 0.5, cursor: 'not-allowed', background: 'var(--gray)', color: 'var(--bg-deep)' } : {})
              }}
              onClick={() => { if (isSelectGenreUnlocked) { SFX.click(); setShowGenrePick(true) } }}
              disabled={!isSelectGenreUnlocked}
              title={!isSelectGenreUnlocked ? `Unlock Select Genre by completing: 3 C-Rated (${getGradeCount('C')}/3), 3 B-Rated (${getGradeCount('B')}/3), and 2 A-Rated (${getGradeCount('A')}/2) productions` : ""}
            >
              🎭 Select Genre {!isSelectGenreUnlocked && '🔒'}
            </button>
            {(() => {
              const baseLimitByTier = { rookie: 2, rising: 3, popular: 5, worldwide: Infinity }
              const baseLimit = baseLimitByTier[gameTier.id] ?? 2
              const spinsLeft = baseLimit === Infinity
                ? Infinity
                : Math.max(0, baseLimit + bonusSpins - slotSpinsUsed)
              const spinLabel = baseLimit === Infinity
                ? '🎰 Random Genre'
                : `🎰 Random Genre (${spinsLeft} left)`
              return (
                <button type="button"
                  style={{ ...styles.genreBtn, background: spinsLeft <= 0 ? 'var(--gray)' : 'var(--lav)', color: 'var(--bg-deep)' }}
                  onClick={() => { SFX.click(); setShowSlotMachine(true) }}
                  disabled={spinsLeft <= 0}
                  title={spinsLeft <= 0 ? 'No spins remaining this production' : ''}
                >
                  {spinLabel}
                </button>
              )
            })()}
          </div>
          {!isSelectGenreUnlocked && (
            <UnlockRequirementsList
              label="Select Genre"
              icon="🎭"
              requirements={getUnlockRequirements('select_genre', state.gradeCounts, gameTier)}
            />
          )}
          {/* 2× multiplier active badge */}
          {genreMultiplier >= 1.3 && (
            <div style={{ fontSize: 8, color: 'var(--gold)', letterSpacing: 1, fontWeight: 'bold', marginTop: 4 }}>
              ✨ 1.35× GENRE MULTIPLIER ACTIVE — combo bonus boosted!
            </div>
          )}

          {/* Genre reuse warning */}
          {isGenreReused && (
            <div style={styles.genreWarn}>
              ⚠️ Reusing this genre may result in lower ratings and reputation.
            </div>
          )}
        </div>

        {/* Theme field */}
        <div className="field" style={{ marginTop: 10 }}>
          <label>THEME</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{THEME_EMOJI[theme] ?? '✨'}</span>
            <span style={{ fontSize: 10, color: 'var(--white)', fontWeight: 'bold' }}>{theme}</span>
          </div>
          <button type="button" style={styles.genreBtn}
            onClick={() => { SFX.click(); setShowThemePick(true) }}
          >
            ✨ Select Theme
          </button>
        </div>

        {/* Genre pick modal */}
        {showGenrePick && (
          <GenrePickModal
            current={genre}
            onSelect={g => { setGenre(g); setShowGenrePick(false); SFX.confirm() }}
            onClose={() => setShowGenrePick(false)}
            unlockedGenres={state.unlockedGenres ?? DEFAULT_GENRES}
          />
        )}

        {/* Theme pick modal */}
        {showThemePick && (
          <ThemePickModal
            current={theme}
            onSelect={t => { setTheme(t); setShowThemePick(false); SFX.confirm() }}
            onClose={() => setShowThemePick(false)}
            unlockedThemes={state.unlockedThemes ?? DEFAULT_THEMES}
          />
        )}

        {/* Slot machine modal */}
        {showSlotMachine && (() => {
          const baseLimitByTier = { rookie: 2, rising: 3, popular: 5, worldwide: Infinity }
          const baseLimit = baseLimitByTier[gameTier.id] ?? 2
          const effectiveSpinsLeft = baseLimit === Infinity
            ? Infinity
            : Math.max(0, baseLimit + bonusSpins - slotSpinsUsed)
          return (
            <SlotMachineModal
              onSelect={(g, isDiscovery) => {
                if (isDiscovery) {
                  dispatch({ type: A.DISCOVER_GENRE, genre: g })
                  pushEventLog(dispatch, `🎉 New Genre Discovered: ${g}!`, 'gold', state.week)
                  dispatch({
                    type: A.PUSH_MODAL,
                    modal: {
                      type: 'generic',
                      data: {
                        title: '🎉 NEW GENRE DISCOVERED!',
                        message: `Congratulations! You have discovered the genre "${g}" during your slot spin! It has been permanently added to your Genre Collection.`,
                      }
                    }
                  })
                }
                setGenre(g);
                setShowSlotMachine(false);
                SFX.confirm()
              }}
              onClose={() => setShowSlotMachine(false)}
              unlockedGenres={state.unlockedGenres ?? DEFAULT_GENRES}
              unlockedMilestones={state.unlockedMilestones ?? ['Romance', 'School', 'Office']}
              spinsLeft={effectiveSpinsLeft}
              onSpinUsed={() => setSlotSpinsUsed(c => c + 1)}
              onSpinAgain={() => setBonusSpins(c => c + 1)}
              onMultiplierAccepted={() => { setGenreMultiplier(1.35); SFX.confirm() }}
              currentGenre={genre}
              gameTierId={gameTier.id}
              genreTrends={displayedGenreTrends}
            />
          )
        })()}

      </div>

      {/* ── Leads & CP name ───────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-title">⭐ LEADS & CHEMISTRY</div>

        <div style={styles.leadsRow}>
          {/* Lead 1 — Prompt 5: auto-filled if lead2 has a fixed CP */}
          <LeadDropdown
            label={lead1FixedLocked ? 'LEAD 1 🔒 Fixed' : 'LEAD 1'}
            value={lead1Id}
            onChange={handleLead1Change}
            actors={availableActors}
            excludeId={Number(lead2Id)}
            locked={lead1FixedLocked}
          />
          {/* Lead 2 — Prompt 5: auto-filled if lead1 has a fixed CP */}
          <LeadDropdown
            label={lead2FixedLocked ? 'LEAD 2 🔒 Fixed' : 'LEAD 2'}
            value={lead2Id}
            onChange={handleLead2Change}
            actors={availableActors}
            excludeId={Number(lead1Id)}
            locked={lead2FixedLocked}
          />
        </div>

        {/* Portraits */}
        {(lead1 || lead2) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            {lead1 && <LeadMini actor={lead1} />}
            {lead1 && lead2 && <span style={{ fontSize: 14, color: 'var(--pink)' }}>💞</span>}
            {lead2 && <LeadMini actor={lead2} />}
          </div>
        )}

        {/* Chemistry panel */}
        {lead1 && lead2 && (
          <div style={styles.chemPanel}>
            <button
              type="button"
              style={{ ...styles.chemToggle }}
              onClick={() => setShowChem(v => !v)}
            >
              💕 CHEMISTRY {showChem ? '▲' : '▼'}
            </button>

            {showChem && (
              <div style={{ marginTop: 8 }}>
                {/* Chemistry bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 10, background: 'var(--bg-inset)', border: '1px solid var(--shadow)' }}>
                    <div style={{ width: `${chemValue}%`, height: '100%', background: chemInfo.color, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: chemInfo.color }}>{chemInfo.emoji} {chemValue}</span>
                  <span style={{ fontSize: 8, color: chemInfo.color }}>{chemInfo.label}</span>
                </div>

                {/* Shared traits */}
                {sharedTraits.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 7, color: 'var(--lav)' }}>Shared: </span>
                    {sharedTraits.map(t => (
                      <span key={t} style={styles.traitChip}>{t}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 7, color: 'var(--gray)', marginBottom: 6 }}>No shared traits</div>
                )}

                {/* Unhappy warnings */}
                {[lead1, lead2].map(a => (a.happiness ?? 70) < 40 && (
                  <div key={a.id} style={{ fontSize: 7, color: 'var(--red)', marginBottom: 4 }}>
                    ⚠️ {actorDisplayName(a)} is unhappy — chemistry may suffer
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CP name */}
        <div className="field" style={{ marginTop: 10 }}>
          <label>CP NAME (couple pairing)</label>
          {isEffectivelyFixed && !cpNameLocked && cpName && (
            <div style={{ fontSize: 6, color: 'var(--gold)', marginBottom: 4, lineHeight: 1.8 }}>
              ⚠️ Are you sure &quot;{cpName}&quot; is the CP Name? Changes will be locked in after submission.
            </div>
          )}
          <input
            type="text"
            value={cpName}
            maxLength={20}
            onChange={e => { if (!cpNameLocked) { setCpName(e.target.value); setCpEdited(true) } }}
            placeholder="Enter a CP name…"
            readOnly={cpNameLocked}
            style={{ opacity: cpNameLocked ? 0.7 : 1, cursor: cpNameLocked ? 'not-allowed' : 'text' }}
          />
          {cpNameLocked && (
            <div style={{ fontSize: 6, color: 'var(--pink)', marginTop: 3 }}>
              🔒 CP name locked for this Fixed CP pair
            </div>
          )}
        </div>

        {/* 3.2: Fixed vs Unfixed CP toggle */}
        {lead1 && lead2 && (
          <div style={styles.cpTypeBox}>
            <div style={{ fontSize: 7, color: 'var(--lav)', marginBottom: 6, letterSpacing: 1 }}>
              CP CONTRACT TYPE
            </div>
            <div className="seg">
              <button type="button"
                className={!cpFixed ? 'sel' : ''}
                onClick={() => { SFX.click(); setCpFixed(false) }}
              >
                🔓 Unfixed (free — can pair with others later)
              </button>
              <button type="button"
                className={cpFixed ? 'sel' : ''}
                onClick={() => { SFX.click(); if (fixedCpAllowed && !alreadyFixedCP) setCpFixed(true) }}
                disabled={!fixedCpAllowed || alreadyFixedCP}
                title={
                  alreadyFixedCP
                    ? 'These actors are already a Fixed CP pair'
                    : !fixedCpAllowed
                      ? `Chemistry must be ≥20 to lock a Fixed CP (current: ${avgChem})`
                      : ''
                }
              >
                {alreadyFixedCP
                  ? '💕 Fixed CP (already paired!)'
                  : `💕 Fixed CP ${fixedCpAllowed ? `(−₩${fixedCpPrice.toLocaleString()})` : `(need chem ≥20)`}`
                }
              </button>
            </div>
            {alreadyFixedCP && (
              <div style={{ fontSize: 7, color: 'var(--pink)', marginTop: 6 }}>
                💕 These actors are already a Fixed CP — no new contract needed.
              </div>
            )}
            {!alreadyFixedCP && cpFixed && fixedCpAllowed && (
              <div style={{ fontSize: 7, color: 'var(--pink)', marginTop: 6 }}>
                💕 Fixed CPs are locked together for all future productions.
                Chemistry must stay ≥20 or the contract breaks.
              </div>
            )}
            {!alreadyFixedCP && !fixedCpAllowed && (
              <div style={{ fontSize: 7, color: 'var(--gray)', marginTop: 4 }}>
                Chemistry {avgChem}/100 — need ≥20 to offer a Fixed CP contract.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Production details ────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-title">🗓️ PRODUCTION DETAILS</div>

        {/* Story */}
        <div className="field">
          <label>STORY</label>
          <div className="seg">
            {STORY_TYPES.map(s => {
              const unlocked = isStoryUnlocked(s.id);
              return (
                <button key={s.id} type="button"
                  className={story === s.id ? 'sel' : ''}
                  onClick={() => { SFX.click(); setStory(s.id) }}
                  disabled={!unlocked}
                  style={!unlocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' } : {}}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {!isStoryUnlocked('adaptation') && (
            <UnlockRequirementsList
              label="Adaptation Story"
              icon="📚"
              requirements={getUnlockRequirements('adaptation', state.gradeCounts, gameTier)}
            />
          )}
        </div>

        {/* Schedule */}
        <div className="field">
          <label>SCHEDULE</label>
          <div className="seg">
            {SCHEDULES.map(s => {
              const unlocked = isScheduleUnlocked(s.id);
              return (
                <button key={s.id} type="button"
                  className={schedule === s.id ? 'sel' : ''}
                  onClick={() => { SFX.click(); setSchedule(s.id) }}
                  disabled={!unlocked}
                  style={!unlocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' } : {}}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 4 }}>
            {schedInfo?.weeks} filming weeks · quality ×{schedInfo?.qMult}
          </div>
          {!isScheduleUnlocked('6m') && (
            <UnlockRequirementsList
              label="6 Months Schedule"
              icon="⏳"
              requirements={getUnlockRequirements('6m', state.gradeCounts, gameTier)}
            />
          )}
          {!isScheduleUnlocked('12m') && (
            <UnlockRequirementsList
              label="12 Months Schedule"
              icon="⏳"
              requirements={getUnlockRequirements('12m', state.gradeCounts, gameTier)}
            />
          )}
        </div>

        {/* Prompt 2: Start week selector */}
        {anySlotLeft && (
          <div className="field">
            <label>START WEEK IN {currentYear}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button"
                onClick={() => { SFX.click(); setStartWeekInYear(w => Math.max(weekInYear, w - 1)) }}
                style={styles.weekStepBtn}
              >◀</button>
              <div style={styles.weekDisplay}>
                Week {clampedStart}
              </div>
              <button type="button"
                onClick={() => { SFX.click(); setStartWeekInYear(w => Math.min(52, w + 1)) }}
                style={styles.weekStepBtn}
              >▶</button>
              <input
                type="number"
                min={weekInYear}
                max={52}
                value={clampedStart}
                onChange={e => setStartWeekInYear(Math.max(weekInYear, Math.min(52, Number(e.target.value) || weekInYear)))}
                style={{ width: 50, fontSize: 8, padding: '4px 6px' }}
              />
            </div>
            {/* Year boundary validation */}
            {actualFitsInYear ? (
              <div style={{ fontSize: 7, color: 'var(--green)', marginTop: 4 }}>
                ✓ Wk {clampedStart} → Wk {lineupEndWeek} · {schedWeeks} weeks · fits this year
              </div>
            ) : (
              <div style={{ fontSize: 7, color: 'var(--pink)', marginTop: 4 }}>
                ✨ Wk {clampedStart} → Wk {lineupEndWeek} (Year rollover) · {schedWeeks} weeks · spills over to next year!
              </div>
            )}
          </div>
        )}

        {/* Platform */}
        <div className="field">
          <label>PLATFORM</label>
          <div className="seg">
            {PLATFORMS.map(p => {
              const unlocked = isPlatformUnlocked(p.id);
              return (
                <button key={p.id} type="button"
                  className={platform === p.id ? 'sel' : ''}
                  onClick={() => { SFX.click(); setPlatform(p.id) }}
                  disabled={!unlocked}
                  style={!unlocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' } : {}}
                >
                  {p.icon} {p.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 4 }}>
            {platInfo?.label === 'TV'
              ? 'Lower cost · steadier returns · stronger reputation · R rating blocked'
              : 'Higher cost · higher revenue ceiling · mature R content gains more popularity'}
          </div>
          {!isPlatformUnlocked('streaming') && (
            <UnlockRequirementsList
              label="Streaming Platform"
              icon="📱"
              requirements={getUnlockRequirements('streaming', state.gradeCounts, gameTier)}
            />
          )}
        </div>

        {/* Rating */}
        <div className="field">
          <label>CONTENT RATING</label>
          <div className="seg">
            {RATINGS.map(r => {
              const blocked = platform === 'tv' && r.id === 'r'
              return (
                <button key={r.id} type="button"
                  className={effectiveRating === r.id ? 'sel' : ''}
                  onClick={() => { SFX.click(); if (!blocked) setRating(r.id) }}
                  disabled={blocked}
                  title={blocked ? 'TV does not allow R-rated content' : ''}
                >
                  {r.label}
                  {blocked && ' 🚫'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Budget ────────────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-title">💰 BUDGET</div>

        {/* Quick-pick */}
        <div className="seg" style={{ marginBottom: 10 }}>
          {[{ label: 'Min ×0.5', v: 0.5 }, { label: 'Standard ×1.0', v: 1.0 }, { label: 'Max ×2.0', v: 2.0 }].map(b => {
            const unlocked = isBudgetPickUnlocked(b.v);
            return (
              <button key={b.v} type="button"
                className={budgetMult === b.v ? 'sel' : ''}
                onClick={() => { SFX.click(); setBudgetMult(b.v) }}
                disabled={!unlocked}
                style={!unlocked ? { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' } : {}}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Custom slider */}
        <div className="field" style={!isCustomBudgetUnlocked ? { opacity: 0.5 } : {}}>
          <label>CUSTOM: ×{budgetMult.toFixed(2)}</label>
          <input
            type="range"
            min={BUDGET_MIN} max={BUDGET_MAX} step={0.05}
            value={budgetMult}
            onChange={e => {
              if (isCustomBudgetUnlocked) {
                setBudgetMult(Number(e.target.value));
              }
            }}
            disabled={!isCustomBudgetUnlocked}
            style={!isCustomBudgetUnlocked ? { cursor: 'not-allowed' } : {}}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: 'var(--lav)' }}>
            <span>×0.5 (min)</span><span>×3.0 (blockbuster)</span>
          </div>
        </div>
        {!isMaxBudgetUnlocked && (
          <UnlockRequirementsList
            label="Max Budget"
            icon="💰"
            requirements={getUnlockRequirements('max_budget', state.gradeCounts, gameTier)}
          />
        )}
        {!isCustomBudgetUnlocked && (
          <UnlockRequirementsList
            label="Custom Budget"
            icon="🎚️"
            requirements={getUnlockRequirements('custom_budget', state.gradeCounts, gameTier)}
          />
        )}
      </div>

      {/* ── Cost preview ──────────────────────────────────────────────────── */}
      <div className="cost-preview">
        <div>Type: {typeInfo?.label} · {typeInfo?.episodes} ep{typeInfo?.episodes !== 1 ? 's' : ''}</div>
        <div>Schedule: {schedInfo?.label} ({schedInfo?.weeks}wk, q×{schedInfo?.qMult})</div>
        <div>Platform: {platInfo?.label} · Rating: {effectiveRating.toUpperCase()}</div>
        <div>Story: {STORY_TYPES.find(s => s.id === story)?.label}</div>
        <div>Budget: ×{budgetMult.toFixed(2)} · Cast: {castIds.length} actor{castIds.length !== 1 ? 's' : ''}</div>
        <div style={{ fontSize: 7, color: 'var(--lav)' }}>
          Tier: {gameTier.label} · Cost ×{gameTier.productionCostMod.toFixed(2)} · Rev ×{gameTier.revenueMod.toFixed(2)}
        </div>
        {cpName && <div>CP: <span style={{ color: 'var(--pink)' }}>{cpName}</span>{cpFixed && fixedCpAllowed ? ' 💕 FIXED' : ''}</div>}
        {cpFixed && fixedCpAllowed && (
          <div style={{ color: 'var(--pink)', fontSize: 7 }}>Fixed CP fee: {fmtMoney(fixedCpPrice)}</div>
        )}
        <div style={{ borderTop: '1px dashed var(--gold)', marginTop: 6, paddingTop: 6 }}>
          <span style={{ color: canAffordTotal ? 'var(--gold)' : 'var(--red)', fontSize: 10 }}>
            TOTAL: {fmtMoney(totalCost)}
          </span>
          {!canAffordTotal && (
            <span style={{ color: 'var(--red)', fontSize: 7, marginLeft: 8 }}>
              (need {fmtMoney(totalCost - state.money)} more)
            </span>
          )}
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="submit"
          className="btn-primary"
          style={{ flex: 1, textAlign: 'center', fontSize: 11, padding: 16 }}
          disabled={!canAffordTotal || !lead1Id || !canFitInYear || !anySlotLeft}
          title={!anySlotLeft ? 'Insufficient weeks remaining this year.' : !canFitInYear ? 'Schedule exceeds year boundary.' : ''}
        >
          {anySlotLeft ? '🎬 ADD TO LINE-UP!' : '⛔ INSUFFICIENT WEEKS'}
        </button>
        <button type="button"
          onClick={() => { SFX.click(); setScreen('dashboard') }}
          style={{ padding: '12px 16px' }}
        >
          ✕
        </button>
      </div>

    </form>
  )
}

// ─── Year Lineup Timeline (Prompt 2) ──────────────────────────────────────────
// 52-block calendar showing which weeks are occupied by productions this year.
// Clicking an empty available week sets the start week.
const PROD_COLORS = [
  '#FF6B9D', '#6BC5FF', '#FFD700', '#90EE90', '#DA70D6',
  '#FFA07A', '#87CEEB', '#DDA0DD', '#98FB98', '#F0E68C',
]
function LineupTimeline({ weekInYear, productions, yearStartGlobal, previewStart, previewWeeks, onWeekClick }) {
  // Build a map of week (1–52) → production info
  const weekMap = {}
  productions.forEach((p, idx) => {
    if (!p.weekScheduled) return
    const startInYear = p.weekScheduled - yearStartGlobal + 1
    if (startInYear < 1 || startInYear > 52) return
    const schedWeeks = SCHEDULES.find(s => s.id === p.schedule)?.weeks ?? 0
    const color = PROD_COLORS[idx % PROD_COLORS.length]
    for (let w = startInYear; w < startInYear + schedWeeks && w <= 52; w++) {
      weekMap[w] = { color, title: p.title, phase: p.phase ?? 'filming' }
    }
  })

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 6, color: 'var(--lav)', letterSpacing: 1, marginBottom: 4 }}>
        52-WEEK YEAR CALENDAR · Click an empty slot to set start week
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(13, 1fr)',
        gap: 2,
      }}>
        {Array.from({ length: 52 }, (_, i) => {
          const w = i + 1
          const occ = weekMap[w]
          const isPast = w < weekInYear
          const isPreview = !occ && previewStart !== null && w >= previewStart && w < previewStart + previewWeeks
          const isCurrentWeek = w === weekInYear

          let bg = 'var(--bg-inset)'
          let border = '1px solid var(--shadow)'
          let cursor = 'default'

          if (occ) {
            bg = occ.color
            border = `1px solid ${occ.color}`
          } else if (isPreview) {
            bg = 'rgba(255,215,0,0.25)'
            border = '1px solid var(--gold)'
          } else if (isPast) {
            bg = 'rgba(255,255,255,0.04)'
          } else {
            cursor = 'pointer'
          }

          return (
            <div
              key={w}
              title={occ ? `${occ.title} (${occ.phase})` : isPast ? `Week ${w} — passed` : `Week ${w} — click to start here`}
              onClick={() => !occ && !isPast && onWeekClick(w)}
              style={{
                height: 12,
                background: bg,
                border: isCurrentWeek ? '2px solid var(--white)' : border,
                cursor,
                opacity: isPast ? 0.35 : 1,
                transition: 'background 0.1s',
                position: 'relative',
              }}
            />
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 6, color: 'var(--lav)', flexWrap: 'wrap' }}>
        <span>▪ <span style={{ background: 'var(--bg-inset)', padding: '0 3px' }}>Empty</span></span>
        <span>▪ <span style={{ background: 'rgba(255,215,0,0.25)', padding: '0 3px', color: 'var(--gold)' }}>Preview</span></span>
        <span>▪ Colored = scheduled production</span>
        <span>▪ White border = current week</span>
      </div>

      {/* Production title list — shows all productions scheduled in this year */}
      {(() => {
        const yearProds = productions
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => {
            if (!p.weekScheduled) return false
            const s = p.weekScheduled - yearStartGlobal + 1
            return s >= 1 && s <= 52
          })
        if (!yearProds.length) return null
        return (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 6, color: 'var(--lav)', letterSpacing: 1, marginBottom: 2 }}>
              SCHEDULED THIS YEAR
            </div>
            {yearProds.map(({ p, idx }) => {
              const color = PROD_COLORS[idx % PROD_COLORS.length]
              const startInYear = p.weekScheduled - yearStartGlobal + 1
              const endInYear   = Math.min(52, startInYear + (SCHEDULES.find(s => s.id === p.schedule)?.weeks ?? 0) - 1)
              return (
                <div key={p.id ?? idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, background: color, flexShrink: 0, borderRadius: 2 }} />
                  <div style={{ fontSize: 7, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 6, color: 'var(--lav)', flexShrink: 0 }}>
                    Wk {startInYear}–{endInYear}
                  </div>
                  <div style={{ fontSize: 6, color: 'var(--pink)', flexShrink: 0, textTransform: 'uppercase' }}>
                    {p.phase ?? 'scheduled'}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Lead actor dropdown ──────────────────────────────────────────────────────
// Prompt 5: `locked` shows a 🔒 Fixed badge and disables the dropdown
function LeadDropdown({ label, value, onChange, actors, excludeId, locked }) {
  const filtered = actors.filter(a => a.id !== excludeId)
  return (
    <div style={styles.leadDropWrap}>
      <label style={{ fontSize: 7, color: locked ? 'var(--pink)' : 'var(--lav)', letterSpacing: 1 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => !locked && onChange(e.target.value)}
        disabled={locked}
        style={{ fontSize: 8, width: '100%', opacity: locked ? 0.85 : 1 }}
      >
        <option value="">— Select —</option>
        {filtered.map(a => (
          <option key={a.id} value={a.id}>
            {actorDisplayName(a)} ({a.tier}) {(a.happiness ?? 70) < 40 ? '⚠️' : ''}
          </option>
        ))}
      </select>
      {locked && (
        <div style={{ fontSize: 6, color: 'var(--pink)', marginTop: 2 }}>
          🔒 Fixed CP partner — locked
        </div>
      )}
    </div>
  )
}

// ─── Lead mini card ───────────────────────────────────────────────────────────
function LeadMini({ actor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <ActorPortrait actor={actor} size={44} />
      <div>
        <div style={{ fontSize: 8, color: 'var(--white)' }}>{actorDisplayName(actor)}</div>
        <div style={{ fontSize: 7, color: 'var(--lav)' }}>{actor.tier}</div>
        <div style={{ fontSize: 12 }}>{moodEmoji(actor.happiness ?? 70)}</div>
      </div>
    </div>
  )
}

// ─── Genre Pick Modal ─────────────────────────────────────────────────────────
// Prompt 4: only shows unlocked genres; locked genres shown dimmed with 🔒
function GenrePickModal({ current, onSelect, onClose, unlockedGenres }) {
  const unlocked = unlockedGenres ?? DEFAULT_GENRES
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.box} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.title}>🎭 SELECT GENRE</div>
        <div style={{ fontSize: 7, color: 'var(--lav)', textAlign: 'center', marginBottom: 8 }}>
          {unlocked.length}/{GENRES.length} genres unlocked · Complete productions to unlock more
        </div>
        <div style={modalStyles.grid}>
          {GENRES.map(g => {
            const isUnlocked = unlocked.includes(g)
            return (
            <button
              key={g}
              type="button"
              disabled={!isUnlocked}
              style={{
                ...modalStyles.genreCard,
                ...(current === g ? modalStyles.genreCardSel : {}),
                opacity: isUnlocked ? 1 : 0.35,
                cursor:  isUnlocked ? 'pointer' : 'not-allowed',
              }}
              onClick={() => isUnlocked && onSelect(g)}
            >
              <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>
                {GENRE_EMOJI[g] ?? '🎬'}
              </span>
              <span style={{
                fontSize:    7,
                color:       current === g ? 'var(--bg-deep)' : isUnlocked ? 'var(--white)' : 'var(--gray)',
                lineHeight:  1.3,
                wordBreak:   'break-word',
                overflowWrap:'break-word',
                textAlign:   'center',
                maxWidth:    '100%',
                display:     'block',
              }}>
                {isUnlocked ? g : `🔒 ${g}`}
              </span>
            </button>
            )
          })}
        </div>
        <button type="button" style={modalStyles.closeBtn} onClick={onClose}>✕ CANCEL</button>
      </div>
    </div>
  )
}

// ─── Theme Pick Modal ─────────────────────────────────────────────────────────
// Shows all 29 themes grouped by category; locked ones are dimmed with 🔒
function ThemePickModal({ current, onSelect, onClose, unlockedThemes }) {
  const unlocked = unlockedThemes ?? DEFAULT_THEMES
  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.box, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.title}>✨ SELECT THEME</div>
        <div style={{ fontSize: 7, color: 'var(--lav)', textAlign: 'center', marginBottom: 8 }}>
          {unlocked.length}/{THEMES.length} themes unlocked · Complete productions to unlock more
        </div>
        {Object.entries(THEME_CATEGORIES).map(([cat, themes]) => (
          <div key={cat} style={{ width: '100%', marginBottom: 10 }}>
            <div style={{ fontSize: 7, color: 'var(--pink)', letterSpacing: 1, marginBottom: 4 }}>
              {cat.toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {themes.map(t => {
                const isUnlocked = unlocked.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!isUnlocked}
                    style={{
                      ...modalStyles.genreCard,
                      ...(current === t ? modalStyles.genreCardSel : {}),
                      opacity: isUnlocked ? 1 : 0.35,
                      cursor:  isUnlocked ? 'pointer' : 'not-allowed',
                      padding: '8px 4px',
                    }}
                    onClick={() => isUnlocked && onSelect(t)}
                  >
                    <span style={{ fontSize: 18, display: 'block', marginBottom: 3 }}>
                      {THEME_EMOJI[t] ?? '✨'}
                    </span>
                    <span style={{
                      fontSize:     6,
                      color:        current === t ? 'var(--bg-deep)' : isUnlocked ? 'var(--white)' : 'var(--gray)',
                      lineHeight:   1.3,
                      wordBreak:    'break-word',
                      overflowWrap: 'break-word',
                      textAlign:    'center',
                      display:      'block',
                    }}>
                      {isUnlocked ? t : `🔒 ${t}`}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <button type="button" style={modalStyles.closeBtn} onClick={onClose}>✕ CANCEL</button>
      </div>
    </div>
  )
}

// ─── Slot Machine Modal ───────────────────────────────────────────────────────
// Outcome-based spin: 5 result types (Genre Trend / Genre Discovery / Available /
// Spin Again / 2× Multiplier) with tier-based probability weights.
// spinsLeft is managed by parent so the count persists across cancel/reopen.
function SlotMachineModal({
  onSelect, onClose, unlockedGenres, unlockedMilestones, spinsLeft, onSpinUsed, onSpinAgain,
  onMultiplierAccepted, currentGenre, gameTierId, genreTrends,
}) {
  const unlocked   = (unlockedGenres ?? DEFAULT_GENRES).filter(g => GENRES.includes(g))
  const trendPool  = (genreTrends ?? []).filter(g => GENRES.includes(g))        // all trending genres
  const availPool  = unlocked.length > 0 ? unlocked : DEFAULT_GENRES             // unlocked genres
  const discoveryPool = (unlockedMilestones ?? []).filter(g => !unlocked.includes(g))

  // Tier-based outcome weights (must sum to 100 per tier)
  // Worldwide has no Spin Again — already unlimited; its weights sum without it.
  const WEIGHTS = {
    rookie:    { genreTrend: 8,  genreDiscovery: 20, available: 35, spinAgain: 25, multiplier: 12 },
    rising:    { genreTrend: 10, genreDiscovery: 16, available: 38, spinAgain: 22, multiplier: 14 },
    popular:   { genreTrend: 14, genreDiscovery: 12, available: 40, spinAgain: 18, multiplier: 16 },
    worldwide: { genreTrend: 20, genreDiscovery: 18, available: 45, spinAgain: 0,  multiplier: 17 },
  }
  const w = WEIGHTS[gameTierId] ?? WEIGHTS.rookie

  function rollDiscovery() {
    if (discoveryPool.length === 0) return null
    const tierWeights = {
      Starter: 100,
      C: 100,
      B: 60,
      A: 30,
      S: 10,
      'S+': 3,
    }
    const bucket = []
    for (const g of discoveryPool) {
      const gTier = GENRE_DETAILS[g]?.tier ?? 'C'
      const w = tierWeights[gTier] ?? 10
      for (let i = 0; i < w; i++) bucket.push(g)
    }
    if (bucket.length === 0) return discoveryPool[0]
    return bucket[Math.floor(Math.random() * bucket.length)]
  }

  function rollOutcome() {
    // If a sub-pool is empty, redistribute its weight to available
    const hasDiscovery = discoveryPool.length > 0
    const effectiveTrend  = trendPool.length > 0 ? w.genreTrend : 0
    const effectiveDisc   = hasDiscovery ? w.genreDiscovery : 0
    const effectiveAvail  = w.available
      + (trendPool.length === 0 ? w.genreTrend : 0)
      + (!hasDiscovery ? w.genreDiscovery  : 0)

    // Build weighted bucket
    const bucket = []
    for (let i = 0; i < effectiveTrend;       i++) bucket.push('genreTrend')
    for (let i = 0; i < effectiveDisc;        i++) bucket.push('genreDiscovery')
    for (let i = 0; i < effectiveAvail;        i++) bucket.push('available')
    for (let i = 0; i < w.spinAgain;           i++) bucket.push('spinAgain')
    for (let i = 0; i < w.multiplier;          i++) bucket.push('multiplier')
    if (bucket.length === 0) { for (let i = 0; i < 100; i++) bucket.push('available') }

    const type = bucket[Math.floor(Math.random() * bucket.length)]

    if (type === 'genreTrend') {
      return { type, genre: trendPool[Math.floor(Math.random() * trendPool.length)] }
    }
    if (type === 'genreDiscovery') {
      const dGenre = rollDiscovery()
      if (dGenre) return { type, genre: dGenre }
    }
    if (type === 'spinAgain')  return { type }
    if (type === 'multiplier') return { type }

    // available — 70% different genre, 30% same
    const same = availPool.filter(g => g === currentGenre)
    const diff = availPool.filter(g => g !== currentGenre)
    let genre
    if (same.length > 0 && diff.length > 0 && Math.random() < 0.30) genre = same[0]
    else if (diff.length > 0) genre = diff[Math.floor(Math.random() * diff.length)]
    else genre = availPool[Math.floor(Math.random() * availPool.length)]
    return { type: 'available', genre }
  }

  const [spinning,   setSpinning]  = React.useState(false)
  const [outcome,    setOutcome]   = React.useState(null)   // { type, genre? }
  const [displayIdx, setDisplayIdx]= React.useState(0)
  const intervalRef = React.useRef(null)

  const isInfinite = spinsLeft === Infinity
  const canSpin    = !spinning && (isInfinite || spinsLeft > 0)
  const displayPool = availPool

  function spin() {
    if (!canSpin) return
    setOutcome(null)
    setSpinning(true)
    onSpinUsed()   // decrement count immediately in parent (persists on cancel)

    let tick = 0
    const totalTicks = 28 + Math.floor(Math.random() * 10)
    let delay = 60

    function nextTick() {
      setDisplayIdx(i => (i + 1) % displayPool.length)
      tick++
      if (tick >= totalTicks) {
        const result = rollOutcome()
        if (result.genre) {
          const idx = displayPool.indexOf(result.genre)
          setDisplayIdx(idx >= 0 ? idx : 0)
        }
        setOutcome(result)
        setSpinning(false)
        // Spin Again: grant +1 bonus spin in parent automatically
        if (result.type === 'spinAgain') onSpinAgain()
        return
      }
      if (tick > totalTicks - 8) delay = 80 + (tick - (totalTicks - 8)) * 40
      intervalRef.current = setTimeout(nextTick, delay)
    }
    intervalRef.current = setTimeout(nextTick, delay)
  }

  React.useEffect(() => {
    spin()
    return () => clearTimeout(intervalRef.current)
  }, [])

  const displayGenre = displayPool[displayIdx] ?? displayPool[0] ?? 'Romance'

  // Spin button label — spinsLeft already decremented, so show post-spin count
  const spinLabel = spinning
    ? '⏳ SPINNING…'
    : (!isInfinite && spinsLeft <= 0)
      ? '🚫 NO SPINS LEFT'
      : isInfinite
        ? '🎰 SPIN AGAIN'
        : `🎰 SPIN AGAIN (${spinsLeft} left)`

  // Center emoji/name in slot window
  const slotEmoji = outcome?.type === 'spinAgain'  ? '🎰'
                  : outcome?.type === 'multiplier' ? '✨'
                  : (GENRE_EMOJI[displayGenre] ?? '🎬')
  const slotLabel = spinning          ? displayGenre
                  : outcome?.type === 'spinAgain'  ? 'SPIN AGAIN!'
                  : outcome?.type === 'multiplier' ? '1.35× MULTIPLIER!'
                  : (outcome?.genre ?? displayGenre)

  // Sub-label shown after landing
  function OutcomeTag() {
    if (!outcome || spinning) return null
    const tagStyles = {
      fontSize: 8, letterSpacing: 1.5, fontWeight: 'bold', marginTop: 6,
    }
    switch (outcome.type) {
      case 'genreTrend': return (
        <div>
          <div style={{ ...tagStyles, color: 'var(--gold)' }}>📈 GENRE TREND!</div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 2 }}>
            {outcome.genre} is trending this year!
          </div>
        </div>
      )
      case 'genreDiscovery': return (
        <div>
          <div style={{ ...tagStyles, color: 'var(--pink)' }}>🎉 NEW GENRE DISCOVERED!</div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 2 }}>
            You discovered {outcome.genre}! This genre is permanently added to your collection!
          </div>
        </div>
      )
      case 'spinAgain': return (
        <div>
          <div style={{ ...tagStyles, color: 'var(--green)' }}>🎰 +1 SPIN GRANTED!</div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 2 }}>
            Spin again to pick your genre.
          </div>
        </div>
      )
      case 'multiplier': return (
        <div>
          <div style={{ ...tagStyles, color: 'var(--gold)' }}>✨ 1.35× COMBO MULTIPLIER!</div>
          <div style={{ fontSize: 7, color: 'var(--lav)', marginTop: 2 }}>
            Accept to double your genre×type combo bonus.
          </div>
        </div>
      )
      default: return (
        <div style={{ ...tagStyles, color: 'var(--green)' }}>✨ LANDED!</div>
      )
    }
  }

  // Action buttons below spin button
  function ActionButtons() {
    if (!outcome || spinning) return null
    switch (outcome.type) {
      case 'spinAgain':
        // Bonus spin already granted — user just spins again; no extra button needed
        return null
      case 'multiplier':
        return (
          <button type="button" style={modalStyles.acceptBtn}
            onClick={() => { onMultiplierAccepted(); onClose() }}
          >
            ✅ ACCEPT 1.35× BONUS
          </button>
        )
      case 'genreDiscovery':
        return (
          <button type="button" style={modalStyles.acceptBtn}
            onClick={() => onSelect(outcome.genre, true)}
          >
            🎉 DISCOVER & USE {(outcome.genre ?? '').toUpperCase()}
          </button>
        )
      case 'genreTrend':
      case 'available':
        return (
          <button type="button" style={modalStyles.acceptBtn}
            onClick={() => onSelect(outcome.genre)}
          >
            ✅ USE {(outcome.genre ?? '').toUpperCase()}
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div style={modalStyles.overlay} onClick={!spinning ? onClose : undefined}>
      <div style={modalStyles.box} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.title}>🎰 RANDOM GENRE</div>

        {/* Slot window */}
        <div style={modalStyles.slotWindow}>
          <div style={{
            fontSize: 40,
            transition: spinning ? 'none' : 'transform 0.3s',
            filter: spinning ? 'blur(1px)' : 'none',
          }}>
            {slotEmoji}
          </div>
          <div style={{
            fontSize: 12,
            color: outcome ? 'var(--gold)' : 'var(--lav)',
            marginTop: 8,
            letterSpacing: 2,
            fontWeight: 'bold',
            minHeight: 20,
            transition: 'color 0.2s',
          }}>
            {slotLabel}
          </div>
          <OutcomeTag />
        </div>

        {/* Spinning strip preview (genre emojis) */}
        <div style={modalStyles.slotStrip}>
          {displayPool
            .slice(displayIdx, displayIdx + 5)
            .concat(displayPool.slice(0, Math.max(0, 5 - (displayPool.length - displayIdx))))
            .map((g, i) => (
              <span key={i} style={{
                fontSize: 16,
                opacity: i === 0 ? 1 : Math.max(0, 0.3 - i * 0.04),
                transition: 'opacity 0.1s',
              }}>
                {GENRE_EMOJI[g] ?? '🎬'}
              </span>
            ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" style={{
            ...modalStyles.spinBtn,
            opacity: canSpin ? 1 : 0.45,
            cursor: canSpin ? 'pointer' : 'not-allowed',
          }}
            onClick={spin} disabled={!canSpin}
          >
            {spinLabel}
          </button>
          <ActionButtons />
        </div>

        {!spinning && (
          <button type="button" style={modalStyles.closeBtn} onClick={onClose}>✕ CANCEL</button>
        )}
      </div>
    </div>
  )
}

const modalStyles = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.82)',
    zIndex:         200,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  box: {
    background:  'var(--bg-deep)',
    border:      '3px solid var(--pink)',
    padding:     '20px 18px',
    maxWidth:    380,
    width:       '94%',
    maxHeight:   '85vh',
    overflowY:   'auto',
    boxShadow:   '4px 4px 0 #8A2B52',
    display:     'flex',
    flexDirection: 'column',
    alignItems:  'center',
    gap:         10,
  },
  title: {
    fontSize:    11,
    color:       'var(--pink)',
    letterSpacing: 2,
    fontWeight:  'bold',
    marginBottom: 4,
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:                 8,
    width:               '100%',
  },
  genreCard: {
    padding:       '10px 4px',
    background:    'var(--bg-inset)',
    border:        '2px solid var(--shadow)',
    cursor:        'pointer',
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    justifyContent:'center',
    minHeight:     'auto',
    transition:    'border-color 0.15s',
    textAlign:     'center',
  },
  genreCardSel: {
    background:  'var(--pink)',
    border:      '2px solid var(--gold)',
  },
  closeBtn: {
    marginTop:   8,
    fontSize:    7,
    padding:     '5px 14px',
    background:  'var(--bg-inset)',
    border:      '2px solid var(--gray)',
    color:       'var(--gray)',
    cursor:      'pointer',
    boxShadow:   'none',
    minHeight:   'auto',
  },
  slotWindow: {
    background:  'var(--bg-inset)',
    border:      '3px solid var(--gold)',
    padding:     '20px 40px',
    textAlign:   'center',
    minWidth:    180,
  },
  slotStrip: {
    display:     'flex',
    gap:         8,
    alignItems:  'center',
    padding:     '4px 0',
  },
  spinBtn: {
    fontSize:    8,
    padding:     '8px 14px',
    background:  'var(--lav)',
    color:       'var(--bg-deep)',
    border:      'none',
    boxShadow:   '2px 2px 0 #4a3a8a',
    cursor:      'pointer',
    minHeight:   'auto',
  },
  acceptBtn: {
    fontSize:    8,
    padding:     '8px 14px',
    background:  'var(--green)',
    color:       'var(--bg-deep)',
    border:      'none',
    boxShadow:   '2px 2px 0 #1a5a2a',
    cursor:      'pointer',
    minHeight:   'auto',
    fontWeight:  'bold',
  },
}

const styles = {
  genreDisplay: {
    display:     'flex',
    alignItems:  'center',
    gap:         10,
    padding:     '10px 12px',
    background:  'var(--bg-inset)',
    border:      '2px solid var(--pink-dim)',
    marginTop:   6,
  },
  genreBtn: {
    flex:        1,
    fontSize:    8,
    padding:     '9px 10px',
    background:  'var(--pink)',
    color:       'var(--bg-deep)',
    border:      'none',
    boxShadow:   '2px 2px 0 #8A2B52',
    cursor:      'pointer',
    minHeight:   'auto',
    fontWeight:  'bold',
    letterSpacing: 1,
  },
  suggestChip: {
    fontSize:   7,
    padding:    '5px 8px',
    background: 'var(--bg-inset)',
    border:     '1px solid var(--pink-dim)',
    color:      'var(--lav)',
    cursor:     'pointer',
    boxShadow:  'none',
    minHeight:  'auto',
  },
  cpTypeBox: {
    marginTop:  10,
    padding:    '10px 10px',
    background: 'var(--bg-inset)',
    border:     '2px solid var(--shadow)',
  },
  comboBadge: {
    marginTop:  10,
    padding:    '7px 10px',
    border:     '2px solid var(--gray)',
    fontSize:   8,
    display:    'flex',
    alignItems: 'center',
    gap:        4,
    flexWrap:   'wrap',
  },
  leadsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 10,
  },
  leadDropWrap: {
    display:       'flex',
    flexDirection: 'column',
    gap:           4,
  },
  chemPanel: {
    background: 'var(--bg-inset)',
    border:     '2px solid var(--shadow)',
    padding:    '8px 10px',
    marginBottom: 4,
  },
  chemToggle: {
    background:  'transparent',
    border:      'none',
    boxShadow:   'none',
    color:       'var(--pink)',
    fontSize:    8,
    padding:     0,
    minHeight:   'auto',
    cursor:      'pointer',
  },
  traitChip: {
    fontSize:   6,
    padding:    '2px 5px',
    background: 'rgba(255,107,157,0.15)',
    border:     '1px solid var(--pink-dim)',
    color:      'var(--pink)',
  },
  lineupSummary: {
    display:        'grid',
    gridTemplateColumns: 'auto auto auto auto auto auto',
    gap:            '4px 10px',
    alignItems:     'center',
    fontSize:       7,
    marginBottom:   10,
    padding:        '6px 8px',
    background:     'var(--bg-inset)',
    border:         '1px solid var(--shadow)',
  },
  lineupError: {
    fontSize:    7,
    color:       'var(--red)',
    marginTop:   8,
    padding:     '6px 8px',
    background:  'rgba(255,80,80,0.08)',
    border:      '1px solid var(--red)',
  },
  genreWarn: {
    fontSize:    7,
    color:       'var(--gold)',
    marginTop:   6,
    padding:     '6px 8px',
    background:  'rgba(255,215,0,0.08)',
    border:      '1px solid rgba(255,215,0,0.3)',
    display:     'flex',
    alignItems:  'center',
    gap:         4,
  },
  weekStepBtn: {
    fontSize:    8,
    padding:     '5px 10px',
    background:  'var(--bg-inset)',
    border:      '2px solid var(--shadow)',
    color:       'var(--lav)',
    cursor:      'pointer',
    minHeight:   'auto',
    boxShadow:   'none',
  },
  weekDisplay: {
    fontSize:    9,
    color:       'var(--white)',
    fontFamily:  'inherit',
    background:  'var(--bg-inset)',
    border:      '2px solid var(--gold)',
    padding:     '4px 10px',
    minWidth:    60,
    textAlign:   'center',
  },
  reqBlock: {
    marginTop: 6,
    padding: '6px 8px',
    background: 'rgba(255,107,157,0.05)',
    border: '1px dashed var(--pink-dim)',
    borderRadius: 2,
  },
  reqHeader: {
    fontSize: '7.5px',
    fontWeight: 'bold',
    color: 'var(--pink)',
    marginBottom: 4,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  reqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
}
