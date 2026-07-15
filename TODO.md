# Elderwood — backlog

Things we want to get to but aren't working on yet. Newest context at the top of
each item. Remove an item when it ships (and note it in the commit).

## Open

1. **Death message.** When the player dies, show a message that says they died,
   how many Heartseeds they *kept*, and how many they *missed* by dying instead of
   cashing out. The numbers already exist in `die()` (`js/game.js`): kept =
   `runSeeds - lastFellSeeds` (what `die()` banks), missed = `lastFellSeeds` (the
   most recent tree's worth, forfeited). `main.js` already has an `announceDeath()`
   hook and a `.floater.death` style to build on.

2. **Death resets spawning to a fresh state.** After a death, enemies should stop
   spawning as if it were a fresh game — i.e. the new run's first tree is a
   pure-clicking tutorial again, no creatures until the player fells a tree.
   Note the friction: `combatAwake()` is gated on `lifetimeFelled` (persists across
   runs), so today combat re-arms immediately on the next run. Implementing this
   likely needs a per-run "awakened" flag (spawning starts only after the first
   fell *of the current run*), separate from the lifetime unlock.

3. **Value-per-Heartwood indicators.** Below each shop item's price, show its
   efficiency so the player can instantly compare deals:
   - Generators: **hps/h** — Heartwood/sec produced per Heartwood spent (`rate / cost`).
   - Siege: **dps/h** — tree damage/sec per Heartwood spent (`dps / cost`).
   Render in `syncGenerators()` / `syncSiege()` in `js/ui.js`; the markup already
   has a `[data-rate]` slot per item to extend or sit beside.

4. **Sound effects.** Add audio (clicks, kills, fells, death). Note: CLAUDE.md
   lists audio as deferred-by-scope, so this is the deliberate re-entry point.
