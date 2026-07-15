// ---------------------------------------------------------------------------
// Elderwood — UI layer.
//
// Builds the DOM once, then re-syncs its text/state each tick from the game
// module. Buttons are created here and wired to game actions via callbacks
// passed in from main.js, keeping game logic free of DOM concerns. Live
// creatures and the boon-draft modal are reconciled from state each render.
// ---------------------------------------------------------------------------

import {
  GAME,
  GENERATORS,
  UPGRADES,
  SIEGE,
  META_UPGRADES,
  BOONS,
  PRESTIGE,
} from './config.js';
import {
  state,
  clickPower,
  totalProduction,
  generatorOutput,
  generatorCost,
  siegeCost,
  treeMaxHpCurrent,
  playerMaxHp,
  metaUpgradeCost,
  combatAwake,
} from './game.js';
import { formatNumber } from './format.js';

const el = {};
let handlers = {};
const creatureEls = new Map(); // cid -> element

export function cacheDom() {
  el.heartwood = document.getElementById('heartwood');
  el.perSecond = document.getElementById('per-second');
  el.perClick = document.getElementById('per-click');
  el.seedStat = document.getElementById('seed-stat');
  el.heartseeds = document.getElementById('heartseeds');
  el.tree = document.getElementById('elder-tree');
  el.treeHpFill = document.getElementById('tree-hp-fill');
  el.treeHpText = document.getElementById('tree-hp-text');
  el.treeFelled = document.getElementById('tree-felled');
  el.vitality = document.getElementById('vitality');
  el.vitalityFill = document.getElementById('vitality-fill');
  el.vitalityText = document.getElementById('vitality-text');
  el.generators = document.getElementById('generators');
  el.siege = document.getElementById('siege');
  el.upgrades = document.getElementById('upgrades');
  el.meta = document.getElementById('meta');
  el.grovePanel = document.getElementById('grove-panel');
  el.seedBalance = document.getElementById('seed-balance');
  el.floaters = document.getElementById('floaters');
  el.creatures = document.getElementById('creatures');
  el.boonBanner = document.getElementById('boon-banner');
  el.prestigeBtn = document.getElementById('prestige-btn');
  el.draftOverlay = document.getElementById('draft-overlay');
  el.draftOptions = document.getElementById('draft-options');
}

// `h` collects every callback: onBuyGenerator, onBuySiege, onBuyUpgrade,
// onBuyMeta, onAttackCreature, onChooseBoon.
export function buildShop(h) {
  handlers = h;

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
    btn.addEventListener('click', () => handlers.onBuyGenerator(gen.id));
    el.generators.appendChild(btn);
  }

  for (const s of SIEGE) {
    const btn = document.createElement('button');
    btn.className = 'shop-item siege-item';
    btn.dataset.siege = s.id;
    btn.innerHTML = `
      <span class="shop-icon">${s.icon}</span>
      <span class="shop-body">
        <span class="shop-name">${s.name} <span class="shop-count" data-count></span></span>
        <span class="shop-flavor">${s.flavor}</span>
        <span class="shop-rate" data-rate></span>
      </span>
      <span class="shop-cost" data-cost></span>`;
    btn.addEventListener('click', () => handlers.onBuySiege(s.id));
    el.siege.appendChild(btn);
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
    btn.addEventListener('click', () => handlers.onBuyUpgrade(up.id));
    el.upgrades.appendChild(btn);
  }

  for (const m of META_UPGRADES) {
    const btn = document.createElement('button');
    btn.className = 'shop-item meta-item';
    btn.dataset.meta = m.id;
    btn.innerHTML = `
      <span class="shop-icon">${m.icon}</span>
      <span class="shop-body">
        <span class="shop-name">${m.name} <span class="shop-count" data-level></span></span>
        <span class="shop-flavor">${m.flavor}</span>
      </span>
      <span class="shop-cost" data-cost></span>`;
    btn.addEventListener('click', () => handlers.onBuyMeta(m.id));
    el.meta.appendChild(btn);
  }
}

