# Elderwood 🌳

*Harvest the heartwood of an ancient, mystical forest.*

A small browser-based **idle/clicker meets active-survival roguelike**, built with vanilla JavaScript — no framework, no build step. Click the Elder Tree to harvest **Heartwood**, grow a forest that harvests for you — then survive the forest that fights back.

## Play

Chop the ancient Elder Tree for **Heartwood**, buy living generators (Saplings, Forest Wisps, Grove Druids…) for passive income, lay **Siege** to fell trees faster, and unlock **Ancient Lore** upgrades. Fell an Elder Tree and a mightier one rises in its place.

Felling your first tree **awakens the forest**: the Elder Tree spawns creatures — **Sap Thieves** steal Heartwood, **Blight Sprites** wreck your units, and **Bramble Maws** drain your vitality. Click them down before they overwhelm you. Pushing deeper makes the forest deadlier — that's the point.

Each fell banks **Heartseeds 🌰**. Choose to *Return to Seed* to cash them all in (or die and forfeit one tree's worth), then spend them on the **Everwood** — permanent blessings that carry into every future run. Each run also draws stacking **boons**, a 1-of-3 blessing at run start and on every fell. Progress saves automatically to your browser.

## Run locally

ES modules require an HTTP server (they won't load from `file://`):

```sh
npx --yes http-server . -p 8123 -c-1
```

Then open http://localhost:8123.

## Deploy (GitHub Pages)

The site is plain static files with `index.html` at the repo root. In the repository settings, enable **Pages → Deploy from a branch → `main` / root**. No build step required.

## Project layout

| Path            | Role                                                          |
| --------------- | ------------------------------------------------------------ |
| `index.html`    | Page shell                                                   |
| `styles.css`    | Ancient-forest theme                                         |
| `js/config.js`  | All game content & balancing (names, costs, rates) — edit here to tune |
| `js/game.js`    | Game state, rules, save/load                                 |
| `js/ui.js`      | DOM rendering                                                 |
| `js/main.js`    | Entry point & game loop                                      |
| `js/format.js`  | Number formatting                                            |

See [CLAUDE.md](CLAUDE.md) for architecture notes.
