// ---------------------------------------------------------------------------
// Elderwood — game content & balancing.
//
// Everything the designer might want to tweak lives here: names, flavor text,
// costs, production rates, and the Elder Tree's HP curve. The rest of the code
// treats this file as data and should not need editing to rebalance the game.
// ---------------------------------------------------------------------------

export const GAME = {
  title: 'Elderwood',
  tagline: 'Harvest the heartwood of an ancient, mystical forest.',
  // The currency harvested from the Elder Tree and produced by the forest.
  currency: { name: 'Heartwood', icon: '🪵' },
};

// Base Heartwood gained (and damage dealt) per manual click, before upgrades.
export const BASE_CLICK_POWER = 1;

// The Elder Tree you chop. Felling one spawns a larger successor; the felled
// count is the hook the future achievement/unlock system will read.
export const ELDER_TREE = {
  name: 'The Elder Tree',
  baseHp: 200,
  // Each successive tree has hp = baseHp * hpGrowth^(felledCount).
  hpGrowth: 1.6,
  // Bonus Heartwood awarded when a tree is felled = current maxHp * fellBonus.
  fellBonus: 0.25,
};

// Passive producers. Order = display order and tier. `baseCost` is the price of
// the first one; each purchase multiplies the next price by `costGrowth`.
// `rate` is Heartwood per second, per unit, before upgrades.
export const GENERATORS = [
  {
    id: 'sapling',
    name: 'Sapling',
    icon: '🌱',
    flavor: 'A young tree reaching for the light.',
    baseCost: 15,
    costGrowth: 1.15,
    rate: 0.1,
  },
  {
    id: 'wisp',
    name: 'Forest Wisp',
    icon: '✨',
    flavor: 'A glimmering spirit that gathers fallen heartwood.',
    baseCost: 100,
    costGrowth: 1.15,
    rate: 1,
  },
  {
    id: 'druid',
    name: 'Grove Druid',
    icon: '🧝',
    flavor: 'A keeper who tends and harvests the grove.',
    baseCost: 1100,
    costGrowth: 1.15,
    rate: 8,
  },
  {
    id: 'treant',
    name: 'Elderbark Treant',
    icon: '🌳',
    flavor: 'A walking tree that fells its lesser kin.',
    baseCost: 12000,
    costGrowth: 1.15,
    rate: 47,
  },
  {
    id: 'grove',
    name: 'Moonlit Grove',
    icon: '🌙',
    flavor: 'An entire glade blessed by the moon.',
    baseCost: 130000,
    costGrowth: 1.15,
    rate: 260,
  },
  {
    id: 'warden',
    name: 'Ancient Warden',
    icon: '🗿',
    flavor: 'A primordial guardian of the deep wood.',
    baseCost: 1400000,
    costGrowth: 1.15,
    rate: 1400,
  },
];

// One-time upgrades. `effect` describes how it modifies play:
//   { type: 'clickAdd',  value } — adds flat Heartwood per click
//   { type: 'clickMult', value } — multiplies click power
//   { type: 'prodMult',  value } — multiplies all generator output
export const UPGRADES = [
  {
    id: 'flint',
    name: 'Sharpened Flint',
    icon: '🔪',
    flavor: 'A keener edge bites deeper. +1 Heartwood per click.',
    cost: 100,
    effect: { type: 'clickAdd', value: 1 },
  },
  {
    id: 'axe',
    name: 'Enchanted Axe',
    icon: '🪓',
    flavor: 'Runes hum along the blade. Doubles Heartwood per click.',
    cost: 1500,
    effect: { type: 'clickMult', value: 2 },
  },
  {
    id: 'blessing',
    name: 'Blessing of the Grove',
    icon: '🍃',
    flavor: 'The forest quickens. All growth +25%.',
    cost: 5000,
    effect: { type: 'prodMult', value: 1.25 },
  },
  {
    id: 'roots',
    name: 'Whispering Roots',
    icon: '🕸️',
    flavor: 'Roots share their secrets. Doubles all growth.',
    cost: 50000,
    effect: { type: 'prodMult', value: 2 },
  },
  {
    id: 'runed',
    name: 'Runed Edge',
    icon: '⚡',
    flavor: 'Lightning sleeps in the steel. Triples click power.',
    cost: 250000,
    effect: { type: 'clickMult', value: 3 },
  },
];

