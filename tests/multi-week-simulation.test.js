import test from 'node:test'
import assert from 'node:assert/strict'
import { A, gameReducer } from '../src/game/stateCore.js'
import { advanceWeekPipeline } from '../src/game/weekAdvance.js'
import { ACTOR_DATA, initChemistry } from '../src/game/actors.js'
import { createProduction, PROD_TYPES, SCHEDULES } from '../src/game/productions.js'
import { createSaveData, migrateSaveData, isSaveData, SAVE_SCHEMA_VERSION } from '../src/game/save.js'

const WEEKS_TO_SIMULATE = 156
const SEED = 0x51a7ed

function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function makeSimulationState(rng) {
  const actors = initChemistry(
    ACTOR_DATA.map(actor => ({
      ...actor,
      signed: actor.tier === 'Rookie',
      status: actor.tier === 'Rookie' ? 'available' : 'locked',
      happiness: 82,
      loyalty: 78,
      idleWeeks: 0,
      injuredWeeks: 0,
      injuredThisYear: 0,
      completedProds: 0,
      awards: 0,
      fame: 0,
      retainerOwed: actor.tier === 'Worldwide' ? 150 : 0,
      chemistry_map: {},
      assignedTo: null,
      level: 1,
      exp: 0,
      isNewTalent: false,
      poolId: null,
      idleReturnCount: 0,
      honeymoonStartWeek: actor.tier === 'Rookie' ? 1 : 0,
      honeymoonWeeks: actor.tier === 'Rookie' ? 4 : 0,
    })),
    rng,
  ).map(actor => actor.id === 1
    ? {
        ...actor,
        fame: 1900,
        exp: 250,
        completedProds: 2,
        skills: Object.fromEntries(Object.keys(actor.skills).map(key => [key, 80])),
      }
    : actor)

  return {
    schemaVersion: 2,
    companyName: 'Seeded Studio',
    unlockedTiers: ['Rookie'],
    unlockedGenres: ['Romance', 'School', 'Office', 'Comedy'],
    unlockedMilestones: ['Romance', 'School', 'Office', 'Comedy'],
    unlockedThemes: ['Slow Burn', 'Friends-to-Lovers', 'Enemies-to-Lovers', 'Soulmates', 'Forbidden Love'],
    events: [],
    fixedCPNames: {},
    gradeCounts: {},
    productionsCompleted: 0,
    settings: { sfxOn: false, scanlines: false, animSpeed: 'normal' },
    lastSaved: null,
    started: true,
    startYear: 2026,
    week: 1,
    money: 250000,
    reputation: 35,
    popularity: 30000,
    rank: 'REGIONAL',
    numericRank: 101,
    actors,
    productions: [],
    history: [{
      id: 'seeded-prior-production',
      title: 'Seeded Prior Production',
      genre: 'Romance',
      castIds: [1],
      leadIds: [1],
      grade: 'A',
      score: 80,
      weekCompleted: 0,
      status: 'completed',
    }],
    eventLog: [],
    modalQueue: [],
    toasts: [],
    fixedCPs: [[1, 2]],
    freeAgentsPool: [{
      poolId: 'seeded-ex-actor',
      type: 'ex_actor',
      name: 'Returning Guest',
      weeksInPool: 23,
      availableWeek: 1,
      permanentlyGone: false,
    }, {
      poolId: 'seeded-new-talent',
      type: 'new_talent',
      name: 'Seeded New Talent',
      weeksInPool: 0,
      availableWeek: 1,
      permanentlyGone: false,
    }],
    genreTrends: [],
    rivals: [
      { id: 1, name: 'Seeded Rival', score: 500000 },
      ...Array.from({ length: 9 }, (_, index) => ({
        id: index + 2,
        name: `Seeded Rival ${index + 2}`,
        score: 100 + index,
      })),
    ],
    awardsPhase: null,
    awardsData: null,
    flags: {},
  }
}

function dispatchFor(stateRef) {
  return action => {
    stateRef.value = gameReducer(stateRef.value, action)
  }
}

