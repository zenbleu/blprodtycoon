---
name: Tier scaling system
description: How the tier-based difficulty system is wired — now rank-based (Prompt 1), not week-based.
---

# Tier scaling system

## Rule
Game difficulty scales by **numeric industry rank** (not week) via `getGameTierByRank(numericRank)` from `src/game/tiers.js`. Thresholds match actor tier unlock ranks exactly.

**Why:** Prompt 1 — tier difficulty should match the effort required to climb industry rank. Players who climb slowly stay in easier tiers longer, which is fair.

**How to apply:**
- `getGameTierByRank(numericRank)` → tier config (Rookie rank>39, Rising 25–39, Popular 10–24, Worldwide ≤9)
- `getNextGameTierByRank(numericRank)` → next tier config (or null at Worldwide)
- `getNextTierRankThreshold(numericRank)` → rank number needed to reach next tier (for TopBar display)
- Use `state.numericRank ?? 50` everywhere — old `getGameTier(week)` still exists for backward compat but should not be used in new code
- `getGameTier(week)` remains exported but is superseded

## Key wiring points
- **weekAdvance.js**: `const tier = getGameTierByRank(state.numericRank ?? 50)` at top of advanceWeek
- **events.js**: `rollCpEvents` and `runChemPulse` use `getGameTierByRank(state.numericRank ?? 50)`
- **TopBar.jsx**: shows current tier label + "need rank #N" for next tier
- **ProductionForm.jsx**: reads `getGameTierByRank(state.numericRank ?? 50)` for cost/revenue display

## Tier unlock (Prompt 2): actor auto-sign
When numeric rank crosses threshold (≤39/≤24/≤9), all actors of that tier are automatically signed for free via UPDATE_ACTOR (no cost, no "pay to sign" modal). A celebration modal lists the new actors' names. Function `autoSignTier(tierName, emoji, rankNum)` in weekAdvance.js handles this — checks `!state.unlockedTiers.includes(tierName)` to prevent re-firing.

## Other key decisions
- CP events always succeed on Accept (Prompt 8 — kept from previous session)
- Negotiate option removed from all CP events (Prompt 6.2)
- +happiness to both CP actors on Accept (Prompt 6.1)
- Genre reuse penalty: −15%/−25% on score (Prompt 4)
- Actor happiness ±δ after production based on grade (Prompt 3): S+15, A+10, B+6, C0, D−6, F−12
- Budget custom max: 3.0 (was 2.5) — Prompt 3
- Grade labels: F Terrible, D Bad, C Neutral, B Good, A Great, S Perfect — Prompt 3
- Sponsorship event gated at money ≤ 50,000 — Prompt 6.4
- comp_fixed_cp event only shows for actors with no existing fixed CP — Prompt 6.3
- 7 tricky events with ⚠️ badge; 30% routing in rollWeeklyEvents — Prompt 6.5
- CP auto-fill in ProductionForm: selecting a lead with a fixedCP auto-fills partner with 🔒 badge — Prompt 5
