/* Boshqaruv paneli hisoblari (Pulse Noir, 2026-10-14) — SOF funksiyalar.
 *
 * Maketdagi (02-Boshqaruv.png) raqamlar namuna; formulalar bu yerda,
 * faqat haqiqiy ma'lumotdan. Ma'lum bo'lmagan qiymat null — UI "—" qiladi
 * (hech qanday zaxira/taxminiy son yo'q):
 *   Faollik   = shu kuni qo'ng'iroq qilgan operatorlar / jami operatorlar
 *   Konversiya= bitim / lid; ball faqat maqsad (norma) ma'lum bo'lsa
 *   Sifat     = baholangan qo'ng'iroqlarning o'rtacha bali (0–100)
 *   Intizom   = kunlik uzun qo'ng'iroq normasini bajarganlar / faol operatorlar
 *   Bo'lim pulsi = ma'lum ballarning o'rtachasi. */

import type { ControlPanel, OperatorDayRow, PanelDay } from "../../data/control";
import type { Tone } from "../../lib/tones";

export type RingKey = "activity" | "conversion" | "quality" | "discipline";

export interface RingVal {
  key: RingKey;
  value: number | null;
  vars: Record<string, string | number>;
}

export interface ControlNorms {
  operatorCount: number | null;
  dailyLongCallsNorm: number | null;
  conversionTargetPct: number | null;
  lowScoreThreshold10: number | null;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function activeOperators(ops: OperatorDayRow[]): OperatorDayRow[] {
  return ops.filter((o) => o.key !== "—" && o.calls > 0);
}

export function score10Of(d: Pick<PanelDay, "scored" | "score_sum"> | undefined): number | null {
  if (!d || !d.scored) return null;
  return Math.round((d.score_sum / d.scored / 10) * 10) / 10;
}

export function rings(day: PanelDay | undefined, ops: OperatorDayRow[] | null, norms: ControlNorms): RingVal[] {
  const active = ops ? activeOperators(ops) : [];
  const total = Math.max(norms.operatorCount ?? 0, active.length);
  const activity = ops && total > 0 ? Math.round((active.length / total) * 100) : null;

  const convPct = day && day.leads > 0 ? (day.closed / day.leads) * 100 : null;
  const conversion = isNum(convPct) && isNum(norms.conversionTargetPct) && norms.conversionTargetPct > 0
    ? Math.min(100, Math.round((convPct / norms.conversionTargetPct) * 100))
    : null;

  const quality = day && day.scored > 0 ? Math.round(day.score_sum / day.scored) : null;

  const norm = norms.dailyLongCallsNorm;
  const meeting = isNum(norm) ? active.filter((o) => o.longCalls >= norm).length : 0;
  const discipline = ops && isNum(norm) && active.length > 0 ? Math.round((meeting / active.length) * 100) : null;

  return [
    { key: "activity", value: activity, vars: { calls: day?.calls ?? 0, active: active.length, total } },
    {
      key: "conversion",
      value: conversion,
      vars: {
        pct: isNum(convPct) ? (Math.round(convPct * 10) / 10).toString() : "—",
        target: isNum(norms.conversionTargetPct) ? norms.conversionTargetPct : "—",
      },
    },
    { key: "quality", value: quality, vars: { score: quality == null ? "—" : (Math.round(quality) / 10).toFixed(1) } },
    // Intizom — KPI normasiga bog'liq; norma olib tashlangan bo'lsa (2026-10-16) halqa ko'rsatilmaydi.
    ...(isNum(norm) ? [{ key: "discipline" as const, value: discipline, vars: { meeting, active: active.length } }] : []),
  ];
}

export function pulse(rs: RingVal[]): { value: number | null; strong: RingKey | null; weak: RingKey | null } {
  const known = rs.filter((r) => r.value != null) as Array<RingVal & { value: number }>;
  if (!known.length) return { value: null, strong: null, weak: null };
  const value = Math.round(known.reduce((s, r) => s + r.value, 0) / known.length);
  const sorted = [...known].sort((a, b) => a.value - b.value);
  return { value, weak: sorted[0].key, strong: sorted[sorted.length - 1].key };
}

/* % o'zgarish; oldingi 0 bo'lsa — null (cheksiz foiz ko'rsatilmaydi). */
export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

export type NegKey = "lowScored" | "penalized" | "short" | "unanswered" | "badLeads";
const NEG_FIELD: Record<NegKey, keyof PanelDay> = {
  lowScored: "low_scored",
  penalized: "penalized",
  short: "short",
  unanswered: "unanswered",
  badLeads: "bad_leads",
};

export interface NegRow {
  key: NegKey;
  value: number;
  /* eskidan yangiga 7 kun (oxirgisi tanlangan kun) */
  series: number[];
  dayDelta: number | null;
  weekDelta: number | null;
}

export function negatives(days: PanelDay[]): NegRow[] {
  const get = (i: number, f: keyof PanelDay) => Number(days[i]?.[f]) || 0;
  return (Object.keys(NEG_FIELD) as NegKey[]).map((key) => {
    const f = NEG_FIELD[key];
    let w = 0;
    let pw = 0;
    for (let i = 0; i < 7; i++) w += get(i, f);
    for (let i = 7; i < 14; i++) pw += get(i, f);
    return {
      key,
      value: get(0, f),
      series: Array.from({ length: 7 }, (_, i) => get(6 - i, f)),
      dayDelta: pctChange(get(0, f), get(1, f)),
      weekDelta: pctChange(w, pw),
    };
  });
}

/* Kamaygani yaxshi: o'sish — yomon, kamayish/teng — yaxshi. */
export function lowerIsBetterTone(delta: number | null): Tone {
  if (delta == null) return "neutral";
  return delta > 0 ? "bad" : "good";
}

export const SLOTS: Array<[number, number]> = [[9, 12], [12, 15], [15, 18], [18, 21]];

export function load(hours: ControlPanel["hours"], live: boolean, nowHour: number) {
  const byHour = new Map(hours.map((h) => [h.hour, h.calls]));
  const first = hours.filter((h) => h.calls > 0).map((h) => h.hour).sort((a, b) => a - b)[0];
  const from = Math.min(9, first ?? 9);
  const bars = [];
  for (let h = from; h <= 23; h++) {
    bars.push({ hour: h, calls: live && h > nowHour ? null : byHour.get(h) ?? 0 });
  }
  const total = hours.reduce((s, h) => s + h.calls, 0);
  const slots = SLOTS.map(([a, b]) => {
    let v = 0;
    for (let h = a; h < b; h++) v += byHour.get(h) ?? 0;
    return { from: a, to: b, calls: v, share: total ? (v / total) * 100 : 0 };
  });
  let peak: { hour: number; calls: number } | null = null;
  for (const b of bars) if (b.calls != null && b.calls > 0 && (!peak || b.calls > peak.calls)) peak = { hour: b.hour, calls: b.calls };
  const topSlot = slots.reduce<(typeof slots)[number] | null>((m, s) => (s.calls > 0 && (!m || s.calls > m.calls) ? s : m), null);
  const topShare = topSlot ? topSlot.share : 0;
  return { bars, slots, total, peak, topSlot, topShare };
}

export type FunnelKey = "calls" | "long" | "leads" | "invited" | "closed";

export function monthFunnel(m: ControlPanel["month"]) {
  const stages: Array<{ key: FunnelKey; value: number }> = [
    { key: "calls", value: m.calls },
    { key: "long", value: m.long_calls },
    { key: "leads", value: m.leads },
    { key: "invited", value: m.invited },
    { key: "closed", value: m.closed },
  ];
  return {
    stages: stages.map((s, i) => ({
      ...s,
      conv: i > 0 && stages[i - 1].value > 0 ? (s.value / stages[i - 1].value) * 100 : null,
    })),
    overall: m.leads > 0 ? (m.closed / m.leads) * 100 : null,
  };
}

export interface Signal {
  key: "unscored" | "fewScored" | "lagging" | "shortUp" | "lowQuality" | "penaltiesDown" | "callsUp" | "allGood";
  tone: Tone;
  vars: Record<string, string | number>;
  metric: string;
  href?: string;
}

export function signals(
  days: PanelDay[],
  ops: OperatorDayRow[] | null,
  norms: ControlNorms,
  longSec: number,
  date: string,
  prevCalls: number | null
): Signal[] {
  const d = days[0];
  const p = days[1];
  const out: Signal[] = [];
  if (!d) return out;
  if (d.calls > 0 && d.scored === 0) {
    out.push({ key: "unscored", tone: "bad", vars: { calls: d.calls }, metric: `0/${d.calls}`, href: `/dashboard/analysis-status?date=${date}` });
  } else if (d.calls >= 10 && d.scored / d.calls < 0.3) {
    const pct = Math.round((d.scored / d.calls) * 100);
    out.push({ key: "fewScored", tone: "warn", vars: { scored: d.scored, calls: d.calls }, metric: `${pct}%`, href: `/dashboard/analysis-status?date=${date}` });
  }
  const norm = norms.dailyLongCallsNorm;
  if (ops && isNum(norm)) {
    const active = activeOperators(ops);
    const behind = active.filter((o) => o.longCalls < norm).sort((a, b) => a.longCalls - b.longCalls);
    if (behind.length > 0) {
      // Ism — "Xodimlarni boshqarish"dagi (backend beradi), bo'lmasa ichki raqam (2026-10-16).
      const names = behind.slice(0, 3).map((o) => o.name ?? o.ext ?? "—").join(", ");
      out.push({
        key: "lagging",
        tone: behind.length * 2 >= active.length ? "bad" : "warn",
        vars: { n: behind.length, names, more: Math.max(0, behind.length - 3) },
        metric: `${behind.length}/${active.length}`,
        href: `/dashboard/staff-stats?date=${date}`,
      });
    }
  }
  if (p) {
    const sd = pctChange(d.short, p.short);
    if (sd != null && sd >= 20 && d.short >= 10) out.push({ key: "shortUp", tone: "bad", vars: { n: d.short, s: longSec }, metric: `+${Math.round(sd)}%` });
  }
  const s10 = score10Of(d);
  if (s10 != null && isNum(norms.lowScoreThreshold10) && s10 < norms.lowScoreThreshold10) {
    out.push({ key: "lowQuality", tone: "warn", vars: { score: s10.toFixed(1) }, metric: s10.toFixed(1), href: `/dashboard/staff-stats?date=${date}` });
  }
  if (p && p.penalized > d.penalized) {
    const ch = pctChange(d.penalized, p.penalized);
    out.push({ key: "penaltiesDown", tone: "good", vars: { from: p.penalized, to: d.penalized }, metric: ch == null ? "—" : `${Math.round(ch)}%` });
  }
  if (prevCalls != null && prevCalls > 0) {
    const ch = pctChange(d.calls, prevCalls);
    if (ch != null && ch >= 15) out.push({ key: "callsUp", tone: "good", vars: { n: d.calls, prev: prevCalls }, metric: `+${Math.round(ch)}%` });
  }
  const rank: Record<Tone, number> = { bad: 0, warn: 1, good: 2, neutral: 3 };
  out.sort((a, b) => rank[a.tone] - rank[b.tone]);
  if (!out.length) out.push({ key: "allGood", tone: "good", vars: {}, metric: "✓" });
  return out.slice(0, 4);
}

/* Yirik ma'lumotlar: so'nggi 7 kun vs oldingi 7 kun. */
export function strategic(days: PanelDay[]) {
  const sum = (from: number, to: number, f: (d: PanelDay) => number) => {
    let s = 0;
    for (let i = from; i < to; i++) if (days[i]) s += f(days[i]);
    return s;
  };
  const series = (f: (d: PanelDay) => number) => Array.from({ length: 7 }, (_, i) => (days[6 - i] ? f(days[6 - i]) : 0));
  const calls = { cur: sum(0, 7, (d) => d.calls), prev: sum(7, 14, (d) => d.calls), series: series((d) => d.calls) };
  const sc = sum(0, 7, (d) => d.scored);
  const psc = sum(7, 14, (d) => d.scored);
  const quality = {
    cur: sc ? sum(0, 7, (d) => d.score_sum) / sc / 10 : null,
    prev: psc ? sum(7, 14, (d) => d.score_sum) / psc / 10 : null,
    series: series((d) => (d.scored ? d.score_sum / d.scored / 10 : 0)),
  };
  const bonus = { cur: sum(0, 7, (d) => d.bonus_sum), prev: sum(7, 14, (d) => d.bonus_sum), series: series((d) => d.bonus_sum) };
  const penalty = { cur: sum(0, 7, (d) => d.penalty_sum), prev: sum(7, 14, (d) => d.penalty_sum), series: series((d) => d.penalty_sum) };
  const long = { cur: sum(0, 7, (d) => d.long_calls), prev: sum(7, 14, (d) => d.long_calls), series: series((d) => d.long_calls) };
  const minutes = { cur: sum(0, 7, (d) => d.seconds) / 60, prev: sum(7, 14, (d) => d.seconds) / 60, series: series((d) => d.seconds / 60) };
  return { calls, quality, bonus, penalty, long, minutes };
}

export function mmss(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const s = Math.round(Math.abs(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
