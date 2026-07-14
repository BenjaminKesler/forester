// ---------------------------------------------------------------------------
// Elderwood — entry point.
//
// Wires the DOM to game actions, loads any save, and runs the game loop:
// production ticks on a fixed timer (independent of frame rate) while rendering
// happens once per animation frame.
// ---------------------------------------------------------------------------

import { GAME } from './config.js';
import {
  state,
  chopElderTree,
  buyGenerator,
  buyUpgrade,
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
} from './ui.js';
import { formatNumber } from './format.js';

const TICK_MS = 100; // passive production resolution: 10 ticks/second

function init() {
  document.title = GAME.title;
  cacheDom();
  buildShop(
    (id) => {
      buyGenerator(id);
      render();
    },
    (id) => {
      buyUpgrade(id);
      render();
    },
  );
  load();

  // Clicking (or tapping) the Elder Tree harvests Heartwood.
  const tree = document.getElementById('elder-tree');
  tree.addEventListener('pointerdown', onChop);

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Abandon this grove and start anew? All progress will be lost.')) {
      resetGame();
      save();
      render();
    }
  });

  startAutosave();

  // Game loop: advance passive production and repaint on a fixed timer. A timer
  // (not requestAnimationFrame) is used deliberately — rAF is paused by the
  // browser when the tab is unfocused or not being painted, which would freeze
  // the display; setInterval keeps ticking regardless of visibility.
  render();
  setInterval(() => {
    tick(TICK_MS / 1000);
    render();
  }, TICK_MS);
}

function onChop(event) {
  const powerBefore = clickPower();
  const { felled } = chopElderTree();
  animateTreeHit(felled);

  // Floating "+N" feedback at the pointer location, relative to the app root.
  const host = document.getElementById('floaters').getBoundingClientRect();
  const x = event.clientX - host.left;
  const y = event.clientY - host.top;
  spawnFloater(x, y, `+${formatNumber(powerBefore)} ${GAME.currency.icon}`);
  if (felled) {
    spawnFloater(x, y - 28, 'Timber!', 'fell');
  }
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
