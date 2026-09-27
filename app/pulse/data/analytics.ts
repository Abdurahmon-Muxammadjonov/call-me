"use client";

/* Analitika sahifasi ma'lumoti (spetsifikatsiya §6.2).
 *
 * Spetsifikatsiya bitta so'rovni ko'zda tutadi: GET /api/v2/pages/analytics
 * ?period=. v2 hali e'lon qilinmagan (Appendix A qo'limizda yo'q), shuning
 * uchun `AnalyticsData` — sahifaga kerakli shakl, uni ikki manba to'ldiradi:
 *   - v1 adapter (hozir): /analytics/daily-summary (to'liq va `until`
 *     bilan — "kechaning shu vaqtida" solishtirish), /analytics/hourly,
 *     kunlik davrda esa bugungi qo'ng'iroqlar ro'yxati (operator kesimi);
 *   - v2 (NEXT_PUBLIC_API_V2=1): javob Appendix A kelgach shu shaklga
 *     o'giriladi.
 * Hech qanday zaxira raqam yo'q: noma'lum qiymat null, UI uni "—" qiladi
 * yoki blokni yashiradi. */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch, API_V2 } from "./api";
import { useMe, type Me } from "./me";
import { useLocale, type Locale } from "../../lib/i18n";
import { listAllCalls, type CallRow } from "../../lib/calls";
import {
  addDays, dayDiff, hmOf, isoWeekday, monthStart, sameDayPrevMonth, shiftMonth, tashkentHourOf, tashkentToday, weekStart,
} from "../lib/dates";

export type Period = "day" | "week" | "month";

export interface StageLabels {
  singular: string;
  plural: string;
  short: string;
}

export interface Bucket {
  /* day: "09" (soat), week: "2026-09-21" (kun), month: "2026-09-01" (kun) */
  key: string;
  count: number | null;
  isCurrent: boolean;
}

export interface SeriesPoint {
  key: string;
  count: number;
}

export interface DynamicsPoint {
  /* day: kun, week: hafta boshi (dushanba), month: "YYYY-MM" */
  key: string;
  calls: number;
  long: number;
  deals: number | null;
}

export type FunnelStage = "calls" | "long" | "leads" | "offers" | "deals";

export interface TeamRow {
  key: string;
  ext: string | null;
  name: string | null;
  calls: number;
  longCalls: number;
  incoming: number;
  outgoing: number;
  leads: number | null;
  score10: number | null;
}

export interface AnalyticsData {
  period: Period;
  today: string;
  range: { from: string; to: string; cutoff: string | null };
  labels: { leads: StageLabels; offers: StageLabels; deals: StageLabels };
  norms: {
    longCallSec: number | null;
    dailyLongCallsNorm: number | null;
    conversionTargetPct: number | null;
    targetScore10: number | null;
  };
  lagging: { count: number; top: Array<{ ext: string; longCalls: number; normTarget: number }> } | null;
  total: { current: number; previous: number | null };
  buckets: Bucket[];
  talkSec: number | null;
  longCalls: number | null;
  peak: { key: string; count: number } | null;
  leads: { current: number; previous: number | null; series: SeriesPoint[] } | null;
  offers: { current: number; previous: number | null; shareOfLeadsPct: number | null; series: SeriesPoint[] } | null;
  conversion: { pct: number | null; previousPct: number | null; leads: number; offers: number | null; deals: number } | null;
  dynamics: DynamicsPoint[];
  funnel: Array<{ stage: FunnelStage; count: number }>;
  direction: { outgoing: number; incoming: number } | null;
  /* null — bu davr uchun operator kesimi manbada yo'q (v1: faqat kun). */
  team: TeamRow[] | null;
  features: { amocrm: boolean | null };
  source: "v2" | "v1";
}

/* ------------------------------------------------------------ v1 labels
 * v1 da bosqich nomlarini sozlash yo'q — eski ilovadagi nomlar
 * (lib/i18n.ts: an.kpi.* / an.funnel.*) ishlatiladi. v2 da /me.labels. */
