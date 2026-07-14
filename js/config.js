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
  baseHp: 50,
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
