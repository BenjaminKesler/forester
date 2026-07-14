// Compact number formatting for large idle-game values.
// 0–9999 show with light precision; beyond that we switch to suffixed units
// (K, M, B, …) so the UI stays readable as numbers grow exponentially.

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) {
    // Show a decimal only when it carries information (e.g. 0.1/s rates).
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(1000, tier);
  return scaled.toFixed(2) + SUFFIXES[tier];
}