const V1_LABELS: Record<Locale, AnalyticsData["labels"]> = {
  uz: {
    leads: { singular: "Yangi lid", plural: "Yangi lidlar", short: "lid" },
    offers: { singular: "O‘quv markazga taklif", plural: "O‘quv markazga taklif", short: "taklif" },
    deals: { singular: "Yopilgan bitim", plural: "Yopilgan bitimlar", short: "bitim" },
  },
  ru: {
    leads: { singular: "Новый лид", plural: "Новые лиды", short: "лид" },
    offers: { singular: "Приглашение в центр", plural: "Приглашено в центр", short: "приглаш." },
    deals: { singular: "Закрытая сделка", plural: "Закрытые сделки", short: "сделка" },
  },
  en: {
    leads: { singular: "New lead", plural: "New leads", short: "lead" },
    offers: { singular: "Invited to centre", plural: "Invited to centre", short: "invite" },
    deals: { singular: "Closed deal", plural: "Closed deals", short: "deal" },
  },
};

/* ---------------------------------------------------------- v1 adapter */

interface SummaryRow {
  date: string;
  calls: number;
  minutes: number;
  long_calls: number;
  incoming: number;
  outgoing: number;
  leads: number;
  invited: number;
  closed: number;
}

interface HourlyRow {
  hour: number;
  calls: number;
}

type Sums = { calls: number; minutes: number; long: number; incoming: number; outgoing: number; leads: number; offers: number; deals: number };

const ZERO: Sums = { calls: 0, minutes: 0, long: 0, incoming: 0, outgoing: 0, leads: 0, offers: 0, deals: 0 };

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function sumRows(map: Map<string, SummaryRow>, days: string[]): Sums {
  const s = { ...ZERO };
  for (const d of days) {
    const r = map.get(d);
    if (!r) continue;
    s.calls += n(r.calls);
    s.minutes += n(r.minutes);
    s.long += n(r.long_calls);
    s.incoming += n(r.incoming);
    s.outgoing += n(r.outgoing);
    s.leads += n(r.leads);
    s.offers += n(r.invited);
    s.deals += n(r.closed);
  }
  return s;
}

function addSums(a: Sums, b: Sums): Sums {
  return {
    calls: a.calls + b.calls, minutes: a.minutes + b.minutes, long: a.long + b.long,
    incoming: a.incoming + b.incoming, outgoing: a.outgoing + b.outgoing,
    leads: a.leads + b.leads, offers: a.offers + b.offers, deals: a.deals + b.deals,
  };
}

function daysFromTo(from: string, to: string): string[] {
  const len = dayDiff(from, to);
  return len < 0 ? [] : Array.from({ length: len + 1 }, (_, i) => addDays(from, i));
}

function toMap(rows: SummaryRow[] | null): Map<string, SummaryRow> {
  return new Map((Array.isArray(rows) ? rows : []).map((r) => [r.date, r]));
}

/* Joriy va oldingi davr kunlari (Toshkent). Oldingi davr — ayni nuqtagacha:
 * oxirgi (tengdosh) kunidan faqat "hozirgi soatgacha" qismi olinadi. */
function periodWindow(period: Period, today: string): { cur: string[]; prevFull: string[]; prevCut: string } {
  if (period === "day") return { cur: [today], prevFull: [], prevCut: addDays(today, -1) };
  if (period === "week") {
    const from = weekStart(today);
    const cur = daysFromTo(from, today);
    const prevFrom = addDays(from, -7);
    const prevCut = addDays(today, -7);
    return { cur, prevFull: daysFromTo(prevFrom, addDays(prevCut, -1)), prevCut };
  }
  const from = monthStart(today);
  const cur = daysFromTo(from, today);
  const prevCut = sameDayPrevMonth(today);
  return { cur, prevFull: daysFromTo(monthStart(prevCut), addDays(prevCut, -1)), prevCut };
}

