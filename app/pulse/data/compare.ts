"use client";

/* Solishtirish ma'lumoti (03-Solishtirish.png, Solishtirish.dc.html).
 *
 * URL: ?period=day|week|month&a=YYYY-MM-DD&b=YYYY-MM-DD&open=YYYY-MM-DD.
 * Kun rejimida A va B — kunlar; hafta — dushanbalar; oy — oyning 1-kuni.
 * v1 adapter: /analytics/daily-summary (to'liq va `until`), /analytics/hourly,
 * /analytics/daily-minutes (kun bo'yicha operatorlar),
 * /api/management/conversion-history. Operatorlar ball o'zgarishi faqat kun
 * rejimida (ikki kunning qo'ng'iroqlari, dayCalls.ts). */

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch, API_V2 } from "./api";
import { useMe, type Me } from "./me";
import { operatorsOf, useDayCalls, useManagerNames } from "./dayCalls";
import { useLocale, type Locale } from "../../lib/i18n";
import {
  addDays, dayDiff, daysInMonth, hmOf, monthStart, shiftMonth, tashkentHourOf, tashkentToday, weekStart,
} from "../lib/dates";

export type ComparePeriod = "day" | "week" | "month";

export interface SideTotals {
  calls: number;
  minutes: number;
  score10: number | null;
}

export interface SeriesPoint {
  /* day: "09" soat; week/month: kun "YYYY-MM-DD" */
  key: string;
  a: number | null;
  b: number | null;
}

export interface DayRow {
  date: string;
  calls: number;
  operatorCalls: number;
  minutes: number;
  operators: Array<{ name: string; calls: number; minutes: number }>;
  traffic: number | null;
  sales: number | null;
}

export interface CompareData {
  period: ComparePeriod;
  today: string;
  a: string;
  b: string;
  /* A B bilan "shu vaqtgacha" solishtirilganmi (B joriy davr bo'lsa). */
  cutoff: string | null;
  totals: { a: SideTotals; b: SideTotals };
  series: SeriesPoint[];
  /* B joriy davr bo'lsa — hozirgi birlik (soat yoki kun) indeksi. */
  nowIndex: number | null;
  days: DayRow[];
  source: "v1" | "v2";
}

interface SummaryRow {
  date: string;
  calls: number;
  minutes: number;
  scored: number;
  avg_score: number;
  operator_calls: number;
}

function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function defaultSides(period: ComparePeriod, today: string): { a: string; b: string } {
  if (period === "day") return { a: addDays(today, -1), b: today };
  if (period === "week") {
    const b = weekStart(today);
    return { a: addDays(b, -7), b };
  }
  const b = monthStart(today);
  return { a: `${shiftMonth(b.slice(0, 7), -1)}-01`, b };
}

/* Tomon kunlari (davr ichida, bugundan oshmaydi). */
export function sideDays(period: ComparePeriod, start: string, today: string): string[] {
  const len = period === "day" ? 1 : period === "week" ? 7 : daysInMonth(start.slice(0, 7));
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const d = addDays(start, i);
    if (d > today) break;
    out.push(d);
  }
  return out;
}

function totals(rows: SummaryRow[]): SideTotals {
  let calls = 0;
  let minutes = 0;
  let scoreSum = 0;
  let scored = 0;
  for (const r of rows) {
    calls += num(r.calls);
    minutes += num(r.minutes);
    if (num(r.scored) > 0) {
      scoreSum += num(r.avg_score) * num(r.scored);
      scored += num(r.scored);
    }
  }
  const avg = scored > 0 ? scoreSum / scored : null;
  return { calls, minutes, score10: avg == null ? null : avg > 10 ? avg / 10 : avg };
}

