// ---------------------------------------------------------------------------
// Elderwood — UI layer.
//
// Builds the DOM once, then re-syncs its text/state each frame from the game
// module. Buttons are created here and wired to game actions via callbacks
// passed in from main.js, keeping game logic free of DOM concerns.
// ---------------------------------------------------------------------------

import { GAME, GENERATORS, UPGRADES } from './config.js';
import {
  state,
  clickPower,
  totalProduction,
  generatorOutput,
  generatorCost,
  treeMaxHpCurrent,
} from './game.js';
import { formatNumber } from './format.js';

const el = {};

// Cache references to the static markup in index.html.
export function cacheDom() {
  el.heartwood = document.getElementById('heartwood');
  el.perSecond = document.getElementById('per-second');
  el.perClick = document.getElementById('per-click');
  el.tree = document.getElementById('elder-tree');
  el.treeHpFill = document.getElementById('tree-hp-fill');
  el.treeHpText = document.getElementById('tree-hp-text');
  el.treeFelled = document.getElementById('tree-felled');
  el.generators = document.getElementById('generators');
  el.upgrades = document.getElementById('upgrades');
  el.floaters = document.getElementById('floaters');
}

// Build the generator and upgrade lists. `onBuyGenerator` / `onBuyUpgrade` are
// called with the item id when the corresponding button is clicked.
export function buildShop(onBuyGenerator, onBuyUpgrade) {
  for (const gen of GENERATORS) {
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.dataset.gen = gen.id;
    btn.innerHTML = `
      <span class="shop-icon">${gen.icon}</span>
      <span class="shop-body">
        <span class="shop-name">${gen.name} <span class="shop-count" data-count></span></span>
        <span class="shop-flavor">${gen.flavor}</span>
        <span class="shop-rate" data-rate></span>
      </span>
      <span class="shop-cost" data-cost></span>`;
    btn.addEventListener('click', () => onBuyGenerator(gen.id));
    el.generators.appendChild(btn);
  }

  for (const up of UPGRADES) {
    const btn = document.createElement('button');
    btn.className = 'shop-item upgrade';
    btn.dataset.upgrade = up.id;
    btn.innerHTML = `
      <span class="shop-icon">${up.icon}</span>
      <span class="shop-body">
        <span class="shop-name">${up.name}</span>
        <span class="shop-flavor">${up.flavor}</span>
      </span>
      <span class="shop-cost" data-cost>${formatNumber(up.cost)}</span>`;
    btn.addEventListener('click', () => onBuyUpgrade(up.id));
    el.upgrades.appendChild(btn);
  }
}

// A short-lived "+N" number that drifts up from the click point.
export function spawnFloater(x, y, text, kind = '') {
  const f = document.createElement('span');
  f.className = `floater ${kind}`;
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  el.floaters.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
}

// Full re-sync of dynamic UI from current state. Called every animation frame.
export function render() {
  const icon = GAME.currency.icon;
  el.heartwood.textContent = `${formatNumber(state.heartwood)} ${icon}`;
  el.perSecond.textContent = `${formatNumber(totalProduction())} ${icon}/s`;
  el.perClick.textContent = `${formatNumber(clickPower())} per strike`;

  // Elder Tree HP bar.
  const maxHp = treeMaxHpCurrent();
  const hp = Math.max(0, state.treeHp);
  el.treeHpFill.style.width = `${(hp / maxHp) * 100}%`;
  el.treeHpText.textContent = `${formatNumber(hp)} / ${formatNumber(maxHp)} HP`;
  el.treeFelled.textContent = String(state.treeFelled);

  // Generators.
  for (const gen of GENERATORS) {
    const btn = el.generators.querySelector(`[data-gen="${gen.id}"]`);
    const cost = generatorCost(gen);
    btn.querySelector('[data-count]').textContent =
      state.owned[gen.id] > 0 ? `×${state.owned[gen.id]}` : '';
    btn.querySelector('[data-rate]').textContent =
      `${formatNumber(generatorOutput(gen) || gen.rate)} /s each`;
    btn.querySelector('[data-cost]').textContent = formatNumber(cost);
    btn.classList.toggle('affordable', state.heartwood >= cost);
    btn.disabled = state.heartwood < cost;
  }

  // Upgrades: hide once purchased, disable until affordable.
  for (const up of UPGRADES) {
    const btn = el.upgrades.querySelector(`[data-upgrade="${up.id}"]`);
    const bought = !!state.upgrades[up.id];
    btn.classList.toggle('purchased', bought);
    btn.classList.toggle('affordable', !bought && state.heartwood >= up.cost);
    btn.disabled = bought || state.heartwood < up.cost;
  }
}

// Trigger the tree's hit/fell animation classes.
export function animateTreeHit(felled) {
  el.tree.classList.remove('hit', 'felled');
  // Force reflow so re-adding the class restarts the animation.
  void el.tree.offsetWidth;
  el.tree.classList.add(felled ? 'felled' : 'hit');
}