/* Mini ustunlar va Dinamika uchun davr birliklari (eskidan yangiga). */
function units(period: Period, today: string, count: number): Array<{ key: string; days: string[] }> {
  if (period === "day") {
    return Array.from({ length: count }, (_, i) => {
      const d = addDays(today, i - (count - 1));
      return { key: d, days: [d] };
    });
  }
  if (period === "week") {
    const cur = weekStart(today);
    return Array.from({ length: count }, (_, i) => {
      const from = addDays(cur, (i - (count - 1)) * 7);
      const to = i === count - 1 ? today : addDays(from, 6);
      return { key: from, days: daysFromTo(from, to) };
    });
  }
  const ym = today.slice(0, 7);
  return Array.from({ length: count }, (_, i) => {
    const m = shiftMonth(ym, i - (count - 1));
    const from = `${m}-01`;
    const next = `${shiftMonth(m, 1)}-01`;
    const to = i === count - 1 ? today : addDays(next, -1);
    return { key: m, days: daysFromTo(from, to) };
  });
}

function historyDays(period: Period): number {
  // 14 ta birlik mini ustunlar uchun + joriy davr.
  if (period === "day") return 15;
  if (period === "week") return 14 * 7 + 7;
  return 430;
}

function pct(a: number, b: number): number | null {
  return b > 0 ? (a / b) * 100 : null;
}

function normalizeScore10(v: number | null | undefined): number | null {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= 0) return null;
  return x > 10 ? x / 10 : x;
}

/* Bugungi qo'ng'iroqlardan operator kesimi (faqat kunlik davr). */
function teamFromCalls(calls: CallRow[], names: Map<string, string>, longSec: number | null): TeamRow[] {
  const by = new Map<string, TeamRow & { scoreSum: number; scored: number; leadsSeen: boolean }>();
  for (const c of calls) {
    const ext = c.operator_ext?.trim() || null;
    const key = ext ?? c.manager_id ?? "—";
    let r = by.get(key);
    if (!r) {
      r = {
        key, ext, name: (c.manager_id && names.get(c.manager_id)) || null,
        calls: 0, longCalls: 0, incoming: 0, outgoing: 0, leads: 0, score10: null,
        scoreSum: 0, scored: 0, leadsSeen: false,
      };
      by.set(key, r);
    }
    r.calls += 1;
    if (longSec != null && n(c.duration) > longSec) r.longCalls += 1;
    if (c.direction === "incoming") r.incoming += 1;
    else if (c.direction === "outgoing") r.outgoing += 1;
    if (c.new_leads_count != null) {
      r.leadsSeen = true;
      r.leads = (r.leads ?? 0) + n(c.new_leads_count);
    }
    const s = normalizeScore10(c.kpi_score);
    if (s != null) {
      r.scoreSum += s;
      r.scored += 1;
    }
  }
  return [...by.values()].map(({ scoreSum, scored, leadsSeen, ...row }) => ({
    ...row,
    leads: leadsSeen ? row.leads : null,
    score10: scored ? Math.round((scoreSum / scored) * 10) / 10 : null,
  }));
}

