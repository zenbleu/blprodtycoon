import { actorDisplayName } from './actors.js'

const LOW_LOYALTY_MAX = 50

export function loyaltyLabel(loyalty) {
  if (loyalty > 75) return 'High'
  if (loyalty > 50) return 'Moderate'
  if (loyalty > 25) return 'Low'
  if (loyalty > 10) return 'Critical'
  return 'LEAVING!'
}

/**
 * Build dashboard alerts for actors who are genuinely at risk.
 *
 * Idle time alone is not an alert condition: an actor can be idle briefly
 * while still having a healthy contract relationship. Alerts begin once
 * loyalty reaches the Low band, with the critical warning still shown even
 * when the actor has not accumulated idle weeks.
 */
export function buildRosterAlerts(actors) {
  const alerts = []
  for (const a of actors) {
    if (!a.signed || a.status !== 'available') continue

    const h = a.happiness ?? 70
    const l = a.loyalty ?? 60
    const idle = a.idleWeeks ?? 0
    if (l > LOW_LOYALTY_MAX) continue

    const name = actorDisplayName(a)
    const loyLvl = loyaltyLabel(l)
    let severity = 0
    let message = ''
    let color = 'var(--gold)'

    // Emergency warning at ≤10 Loyalty — always shown for available actors.
    if (l <= 10) {
      severity = 4
      message = `‼️ FINAL WARNING‼️: ${name} is walking out! 🤬 (Loyalty: ${loyLvl}) ⚠️`
      color = 'var(--red)'
    } else if (idle >= 1 && h < 25) {
      // Angry (0–24) and actually been idle at least 1 week.
      severity = 3
      message = `❗ROSTER IDLE❗ ${name} is angry after ${idle} week${idle !== 1 ? 's' : ''} with no work! 😢 Cast them before they quit! (Loyalty: ${loyLvl}) 📢`
      color = '#FF5470'
    } else if (idle >= 1 && h < 50) {
      // Sad (25–49) and actually been idle at least 1 week.
      severity = 2
      message = `${name} feels forgotten after ${idle} week${idle !== 1 ? 's' : ''}! 😠 Keep them acting or loyalty will drop! (Loyalty: ${loyLvl}) 📉`
      color = '#FF9F68'
    } else if (idle >= 1 && h < 75) {
      // Neutral (50–74) and actually been idle at least 1 week.
      severity = 1
      message = `Roster idle: Keep ${name} acting! 😐 It has been ${idle} week${idle !== 1 ? 's' : ''}. (Loyalty: ${loyLvl}) ⏳`
      color = 'var(--gold)'
    }

    if (severity > 0) alerts.push({ actor: a, severity, message, color })
  }
  return alerts.sort((x, y) => y.severity - x.severity)
}