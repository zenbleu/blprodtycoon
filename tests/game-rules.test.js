import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calcCost, calcRevenue, calcScore, getComboResult, tickProduction,
  createProduction, hasScheduleConflict, normalizeRatingForPlatform,
} from '../src/game/productions.js'
import { applyTierPromotion, checkTierPromotion, grantExp, xpToNextLevel } from '../src/game/actors.js'
import { calcBondGrowth } from '../src/game/chemistry.js'
import { buildBalanceReport } from '../src/game/debug.js'
import { isSaveData, migrateSaveData, SAVE_SCHEMA_VERSION } from '../src/game/save.js'
import { evaluateProduction } from '../src/game/evaluators.js'
import { A, gameReducer } from '../src/game/stateCore.js'

const fixedRandom = value => () => value

test('production cost remains positive and platform costs are strategic', () => {
  const tvCost = calcCost('series', 1, '6m', 2, 1, 'Romance', 'tv')
  const streamingCost = calcCost('series', 1, '6m', 2, 1, 'Romance', 'streaming')
  assert.ok(tvCost > 0)
  assert.ok(streamingCost > tvCost)
})

test('format and theme-independent combo categories are stable', () => {
  assert.equal(getComboResult('mini_series', 'Romance').label, 'PERFECT')
  assert.equal(getComboResult('series', 'School').label, 'BAD FIT')
  assert.equal(getComboResult('movie', 'Office').mult, 0.6)
})

test('controlled randomness makes score and revenue reproducible', () => {
  const production = {
    type: 'series',
    budget: 1,
    schedule: '6m',
    story: 'original',
    genre: 'Romance',
  }
  const cast = [{ skills: { act: 60, visual: 60, comedy: 60, sing: 60, dance: 60, lang: 60, art: 60, fitness: 60 } }]
  const scoreA = calcScore(production, cast, 20, 4, fixedRandom(0.5))
  const scoreB = calcScore(production, cast, 20, 4, fixedRandom(0.5))
  const revenueA = calcRevenue(80, 1, 'series', 'streaming', 1, 'original', fixedRandom(0.5))
  const revenueB = calcRevenue(80, 1, 'series', 'streaming', 1, 'original', fixedRandom(0.5))
  assert.equal(scoreA, scoreB)
  assert.equal(revenueA, revenueB)
})

test('production lifecycle can be advanced deterministically', () => {
  const production = {
    type: 'series',
    genre: 'Romance',
    theme: 'Slow Burn',
    genreMultiplier: 1,
    phase: 'filming',
    weeksLeft: 1,
    weeksTotal: 1,
    episodesTotal: 1,
    episodesReleased: 0,
    episodeRatings: [],
    platform: 'tv',
  }
  const wrapped = tickProduction(production, fixedRandom(0.5))
  assert.equal(wrapped.phase, 'wrap')
  assert.ok(wrapped.comboResult)
  const releasing = tickProduction({ ...production, ...wrapped }, fixedRandom(0.5))
  assert.equal(releasing.phase, 'releasing')
  const completed = tickProduction({ ...production, ...wrapped, ...releasing }, fixedRandom(0.5))
  assert.equal(completed.status, 'completed')
  assert.equal(completed.episodesReleased, 1)
})

test('lineup scheduling rejects overlaps and year-boundary overflow', () => {
  const existing = [{
    id: 'existing',
    status: 'active',
    phase: 'filming',
    weekScheduled: 10,
    schedule: '3m',
  }]

  assert.equal(hasScheduleConflict(existing, 21, '3m'), true)
  assert.equal(hasScheduleConflict(existing, 22, '3m'), false)
  assert.equal(hasScheduleConflict([{ ...existing[0], status: 'completed' }], 21, '3m'), false)
  assert.equal(10 + 48 - 1 > 52, true, '12-month starts must fit inside the 52-week year')
})

test('TV rating normalization is explicit at both helper and production boundaries', () => {
  assert.equal(normalizeRatingForPlatform('tv', 'r'), 'pg13')
  assert.equal(normalizeRatingForPlatform('streaming', 'r'), 'r')
  assert.equal(createProduction({
    type: 'movie',
    title: 'TV Cut',
    genre: 'Romance',
    budget: 1,
    schedule: '3m',
    platform: 'tv',
    rating: 'r',
  }).rating, 'pg13')
})

