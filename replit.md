# BL Production Tycoon

A turn-based Boys' Love (BL) production management tycoon game built with React 18 + Vite 5.

## Stack
- **Frontend**: React 18 + Vite 5
- **Styling**: CSS custom properties (`/src/styles/theme.css`), Press Start 2P pixel font
- **State**: React Context + useReducer with localStorage auto-save
- **Deploy target**: GitHub Pages via `.github/workflows/deploy.yml`

## Project structure
```
/src
  /components   — 9 UI components (TitleScreen, Dashboard, ProductionForm, ActorRoster, ActorProfile, Settings, ModalSystem, Sidebar, TopBar)
  /game         — 7 pure logic modules (state.jsx, actors.js, productions.js, chemistry.js, evaluators.js, ranking.js, events.js, audio.js)
  /styles       — theme.css (CSS variables, scanline overlay, pixel font)
/public/images  — actor_01.jpg through actor_20.jpg (pixel-art portraits)
```

## How to run
```bash
pnpm install
pnpm run dev      # dev server on port 5000
pnpm run build    # production build → /dist
pnpm test         # deterministic game-rule tests
```

## Mobile-first
The game targets mobile web. Bottom nav on <760px, 44px touch targets, no hover-dependent interactions.

## Reference
Original monolithic prototype: `attached_assets/index_1784307841414.html`
Use as the functional reference for all game systems and formulas.

## Actor portraits
Portraits are `.jpg` files at `/public/images/actor_01.jpg` through `actor_20.jpg`.
Code references them via the `getPortraitUrl(id)` helper in `src/game/actors.js`.

## GitHub Pages
`.github/workflows/deploy.yml` builds with pnpm and publishes `dist/` using the official Pages artifact/deploy actions. `vite.config.js` uses `base: './'`, which keeps assets compatible with both project-site Pages URLs and Capacitor/Android packaging.

## User preferences
- Mobile-first, touch-friendly (thumb-sized buttons, no hover-only interactions)
- Pixel/retro aesthetic with scanline overlay
- Keep all game logic in `/game/` as pure functions; components only handle rendering and input
- Do not restructure or migrate the existing stack
