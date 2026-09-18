/**
 * PlayerGuide.jsx — Practical reference for the studio's rules and goals.
 *
 * This is intentionally a game-facing guide, not a developer/debug screen:
 * it explains what each meter does, what to aim for next, and how actors grow.
 */
import React, { useMemo } from 'react'
import { useGame } from '../game/state.jsx'
import { calcRank, fmtPop } from '../game/ranking.js'
import { getGameTierByRank, getNextTierRankThreshold } from '../game/tiers.js'
import {
  GENRE_UNLOCK_BY_GRADE,
  GENRE_UNLOCK_COUNTS,
} from '../game/productions.js'
import {
  THEME_UNLOCK_BY_GRADE,
  THEME_UNLOCK_COUNTS,
} from '../game/themes.js'
import {
  TIER_PROMOTION_REQ,
  TIER_COLOR,
  actorDisplayName,
  checkTierPromotion,
  xpToNextLevel,
} from '../game/actors.js'

const GRADE_ORDER = ['C', 'B', 'A', 'S', 'S+']

const GLOSSARY = [
  {
    term: 'Reputation',
    value: '0–100 studio standing',
    detail: 'Critics, platforms, awards, and production quality move it. It helps determine your named studio rank.',
  },
  {
    term: 'Popularity',
    value: 'Audience reach',
    detail: 'Released productions grow your fanbase. It is one of the main inputs to studio rank.',
  },
  {
    term: 'Numeric rank',
    value: '#1 is best',
    detail: 'Your position among 50 studios. A lower number unlocks better studio tiers and more actor opportunities.',
  },
  {
    term: 'Chemistry',
    value: 'Lead pairing strength',
    detail: 'It adds a quality contribution and grows when actors film together. Shared traits can make a pairing stronger.',
  },
  {
    term: 'Combo',
    value: 'Format × genre × theme fit',
    detail: 'Perfect fits improve the score multiplier. Bad fits reduce it. The setup preview gives you the qualitative signal before committing.',
  },
  {
    term: 'Genre trend',
    value: 'This year’s audience interest',
    detail: 'A trending genre gets an audience bonus when it releases. Trends refresh at the start of a year.',
  },
  {
    term: 'Reuse penalty',
    value: 'Freshness matters',
    detail: 'Using the same genre again soon can reduce the production score: −15% for the first recent reuse and −25% for another.',
  },
  {
    term: 'Fame',
    value: 'Actor career momentum',
    detail: 'Actors gain fame from completed productions. Fame, XP, grades, awards, happiness, and loyalty together drive promotion.',
  },
  {
    term: 'Loyalty',
    value: 'Contract stability',
    detail: 'Filming and fan meetings build loyalty. Low happiness can reduce it; at zero, an actor may leave.',
  },
]

function progressValue(value, goal) {
  if (!goal) return 1
  return Math.min(1, Math.max(0, value / goal))
}

function nextGradeGoal(counts, unlocks, requirements) {
  const grade = GRADE_ORDER.find(g => (counts?.[g] ?? 0) < (requirements?.[g] ?? 0))
  if (!grade) return null
  const current = counts?.[grade] ?? 0
  const required = requirements[grade]
  return {
    grade,
    current,
    required,
    remaining: Math.max(0, required - current),
    unlocks: unlocks[grade] ?? [],
  }
}

function GoalCard({ icon, title, detail, progress, tone = 'var(--pink)', children }) {
  return (
    <div style={styles.goalCard}>
      <div style={styles.goalHeader}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, color: tone, fontWeight: 'bold' }}>{title}</div>
          <div style={{ fontSize: 6.5, color: 'var(--lav)', lineHeight: 1.6 }}>{detail}</div>
        </div>
      </div>
      {progress != null && (
        <div style={styles.progressTrack} aria-label={`${Math.round(progress * 100)} percent complete`}>
          <div style={{ ...styles.progressFill, width: `${progress * 100}%`, background: tone }} />
        </div>
      )}
      {children}
    </div>
  )
}

