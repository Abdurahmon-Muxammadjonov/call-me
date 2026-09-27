/* Grafiklar uchun raqamlar (spetsifikatsiya §4.8).
 *
 * Maketdagi o'q qiymatlari (1400/1050/700/350, 180/120/60) qattiq yozilgan
 * edi (D8). Bu yerdagi funksiyalar ularni MA'LUMOTDAN chiqaradi va maket
 * misollarini aynan takrorlaydi — qarang numbers.test.ts. */

/* Suzuvchi nuqta shovqinini kesish: 0.15/0.05 = 2.9999999999999996. */
const EPS = 1e-9;

function decimalsOf(step: number): number {
  if (!(step > 0) || Number.isInteger(step)) return 0;
  return Math.min(12, Math.max(0, Math.ceil(-Math.log10(step)) + 2));
}

function roundTo(v: number, decimals: number): number {
  return decimals ? Number(v.toFixed(decimals)) : Math.round(v);
}

/* 1) raw = max / intervals
 * 2) u = 5 × 10^(floor(log10(raw)) − 1)
 * 3) step = ceil(raw / u) × u
 * 4) 0, step, …, step × intervals
 * max ≤ 0 (yoki noma'lum) → qadam 1. */
export function niceTicks(max: number, intervals: number): number[] {
  const n = Math.max(1, Math.floor(intervals));
  let step = 1;
  if (Number.isFinite(max) && max > 0) {
    const raw = max / n;
    const u = 5 * Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    step = roundTo(Math.ceil(raw / u - EPS) * u, decimalsOf(u));
  }
  const d = decimalsOf(step);
  return Array.from({ length: n + 1 }, (_, i) => roundTo(step * i, d));
}

export function niceCeil(v: number): number {
  const ticks = niceTicks(v, 4);
  return ticks[ticks.length - 1];
}

export function ceilTo(v: number, step: number): number {
  if (!(step > 0)) return v;
  return roundTo(Math.ceil(v / step - EPS) * step, decimalsOf(step));
}

/* Konversiya yarim-gauge shkalasi: max(25, ceilTo5(max(target×1.25, pct×1.1))).
 * Maqsad 20 → 25 (maketdagidek). */
export function gaugeScaleMax(target: number | null | undefined, pct: number | null | undefined): number {
  const t = typeof target === "number" && Number.isFinite(target) ? target * 1.25 : 0;
  const p = typeof pct === "number" && Number.isFinite(pct) ? pct * 1.1 : 0;
  return Math.max(25, ceilTo(Math.max(t, p), 5));
}

/* Gauge yoyidagi to'ldirish (pathLength=100 bo'yicha). */
export function gaugeFill(pct: number | null | undefined, scaleMax: number): number {
  if (typeof pct !== "number" || !Number.isFinite(pct) || !(scaleMax > 0)) return 0;
  return Math.max(0, Math.min(100, (pct / scaleMax) * 100));
}

/* Maqsad chizig'i: markaz (cx, cy), radiuslar r1→r2, burchak π(1 − target/scaleMax).
 * Maket: target 20, shkala 25 → (143.4, 55.2) → (159.6, 43.5). */
export function gaugeTick(
  target: number,
  scaleMax: number,
  { cx = 90, cy = 94, r1 = 66, r2 = 86 }: { cx?: number; cy?: number; r1?: number; r2?: number } = {}
): { x1: number; y1: number; x2: number; y2: number } {
  const f = Math.max(0, Math.min(1, target / scaleMax));
  const a = Math.PI * (1 - f);
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    x1: round1(cx + r1 * Math.cos(a)),
    y1: round1(cy - r1 * Math.sin(a)),
    x2: round1(cx + r2 * Math.cos(a)),
    y2: round1(cy - r2 * Math.sin(a)),
  };
}

/* Diverging bar shkalasi: max(0.5, ceilTo(max|Δ| × 1.25, 0.1)). 0.6 → 0.8. */
export function divMax(deltas: ReadonlyArray<number | null | undefined>): number {
  let m = 0;
  for (const d of deltas) {
    if (typeof d === "number" && Number.isFinite(d)) m = Math.max(m, Math.abs(d));
  }
  return Math.max(0.5, ceilTo(m * 1.25, 0.1));
}

/* To'lqin shakli: 0–100 cho'qqilarni n ta ustunga max-pool qiladi.
 * Cho'qqilar n dan kam bo'lsa — eng yaqin qo'shni bo'yicha cho'ziladi,
 * shunda ustunlar soni doim n ta. */
export function downsamplePeaks(peaks: ReadonlyArray<number>, n: number): number[] {
  const count = Math.max(0, Math.floor(n));
  const L = peaks.length;
  if (!count || !L) return [];
  const clamp = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);
  const out: number[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * L) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * L) / count));
    let m = 0;
    for (let j = start; j < end && j < L; j++) m = Math.max(m, clamp(peaks[j]));
    out[i] = m;
  }
  return out;
}

/* Xodimlar › ball taqsimoti (Xodimlar.dc.html dan ko'chirildi, D3 bilan:
 * kenglik suyuq). Nuqtalar ball bo'yicha o'sish tartibida joylashadi;
 * yo'laklar [0, −15, +15, −30, +30], to'qnashuv masofasi 15 px. */
export interface BeeswarmDot<T> {
  item: T;
  x: number;
  /* Nuqta markazining o'q chizig'iga nisbatan siljishi (px). */
  offsetY: number;
  lane: number;
  size: number;
  selected: boolean;
}

const LANES = [0, -15, 15, -30, 30];

export function beeswarmLayout<T>(
  items: ReadonlyArray<T>,
  getScore: (item: T) => number | null | undefined,
  width: number,
  isSelected: (item: T) => boolean = () => false
): BeeswarmDot<T>[] {
  const scored = items
    .map((item) => ({ item, s: getScore(item) }))
    .filter((d): d is { item: T; s: number } => typeof d.s === "number" && Number.isFinite(d.s))
    .sort((p, q) => p.s - q.s);
  const last = LANES.map(() => -Infinity);
  return scored.map(({ item, s }) => {
    const x = (Math.max(0, Math.min(10, s)) / 10) * width;
    let k = 0;
    while (k < LANES.length - 1 && x - last[k] < 15) k++;
    last[k] = x;
    const selected = isSelected(item);
    return { item, x, offsetY: LANES[k], lane: k, size: selected ? 18 : 14, selected };
  });
}

/* Sparkline y-oralig'i (D9): operatorning o'z min/max'i, chetlari bilan;
 * oraliq kamida 1.0 — tekis qator tekis ko'rinsin. */
export function sparkRange(values: ReadonlyArray<number | null | undefined>, minSpan = 1): [number, number] {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!nums.length) return [0, minSpan];
  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  const pad = (hi - lo) * 0.1;
  lo -= pad;
  hi += pad;
  if (hi - lo < minSpan) {
    const mid = (hi + lo) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  return [lo, hi];
}
