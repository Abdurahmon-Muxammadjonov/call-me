// Boshqaruv paneli hisoblari (2026-10-14): ballar faqat haqiqiy ma'lumotdan,
// noma'lum qiymat null (UI "—"), salbiy holatlar "kamaygani yaxshi".
import test from "node:test";
import assert from "node:assert/strict";
import { load, monthFunnel, negatives, pulse, rings, signals, lowerIsBetterTone } from "./model.ts";
import type { OperatorDayRow, PanelDay } from "../../data/control.ts";

const day = (p: Partial<PanelDay> = {}): PanelDay => ({
  date: "2026-10-12", calls: 0, operator_calls: 0, kpi_sum: 0, seconds: 0, low: 0, low_scored: 0, penalized: 0,
  short: 0, bonus_sum: 0, penalty_sum: 0, long_calls: 0, scored: 0, score_sum: 0, unanswered: 0, bad_leads: 0,
  leads: 0, invited: 0, closed: 0, incoming: 0, outgoing: 0, ...p,
});
const op = (key: string, calls: number, longCalls: number): OperatorDayRow => ({ key, ext: key, name: null, calls, longCalls, incoming: 0, outgoing: 0, leads: 0, score10: null, scored: 0, talkSec: 0 });
const norms = { operatorCount: 4, dailyLongCallsNorm: 10, conversionTargetPct: null, lowScoreThreshold10: 5 };

test("ballar: faollik, sifat, intizom; konversiya maqsadsiz — null", () => {
  const rs = rings(day({ calls: 50, scored: 10, score_sum: 640, leads: 10, closed: 2 }), [op("101", 20, 12), op("102", 30, 4), op("—", 5, 0)], { ...norms, operatorCount: 3 });
  const v = Object.fromEntries(rs.map((r) => [r.key, r.value]));
  assert.deepEqual(v, { activity: 67, conversion: null, quality: 64, discipline: 50 });
  assert.equal(rs.find((r) => r.key === "conversion")!.vars.pct, "20");
  assert.equal(pulse(rs).value, 60);
  assert.equal(pulse(rs).weak, "discipline");
});

test("ma'lumot yo'q — puls null", () => {
  assert.equal(pulse(rings(day(), null, { ...norms, dailyLongCallsNorm: null })).value, null);
});

test("salbiy holatlar: kun va hafta o'zgarishi, 7 kunlik qator eskidan yangiga", () => {
  const days = Array.from({ length: 14 }, (_, i) => day({ short: i === 0 ? 30 : i === 1 ? 20 : 10 }));
  const s = negatives(days).find((r) => r.key === "short")!;
  assert.equal(s.value, 30);
  assert.equal(s.dayDelta, 50);
  assert.equal(s.series.at(-1), 30);
  assert.equal(lowerIsBetterTone(s.dayDelta), "bad");
  assert.equal(lowerIsBetterTone(-5), "good");
});

test("yuklama: cho'qqi soat, oraliqlar ulushi, kelajak soatlar null", () => {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, calls: hour === 10 ? 6 : hour === 19 ? 4 : 0 }));
  const l = load(hours, true, 15);
  assert.equal(l.peak!.hour, 10);
  assert.equal(l.topSlot!.from, 9);
  assert.equal(Math.round(l.topShare), 60);
  assert.equal(l.bars.find((b) => b.hour === 19)!.calls, null);
});

test("voronka: bosqichlararo foiz va umumiy konversiya", () => {
  const f = monthFunnel({ from: "2026-10-01", to: "2026-10-12", calls: 100, long_calls: 40, leads: 20, invited: 5, closed: 2 });
  assert.equal(f.stages[1].conv, 40);
  assert.equal(f.overall, 10);
});

test("signal: baholanmagan qo'ng'iroqlar birinchi", () => {
  const s = signals([day({ calls: 40, scored: 0 }), day({ calls: 30 })], [op("101", 40, 2)], norms, 60, "2026-10-12", 30);
  assert.equal(s[0].key, "unscored");
  assert.ok(s.some((x) => x.key === "lagging"));
});
