// ---------------------------------------------------------------------------
// Elderwood — entry point.
//
// Wires the DOM to game actions, loads any save, and runs the game loop:
// production and combat advance on a fixed timer (independent of frame rate),
// and the view re-syncs on the same tick and immediately after each input.
// ---------------------------------------------------------------------------

import { GAME, PRESTIGE } from './config.js';
import {
  state,
  chopElderTree,
  attackCreature,
  buyGenerator,
  buySiege,
  buyUpgrade,
  buyMetaUpgrade,
  chooseBoon,
  prestige,
  clickPower,
  tick,
  load,
  save,
  resetGame,
  startAutosave,
} from './game.js';
import {
  cacheDom,
  buildShop,
  render,
  spawnFloater,
  animateTreeHit,
  creaturePixel,
} from './ui.js';
import { formatNumber } from './format.js';

const TICK_MS = 100; // simulation resolution: 10 ticks/second

function init() {
  document.title = GAME.title;
  cacheDom();
  buildShop({
    onBuyGenerator: (id) => { buyGenerator(id); render(); },
    onBuySiege: (id) => { buySiege(id); render(); },
    onBuyUpgrade: (id) => { buyUpgrade(id); render(); },
    onBuyMeta: (id) => { buyMetaUpgrade(id); render(); },
    onAttackCreature: onAttackCreature,
    onChooseBoon: (id) => { chooseBoon(id); render(); },
  });
  load();

  // Clicking (or tapping) the Elder Tree harvests Heartwood and wounds it.
  document.getElementById('elder-tree').addEventListener('pointerdown', onChop);

  document.getElementById('prestige-btn').addEventListener('click', () => {
    const gain = state.runSeeds;
    const msg = `Let this grove return to seed and claim ${formatNumber(gain)} ${PRESTIGE.currency.icon} Heartseeds?\n\nThe run resets, but the Everwood's blessings endure.`;
    if (confirm(msg)) {
      prestige();
      render();
    }
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Abandon EVERYTHING — including permanent Heartseeds and blessings — and start over?')) {
      resetGame();
      save();
      render();
    }
  });

  startAutosave();

  // Game loop: advance the simulation and repaint on a fixed timer. A timer
  // (not requestAnimationFrame) is used deliberately — rAF is paused by the
  // browser when the tab is unfocused, which would freeze the display.
  render();
  setInterval(() => {
    const { died } = tick(TICK_MS / 1000);
    if (died) announceDeath();
    render();
  }, TICK_MS);
}

function onChop(event) {
  const powerBefore = clickPower();
  const { felled } = chopElderTree();
  animateTreeHit(felled);

  const host = document.getElementById('floaters').getBoundingClientRect();
  const x = event.clientX - host.left;
  const y = event.clientY - host.top;
  spawnFloater(x, y, `+${formatNumber(powerBefore)} ${GAME.currency.icon}`);
  if (felled) spawnFloater(x, y - 28, 'Timber!', 'fell');
  render();
}

function onAttackCreature(cid) {
  const power = clickPower();
  const results = attackCreature(cid);
  for (const r of results) {
    const { x, y } = creaturePixel(r.x, r.y);
    if (r.killed) spawnFloater(x, y, '💥', 'kill');
    else spawnFloater(x, y, `-${formatNumber(power)}`, 'creature-hit');
  }
  render();
}

function announceDeath() {
  const host = document.getElementById('floaters').getBoundingClientRect();
  spawnFloater(host.width / 2, host.height / 2, 'The forest overwhelms you!', 'death');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
