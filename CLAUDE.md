# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Elderwood** — a browser-based idle/clicker game (demo project) themed around an ancient mystical forest. Pure vanilla JavaScript ES modules, **no build step**, deployed as static files to GitHub Pages.

## Running & deploying

ES modules will **not** load over `file://` — the app must be served over HTTP.

- **Local dev:** `npx --yes http-server . -p 8123 -c-1` then open `http://localhost:8123`. (The `.claude/launch.json` "elderwood" config does exactly this.)
- **Deploy:** GitHub Pages, "Deploy from a branch" → `main` / root. `index.html` is at the repo root and all asset paths are relative, so it works unmodified under the `/forester/` project subpath.
- No build, no bundler, no test/lint tooling currently exists. Don't add a toolchain unless the scope grows past a demo.

## Architecture

Strict separation between **data**, **logic**, and **view** — each `js/` module has one job:

- **`js/config.js`** — the single source of all game content and balancing: currency, the Elder Tree HP curve, every generator (name/flavor/cost/rate), and every upgrade. **Rebalancing or renaming should only require editing this file.** The rest of the code treats it as data.
- **`js/game.js`** — the state singleton (`state`), derived-value functions (`clickPower`, `totalProduction`, `generatorCost`, …), actions (`chopElderTree`, `buyGenerator`, `buyUpgrade`, `tick`), and persistence. **Contains no DOM code.**
- **`js/ui.js`** — builds the shop DOM once, then `render()` re-syncs the DOM from `state` each tick. **Contains no game logic.** Buy buttons call back into game actions via callbacks passed from `main.js`.
- **`js/main.js`** — entry point: wires DOM events to game actions and runs the game loop.
- **`js/format.js`** — compact large-number formatting (K/M/B suffixes).

Data flow is one-directional: input → game action mutates `state` → `render()` reads `state` → DOM. UI never mutates game state directly.

## Critical conventions

- **The game loop is timer-driven (`setInterval`), NOT `requestAnimationFrame` — this is deliberate.** rAF is paused by the browser when the tab is unfocused or not being painted, which freezes both the display and the visual feedback loop. Do not reintroduce a pure rAF render loop. Rendering happens on the fixed tick **and** immediately after each user action (click/buy) for input snappiness.
- **Passive production advances by real elapsed time** via `tick(dtSeconds)` on a fixed interval, so output stays consistent regardless of render rate.
- **Saves are versioned** under the key `elderwood.save.v1` and `load()` is intentionally tolerant of missing/extra keys, so a config rebalance never bricks an existing save. If you make a save-breaking schema change, bump the key version.

## Design hooks for future work

- `state.treeFelled` counts Elder Trees chopped down. This is the **deliberate seam for the future achievement/unlock system** — felling milestones are meant to unlock content. The counter and tree-respawn (each successor has more HP) are wired; the unlock rewards are intentionally **not** built yet.
- Deferred by scope (mentioned so they aren't reinvented ad hoc): biomes, prestige/reset-for-bonus, offline earnings, achievements.
