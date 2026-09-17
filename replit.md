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

## Responsive web
The game targets GitHub Pages as a static web app. The layout remains mobile-friendly:
bottom nav on <760px, 44px touch targets, and no hover-dependent interactions.

## Reference
Original monolithic prototype: `attached_assets/index_1784307841414.html`
Use as the functional reference for all game systems and formulas.

## Actor portraits
The actor portraits and loading backgrounds are checked in as real image bytes,
so local preview and the GitHub Pages build do not depend on Git LFS hydration.
Actor cards still keep a deterministic initials/color fallback for any future
missing image.

## GitHub Pages
`.github/workflows/deploy.yml` builds with pnpm and publishes `dist/` using the official Pages artifact/deploy actions. The workflow sets `VITE_BASE_PATH` to the repository name so Pages uses the project-site path (for example, `/blprodtycoon/`), while local previews keep Vite's relative `./` base. Public assets are resolved through `src/lib/assets.js` rather than root-relative URLs.

## User preferences
- Mobile-first, touch-friendly (thumb-sized buttons, no hover-only interactions)
- Pixel/retro aesthetic with scanline overlay
- Keep all game logic in `/game/` as pure functions; components only handle rendering and input
- Do not restructure or migrate the existing stack