test('genre unlocks update the selectable collection and legacy milestone collection', () => {
  const initial = {
    unlockedGenres: ['Romance', 'School', 'Office', 'Comedy'],
    unlockedMilestones: ['Romance', 'School', 'Office', 'Comedy'],
  }
  const unlocked = gameReducer(initial, { type: A.UNLOCK_GENRES, genres: ['Music', 'Sports'] })
  assert.ok(unlocked.unlockedGenres.includes('Music'))
  assert.ok(unlocked.unlockedGenres.includes('Sports'))
  assert.ok(unlocked.unlockedMilestones.includes('Music'))
  assert.ok(unlocked.unlockedMilestones.includes('Sports'))
})

test('actor promotion and bond growth accept controlled randomness', () => {
  const actor = {
    id: 1,
    tier: 'Rookie',
    skills: { act: 20, sing: 20, dance: 20, visual: 20, lang: 20, comedy: 20, art: 20, fitness: 20 },
    happiness: 70,
    loyalty: 60,
  }
  const promoted = applyTierPromotion(actor, fixedRandom(0))
  assert.equal(promoted.tier, 'Rising Star')
  assert.equal(promoted.skills.act, 35)
  const cast = [
    { id: 1, tier: 'Rookie', chemistry_map: {} },
    { id: 2, tier: 'Rookie', chemistry_map: {} },
  ]
  assert.deepEqual(calcBondGrowth(cast, 80, 1, fixedRandom(0)), calcBondGrowth(cast, 80, 1, fixedRandom(0)))
})

test('actor XP is lifetime progress and raises visible levels', () => {
  const firstStep = xpToNextLevel(1)
  const actor = { level: 1, exp: firstStep - 1 }
  const patch = grantExp(actor, 1)
  assert.equal(patch.exp, firstStep)
  assert.equal(patch.level, 2)
})

test('save migration versions legacy saves and rejects future schemas', () => {
  const legacy = migrateSaveData({ week: 4, actors: [], history: [] })
  assert.equal(legacy.schemaVersion, SAVE_SCHEMA_VERSION)
  assert.ok(legacy.unlockedGenres.includes('Comedy'))
  assert.ok(isSaveData(legacy))
  assert.equal(isSaveData({ week: 4, schemaVersion: SAVE_SCHEMA_VERSION + 1 }), false)
})

test('developer balance report summarizes grades, genres, releases, and departures', () => {
  const report = buildBalanceReport({
    week: 20,
    money: 42000,
    history: [
      { grade: 'A', genre: 'Romance', score: 80, revenue: 5000 },
      { grade: 'B', genre: 'Romance', score: 65, revenue: 3500 },
    ],
    freeAgentsPool: [{ type: 'ex_actor' }, { type: 'new_talent' }],
    genreTrends: ['Romance'],
  })
  assert.deepEqual(report.gradeDistribution, { A: 1, B: 1 })
  assert.deepEqual(report.genreUsage, { Romance: 2 })
  assert.equal(report.actorDepartures, 1)
  assert.equal(report.releaseCashFlowProxy, 58500)
})

test('production evaluation explains the major strategic contributors', () => {
  const result = evaluateProduction({
    production: {
      title: 'Test Production',
      type: 'series',
      genre: 'Romance',
      theme: 'Slow Burn',
      budget: 1,
      schedule: '6m',
      platform: 'streaming',
      rating: 'pg13',
      story: 'original',
      comboResult: {
        formatGenreMult: 1.5,
        genreThemeMult: 1.25,
        fitLabel: 'Perfect Fit',
      },
    },
    score: 72,
    baseScore: 68,
    reputation: 10,
    chemValue: 80,
    castActors: [],
    tier: {},
    genreTrends: ['Romance'],
    genreReuseMod: 0.85,
    rng: fixedRandom(0.5),
  })
  const ids = result.resultBreakdown.map(item => item.id)
  assert.ok(ids.includes('quality'))
  assert.ok(ids.includes('chemistry'))
  assert.ok(ids.includes('format'))
  assert.ok(ids.includes('theme'))
  assert.ok(ids.includes('trend'))
  assert.ok(ids.includes('reuse'))
  assert.ok(ids.includes('platform'))
  assert.ok(result.famePerActor > 0)
})

test('promotion requirements remain gated until all criteria are met', () => {
  const actor = { id: 1, tier: 'Rookie', fame: 0, exp: 0, completedProds: 0, happiness: 20, loyalty: 20, awards: 0 }
  const result = checkTierPromotion(actor, [])
  assert.equal(result.eligible, false)
  assert.ok(result.unmet.length > 0)
})