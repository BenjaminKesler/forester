// ---------------------------------------------------------------------------
// Elderwood — game state and rules.
//
// Pure-ish logic layer: it owns the mutable `state`, knows how to derive values
// from config + upgrades, and exposes actions (click, buy, tick). It performs
// no DOM work — the UI layer reads state and calls these functions.
// ---------------------------------------------------------------------------

import {
  BASE_CLICK_POWER,
  ELDER_TREE,
  GENERATORS,
  UPGRADES,
} from './config.js';

const SAVE_KEY = 'elderwood.save.v1';
const SAVE_INTERVAL_MS = 10000;

// maxHp of the felled-count-th Elder Tree.
function treeMaxHp(felled) {
  return Math.floor(ELDER_TREE.baseHp * Math.pow(ELDER_TREE.hpGrowth, felled));
}

function defaultState() {
  const owned = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  return {
    heartwood: 0,
    totalHeartwood: 0, // lifetime earned; never decreases on spend
    owned, // generatorId -> count
    upgrades: {}, // upgradeId -> true once purchased
    treeFelled: 0, // hook for the future achievement system
    treeHp: treeMaxHp(0),
    lastSaved: Date.now(),
  };
}

export const state = defaultState();

// --- Derived values -------------------------------------------------------

export function clickPower() {
  let add = 0;
  let mult = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.effect.type === 'clickAdd') add += u.effect.value;
    if (u.effect.type === 'clickMult') mult *= u.effect.value;
  }
  return (BASE_CLICK_POWER + add) * mult;
}

// Global multiplier applied to every generator's output.
function productionMultiplier() {
  let mult = 1;
  for (const u of UPGRADES) {
    if (state.upgrades[u.id] && u.effect.type === 'prodMult') {
      mult *= u.effect.value;
    }
  }
  return mult;
}

// Heartwood per second from a single generator definition, given current owned
// count and global multipliers.
export function generatorOutput(gen) {
  return gen.rate * state.owned[gen.id] * productionMultiplier();
}

// Total passive Heartwood per second across all generators.
export function totalProduction() {
  return GENERATORS.reduce((sum, g) => sum + generatorOutput(g), 0);
}

// Current price of the next unit of a generator (integer).
export function generatorCost(gen) {
  return Math.floor(gen.baseCost * Math.pow(gen.costGrowth, state.owned[gen.id]));
}

export function treeMaxHpCurrent() {
  return treeMaxHp(state.treeFelled);
}

// --- Actions --------------------------------------------------------------

function grantHeartwood(amount) {
  state.heartwood += amount;
  state.totalHeartwood += amount;
}

// A manual strike on the Elder Tree. Returns { felled } so the UI can react.
export function chopElderTree() {
  const power = clickPower();
  grantHeartwood(power);

  state.treeHp -= power;
  let felled = false;
  if (state.treeHp <= 0) {
    felled = true;
    const bonus = Math.floor(treeMaxHpCurrent() * ELDER_TREE.fellBonus);
    grantHeartwood(bonus);
    state.treeFelled += 1;
    state.treeHp = treeMaxHpCurrent();
  }
  return { felled };
}

export function buyGenerator(id) {
  const gen = GENERATORS.find((g) => g.id === id);
  if (!gen) return false;
  const cost = generatorCost(gen);
  if (state.heartwood < cost) return false;
  state.heartwood -= cost;
  state.owned[id] += 1;
  return true;
}

export function buyUpgrade(id) {
  const up = UPGRADES.find((u) => u.id === id);
  if (!up || state.upgrades[id]) return false;
  if (state.heartwood < up.cost) return false;
  state.heartwood -= up.cost;
  state.upgrades[id] = true;
  return true;
}

// Advance passive production by `dtSeconds`.
export function tick(dtSeconds) {
  grantHeartwood(totalProduction() * dtSeconds);
}

// --- Persistence ----------------------------------------------------------

export function save() {
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage may be unavailable (private mode, quota). Non-fatal.
    console.warn('Elderwood: could not save.', e);
  }
}

// Merge a loaded save into `state`, tolerating missing keys from older/newer
// configs so a rebalance never bricks an existing save.
export function load() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
  if (!raw) return false;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.warn('Elderwood: corrupt save, starting fresh.', e);
    return false;
  }

  state.heartwood = Number(data.heartwood) || 0;
  state.totalHeartwood = Number(data.totalHeartwood) || state.heartwood;
  state.treeFelled = Number(data.treeFelled) || 0;
  for (const g of GENERATORS) {
    state.owned[g.id] = Number(data.owned?.[g.id]) || 0;
  }
  state.upgrades = {};
  for (const u of UPGRADES) {
    if (data.upgrades?.[u.id]) state.upgrades[u.id] = true;
  }
  // Clamp HP into the valid range for the current tree; default to full.
  const maxHp = treeMaxHpCurrent();
  const savedHp = Number(data.treeHp);
  state.treeHp = savedHp > 0 && savedHp <= maxHp ? savedHp : maxHp;
  return true;
}

export function resetGame() {
  const fresh = defaultState();
  Object.assign(state, fresh);
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    /* ignore */
  }
}

export function startAutosave() {
  setInterval(save, SAVE_INTERVAL_MS);
  // Best-effort save when the tab is hidden or closed.
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
}