// A short-lived "+N" number that drifts up from a point in the grove.
export function spawnFloater(x, y, text, kind = '') {
  const f = document.createElement('span');
  f.className = `floater ${kind}`;
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  el.floaters.appendChild(f);
  f.addEventListener('animationend', () => f.remove());
}

// Convert a creature's grove-percentage position to floater pixel coordinates.
export function creaturePixel(xPct, yPct) {
  const host = el.creatures.getBoundingClientRect();
  return { x: (xPct / 100) * host.width, y: (yPct / 100) * host.height };
}

export function render() {
  const icon = GAME.currency.icon;
  el.heartwood.textContent = `${formatNumber(state.heartwood)} ${icon}`;
  el.perSecond.textContent = `${formatNumber(totalProduction())} ${icon}/s`;
  el.perClick.textContent = `${formatNumber(clickPower())} per strike`;

  const awake = combatAwake();

  // Heartseed readouts.
  const seedIcon = PRESTIGE.currency.icon;
  const showSeeds = awake || state.heartseeds > 0;
  el.seedStat.hidden = !showSeeds;
  el.heartseeds.textContent = `${formatNumber(state.heartseeds)} ${seedIcon}`;

  // Elder Tree HP.
  const maxHp = treeMaxHpCurrent();
  const hp = Math.max(0, state.treeHp);
  el.treeHpFill.style.width = `${(hp / maxHp) * 100}%`;
  el.treeHpText.textContent = `${formatNumber(hp)} / ${formatNumber(maxHp)} HP`;
  el.treeFelled.textContent = String(state.treeFelled);

  // Vitality (only once the forest has awakened).
  el.vitality.hidden = !awake;
  if (awake) {
    const pMax = playerMaxHp();
    const vit = Math.max(0, state.hp);
    el.vitalityFill.style.width = `${(vit / pMax) * 100}%`;
    el.vitalityText.textContent = `${formatNumber(vit)} / ${formatNumber(pMax)} Vitality`;
    el.vitality.classList.toggle('low', vit / pMax < 0.3);
  }

  syncGenerators();
  syncSiege();
  syncUpgrades();
  syncMeta(showSeeds, seedIcon);
  syncCreatures();
  syncBoonBanner();
  syncPrestige(awake, seedIcon);
  syncDraft();
}

function syncGenerators() {
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
}

function syncSiege() {
  for (const s of SIEGE) {
    const btn = el.siege.querySelector(`[data-siege="${s.id}"]`);
    const cost = siegeCost(s);
    btn.querySelector('[data-count]').textContent =
      state.siege[s.id] > 0 ? `×${state.siege[s.id]}` : '';
    btn.querySelector('[data-rate]').textContent = `${formatNumber(s.dps)} dmg/s each`;
    btn.querySelector('[data-cost]').textContent = formatNumber(cost);
    btn.classList.toggle('affordable', state.heartwood >= cost);
    btn.disabled = state.heartwood < cost;
  }
}

function syncUpgrades() {
  for (const up of UPGRADES) {
    const btn = el.upgrades.querySelector(`[data-upgrade="${up.id}"]`);
    const bought = !!state.upgrades[up.id];
    btn.classList.toggle('purchased', bought);
    btn.classList.toggle('affordable', !bought && state.heartwood >= up.cost);
    btn.disabled = bought || state.heartwood < up.cost;
  }
}

function syncMeta(showSeeds, seedIcon) {
  el.grovePanel.hidden = !showSeeds;
  if (!showSeeds) return;
  el.seedBalance.textContent = `${formatNumber(state.heartseeds)} ${seedIcon}`;
  for (const m of META_UPGRADES) {
    const btn = el.meta.querySelector(`[data-meta="${m.id}"]`);
    const lvl = state.metaUpgrades[m.id] || 0;
    const maxed = lvl >= m.max;
    btn.querySelector('[data-level]').textContent = `Lv ${lvl}/${m.max}`;
    const costEl = btn.querySelector('[data-cost]');
    if (maxed) {
      costEl.textContent = 'MAX';
      btn.classList.add('purchased');
      btn.disabled = true;
    } else {
      const cost = metaUpgradeCost(m);
      costEl.textContent = `${formatNumber(cost)} ${seedIcon}`;
      btn.classList.remove('purchased');
      btn.classList.toggle('affordable', state.heartseeds >= cost);
      btn.disabled = state.heartseeds < cost;
    }
  }
}

