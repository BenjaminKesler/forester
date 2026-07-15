// ---------------------------------------------------------------------------
// Elderwood — game state and rules.
//
// Pure-ish logic layer: it owns the mutable `state`, knows how to derive values
// from config + upgrades + boons + permanent meta upgrades, and exposes actions
// (click, buy, tick, prestige...). It performs no DOM work — the UI layer reads
// state and calls these functions.
//
// Two nested loops live here:
//   * A RUN — Heartwood economy, siege, the Elder Tree, and the creatures it
//     spawns. Everything run-scoped resets on prestige or death.
//   * The META — Heartseeds and permanent upgrades that persist across runs,
//     plus lifetimeFelled, which gates when the forest "awakens".
// ---------------------------------------------------------------------------

import {
  BASE_CLICK_POWER,
  ELDER_TREE,
  GENERATORS,
  UPGRADES,
  SIEGE,
  CREATURES,
  PLAYER,
  PRESTIGE,
  BOONS,
  META_UPGRADES,
} from './config.js';

const SAVE_KEY = 'elderwood.save.v2';
const SAVE_KEY_V1 = 'elderwood.save.v1';
const SAVE_INTERVAL_MS = 10000;

let nextCreatureId = 1;

// --- Permanent (meta) helpers ---------------------------------------------

function metaLevel(id) {
  return state.metaUpgrades[id] || 0;
}

// Summed additive effect value across the levels bought of a meta upgrade,
// e.g. Deep Roots at level 3 with effect.prodMult 0.25 → 0.75.
function metaSum(effectKey) {
  let total = 0;
  for (const m of META_UPGRADES) {
    const lvl = metaLevel(m.id);
    if (lvl && m.effect[effectKey] != null) total += m.effect[effectKey] * lvl;
  }
  return total;
}

export function metaUpgradeCost(m) {
  return Math.floor(m.baseCost * Math.pow(m.costGrowth, metaLevel(m.id)));
}

// --- Boon helpers (run-scoped, may stack) ---------------------------------

// Product of a multiplicative boon effect across all active boons (default 1).
function boonProduct(effectKey) {
  let mult = 1;
  for (const id of state.activeBoons) {
    const b = BOONS.find((x) => x.id === id);
    if (b && b.effect[effectKey] != null) mult *= b.effect[effectKey];
  }
  return mult;
}

function boonHasFlag(effectKey) {
  return state.activeBoons.some((id) => {
    const b = BOONS.find((x) => x.id === id);
    return b && b.effect[effectKey];
  });
}

// --- Tree HP curve --------------------------------------------------------

// maxHp of the (felled)-th Elder Tree, given a Soft Bark discount fraction.
// softFrac is passed in (not read from state) so this is safe to call while
// `state` itself is still being initialized.
function treeMaxHp(felled, softFrac = 0) {
  const frac = Math.min(0.6, softFrac); // cap the discount
  const base = ELDER_TREE.baseHp * (1 - frac);
  return Math.max(1, Math.floor(base * Math.pow(ELDER_TREE.hpGrowth, felled)));
}

// Current permanent Soft Bark discount (reads state; safe after init).
function softFrac() {
  return metaSum('treeHpFrac');
}

// --- Initial state --------------------------------------------------------

function freshOwned() {
  const owned = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  return owned;
}

function freshSiege() {
  const s = {};
  for (const g of SIEGE) s[g.id] = 0;
  return s;
}

function defaultState() {
  return {
    // --- meta (persists across runs) ---
    heartseeds: 0, // permanent currency
    metaUpgrades: {}, // metaUpgradeId -> level
    lifetimeFelled: 0, // total Elder Trees ever felled; gates unlocks
    totalHeartwood: 0, // lifetime earned; never decreases

    // --- run (reset on prestige/death) ---
    heartwood: 0,
    owned: freshOwned(), // generatorId -> count
    siege: freshSiege(), // siegeId -> count
    upgrades: {}, // upgradeId -> true
    treeFelled: 0, // trees felled THIS run = current tree tier
    treeHp: treeMaxHp(0),
    hp: PLAYER.maxHp, // grove vitality
    runSeeds: 0, // Heartseeds owed if you cash out now
    lastFellSeeds: 0, // seeds from the most recent fell (death penalty)
    activeBoons: [], // boon ids active this run (may repeat)
    // Combat only spawns once THIS run's first tree falls — even once the
    // forest has awakened for good (see combatAwake), a fresh run's opening
    // tree is a pure-clicking tutorial again.
    runAwakened: false,

    // --- ephemeral (never saved) ---
    creatures: [], // live creatures on the grove
    spawnTimer: 0,
    pendingDraft: null, // { options: [boonId, boonId, boonId] } while choosing
    pendingDeath: null, // { kept, missed } while the death screen is shown

    lastSaved: Date.now(),
  };
}

