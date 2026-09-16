---
name: Theme system
description: How the 29-theme system is structured, where it lives, and how it integrates with the combo/score pipeline.
---

# Theme System

## Architecture
- All theme data lives in `src/game/themes.js`: THEMES, THEME_CATEGORIES, DEFAULT_THEMES, THEME_UNLOCK_BY_GRADE, THEME_UNLOCK_COUNTS, THEME_EMOJI, THEME_COMBO_TABLE, THEME_TIERS.
- Exported functions: `getThemeComboResult(genre, theme)`, `getTypeThemeBonus(type, theme)`, `themeTier(val)`, `themeLabel(val)`.

## State
- `state.unlockedThemes` — starts with DEFAULT_THEMES (5), expands via `A.UNLOCK_THEMES` action.
- Same grade-count gate as genres: THEME_UNLOCK_COUNTS mirrors GENRE_UNLOCK_COUNTS.

## Combo formula (applied in tickProduction wrap phase, productions.js)
```
rawMult = (genreTypeMult + genreThemeMult) / 2 + typeThemeBonus
finalMult = clamp(rawMult, 0.4, 2.5) * genreMultiplier(slot bonus)
```
- PERFECT ≥ 1.45, BAD FIT < 0.85, GOOD otherwise.
- If no theme set, falls back to genreTypeMult alone (backward compatible).

## Productions schema
- `createProduction()` accepts `theme` field; stored as `prod.theme`.
- `productions.js` imports `getThemeComboResult` and `getTypeThemeBonus` from themes.js.

## Unlock events
- `weekAdvance.js` fires `A.UNLOCK_THEMES` inside the same grade-count block as genre unlocks.
- Event log entry: "✨ Themes unlocked: …"

## UI (ProductionForm.jsx)
- THEME field section shows selected theme emoji, genre×theme combo badge, format bonus, and combined mult preview.
- "✨ Select Theme" button opens `ThemePickModal` (grid grouped by THEME_CATEGORIES; locked themes dimmed).
- Theme defaulted to 'Slow Burn' on form mount.

**Why:** Themes add a second narrative axis to the combo system without replacing the existing genre×type table, keeping backward compatibility with saves that have no theme field.
