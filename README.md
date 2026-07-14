# Elderwood 🌳

*Harvest the heartwood of an ancient, mystical forest.*

A small browser-based **idle/clicker game** built with vanilla JavaScript — no framework, no build step. Click the Elder Tree to harvest **Heartwood**, then spend it to grow a forest that harvests for you.

## Play

Chop the ancient Elder Tree for Heartwood, buy living generators (Saplings, Forest Wisps, Grove Druids, and more) for passive income, and unlock Ancient Lore upgrades that sharpen your axe and quicken the forest. Fell an Elder Tree and a mightier one rises in its place. Progress saves automatically to your browser.

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