export const state = defaultState();

// --- Unlock gates ---------------------------------------------------------

export function combatAwake() {
  return state.lifetimeFelled >= PRESTIGE.awakenAtLifetimeFelled;
}

export function boonsUnlocked() {
  return state.lifetimeFelled >= PRESTIGE.boonsAtLifetimeFelled;
}

// --- Derived values -------------------------------------------------------

export function clickPower() {
  let add = 0;
  let mult = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (u.effect.type === 'clickAdd') add += u.effect.value;
    if (u.effect.type === 'clickMult') mult *= u.effect.value;
  }
  const meta = 1 + metaSum('clickMult');
  return (BASE_CLICK_POWER + add) * mult * meta * boonProduct('clickMult');
}

function productionMultiplier() {
  let mult = 1;
  for (const u of UPGRADES) {
    if (state.upgrades[u.id] && u.effect.type === 'prodMult') {
      mult *= u.effect.value;
    }
  }
  return mult * (1 + metaSum('prodMult')) * boonProduct('prodMult');
}

export function generatorOutput(gen) {
  return gen.rate * state.owned[gen.id] * productionMultiplier();
}

export function totalProduction() {
  return GENERATORS.reduce((sum, g) => sum + generatorOutput(g), 0);
}

export function generatorCost(gen) {
  return Math.floor(gen.baseCost * Math.pow(gen.costGrowth, state.owned[gen.id]));
}

// Tree damage per second dealt automatically by all owned siege engines.
export function siegeDps() {
  const raw = SIEGE.reduce((sum, s) => sum + s.dps * state.siege[s.id], 0);
  return raw * boonProduct('siegeMult');
}

export function siegeCost(s) {
  return Math.floor(s.baseCost * Math.pow(s.costGrowth, state.siege[s.id]));
}

export function treeMaxHpCurrent() {
  return treeMaxHp(state.treeFelled, softFrac());
}

export function playerMaxHp() {
  return PLAYER.maxHp + metaSum('maxHp');
}

// Seconds between creature spawns at the current tier, after boons/meta.
function spawnInterval() {
  const s = CREATURES.spawn;
  const base = Math.max(
    s.minIntervalSec,
    s.baseIntervalSec * Math.pow(s.intervalDecay, state.treeFelled),
  );
  const slow = boonProduct('spawnMult') * (1 + metaSum('spawnFrac'));
  return base * slow;
}

// --- Actions: economy -----------------------------------------------------

function grantHeartwood(amount) {
  state.heartwood += amount;
  state.totalHeartwood += amount;
}

// Shared damage path for the Elder Tree; handles felling. Returns fells count.
function damageTree(amount) {
  let fells = 0;
  state.treeHp -= amount;
  // Guard against a huge single hit felling many small trees in one step.
  while (state.treeHp <= 0 && fells < 100) {
    fells += 1;
    onFell();
    if (state.pendingDraft) break; // a draft pauses further felling this step
  }
  return fells;
}

// Bookkeeping for a single fell (from a click OR from siege).
function onFell() {
  state.treeFelled += 1;
  state.lifetimeFelled += 1;
  state.runAwakened = true; // this run's tutorial tree is behind us now
  // Tiered payout: the n-th tree of the run is worth n Heartseeds.
  state.lastFellSeeds = state.treeFelled;
  state.runSeeds += state.lastFellSeeds;
  // Felling restores vitality — survival rewards aggression.
  if (combatAwake()) {
    state.hp = Math.min(playerMaxHp(), state.hp + playerMaxHp() * PLAYER.fellHeal);
  }
  // A bigger successor rises.
  state.treeHp = treeMaxHpCurrent();
  // Offer a fresh boon (one draft at a time).
  if (boonsUnlocked() && !state.pendingDraft) rollDraft();
}