async function fetchV1(period: Period, me: Me, locale: Locale, signal?: AbortSignal): Promise<AnalyticsData> {
  // Operator kesimi (jamoa jadvali, norma banneri) alohida so'rovda —
  // qo'ng'iroqlar ro'yxati og'ir, u sekinroq yangilanadi (fetchV1Team).
  const now = new Date();
  const today = tashkentToday(now);
  const cutoff = hmOf(now);
  const longSec = me.norms.longCallSec;
  const dailyNorm = me.norms.dailyLongCallsNorm;
  const win = periodWindow(period, today);
  const untilDays = dayDiff(win.prevCut, today) + 1;

  const [full, until, hourly] = await Promise.all([
    apiFetch<SummaryRow[]>(`/analytics/daily-summary?days=${historyDays(period)}`, { signal }),
    apiFetch<SummaryRow[]>(`/analytics/daily-summary?days=${untilDays}&until=${encodeURIComponent(cutoff)}`, { signal }).catch(() => null),
    period === "day" ? apiFetch<HourlyRow[]>(`/analytics/hourly?date=${today}`, { signal }).catch(() => null) : Promise.resolve(null),
  ]);

  const fullMap = toMap(full);
  const untilMap = toMap(until);
  const cur = sumRows(fullMap, win.cur);
  // Oldingi davr: to'liq kunlar + tengdosh kun "hozirgacha". `until`
  // bo'lmasa (eski server) — tengdosh kun to'liq, cutoff = null.
  const prevCutRow = until ? sumRows(untilMap, [win.prevCut]) : sumRows(fullMap, [win.prevCut]);
  const prev = addSums(sumRows(fullMap, win.prevFull), prevCutRow);
  const hasCutoff = !!until;

  // ---- Hero ustunlari
  let buckets: Bucket[] = [];
  let peak: AnalyticsData["peak"] = null;
  if (period === "day") {
    const rows = Array.isArray(hourly) ? hourly : [];
    const byHour = new Map(rows.map((r) => [n(r.hour), n(r.calls)]));
    const nowHour = tashkentHourOf(now);
    const first = [...byHour.entries()].filter(([, c]) => c > 0).map(([h]) => h).sort((a, b) => a - b)[0];
    if (first != null) {
      for (let h = first; h <= 23; h++) {
        buckets.push({
          key: String(h).padStart(2, "0"),
          count: h > nowHour ? null : (byHour.get(h) ?? 0),
          isCurrent: h === nowHour,
        });
      }
    }
  } else {
    const days = period === "week"
      ? daysFromTo(weekStart(today), addDays(weekStart(today), 6))
      : daysFromTo(monthStart(today), addDays(`${shiftMonth(today.slice(0, 7), 1)}-01`, -1));
    buckets = days.map((d) => ({
      key: d,
      count: d > today ? null : n(fullMap.get(d)?.calls),
      isCurrent: d === today,
    }));
  }
  for (const b of buckets) {
    if (b.count != null && b.count > 0 && (!peak || b.count > peak.count)) peak = { key: b.key, count: b.count };
  }

  // ---- 14 birlik: mini ustunlar; 12 birlik: Dinamika (kun: 14).
  const u14 = units(period, today, 14);
  const leadsSeries = u14.map((u) => ({ key: u.key, count: sumRows(fullMap, u.days).leads }));
  const offersSeries = u14.map((u) => ({ key: u.key, count: sumRows(fullMap, u.days).offers }));
  const dyn = units(period, today, period === "day" ? 14 : 12).map((u) => {
    const s = sumRows(fullMap, u.days);
    return { key: u.key, calls: s.calls, long: s.long, deals: s.deals };
  });

  return {
    period,
    today,
    range: { from: win.cur[0], to: today, cutoff: hasCutoff ? cutoff : null },
    labels: V1_LABELS[locale] ?? V1_LABELS.uz,
    norms: { longCallSec: longSec, dailyLongCallsNorm: dailyNorm, conversionTargetPct: null, targetScore10: me.norms.targetScore10 },
    lagging: null,
    total: { current: cur.calls, previous: prev.calls },
    buckets,
    talkSec: cur.minutes * 60,
    longCalls: cur.long,
    peak,
    leads: { current: cur.leads, previous: prev.leads, series: leadsSeries },
    offers: { current: cur.offers, previous: prev.offers, shareOfLeadsPct: pct(cur.offers, cur.leads), series: offersSeries },
    conversion: { pct: pct(cur.deals, cur.leads), previousPct: pct(prev.deals, prev.leads), leads: cur.leads, offers: cur.offers, deals: cur.deals },
    dynamics: dyn,
    funnel: [
      { stage: "calls", count: cur.calls },
      { stage: "long", count: cur.long },
      { stage: "leads", count: cur.leads },
      { stage: "offers", count: cur.offers },
      { stage: "deals", count: cur.deals },
    ],
    direction: { outgoing: cur.outgoing, incoming: cur.incoming },
    team: null,
    features: { amocrm: null },
    source: "v1",
  };
}