// ===========================================================================
// COMBAT & ROGUELIKE LAYER
//
// The Elder Tree is a boss that fights back. Felling it awakens the forest:
// creatures spawn to defend it, and each fell makes the next tree — and its
// defenders — deadlier. You spend Heartwood on Siege engines (to fell faster)
// and Heartwood on Generators (income); you spend permanent Heartseeds, earned
// by felling, on a grove of bonuses that carry across every run.
// ===========================================================================

// The player's "grove vitality". Creatures whittle it; felling restores some.
// Reaching 0 forces a reset (a death), forfeiting one tree's worth of seeds.
export const PLAYER = {
  maxHp: 100,
  fellHeal: 0.35, // fraction of max vitality restored per Elder Tree felled
};

// Siege engines: bought with Heartwood, deal continuous damage to the Elder
// Tree but produce NO Heartwood. They fell trees faster (→ more Heartseeds)
// at the cost of income and of rousing a bigger, angrier tree.
export const SIEGE = [
  {
    id: 'termites',
    name: 'Heartwood Termites',
    icon: '🐜',
    flavor: 'They gnaw the ancient bark without rest.',
    baseCost: 60,
    costGrowth: 1.18,
    dps: 0.6,
  },
  {
    id: 'sawhand',
    name: 'Sawhand Sprite',
    icon: '🪚',
    flavor: 'A woodland spirit with a blade for an arm.',
    baseCost: 750,
    costGrowth: 1.18,
    dps: 6,
  },
  {
    id: 'firebrand',
    name: 'Firebrand',
    icon: '🔥',
    flavor: 'Slow embers eat into the heartwood.',
    baseCost: 9000,
    costGrowth: 1.18,
    dps: 45,
  },
  {
    id: 'ballista',
    name: 'Root Ballista',
    icon: '🎯',
    flavor: 'Hurls sharpened roots deep into the trunk.',
    baseCost: 110000,
    costGrowth: 1.18,
    dps: 320,
  },
  {
    id: 'tempest',
    name: 'Tempest Bough',
    icon: '🌩️',
    flavor: 'Calls the storm down upon the Elder Tree.',
    baseCost: 1300000,
    costGrowth: 1.18,
    dps: 2200,
  },
];

// Creatures the Elder Tree spawns to defend itself. Their health and effect
// strength scale with the CURRENT tree's tier (trees felled this run), so
// felling faster makes the forest deadlier — the core risk/reward dial.
//
//   - thief:  drains Heartwood while alive, then flees after its lifespan
//   - mauler: deals continuous damage to your vitality until you kill it
//   - blight: after a short fuse, destroys one of your generators/siege units
export const CREATURES = {
  spawn: {
    baseIntervalSec: 3.2, // seconds between spawns at tier 0
    minIntervalSec: 0.55, // fastest cadence, however deep you push
    intervalDecay: 0.92, // interval *= decay^tier
    maxAlive: 14,
    // Spawn-in delay: a newly spawned creature emerges over this many seconds.
    // While emerging it can be attacked but does not act (no steal/maul/fuse).
    emergeSec: 1.0,
  },
  hpBase: 1,
  hpGrowth: 1.32, // creature hp = hpBase * hpGrowth^tier
  effectGrowth: 1.28, // effect strength = base * effectGrowth^tier
  types: [
    {
      type: 'thief',
      name: 'Sap Thief',
      icon: '🐿️',
      weight: 3,
      lifespanSec: 6,
      stealBase: 4, // Heartwood/sec drained at tier 0
    },
    {
      type: 'mauler',
      name: 'Bramble Maw',
      icon: '👹',
      weight: 2,
      dmgBase: 5, // vitality/sec dealt at tier 0
    },
    {
      type: 'blight',
      name: 'Blight Sprite',
      icon: '🍄',
      weight: 1,
      fuseSec: 5, // seconds until it destroys one of your units
    },
  ],
};