// Reconcile the live-creature layer against state.creatures.
function syncCreatures() {
  const alive = new Set();
  for (const c of state.creatures) {
    alive.add(c.cid);
    let node = creatureEls.get(c.cid);
    if (!node) {
      node = document.createElement('button');
      node.className = `creature ${c.type}`;
      node.dataset.cid = String(c.cid);
      node.title = c.name;
      node.innerHTML = `
        <span class="creature-icon">${c.icon}</span>
        <span class="creature-hp"><span class="creature-hp-fill"></span></span>`;
      node.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        handlers.onAttackCreature(c.cid, ev);
      });
      el.creatures.appendChild(node);
      creatureEls.set(c.cid, node);
    }
    node.style.left = `${c.x}%`;
    node.style.top = `${c.y}%`;
    node.querySelector('.creature-hp-fill').style.width =
      `${Math.max(0, (c.hp / c.maxHp) * 100)}%`;
  }
  // Remove elements for creatures that are gone.
  for (const [cid, node] of creatureEls) {
    if (!alive.has(cid)) {
      node.remove();
      creatureEls.delete(cid);
    }
  }
}

function syncBoonBanner() {
  if (state.activeBoons.length === 0) {
    el.boonBanner.hidden = true;
    return;
  }
  // Collapse stacks into "icon ×N".
  const counts = new Map();
  for (const id of state.activeBoons) counts.set(id, (counts.get(id) || 0) + 1);
  const parts = [];
  for (const [id, n] of counts) {
    const b = BOONS.find((x) => x.id === id);
    if (!b) continue;
    parts.push(
      `<span class="boon-chip" title="${b.name}: ${b.flavor}">${b.icon}${n > 1 ? ` ×${n}` : ''}</span>`,
    );
  }
  el.boonBanner.innerHTML = parts.join('');
  el.boonBanner.hidden = false;
}

function syncPrestige(awake, seedIcon) {
  el.prestigeBtn.hidden = !awake;
  if (awake) {
    el.prestigeBtn.textContent = `Return to Seed  (+${formatNumber(state.runSeeds)} ${seedIcon})`;
    el.prestigeBtn.disabled = state.runSeeds <= 0;
  }
}

function syncDraft() {
  const draft = state.pendingDraft;
  if (!draft) {
    el.draftOverlay.hidden = true;
    el.draftOptions.replaceChildren();
    el.draftOptions.dataset.sig = ''; // so an identical next roll still rebuilds
    return;
  }
  // Rebuild only when the option set changes (cheap identity check on ids).
  const sig = draft.options.join(',');
  if (el.draftOptions.dataset.sig === sig) {
    el.draftOverlay.hidden = false;
    return;
  }
  el.draftOptions.dataset.sig = sig;
  el.draftOptions.replaceChildren();
  for (const id of draft.options) {
    const b = BOONS.find((x) => x.id === id);
    if (!b) continue;
    const card = document.createElement('button');
    card.className = 'boon-card';
    card.innerHTML = `
      <span class="boon-card-icon">${b.icon}</span>
      <span class="boon-card-name">${b.name}</span>
      <span class="boon-card-flavor">${b.flavor}</span>`;
    card.addEventListener('click', () => handlers.onChooseBoon(id));
    el.draftOptions.appendChild(card);
  }
  el.draftOverlay.hidden = false;
}

export function animateTreeHit(felled) {
  el.tree.classList.remove('hit', 'felled');
  void el.tree.offsetWidth; // restart the animation
  el.tree.classList.add(felled ? 'felled' : 'hit');
}