async function fetchV1(period: ComparePeriod, aStart: string, bStart: string, signal?: AbortSignal): Promise<CompareData> {
  const now = new Date();
  const today = tashkentToday(now);
  const hm = hmOf(now);
  const aDays = sideDays(period, aStart, today);
  const bDays = sideDays(period, bStart, today);
  const earliest = [aStart, bStart].sort()[0];
  const history = Math.min(400, Math.max(dayDiff(earliest, today) + 1, 30));
  // B joriy davrni o'z ichiga olsa — A ham "shu vaqtgacha" (tengdosh kun).
  const bIsCurrent = bDays.includes(today);
  const aCut = bIsCurrent ? aDays[Math.min(aDays.length - 1, bDays.length - 1)] ?? null : null;

  const [full, until, hourA, hourB, minutes, conv] = await Promise.all([
    apiFetch<SummaryRow[]>(`/analytics/daily-summary?days=${history}`, { signal }),
    aCut
      ? apiFetch<SummaryRow[]>(`/analytics/daily-summary?days=${dayDiff(aCut, today) + 1}&until=${encodeURIComponent(hm)}`, { signal }).catch(() => null)
      : Promise.resolve(null),
    period === "day" ? apiFetch<Array<{ hour: number; calls: number }>>(`/analytics/hourly?date=${aStart}`, { signal }).catch(() => null) : Promise.resolve(null),
    period === "day" ? apiFetch<Array<{ hour: number; calls: number }>>(`/analytics/hourly?date=${bStart}`, { signal }).catch(() => null) : Promise.resolve(null),
    apiFetch<Array<{ date: string; operators?: Array<{ name: string; calls: number; minutes: number }> }>>(`/analytics/daily-minutes?days=${history}`, { signal }).catch(() => null),
    apiFetch<Array<{ date: string; traffic_conversion: number; sales_conversion: number }>>(`/api/management/conversion-history?days=${Math.min(history, 60)}`, { signal }).catch(() => null),
  ]);

  const byDay = new Map((Array.isArray(full) ? full : []).map((r) => [r.date, r]));
  const untilByDay = new Map((Array.isArray(until) ? until : []).map((r) => [r.date, r]));
  const aRows = aDays
    .slice(0, bIsCurrent ? bDays.length : aDays.length)
    .map((d) => (d === aCut && untilByDay.has(d) ? untilByDay.get(d)! : byDay.get(d)))
    .filter((r): r is SummaryRow => !!r);
  const bRows = bDays.map((d) => byDay.get(d)).filter((r): r is SummaryRow => !!r);

  // ---- Seriya: kun — soatlar; hafta/oy — kunlar (A va B o'z tartibida).
  let series: SeriesPoint[] = [];
  let nowIndex: number | null = null;
  if (period === "day") {
    const ha = new Map((Array.isArray(hourA) ? hourA : []).map((r) => [num(r.hour), num(r.calls)]));
    const hb = new Map((Array.isArray(hourB) ? hourB : []).map((r) => [num(r.hour), num(r.calls)]));
    const nonzero = [...ha.entries(), ...hb.entries()].filter(([, c]) => c > 0).map(([h]) => h);
    const first = nonzero.length ? Math.min(...nonzero) : null;
    const nowHour = bStart === today ? tashkentHourOf(now) : null;
    if (first != null) {
      for (let h = first; h <= 23; h++) {
        series.push({
          key: String(h).padStart(2, "0"),
          a: ha.get(h) ?? 0,
          b: nowHour != null && h > nowHour ? null : (hb.get(h) ?? 0),
        });
      }
      nowIndex = nowHour != null && nowHour >= first ? nowHour - first : null;
    }
  } else {
    const len = period === "week" ? 7 : Math.max(daysInMonth(aStart.slice(0, 7)), daysInMonth(bStart.slice(0, 7)));
    series = Array.from({ length: len }, (_, i) => {
      const da = addDays(aStart, i);
      const db = addDays(bStart, i);
      const inA = period === "week" || da.slice(0, 7) === aStart.slice(0, 7);
      const inB = period === "week" || db.slice(0, 7) === bStart.slice(0, 7);
      return {
        key: db,
        a: inA && da <= today ? num(byDay.get(da)?.calls) : null,
        b: inB && db <= today ? num(byDay.get(db)?.calls) : null,
      };
    });
    const idx = series.findIndex((p) => p.key === today);
    nowIndex = idx >= 0 ? idx : null;
  }

  // ---- Kunlik gaplashuv: B davri oxiridan orqaga 14 kun.
  const opsByDay = new Map((Array.isArray(minutes) ? minutes : []).map((d) => [d.date, Array.isArray(d.operators) ? d.operators : []]));
  const convByDay = new Map((Array.isArray(conv) ? conv : []).map((c) => [c.date, c]));
  const lastB = bDays[bDays.length - 1] ?? bStart;
  const days: DayRow[] = Array.from({ length: 14 }, (_, i) => addDays(lastB, -i))
    .filter((d) => d <= today)
    .map((d) => {
      const r = byDay.get(d);
      const c = convByDay.get(d);
      return {
        date: d,
        calls: num(r?.calls),
        operatorCalls: num(r?.operator_calls),
        minutes: num(r?.minutes),
        operators: (opsByDay.get(d) ?? []).map((o) => ({ name: o.name, calls: num(o.calls), minutes: num(o.minutes) })),
        traffic: c ? num(c.traffic_conversion) : null,
        sales: c ? num(c.sales_conversion) : null,
      };
    });

  return {
    period,
    today,
    a: aStart,
    b: bStart,
    cutoff: bIsCurrent && until ? hm : null,
    totals: { a: totals(aRows), b: totals(bRows) },
    series,
    nowIndex,
    days,
    source: "v1",
  };
}