// The permanent meta-currency and the run/prestige rules.
export const PRESTIGE = {
  currency: { name: 'Heartseeds', icon: '🌰' },
  // The forest awakens (combat + prestige) once you have ever felled this many.
  awakenAtLifetimeFelled: 1,
  // Boon drafts begin once you have ever felled this many trees.
  boonsAtLifetimeFelled: 3,
  // Seeds for the n-th tree felled in a run = n. Dying forfeits the most
  // recent tree's worth (see game.js die()).
};

// Run-scoped blessings. Drafted 1-of-3 at run start and again on every fell;
// they STACK within a run and reset when the run does. Effects:
//   prodMult / clickMult / siegeMult — run multipliers
//   spawnMult   — multiplies creature spawn interval (>1 = slower)
//   creatureHpMult / thiefMult — <1 weakens creatures / thieves
//   cleave      — your strikes hit every creature at once
//   heal        — instantly restore this fraction of max vitality
export const BOONS = [
  { id: 'bounty', name: 'Bountiful Season', icon: '🌸', flavor: '+60% Heartwood production this run.', effect: { prodMult: 1.6 } },
  { id: 'focus', name: "Woodsman's Focus", icon: '🎯', flavor: 'Your strikes hit 2.5× harder this run.', effect: { clickMult: 2.5 } },
  { id: 'siegevow', name: 'Siege Vow', icon: '⚔️', flavor: '+80% siege damage this run.', effect: { siegeMult: 1.8 } },
  { id: 'cleave', name: 'Whirling Edge', icon: '🌀', flavor: 'Your strikes cleave every creature at once.', effect: { cleave: true } },
  { id: 'ward', name: 'Warding Glyph', icon: '🛡️', flavor: 'Creatures spawn 35% slower this run.', effect: { spawnMult: 1.35 } },
  { id: 'brittle', name: 'Brittle Bones', icon: '💀', flavor: 'Creatures have 35% less health this run.', effect: { creatureHpMult: 0.65 } },
  { id: 'miser', name: "Miser's Ward", icon: '🔒', flavor: 'Sap Thieves steal 70% less this run.', effect: { thiefMult: 0.3 } },
  { id: 'sap', name: 'Rising Sap', icon: '💚', flavor: 'Restore 40% of your vitality now.', effect: { heal: 0.4 } },
];

// Permanent upgrades bought with Heartseeds; they persist across every run.
// Each level adds its effect value (multipliers are additive per level, e.g.
// prodMult 0.25 → +25% per level). No auto-defense here by design — vitality,
// not automation, is how the grove keeps you alive.
export const META_UPGRADES = [
  { id: 'deeproots', name: 'Deep Roots', icon: '🌰', flavor: '+25% Heartwood production per level.', baseCost: 3, costGrowth: 1.6, max: 12, effect: { prodMult: 0.25 } },
  { id: 'instinct', name: 'Sharpened Instinct', icon: '🗡️', flavor: '+25% click power per level.', baseCost: 3, costGrowth: 1.6, max: 12, effect: { clickMult: 0.25 } },
  { id: 'vitality', name: 'Heartwood Vitality', icon: '❤️', flavor: '+30 max vitality per level.', baseCost: 4, costGrowth: 1.7, max: 10, effect: { maxHp: 30 } },
  { id: 'seedcache', name: 'Seed Cache', icon: '🌾', flavor: 'Start each run with +50 Heartwood per level.', baseCost: 5, costGrowth: 1.8, max: 8, effect: { startHeartwood: 50 } },
  { id: 'softbark', name: 'Soft Bark', icon: '🪵', flavor: 'Elder Trees start with 8% less health per level.', baseCost: 6, costGrowth: 2.0, max: 5, effect: { treeHpFrac: 0.08 } },
  { id: 'wardpact', name: 'Ward Pact', icon: '🛡️', flavor: 'Creatures spawn 6% slower per level.', baseCost: 6, costGrowth: 2.0, max: 6, effect: { spawnFrac: 0.06 } },
];
