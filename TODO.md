# Elderwood — backlog

Things we want to get to but aren't working on yet. Newest context at the top of
each item. Remove an item when it ships (and note it in the commit).

## Open

1. **Value-per-Heartwood indicators.** Below each shop item's price, show its
   efficiency so the player can instantly compare deals:
   - Generators: **hps/h** — Heartwood/sec produced per Heartwood spent (`rate / cost`).
   - Siege: **dps/h** — tree damage/sec per Heartwood spent (`dps / cost`).
   Render in `syncGenerators()` / `syncSiege()` in `js/ui.js`; the markup already
   has a `[data-rate]` slot per item to extend or sit beside.

2. **Sound effects.** Add audio (clicks, kills, fells, death). Note: CLAUDE.md
   lists audio as deferred-by-scope, so this is the deliberate re-entry point.