export function compareKey(companyId: string | undefined, locale: Locale, period: ComparePeriod, a: string, b: string) {
  return ["v2", companyId ?? "_", locale, "/pages/compare", { period, a, b }] as const;
}

export function useCompare(period: ComparePeriod, a: string, b: string) {
  const { data: me } = useMe();
  const locale = useLocale();
  const page = useQuery({
    queryKey: compareKey(me?.company.id, locale, period, a, b),
    queryFn: ({ signal }) =>
      API_V2
        ? apiFetch<CompareData>(`/pages/compare?period=${period}&a=${a}&b=${b}`, { signal, v2: true })
        : fetchV1(period, a, b, signal),
    enabled: !!me,
    staleTime: 15_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
    meta: { persist: true, page: true },
  });
  // Operatorlar ball o'zgarishi — faqat kun rejimida (v1).
  const dayMode = !API_V2 && period === "day";
  const callsA = useDayCalls(me?.company.id, a, dayMode);
  const callsB = useDayCalls(me?.company.id, b, dayMode);
  const names = useManagerNames(me?.company.id, dayMode);
  const movers = useMemo(() => moversOf(me, callsA.data, callsB.data, names.data), [me, callsA.data, callsB.data, names.data]);
  return {
    ...page,
    movers: dayMode ? movers : null,
    moversLoading: dayMode && (callsA.isLoading || callsB.isLoading),
    moversError: dayMode && (callsA.isError || callsB.isError),
  };
}

export interface Mover {
  key: string;
  ext: string | null;
  name: string | null;
  from: number;
  to: number;
  delta: number;
}

function moversOf(
  me: Me | undefined,
  a: Parameters<typeof operatorsOf>[0] | undefined,
  b: Parameters<typeof operatorsOf>[0] | undefined,
  names: Map<string, string> | undefined
): Mover[] | null {
  if (!me || !a || !b) return null;
  const nm = names ?? new Map<string, string>();
  const opsA = new Map(operatorsOf(a, nm, me.norms.longCallSec).map((o) => [o.key, o]));
  const out: Mover[] = [];
  for (const o of operatorsOf(b, nm, me.norms.longCallSec)) {
    const prev = opsA.get(o.key);
    if (o.score10 == null || prev?.score10 == null) continue;
    out.push({
      key: o.key,
      ext: o.ext,
      name: o.name ?? prev.name,
      from: prev.score10,
      to: o.score10,
      delta: Math.round((o.score10 - prev.score10) * 10) / 10,
    });
  }
  return out.sort((x, y) => y.delta - x.delta || y.to - x.to);
}