// A manual strike on the Elder Tree. Returns { felled }.
export function chopElderTree() {
  if (state.pendingDraft) return { felled: false };
  const power = clickPower();
  grantHeartwood(power);
  const fells = damageTree(power);
  return { felled: fells > 0 };
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

export function buySiege(id) {
  const s = SIEGE.find((x) => x.id === id);
  if (!s) return false;
  const cost = siegeCost(s);
  if (state.heartwood < cost) return false;
  state.heartwood -= cost;
  state.siege[id] += 1;
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

// --- Actions: combat ------------------------------------------------------

function creatureConfig(type) {
  return CREATURES.types.find((t) => t.type === type);
}

function spawnCreature() {
  const s = CREATURES.spawn;
  if (state.creatures.length >= s.maxAlive) return;

  // Weighted pick of an archetype.
  const total = CREATURES.types.reduce((a, t) => a + t.weight, 0);
  let roll = Math.random() * total;
  let pick = CREATURES.types[0];
  for (const t of CREATURES.types) {
    roll -= t.weight;
    if (roll <= 0) { pick = t; break; }
  }

  const tier = state.treeFelled;
  const hp = Math.max(
    1,
    Math.round(CREATURES.hpBase * Math.pow(CREATURES.hpGrowth, tier) * boonProduct('creatureHpMult')),
  );

  state.creatures.push({
    cid: nextCreatureId++,
    type: pick.type,
    icon: pick.icon,
    name: pick.name,
    hp,
    maxHp: hp,
    age: 0,
    // Emerges over this many seconds; attackable but inert until it hits 0.
    emerge: CREATURES.spawn.emergeSec,
    fuse: pick.fuseSec || 0,
    // Position as a percentage of the grove, kept clear of dead-centre (tree).
    x: 8 + Math.random() * 84,
    y: 12 + Math.random() * 70,
  });
}

// Effect strength for a creature at the current tier.
function tierEffect(base) {
  return base * Math.pow(CREATURES.effectGrowth, state.treeFelled);
}

// Destroy one owned unit (generator or siege), preferring the priciest tier
// available, when a Blight Sprite detonates. Returns a label or null.
function blightDestroy() {
  const pool = [];
  for (let i = GENERATORS.length - 1; i >= 0; i--) {
    if (state.owned[GENERATORS[i].id] > 0) pool.push({ kind: 'gen', def: GENERATORS[i] });
  }
  for (let i = SIEGE.length - 1; i >= 0; i--) {
    if (state.siege[SIEGE[i].id] > 0) pool.push({ kind: 'siege', def: SIEGE[i] });
  }
  if (pool.length === 0) return null;
  const target = pool[Math.floor(Math.random() * pool.length)];
  if (target.kind === 'gen') state.owned[target.def.id] -= 1;
  else state.siege[target.def.id] -= 1;
  return target.def.name;
}

// Player strikes a creature. Returns results per creature hit (for UI feedback):
//   [{ cid, x, y, killed }]
export function attackCreature(cid) {
  if (state.pendingDraft) return [];
  const power = clickPower();
  const targets = boonHasFlag('cleave')
    ? [...state.creatures]
    : state.creatures.filter((c) => c.cid === cid);

  const results = [];
  for (const c of targets) {
    c.hp -= power;
    const killed = c.hp <= 0;
    results.push({ cid: c.cid, x: c.x, y: c.y, killed });
  }
  if (results.some((r) => r.killed)) {
    state.creatures = state.creatures.filter((c) => c.hp > 0);
  }
  return results;
}

// --- Tick -----------------------------------------------------------------

// Advance the whole simulation by `dtSeconds`. Returns { died, kept, missed }
// so the UI can react to a forced reset. The economy always advances; combat
// is paused while a boon draft or the death screen is open (a deliberate
// respite — see runAwakened for why felling still gates spawns per-run).
export function tick(dtSeconds) {
  if (state.pendingDeath) return { died: false };

  grantHeartwood(totalProduction() * dtSeconds);

  if (state.pendingDraft) return { died: false };

  // Siege engines gnaw the tree even while you fight.
  const sd = siegeDps();
  if (sd > 0) damageTree(sd * dtSeconds);

  if (!combatAwake() || !state.runAwakened) return { died: false };

  // Spawn on a cadence that quickens as the tree grows.
  state.spawnTimer += dtSeconds;
  const interval = spawnInterval();
  while (state.spawnTimer >= interval) {
    state.spawnTimer -= interval;
    spawnCreature();
  }

  // Resolve each living creature's behaviour.
  const survivors = [];
  for (const c of state.creatures) {
    // Still spawning in: it can be clicked to death, but does not act yet.
    if (c.emerge > 0) {
      c.emerge = Math.max(0, c.emerge - dtSeconds);
      survivors.push(c);
      continue;
    }
    c.age += dtSeconds;
    const cfg = creatureConfig(c.type);

    if (c.type === 'thief') {
      const steal = tierEffect(cfg.stealBase) * boonProduct('thiefMult') * dtSeconds;
      state.heartwood = Math.max(0, state.heartwood - steal);
      if (c.age >= cfg.lifespanSec) continue; // flees
    } else if (c.type === 'mauler') {
      state.hp -= tierEffect(cfg.dmgBase) * dtSeconds;
    } else if (c.type === 'blight') {
      c.fuse -= dtSeconds;
      if (c.fuse <= 0) { c.detonated = blightDestroy(); continue; }
    }
    survivors.push(c);
  }
  state.creatures = survivors;

  if (state.hp <= 0) {
    const { kept, missed } = die();
    return { died: true, kept, missed };
  }
  return { died: false };
}

// --- Prestige / death -----------------------------------------------------

// Begin a fresh run, keeping all meta progress. Seeds banked before this.
function startRun() {
  state.heartwood = metaSum('startHeartwood');
  state.owned = freshOwned();
  state.siege = freshSiege();
  state.upgrades = {};
  state.treeFelled = 0;
  state.treeHp = treeMaxHp(0, softFrac());
  state.hp = playerMaxHp();
  state.runSeeds = 0;
  state.lastFellSeeds = 0;
  state.activeBoons = [];
  state.runAwakened = false;
  state.creatures = [];
  state.spawnTimer = 0;
  state.pendingDraft = null;
  // A run begins with one draft, once boons are unlocked.
  if (boonsUnlocked()) rollDraft();
}

// Voluntary cash-out: bank every owed seed, then start anew.
export function prestige() {
  if (!combatAwake()) return false;
  state.heartseeds += state.runSeeds;
  startRun();
  save();
  return true;
}

// Forced reset on death: bank owed seeds MINUS the most recent tree's worth.
// The new run starts immediately, but stays behind the death screen (which
// pauses tick(), like a boon draft) until the player acknowledges it.
export function die() {
  const kept = Math.max(0, state.runSeeds - state.lastFellSeeds);
  const missed = state.lastFellSeeds;
  state.heartseeds += kept;
  startRun();
  state.pendingDeath = { kept, missed };
  save();
  return { kept, missed };
}

export function acknowledgeDeath() {
  state.pendingDeath = null;
}

// --- Boon draft -----------------------------------------------------------

function rollDraft() {
  // Offer three distinct random boons.
  const pool = [...BOONS];
  const options = [];
  while (options.length < 3 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    options.push(pool.splice(i, 1)[0].id);
  }
  state.pendingDraft = { options };
}

export function chooseBoon(id) {
  if (!state.pendingDraft || !state.pendingDraft.options.includes(id)) return false;
  const b = BOONS.find((x) => x.id === id);
  if (b.effect.heal) {
    state.hp = Math.min(playerMaxHp(), state.hp + playerMaxHp() * b.effect.heal);
  } else {
    state.activeBoons.push(id); // persistent boons stack for the run
  }
  state.pendingDraft = null;
  return true;
}

// --- Meta upgrades --------------------------------------------------------

export function buyMetaUpgrade(id) {
  const m = META_UPGRADES.find((x) => x.id === id);
  if (!m) return false;
  if (metaLevel(id) >= m.max) return false;
  const cost = metaUpgradeCost(m);
  if (state.heartseeds < cost) return false;
  state.heartseeds -= cost;
  state.metaUpgrades[id] = metaLevel(id) + 1;
  // Buying +max HP shouldn't retroactively hurt; nudge current HP up too.
  if (m.effect.maxHp) state.hp = Math.min(playerMaxHp(), state.hp + m.effect.maxHp);
  return true;
}

// --- Persistence ----------------------------------------------------------

// Only durable fields are saved; creatures, spawn timer and the pending draft
// are ephemeral and rebuilt on load.
export function save() {
  state.lastSaved = Date.now();
  const data = {
    heartseeds: state.heartseeds,
    metaUpgrades: state.metaUpgrades,
    lifetimeFelled: state.lifetimeFelled,
    totalHeartwood: state.totalHeartwood,
    heartwood: state.heartwood,
    owned: state.owned,
    siege: state.siege,
    upgrades: state.upgrades,
    treeFelled: state.treeFelled,
    treeHp: state.treeHp,
    hp: state.hp,
    runSeeds: state.runSeeds,
    lastFellSeeds: state.lastFellSeeds,
    activeBoons: state.activeBoons,
    runAwakened: state.runAwakened,
    lastSaved: state.lastSaved,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Elderwood: could not save.', e);
  }
}

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Merge a save into `state`, tolerating missing keys so a rebalance never
// bricks a save. Falls back to migrating a v1 (pre-combat) save if present.
export function load() {
  let data = readRaw(SAVE_KEY);
  if (!data) {
    const v1 = readRaw(SAVE_KEY_V1);
    if (v1) data = migrateV1(v1);
  }
  if (!data) return false;

  // Meta.
  state.heartseeds = Number(data.heartseeds) || 0;
  state.metaUpgrades = {};
  for (const m of META_UPGRADES) {
    const lvl = Number(data.metaUpgrades?.[m.id]) || 0;
    if (lvl > 0) state.metaUpgrades[m.id] = Math.min(lvl, m.max);
  }
  state.lifetimeFelled = Number(data.lifetimeFelled) || 0;
  state.totalHeartwood = Number(data.totalHeartwood) || 0;

  // Run.
  state.heartwood = Number(data.heartwood) || 0;
  if (state.totalHeartwood < state.heartwood) state.totalHeartwood = state.heartwood;
  state.owned = freshOwned();
  for (const g of GENERATORS) state.owned[g.id] = Number(data.owned?.[g.id]) || 0;
  state.siege = freshSiege();
  for (const s of SIEGE) state.siege[s.id] = Number(data.siege?.[s.id]) || 0;
  state.upgrades = {};
  for (const u of UPGRADES) if (data.upgrades?.[u.id]) state.upgrades[u.id] = true;
  state.treeFelled = Number(data.treeFelled) || 0;

  const maxHp = treeMaxHpCurrent();
  const savedHp = Number(data.treeHp);
  state.treeHp = savedHp > 0 && savedHp <= maxHp ? savedHp : maxHp;

  const pMax = playerMaxHp();
  const savedVit = Number(data.hp);
  state.hp = savedVit > 0 && savedVit <= pMax ? savedVit : pMax;

  state.runSeeds = Number(data.runSeeds) || 0;
  state.lastFellSeeds = Number(data.lastFellSeeds) || 0;
  state.activeBoons = Array.isArray(data.activeBoons)
    ? data.activeBoons.filter((id) => BOONS.some((b) => b.id === id))
    : [];
  // Older saves predate this flag: infer it from whether this run's tree
  // has already advanced past the tutorial tier.
  state.runAwakened = data.runAwakened != null ? !!data.runAwakened : state.treeFelled > 0;

  // Ephemeral — always start clear.
  state.creatures = [];
  state.spawnTimer = 0;
  state.pendingDraft = null;
  state.pendingDeath = null;
  return true;
}

// A v1 save had no runs: its treeFelled was a lifetime count. Carry it into
// both lifetimeFelled and the current run's tier so play continues seamlessly.
function migrateV1(v1) {
  return {
    heartseeds: 0,
    metaUpgrades: {},
    lifetimeFelled: Number(v1.treeFelled) || 0,
    totalHeartwood: Number(v1.totalHeartwood) || 0,
    heartwood: Number(v1.heartwood) || 0,
    owned: v1.owned || {},
    siege: {},
    upgrades: v1.upgrades || {},
    treeFelled: Number(v1.treeFelled) || 0,
    treeHp: Number(v1.treeHp) || 0,
    hp: PLAYER.maxHp,
    runSeeds: 0,
    lastFellSeeds: 0,
    activeBoons: [],
  };
}

// Full wipe, including all meta progress ("Start Anew").
export function resetGame() {
  Object.assign(state, defaultState());
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY_V1);
  } catch (e) {
    /* ignore */
  }
}

export function startAutosave() {
  setInterval(save, SAVE_INTERVAL_MS);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
}
