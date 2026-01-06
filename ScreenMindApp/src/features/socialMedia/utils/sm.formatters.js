export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function toFixedMaybe(num, digits = 2) {
  const n = Number(num);
  if (Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function formatMinutes(mins) {
  const m = Number(mins);
  if (Number.isNaN(m)) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return `${h}h ${r}m`;
}
