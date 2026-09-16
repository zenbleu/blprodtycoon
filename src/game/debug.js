/**
 * debug.js — Developer-only balance inspection helpers.
 *
 * This module does not render UI or change gameplay. App.jsx exposes its report
 * through window.__BL_TYCOON_DEBUG__ only in Vite development mode.
 */

export function buildBalanceReport(state, initialMoney = 50000) {
  const history = Array.isArray(state?.history) ? state.history : []
  const pool = Array.isArray(state?.freeAgentsPool) ? state.freeAgentsPool : []
  const gradeDistribution = {}
  const genreUsage = {}

  for (const record of history) {
    if (record.grade) gradeDistribution[record.grade] = (gradeDistribution[record.grade] ?? 0) + 1
    if (record.genre) genreUsage[record.genre] = (genreUsage[record.genre] ?? 0) + 1
  }

  const scores = history.map(record => Number(record.score)).filter(Number.isFinite)
  const totalRevenue = history.reduce((sum, record) => sum + (Number(record.revenue) || 0), 0)
  const averageScore = scores.length
    ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
    : 0

  return {
    week: state?.week ?? 0,
    currentMoney: state?.money ?? 0,
    productionsCompleted: history.length,
    gradeDistribution,
    genreUsage,
    averageScore,
    totalRevenue,
    releaseCashFlowProxy: initialMoney + totalRevenue,
    actorDepartures: pool.filter(entry => entry.type === 'ex_actor').length,
    genreTrend: Array.isArray(state?.genreTrends) ? [...state.genreTrends] : [],
  }
}