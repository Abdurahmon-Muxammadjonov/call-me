/* `npm test` → node --test (Node 24 TypeScript'ni o'zi tozalaydi). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  niceTicks, niceCeil, ceilTo, gaugeScaleMax, gaugeFill, gaugeTick, divMax,
  downsamplePeaks, beeswarmLayout, sparkRange,
} from "./numbers.ts";

test("niceTicks: maketdagi o'qlarni takrorlaydi (D8)", () => {
  assert.deepEqual(niceTicks(1306, 4), [0, 350, 700, 1050, 1400]);
  assert.deepEqual(niceTicks(171, 3), [0, 60, 120, 180]);
});

test("niceTicks: chekka holatlar", () => {
  assert.deepEqual(niceTicks(0, 4), [0, 1, 2, 3, 4]);
  assert.deepEqual(niceTicks(-5, 3), [0, 1, 2, 3]);
  assert.deepEqual(niceTicks(Number.NaN, 2), [0, 1, 2]);
  // O'nli kasrlar ham xuddi shunday, suzuvchi nuqta shovqinisiz.
  assert.deepEqual(niceTicks(0.6, 4), [0, 0.15, 0.3, 0.45, 0.6]);
  assert.deepEqual(niceTicks(7, 4), [0, 2, 4, 6, 8]);
  assert.deepEqual(niceTicks(0.35, 4), [0, 0.09, 0.18, 0.27, 0.36]);
  assert.deepEqual(niceTicks(1, 1), [0, 1]);
});

test("niceCeil: gantel shkalasi 1 306 × 1.07 → 1 400", () => {
  assert.equal(niceCeil(1306 * 1.07), 1400);
  assert.equal(niceCeil(1306), 1400);
});

test("ceilTo", () => {
  assert.equal(ceilTo(0.75, 0.1), 0.8);
  assert.equal(ceilTo(25, 5), 25);
  assert.equal(ceilTo(25.01, 5), 30);
});

test("gaugeScaleMax: maqsad 20 → 25 (maketdagidek)", () => {
  assert.equal(gaugeScaleMax(20, 14.6), 25);
  assert.equal(gaugeScaleMax(20, 40), 45);
  assert.equal(gaugeScaleMax(null, null), 25);
  assert.equal(gaugeFill(14.6, 25), 58.4);
  assert.equal(gaugeFill(99, 25), 100);
});

test("gaugeTick: maket koordinatalari (143.4, 55.2) → (159.6, 43.5)", () => {
  assert.deepEqual(gaugeTick(20, 25), { x1: 143.4, y1: 55.2, x2: 159.6, y2: 43.5 });
});

test("divMax: max|Δ| 0.6 → 0.8, kamida 0.5", () => {
  assert.equal(divMax([0.2, -0.6, 0.4]), 0.8);
  assert.equal(divMax([0.1]), 0.5);
  assert.equal(divMax([]), 0.5);
  assert.equal(divMax([null, undefined, -1.3]), 1.7);
});

test("downsamplePeaks: max-pool va cho'zish", () => {
  assert.deepEqual(downsamplePeaks([1, 9, 3, 4, 8, 2], 3), [9, 4, 8]);
  assert.deepEqual(downsamplePeaks([10, 20], 4), [10, 10, 20, 20]);
  assert.deepEqual(downsamplePeaks([150, -3], 2), [100, 0]);
  assert.deepEqual(downsamplePeaks([], 5), []);
  assert.equal(downsamplePeaks(Array.from({ length: 1000 }, (_, i) => i % 100), 64).length, 64);
});

test("beeswarmLayout: Xodimlar.dc.html bilan bir xil yo'laklar", () => {
  // Maketdagi ballar (faqat test uchun namuna).
  const raw: Array<[string, number]> = [
    ["106", 4.3], ["102", 4.2], ["103", 3.9], ["104", 3.6], ["108", 3.5], ["101", 3.3],
    ["107", 3.1], ["109", 3.0], ["110", 2.8], ["5200", 2.6], ["105", 2.4], ["100", 2.3],
  ];
  const W = 652;
  // Manbadagi algoritmning aynan o'zi — solishtirish uchun.
  const offs = [0, -15, 15, -30, 30];
  const lanes = offs.map(() => -999);
  const expected = [...raw].sort((p, q) => p[1] - q[1]).map(([ext, s]) => {
    const x = (s / 10) * W;
    let k = 0;
    while (k < offs.length - 1 && x - lanes[k] < 15) k++;
    lanes[k] = x;
    return { ext, x: x.toFixed(1), off: offs[k], size: ext === "104" ? 18 : 14 };
  });
  const got = beeswarmLayout(raw, (r) => r[1], W, (r) => r[0] === "104").map((d) => ({
    ext: d.item[0], x: d.x.toFixed(1), off: d.offsetY, size: d.size,
  }));
  assert.deepEqual(got, expected);
});

test("beeswarmLayout: ballsiz elementlar tashlab yuboriladi, kenglik suyuq (D3)", () => {
  const dots = beeswarmLayout([{ s: 5 }, { s: null }, { s: 10 }], (d) => d.s, 300);
  assert.equal(dots.length, 2);
  assert.equal(dots[0].x, 150);
  assert.equal(dots[1].x, 300);
});

test("sparkRange: kamida 1.0 oraliq (D9)", () => {
  assert.deepEqual(sparkRange([3, 3, 3]), [2.5, 3.5]);
  const [lo, hi] = sparkRange([2, 4]);
  assert.ok(lo < 2 && hi > 4);
});
