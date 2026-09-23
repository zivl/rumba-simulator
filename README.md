# Roomba Simulator

A 3D browser game: you are a robot vacuum. Clean the house before the battery dies, dock to recharge, spend your pay in a roguelite-style shop, move into bigger houses, and survive a ridiculous boss every 10 stages (a giant dust cloud, a dust cloud in mud boots, a muddy child, a shedding cat and a very affectionate dog).

Runs on desktop and mobile browsers (touch joystick + buttons, portrait and landscape).

## Quick start

Requires Node 18+ and Yarn 4 (via Corepack: `corepack enable`).

```bash
yarn install
yarn dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `yarn dev` | Vite dev server (also exposed on your LAN for phone testing) |
| `yarn build` | Type-checks every workspace, then builds `apps/web/dist` |
| `yarn preview` | Serves the production build |
| `yarn test` | Unit tests for the game logic (Vitest) |
| `yarn typecheck` | `tsc` across all workspaces |

Production build output is a static site in `apps/web/dist/` that can be hosted anywhere.

### Deploy to Vercel

`vercel.json` configures everything, so no dashboard settings are needed:

1. In Vercel, **Add New Project** and import the GitHub repo. Keep the root directory as the repo root.
2. Deploy. Vercel runs `corepack enable && yarn install --immutable`, then `yarn build`, and serves `apps/web/dist`.

Or from the CLI: `npx vercel` (preview) and `npx vercel --prod`.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Drive / rotate | W A S D or arrows | Virtual joystick |
| Camera first/third person | C | 🎥 |
| Brush on/off | Q | 🧹 |
| Vacuum on/off | E | 🌪️ |
| Lights on/off | F | 💡 |
| Mission panel | O | 📋 |
| Infrared vision (once bought) | I | 🌡️ |
| Pause | Esc / P | ⏸ |

All keys can be remapped in **Settings**. Touch controls appear automatically on touch devices (overridable in Settings).

## How to play

- Drive over dirt to clean it. The brush scrubs (essential for mud and fur), the vacuum pulls dirt in from a cone in front of you (essential for heavy debris). Both drain battery, as do movement, lights and radars.
- Park on the glowing dock ring to recharge. Charging takes time and you must stay on it.
- Reach the required cleaning percentage to finish a stage and earn ₪200 plus ₪100 per house level. Battery at zero means Game Over: retry the stage, keeping your money and upgrades.
- After each stage the **Roomba Shop** offers exactly 3 upgrades. Buying replaces only that card; **Refresh (₪100)** rerolls all three without repeating the ones shown.
- Every 10th stage is a boss stage: survive, ram the boss with the vacuum on to neutralize it, then clean its mess.

## Monorepo layout

```
packages/core    @roomba/core   Framework-free game logic and all tunable config (no React, no three.js)
packages/audio   @roomba/audio  AudioManager interface + procedural WebAudio implementation
apps/web         @roomba/web    React + Three.js (React Three Fiber) client: rendering, HUD, screens, input
```

Packages are consumed as TypeScript source, so there is no per-package build step. A future native app (e.g. Capacitor) or a server-side save service can depend on `@roomba/core` directly.

### `@roomba/core`

| Folder | Responsibility |
|---|---|
| `config/` | Every number that shapes gameplay: roomba physics, battery drain, dirt types, rooms, houses, upgrades, shop, economy, stages, bosses, materials, input bindings, graphics presets |
| `world/` | Grid-based house generator (rooms, doors, walls, windows, furniture placement with connectivity checks), furniture builders, reachability map, boss nav grid |
| `physics/` | 2D circle-vs-AABB/circle collision world with a grid broadphase |
| `dirt/` | Dirt field and room-aware, reachability-validated dirt generation |
| `sim/` | `Simulation` (one stage), roomba movement, battery, cleaning, events |
| `bosses/` | Data-driven boss controller: composable movement types and abilities |
| `stats/`, `upgrades/`, `shop/`, `economy/`, `progression/` | Upgrade levels to stats, prices, 3-offer shop generation, rewards, pure progression functions |
| `missions/`, `radar/`, `stages/`, `save/` | Objectives, radar queries, stage definitions, versioned save format + repositories |

### `apps/web`

| Folder | Responsibility |
|---|---|
| `game/stores/` | Zustand stores: `gameStore` (state machine + HUD snapshot), `progressStore` (money, upgrades, shop, persistence), `settingsStore` |
| `game/flow.ts` | Stage lifecycle: start, boss intro, complete, game over, shop, continue, quit |
| `game/controller.ts` | Per-frame fixed-step loop, sim events to audio/FX/state, equipment toggles |
| `game/input/` | Centralized, remappable `InputManager` (keyboard + touch share one API) |
| `render/` | Scene, lighting moods, camera rig, house (merged geometry per material), roomba, instanced dirt, floor grime, particles, bosses |
| `ui/` | HUD, radar/minimap, mission panel, touch controls, menu and all screens |

### Game states

`MAIN_MENU → PLAYING | BOSS_INTRO → BOSS_FIGHT → STAGE_COMPLETE → SHOP → next stage`, plus `PAUSED` and `GAME_OVER`. Transitions are validated against a table in `gameStore.ts`; the simulation only ticks in `PLAYING` / `BOSS_FIGHT`.

## Extending the game

- **New upgrade**: add an id to `UpgradeId`, a definition in `UPGRADE_DEFINITIONS` (rarity, levels, prices, prerequisites, effect text) and a table in `UPGRADE_TABLES`; map it to stats in `stats/deriveStats.ts`. The shop picks it up automatically.
- **New boss**: append a `BossDefinition` to `BOSSES` in `config/bosses.ts` (movement type, abilities such as `trail`, `burst`, `pause`, `knockback`, `aura`, an arena and props), and add a model case in `render/bosses/BossModels.tsx`. Bosses after the last one repeat with scaling (`MEGA`, `ULTRA`, ...).
- **New house**: add a `HouseConfig` with an ASCII layout to `HOUSES` (legend in `LAYOUT_LEGEND`). Doors, walls, furniture and dirt are generated.
- **Real sound files**: call `audio.registerSample('pickup', '/sounds/pickup.ogg')` (any `SoundId`); samples override the synthesized placeholders.
- **Backend saves**: implement `SaveRepository` (`load`, `save`, `clear`) and swap it in `progressStore.ts`.

## Save data

Progress (money, house, upgrade levels, current/highest stage, completed stages, defeated bosses, statistics) is saved to `localStorage` after purchases, refreshes, stage completion, game over and when continuing from the shop. Saves are versioned and repaired on load (`migrateSave`). Settings are stored separately.

## Dev shortcuts

- `?stage=10` jumps to a stage (10, 20, ... are boss stages), `?money=5000` sets money. Both apply to the loaded save, then use **Continue**.
- In dev builds `window.__roomba` exposes the simulation and stores, plus `pump(seconds, throttle, turn)` to advance the loop without rendering.

## Performance notes

Walls are one instanced mesh, furniture is merged into one mesh per material, dirt is one instanced mesh per shape and effects share a single point cloud, so a house renders in a few dozen draw calls. Graphics quality (Settings) controls shadows, shadow-map size, pixel ratio and particle budget; touch devices default to Low.
