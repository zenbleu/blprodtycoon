---
name: Genre unlock system
description: Prompt-4 genre unlock system — genres gated by production grade, reuse penalty, state tracking.
---

# Genre unlock system

## Rule
Genres unlock cumulatively as production grades improve. Default always available: Romance, School, Office.

**Why:** Prompt 4 — early game should feel simple; later grades reward experimentation.

**How to apply:**
- `GENRE_UNLOCK_BY_GRADE` in `src/game/productions.js` maps grade letter → genres to unlock
- `state.unlockedGenres` holds the player's currently unlocked genres (INITIAL_STATE seeds it)
- `A.UNLOCK_GENRES` action (state.jsx reducer) adds genres, deduplicates automatically
- weekAdvance.js dispatches `UNLOCK_GENRES` after every completed production's evalResult
- ProductionForm.jsx `GenrePickModal` shows all genres but dims/locks ones not in `state.unlockedGenres`; `SlotMachineModal` only spins through unlocked genres
- Genre reuse penalty applied in weekAdvance.js: −15% score if same genre used last 1 prod, −25% if 2 of last 3; logged to event log

## Unlock table
| Grade | Unlocks |
|-------|---------|
| F | nothing (keep defaults) |
| D | Comedy, Slice of Life |
| C | Action, Drama |
| B | Music, Mystery, Sports, Supernatural |
| A | Horror, Thriller, Crime, Fantasy |
| S | Historical, Sci-Fi, Idol, Psychological, Omegaverse |

## Genre list
20 total in GENRES array: includes Supernatural (🌙) added alongside original 19.