function scheduleProduction(stateRef, rng, week) {
  const current = stateRef.value
  const available = current.actors.filter(actor => actor.signed && actor.status === 'available')
  if (available.length < 2 || current.productions.length >= 3) return false

  const recipes = [
    { type: 'movie', schedule: '3m', genre: 'Romance', theme: 'Slow Burn', platform: 'streaming' },
    { type: 'mini_series', schedule: '3m', genre: 'Comedy', theme: 'Friends-to-Lovers', platform: 'tv' },
    { type: 'series', schedule: '3m', genre: 'Office', theme: 'Enemies-to-Lovers', platform: 'streaming' },
  ]
  const recipe = recipes[(week - 1) % recipes.length]
  const cast = available.slice(0, recipe.type === 'movie' ? 2 : 3)
  const production = createProduction({
    ...recipe,
    title: `Seeded Production ${week}`,
    budget: 1.5,
    rating: recipe.genre === 'Comedy' ? 'pg' : 'pg13',
    story: week % 2 === 0 ? 'adaptation' : 'original',
    castIds: cast.map(actor => actor.id),
    leadIds: cast.slice(0, 2).map(actor => actor.id),
    cpName: `${cast[0].name} × ${cast[1].name}`,
    weekStarted: week,
    weekScheduled: week,
  })

  stateRef.value = gameReducer(current, {
    type: A.ADD_PRODUCTION,
    production: { ...production, id: `seeded-production-${week}` },
  })
  for (const actor of cast) {
    stateRef.value = gameReducer(stateRef.value, {
      type: A.UPDATE_ACTOR,
      id: actor.id,
      patch: { status: 'filming', assignedTo: production.id },
    })
  }
  return true
}

function resolveModalQueue(stateRef, rng) {
  let guard = 0
  while (stateRef.value.modalQueue.length > 0) {
    assert.ok(++guard < 100, 'modal queue did not converge')
    const modal = stateRef.value.modalQueue[0]
    const choices = modal?.data?.choices
    stateRef.value = gameReducer(stateRef.value, { type: A.POP_MODAL })
    if (Array.isArray(choices) && choices.length > 0) {
      // Some event choices contain their own random outcome. Keep those rolls
      // inside the same seeded stream as the weekly pipeline.
      const previousRandom = Math.random
      Math.random = rng
      try {
        choices[0].effect(stateRef.value, dispatchFor(stateRef))
      } finally {
        Math.random = previousRandom
      }
    }
  }
}

function assertValidState(state) {
  assert.ok(Number.isFinite(state.week) && state.week >= 1)
  assert.ok(Number.isFinite(state.money))
  assert.ok(Number.isFinite(state.reputation) && state.reputation >= 0 && state.reputation <= 100)
  assert.ok(Number.isFinite(state.popularity) && state.popularity >= 0)
  assert.ok(Number.isInteger(state.productionsCompleted) && state.productionsCompleted >= 0)
  assert.ok(Array.isArray(state.genreTrends) && state.genreTrends.length > 0)
  assert.ok(Array.isArray(state.history))
  assert.equal(new Set(state.history.map(item => item.id)).size, state.history.length)

  for (const actor of state.actors) {
    assert.ok(['available', 'filming', 'resting', 'injured', 'locked'].includes(actor.status))
    assert.equal(typeof actor.signed, 'boolean')
    assert.ok(Number.isFinite(actor.happiness) && actor.happiness >= 0 && actor.happiness <= 100)
    assert.ok(Number.isFinite(actor.loyalty) && actor.loyalty >= 0 && actor.loyalty <= 100)
    assert.ok(Number.isFinite(actor.exp) && actor.exp >= 0)
    for (const value of Object.values(actor.chemistry_map ?? {})) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 100)
    }
  }

  for (const production of state.productions) {
    assert.equal(production.status, 'active')
    assert.ok(['filming', 'wrap', 'releasing'].includes(production.phase))
    assert.ok(production.weeksLeft >= 0 && production.weeksLeft <= production.weeksTotal)
    assert.ok(production.episodesReleased >= 0 && production.episodesReleased <= production.episodesTotal)
  }

  assert.equal(state.history.some(item => item.status === 'active'), false)
  assert.ok(state.freeAgentsPool.every(entry => Number.isFinite(entry.weeksInPool) && entry.weeksInPool >= 0))
  if (state.awardsData) {
    assert.ok(Number.isInteger(state.awardsData.year) && state.awardsData.year >= 1)
    assert.ok(state.awardsData.results.length >= 19)
    assert.equal(new Set(state.awardsData.results.map(result => result.awardId)).size, state.awardsData.results.length)
  }
}