/* v1: operator kesimi — bugungi qo'ng'iroqlardan (faqat kunlik davr).
 * Ro'yxat og'ir bo'lgani uchun alohida so'rov va sekinroq yangilanadi. */
async function fetchV1Team(me: Me, signal?: AbortSignal): Promise<Pick<AnalyticsData, "team" | "lagging">> {
  const today = tashkentToday();
  const longSec = me.norms.longCallSec;
  const dailyNorm = me.norms.dailyLongCallsNorm;
  const [calls, managers] = await Promise.all([
    listAllCalls({ date: today }, signal),
    apiFetch<Array<{ id: string; name: string }>>("/managers", { signal }).catch(() => null),
  ]);
  const names = new Map((Array.isArray(managers) ? managers : []).map((m) => [m.id, m.name]));
  const team = teamFromCalls(calls, names, longSec);
  let lagging: AnalyticsData["lagging"] = null;
  if (dailyNorm != null && longSec != null) {
    const behind = team.filter((r) => r.calls > 0 && r.longCalls < dailyNorm).sort((a, b) => a.longCalls - b.longCalls);
    lagging = {
      count: behind.length,
      top: behind.slice(0, 3).map((r) => ({ ext: r.ext ?? r.name ?? r.key, longCalls: r.longCalls, normTarget: dailyNorm })),
    };
  }
  return { team, lagging };
}

async function fetchV2(period: Period, signal?: AbortSignal): Promise<AnalyticsData> {
  // Appendix A.3 (pages/analytics) kelgach shu yerda o'giriladi.
  const data = await apiFetch<Omit<AnalyticsData, "source">>(`/pages/analytics?period=${period}`, { signal, v2: true });
  return { ...data, source: "v2" };
}

export function analyticsKey(companyId: string | undefined, locale: Locale, period: Period) {
  return ["v2", companyId ?? "_", locale, "/pages/analytics", { period }] as const;
}

export function useAnalytics(period: Period) {
  const { data: me } = useMe();
  const locale = useLocale();
  const page = useQuery({
    queryKey: analyticsKey(me?.company.id, locale, period),
    queryFn: ({ signal }) => (API_V2 ? fetchV2(period, signal) : fetchV1(period, me!, locale, signal)),
    enabled: !!me,
    // Joriy davr "hozir"ni o'z ichiga oladi (§3.2): 15 s, fokusda yangilanadi.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    // SSE hali yo'q — faol sahifada 30 s da bir yangilanadi.
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
    meta: { persist: true, page: true },
  });
  // v1: operator kesimi alohida (faqat kunlik davrda ma'lum).
  const team = useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "analytics-team", tashkentToday()],
    queryFn: ({ signal }) => fetchV1Team(me!, signal),
    enabled: !!me && !API_V2 && period === "day",
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const merged: AnalyticsData | undefined =
    page.data && !API_V2 && page.data.period === "day"
      ? { ...page.data, team: team.data?.team ?? null, lagging: team.data?.lagging ?? null }
      : page.data;
  return {
    data: merged,
    isLoading: page.isLoading,
    isError: page.isError,
    error: page.error,
    isFetching: page.isFetching,
    isPlaceholderData: page.isPlaceholderData,
    refetch: page.refetch,
    teamLoading: !API_V2 && period === "day" && team.isLoading,
    teamError: !API_V2 && period === "day" && team.isError,
    refetchTeam: team.refetch,
  };
}

/* Menyu hover'ida va bo'sh vaqtda oldindan yuklash (§3.2). */
export function analyticsPrefetchFn(me: Me | undefined, locale: Locale) {
  return {
    queryKey: analyticsKey(me?.company.id, locale, "day"),
    queryFn: ({ signal }: { signal?: AbortSignal }) => (API_V2 ? fetchV2("day", signal) : fetchV1("day", me!, locale, signal)),
    staleTime: 15_000,
    meta: { persist: true, page: true },
  };
}

export { isoWeekday };