export default function PlayerGuide() {
  const { state } = useGame()
  const rank = calcRank(state.reputation, state.popularity)
  const currentTier = getGameTierByRank(state.numericRank ?? 101)
  const nextTierRank = getNextTierRankThreshold(state.numericRank ?? 101)
  const signedActors = state.actors.filter(actor => actor.signed)

  const nextGenre = useMemo(
    () => nextGradeGoal(state.gradeCounts, GENRE_UNLOCK_BY_GRADE, GENRE_UNLOCK_COUNTS),
    [state.gradeCounts],
  )
  const nextTheme = useMemo(
    () => nextGradeGoal(state.gradeCounts, THEME_UNLOCK_BY_GRADE, THEME_UNLOCK_COUNTS),
    [state.gradeCounts],
  )

  const actorGoals = signedActors
    .filter(actor => actor.tier !== 'Worldwide')
    .map(actor => {
      const promotion = checkTierPromotion(actor, state.history)
      const req = TIER_PROMOTION_REQ[actor.tier]
      const numericGoals = [
        { label: 'Fame', value: actor.fame ?? 0, goal: req?.fame ?? 0 },
        { label: 'XP', value: actor.exp ?? 0, goal: req?.exp ?? 0 },
        { label: 'Productions', value: actor.completedProds ?? 0, goal: req?.completedProds ?? 0 },
      ]
      const average = numericGoals.reduce((sum, item) => sum + progressValue(item.value, item.goal), 0) / numericGoals.length
      return { actor, promotion, req, numericGoals, average }
    })
    .sort((a, b) => b.average - a.average)
    .slice(0, 4)

  return (
    <div style={styles.page}>
      <div className="panel">
        <div className="panel-title">📖 STUDIO FIELD GUIDE</div>
        <div style={styles.intro}>
          Use this page when you are deciding what to make next. The strongest production is not always the
          biggest one: fit, timing, cast chemistry, and a healthy studio all compound together.
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">🧭 NEXT UNLOCKS</div>
        <div style={styles.goalGrid}>
          <GoalCard
            icon="🏢"
            title={`${currentTier.label} STUDIO TIER`}
            tone="var(--blue)"
            progress={nextTierRank == null ? 1 : Math.max(0, Math.min(1, (101 - (state.numericRank ?? 101)) / (101 - nextTierRank)))}
            detail={nextTierRank == null ? 'Maximum studio tier reached.' : `Reach industry rank #${nextTierRank} to open the next tier.`}
          >
            <div style={styles.goalMeta}>
              {nextTierRank == null ? '✦ Worldwide access' : `Current rank #${state.numericRank ?? 101} · ${rank.label}`}
            </div>
          </GoalCard>

          <GoalCard
            icon="🎭"
            title={nextGenre ? `UNLOCK ${nextGenre.grade} GENRES` : 'ALL GENRES UNLOCKED'}
            tone="var(--pink)"
            progress={nextGenre ? progressValue(nextGenre.current, nextGenre.required) : 1}
            detail={nextGenre
              ? `Complete ${nextGenre.remaining} more ${nextGenre.grade}-rated production${nextGenre.remaining === 1 ? '' : 's'}.`
              : 'Your genre collection is complete.'}
          >
            <div style={styles.goalMeta}>{nextGenre?.unlocks.join(' · ') ?? 'Every genre is available'}</div>
          </GoalCard>

          <GoalCard
            icon="✨"
            title={nextTheme ? `UNLOCK ${nextTheme.grade} THEMES` : 'ALL THEMES UNLOCKED'}
            tone="var(--gold)"
            progress={nextTheme ? progressValue(nextTheme.current, nextTheme.required) : 1}
            detail={nextTheme
              ? `Complete ${nextTheme.remaining} more ${nextTheme.grade}-rated production${nextTheme.remaining === 1 ? '' : 's'}.`
              : 'Your theme collection is complete.'}
          >
            <div style={styles.goalMeta}>{nextTheme?.unlocks.join(' · ') ?? 'Every theme is available'}</div>
          </GoalCard>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">🧑‍🎤 ACTOR CAREER PATH</div>
        <div style={styles.intro}>
          Productions award XP and fame to every cast member. XP raises their level; fame, grades, awards,
          completed work, happiness, and loyalty unlock the next tier. Keep idle actors happy with rest,
          training, or fan meetings.
        </div>
        {actorGoals.length === 0 ? (
          <div style={styles.empty}>All signed actors are at the Worldwide tier, or sign your first actor to begin a career path.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actorGoals.map(({ actor, promotion, req, numericGoals, average }) => (
              <div key={actor.id} style={styles.actorGoal}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: TIER_COLOR[actor.tier] ?? 'var(--lav)', fontSize: 8 }}>★</span>
                  <strong style={{ color: 'var(--white)', fontSize: 8 }}>{actorDisplayName(actor)}</strong>
                  <span style={{ color: TIER_COLOR[actor.tier] ?? 'var(--lav)', fontSize: 6 }}>{actor.tier}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--gray)', fontSize: 6 }}>
                    {promotion.nextTier ? `→ ${promotion.nextTier}` : 'MAX'}
                  </span>
                </div>
                <div style={styles.miniGoalRow}>
                  {numericGoals.map(item => (
                    <div key={item.label} style={{ flex: 1, minWidth: 72 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, color: 'var(--lav)' }}>
                        <span>{item.label}</span>
                        <span>{item.value.toLocaleString()} / {item.goal.toLocaleString()}</span>
                      </div>
                      <div style={styles.miniTrack}>
                        <div style={{ ...styles.miniFill, width: `${progressValue(item.value, item.goal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 6.5, color: promotion.unmet.length ? 'var(--lav)' : 'var(--green)', lineHeight: 1.6 }}>
                  {promotion.unmet.length
                    ? `Next promotion needs: ${promotion.unmet.slice(0, 3).join(' · ')}${promotion.unmet.length > 3 ? ' · …' : ''}`
                    : `Ready for promotion to ${req.nextTier}. Advance a week to resolve it.`}
                </div>
                <div style={{ fontSize: 6, color: 'var(--gray)' }}>
                  Level {actor.level ?? 1} · next XP step {xpToNextLevel(actor.level ?? 1).toLocaleString()} · overall progress {Math.round(average * 100)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-title">📚 TERMS & FORMULAS</div>
        <div style={styles.glossaryGrid}>
          {GLOSSARY.map(item => (
            <div key={item.term} style={styles.termCard}>
              <div style={{ color: 'var(--pink)', fontSize: 8 }}>{item.term}</div>
              <div style={{ color: 'var(--gold)', fontSize: 7, margin: '3px 0' }}>{item.value}</div>
              <div style={{ color: 'var(--lav)', fontSize: 6.5, lineHeight: 1.7 }}>{item.detail}</div>
            </div>
          ))}
        </div>
        <div style={styles.formulaBox}>
          <strong style={{ color: 'var(--white)', fontSize: 7 }}>Rank formula</strong>
          <span style={{ color: 'var(--lav)', fontSize: 6.5 }}>
            Reputation × 2 + Popularity × 0.8 + Awards × 20 + lifetime revenue ÷ 3,000.
            Current popularity: {fmtPop(state.popularity)}.
          </span>
          <span style={{ color: 'var(--gray)', fontSize: 6 }}>
            Rank is a lower-is-better position among 50 studios; use it to plan tier unlocks.
          </span>
        </div>
      </section>
    </div>
  )
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 14 },
  intro: { fontSize: 7.5, color: 'var(--lav)', lineHeight: 1.9 },
  goalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8 },
  goalCard: { background: 'var(--bg-inset)', border: '2px solid var(--shadow)', padding: 9, minWidth: 0 },
  goalHeader: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  progressTrack: { height: 7, marginTop: 9, background: 'var(--bg-deep)', border: '1px solid var(--shadow)' },
  progressFill: { height: '100%', transition: 'width 0.3s ease' },
  goalMeta: { color: 'var(--white)', fontSize: 6.5, lineHeight: 1.6, marginTop: 7 },
  empty: { color: 'var(--gray)', fontSize: 7.5, lineHeight: 1.8, padding: '8px 0' },
  actorGoal: { background: 'var(--bg-inset)', border: '1px solid var(--shadow)', padding: 9 },
  miniGoalRow: { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '9px 0 6px' },
  miniTrack: { height: 5, marginTop: 3, background: 'var(--bg-deep)', border: '1px solid var(--shadow)' },
  miniFill: { height: '100%', background: 'var(--blue)' },
  glossaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 7 },
  termCard: { background: 'var(--bg-inset)', border: '1px solid var(--shadow)', padding: 8 },
  formulaBox: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 9, padding: 9, border: '1px dashed var(--gold)', background: 'rgba(255,215,0,0.05)' },
}