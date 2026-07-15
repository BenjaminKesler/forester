# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Elderwood** — a browser-based idle/clicker game (demo project) themed around an ancient mystical forest. Pure vanilla JavaScript ES modules, **no build step**, deployed as static files to GitHub Pages.

It has grown past a plain clicker into an **active-survival roguelike**. Two nested loops:

- **A run** (all reset on prestige/death): chop/siege the Elder Tree for Heartwood 🪵; the tree is a boss that spawns **creatures** you must clear by clicking, or you die. Felling a tree grows a bigger, deadlier successor.
- **The meta** (persists across runs): felling banks **Heartseeds** 🌰 spent on a permanent grove of bonuses; `lifetimeFelled` gates unlocks. Each run also drafts stacking **boons** (1-of-3, at run start and every fell).

The forest only "awakens" (combat + prestige) after the player's **first-ever fell** — the opening tree is a pure-clicking tutorial.

## Running & deploying

ES modules will **not** load over `file://` — the app must be served over HTTP.

- **Local dev:** `npx --yes http-server . -p 8123 -c-1` then open `http://localhost:8123`. (The `.claude/launch.json` "elderwood" config does exactly this.)
- **Deploy:** GitHub Pages, "Deploy from a branch" → `main` / root. `index.html` is at the repo root and all asset paths are relative, so it works unmodified under the `/forester/` project subpath.
- No build, no bundler, no test/lint tooling currently exists. Don't add a toolchain unless the scope grows past a demo.

## Architecture

Strict separation between **data**, **logic**, and **view** — each `js/` module has one job:

- **`js/config.js`** — the single source of all game content and balancing: currency, the Elder Tree HP curve, generators, upgrades, **`SIEGE`** (anti-tree engines), **`CREATURES`** (archetypes + spawn curve), **`PLAYER`** (vitality), **`PRESTIGE`** (Heartseeds + unlock gates), **`BOONS`**, and **`META_UPGRADES`**. **Rebalancing or renaming should only require editing this file.** The rest of the code treats it as data.
- **`js/game.js`** — the state singleton (`state`), derived-value functions (`clickPower`, `totalProduction`, `siegeDps`, `playerMaxHp`, …), actions (`chopElderTree`, `attackCreature`, `buyGenerator`, `buySiege`, `buyUpgrade`, `buyMetaUpgrade`, `chooseBoon`, `prestige`, `die`, `tick`), and persistence. **Contains no DOM code.** `tick(dt)` returns `{ died }`.
- **`js/ui.js`** — builds the shop DOM once, then `render()` re-syncs the DOM from `state` each tick, including reconciling the live-creature layer and the boon-draft modal. **Contains no game logic.** All buttons call back into game actions via callbacks passed once through `buildShop({...})` from `main.js`.
- **`js/main.js`** — entry point: wires DOM events to game actions and runs the game loop.
- **`js/format.js`** — compact large-number formatting (K/M/B suffixes).

Data flow is one-directional: input → game action mutates `state` → `render()` reads `state` → DOM. UI never mutates game state directly.

## Critical conventions

- **The game loop is timer-driven (`setInterval`), NOT `requestAnimationFrame` — this is deliberate.** rAF is paused by the browser when the tab is unfocused or not being painted, which freezes both the display and the visual feedback loop. Do not reintroduce a pure rAF render loop. Rendering happens on the fixed tick **and** immediately after each user action (click/buy) for input snappiness.
- **The tick advances by a fixed `dt` (`TICK_MS/1000`), not real elapsed time.** Consequence: a backgrounded tab (where browsers throttle `setInterval` to ~1 Hz) runs the whole sim ~10× slow rather than pausing. Acceptable for a demo; if you ever want true real-time/offline progress, switch to a delta-time clock — but keep the timer (not rAF) driver.
- **Run state vs meta state.** `game.js` separates fields reset each run (`heartwood`, `owned`, `siege`, `upgrades`, `treeFelled`, `treeHp`, `hp`, `runSeeds`, `activeBoons`) from meta that persists across runs (`heartseeds`, `metaUpgrades`, `lifetimeFelled`, `totalHeartwood`). `startRun()` resets only the former; `prestige()`/`die()` bank seeds then call it. A full wipe is `resetGame()`.
- **Ephemeral, never-saved state:** `creatures`, `spawnTimer`, `pendingDraft` are rebuilt on load (the board clears on reload). Everything else is persisted.
- **Saves are versioned** at `elderwood.save.v2`; `load()` tolerates missing keys and **migrates a v1 (pre-combat) save**. Bump the key on any save-breaking change and add a migration.
- **Target-aware clicking is done via DOM layering, not hit-testing.** The `#creatures` layer is `pointer-events: none` so empty space falls through to the Elder Tree button; individual `.creature` elements re-enable pointer events. Clicking a creature → `attackCreature`; clicking the tree → `chopElderTree`.
- **A boon draft pauses combat.** While `state.pendingDraft` is set, `tick` grants generator production but skips siege damage and the whole creature simulation (a deliberate respite); the modal overlay also blocks input.
- **No auto-defense, by design (hardcore).** Creatures are cleared only by clicks; there is intentionally no defender unit or auto-kill meta upgrade. Don't add one without a design decision — it reverses the core tension.
- **TDZ caution:** `state` is initialized by `defaultState()`, so helpers it calls must not read `state`. `treeMaxHp(felled, softFrac)` takes the Soft Bark discount as a parameter for exactly this reason — don't make it read `state` again.

## Design hooks for future work

- `state.lifetimeFelled` gates unlocks (`PRESTIGE.awakenAtLifetimeFelled`, `boonsAtLifetimeFelled`). This is the live achievement seam — add further milestone-gated content (new tiers, biomes) by reading it.
- Deferred by scope (mentioned so they aren't reinvented ad hoc): biomes, offline/real-time earnings, deeper milestone unlocks, and audio.