function summarize(state) {
  return {
    week: state.week,
    money: state.money,
    reputation: state.reputation,
    popularity: state.popularity,
    rank: state.rank,
    numericRank: state.numericRank,
    awards: state.awards,
    productionsCompleted: state.productionsCompleted,
    history: state.history.map(({ id, title, grade, score, revenue, weekCompleted }) => ({
      id, title, grade, score, revenue, weekCompleted,
    })),
    actorTiers: state.actors.map(actor => [actor.id, actor.tier, actor.completedProds, actor.exp, actor.fame]),
    freeAgentWeeks: state.freeAgentsPool.map(entry => [entry.poolId, entry.weeksInPool]),
    awardYears: state.awardsData ? [state.awardsData.year] : [],
    trendCount: state.genreTrends.length,
    rivalScore: state.rivals[0]?.score,
  }
}

async function runSimulation(seed) {
  const rng = seededRandom(seed)
  const stateRef = { value: makeSimulationState(rng) }
  const dispatch = dispatchFor(stateRef)

  for (let step = 0; step < WEEKS_TO_SIMULATE; step++) {
    const week = stateRef.value.week
    scheduleProduction(stateRef, rng, week)
    await advanceWeekPipeline({ state: stateRef.value, dispatch, rng })
    resolveModalQueue(stateRef, rng)

    // Awards are presented through a modal choice in the real UI. Attend the
    // ceremony automatically so the annual phase transition is exercised too.
    if (stateRef.value.awardsPhase === 'ceremony') {
      stateRef.value = gameReducer(stateRef.value, {
        type: A.SET_AWARDS_PHASE,
        phase: 'summary',
        attended: true,
      })
    }
    assert.equal(stateRef.value.week, week + 1)
    assertValidState(stateRef.value)
  }

  return stateRef.value
}

test('seeded weekly pipeline remains deterministic across three in-game years', async () => {
  const first = await runSimulation(SEED)
  const second = await runSimulation(SEED)

  assert.deepEqual(summarize(first), summarize(second))
  assert.equal(first.week, WEEKS_TO_SIMULATE + 1)
  assert.ok(first.history.length >= 20, 'representative run should complete productions')
  assert.ok(first.history.some(item => item.grade), 'production evaluation should run')
  assert.ok(first.history.some(item => item.episodeRatings?.length > 0), 'release ratings should be recorded')
  assert.ok(first.actors.some(actor => actor.completedProds > 0), 'actors should recover and complete work')
  assert.ok(first.actors.some(actor => actor.fame > 0), 'actor fame should progress')
  assert.ok(
    first.actors.some(actor => actor.tier !== ACTOR_DATA.find(base => base.id === actor.id)?.tier),
    `promotion should be reachable: ${JSON.stringify(first.actors.map(actor => ({ id: actor.id, tier: actor.tier, completedProds: actor.completedProds, exp: actor.exp, fame: actor.fame })))}`
  )
  assert.ok(first.history.some(item => item.genre === 'Romance') && first.history.some(item => item.genre === 'Comedy'), 'multiple genres should be exercised')
  assert.ok(first.awardsData && first.awardsData.year === 3, 'annual awards state should transition through year three')
  assert.ok(first.freeAgentsPool.length >= 1, 'free-agent pool should be processed')
  assert.ok(first.rivals[0].score !== 500000, 'rival showdown should update a rival')
})

test('multi-week simulation save data round-trips and legacy migration remains valid', async () => {
  const state = await runSimulation(SEED)
  const saved = createSaveData(state)
  assert.equal(saved.schemaVersion, SAVE_SCHEMA_VERSION)
  assert.equal(isSaveData(saved), true)

  const restored = migrateSaveData(JSON.parse(JSON.stringify(saved)))
  assert.equal(restored.week, state.week)
  assert.equal(restored.history.length, state.history.length)
  assert.equal(restored.awardsPhase, null)
  assert.equal(restored.awardsData, null)
  assert.ok(Array.isArray(restored.unlockedGenres))
  assert.ok(Object.keys(PROD_TYPES).length >= 3)
  assert.ok(SCHEDULES.some(schedule => schedule.weeks === 12))
})

test('legacy saves can advance after runtime collections were introduced', async () => {
  const rng = seededRandom(SEED)
  const legacyState = makeSimulationState(rng)
  delete legacyState.unlockedTiers
  delete legacyState.modalQueue
  delete legacyState.events
  delete legacyState.flags

  const restored = migrateSaveData(legacyState)
  const stateRef = { value: restored }
  await advanceWeekPipeline({ state: stateRef.value, dispatch: dispatchFor(stateRef), rng })

  assert.equal(stateRef.value.week, 2)
  assert.ok(stateRef.value.unlockedTiers.includes('Rookie'))
  assert.ok(Array.isArray(stateRef.value.modalQueue))
  assert.ok(Array.isArray(stateRef.value.events))
  assert.deepEqual(stateRef.value.flags, {})
})