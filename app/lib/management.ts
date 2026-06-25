"use client";

/* Executive "Boshqaruv paneli" — LIVE data layer.
 *
 * Everything here is derived from the real backend (procell-backend, :5001)
 * using the endpoints that already exist:
 *   GET /managers                 → sotuvchilar
 *   GET /managers/:id/stats       → yig'ma KPI (calls, avg kpi, duration, bonus, penalty)
 *   GET /api/calls?limit          → qo'ng'iroqlar jurnali (created_at bilan)
 *   GET /api/calls/:id            → konversiya bosqichlari (voronka uchun)
 *   GET /api/analyze-call/        → umumiy analitika (totalCalls, conversions, lost reasons)
 *
 * Statik demo dataset YO'Q. Kunlik/haftalik dinamika qo'ng'iroqlarning
 * `created_at` vaqtidan hisoblanadi; menejer ko'rsatkichlari stats'dan keladi.
 *
 * Backend hali bermaydigan maydonlar (kunlik reja maqsadi, ko'p platforma,
 * javobsiz/uzilgan sabablari, konversiya tarixi) — PROMPT_BACKEND_MANAGEMENT.md
 * da tavsiflangan; ular qo'shilguncha frontend xavfsiz proksi/standart bilan
 * ishlaydi (DEFAULT_DAILY_PLAN va h.k.). */

import type { Accent } from "../components/ui";
import { fetchCallAnalytics } from "./api";
import {
  listManagers,
  getManagerStats,
  listCalls,
  getCall,
  formatSeconds,
  type CallRow,
} from "./calls";

/* ---------- Sub-platforms / tenants ---------- */
export type PlatformId = string;

export interface Platform {
  id: PlatformId;
  name: string;
  tagline: string;
  initials: string;
  accent: Accent;
}

/* Backend hali ko'p platformani bermaydi — bitta jonli workspace. Backend
 * `GET /api/management/platforms` qo'shgach, fetchPlatforms() ro'yxatni jonli
 * to'ldiradi va almashtirgich avtomatik ko'p platformani ko'rsatadi. */
const LIVE_PLATFORM: Platform = {
  id: "live",
  name: "Procell Core",
  tagline: "Jonli backend",
  initials: "PC",
  accent: "indigo",
};

/* ---------- Types (UI shu shaklni kutadi) ---------- */
export interface ComparisonMetric {
  key: string;
  label: string;
  today: number;
  yesterday: number;
  week: number;
  lastWeek: number;
  unit: string;
  spark: number[];
  lowerIsBetter: boolean;
}

export interface TimeBucket {
  range: string;
  calls: number;
  share: number;
  accent: Accent;
}

export interface HealthMetric {
  key: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  accent: Accent;
  icon: string;
  spark: number[];
}

export interface StrategicTrend {
  label: string;
  value: string;
  sub: string;
  growth: number;
  spark: number[];
  accent: Accent;
  lowerIsBetter?: boolean;
}

export interface SellerKPI {
  id: string;
  name: string;
  role: string;
  status: "online" | "away" | "offline";
  calls: number;
  avgDuration: string;
  score: number;
  planTarget: number;
  planDone: number;
  bonus: number;
  penalty: number;
}

export interface FunnelStage {
  label: string;
  value: number;
  hint: string;
}

export interface PlatformData {
  comparison: ComparisonMetric[];
  timeBuckets: TimeBucket[];
  general: HealthMetric[];
  strategic: StrategicTrend[];
  sellers: SellerKPI[];
  funnel: FunnelStage[];
}

/* Backend hali kunlik reja maqsadini bermaydi — vaqtincha standart.
 * PROMPT_BACKEND_MANAGEMENT.md: managers.daily_call_target qo'shilsin. */
const DEFAULT_DAILY_PLAN = 20;

/* ---------- Formatting helpers ---------- */
const SOM = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 });

export function formatSom(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} mln so'm`;
  return `${SOM.format(n)} so'm`;
}

export function pctChange(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/* ---------- Day bucketing (last 14 calendar days) ---------- */
interface DayBucket {
  count: number;
  kpiSum: number;
  durSum: number;
  low: number; // kpi < 50
  penalized: number; // penalty_amount > 0
  short: number; // duration < 60s
  bonus: number;
  penalty: number;
}

function emptyDay(): DayBucket {
  return { count: 0, kpiSum: 0, durSum: 0, low: 0, penalized: 0, short: 0, bonus: 0, penalty: 0 };
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** days[0] = today, days[1] = yesterday … days[13] = 13 days ago. */
function buildDays(calls: CallRow[]): DayBucket[] {
  const days: DayBucket[] = Array.from({ length: 14 }, emptyDay);
  const sToday = startOfDay(new Date());
  for (const c of calls) {
    const t = new Date(c.created_at).getTime();
    if (Number.isNaN(t)) continue;
    const idx = Math.floor((sToday - startOfDay(new Date(t))) / 86_400_000);
    if (idx < 0 || idx >= 14) continue;
    const b = days[idx];
    b.count += 1;
    b.kpiSum += Number(c.kpi_score) || 0;
    b.durSum += Number(c.duration) || 0;
    if ((Number(c.kpi_score) || 0) < 50) b.low += 1;
    if ((Number(c.penalty_amount) || 0) > 0) b.penalized += 1;
    if ((Number(c.duration) || 0) < 60) b.short += 1;
    b.bonus += Number(c.bonus_amount) || 0;
    b.penalty += Number(c.penalty_amount) || 0;
  }
  return days;
}

type Sel = (d: DayBucket) => number;
const sum = (days: DayBucket[], sel: Sel, from: number, to: number) => {
  let s = 0;
  for (let i = from; i < to; i++) s += sel(days[i]);
  return s;
};
/** Chronological 7-day series (oldest → today) for sparklines. */
const spark = (days: DayBucket[], sel: Sel): number[] => {
  const a: number[] = [];
  for (let i = 6; i >= 0; i--) a.push(sel(days[i]));
  return a;
};
const avgSpark = (days: DayBucket[], s: Sel, c: Sel): number[] => {
  const a: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const n = c(days[i]);
    a.push(n ? s(days[i]) / n : 0);
  }
  return a;
};

function deltaPct(cur: number, prev: number): { delta: string; trend: "up" | "down" } {
  const p = pctChange(cur, prev);
  return { delta: `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`, trend: p >= 0 ? "up" : "down" };
}

/* Normalise a conversion value that may arrive as a ratio (0.35) or a
 * percentage (35) into a 0–1 ratio. */
function asRatio(v: number | undefined | null): number {
  const n = Number(v) || 0;
  return n > 1 ? n / 100 : n;
}

/* ---------- Platforms ---------- */
export async function fetchPlatforms(): Promise<Platform[]> {
  // Backend ko'p platforma endpointini bergach shu yerda jonli yuklanadi.
  return [LIVE_PLATFORM];
}

/* ---------- Time-of-day buckets ---------- */
const HOUR_BUCKETS: { range: string; from: number; to: number; accent: Accent }[] = [
  { range: "09:00–12:00", from: 9, to: 12, accent: "indigo" },
  { range: "12:00–15:00", from: 12, to: 15, accent: "cyan" },
  { range: "15:00–18:00", from: 15, to: 18, accent: "emerald" },
  { range: "18:00–21:00", from: 18, to: 21, accent: "violet" },
];

function buildTimeBuckets(calls: CallRow[]): TimeBucket[] {
  const counts = HOUR_BUCKETS.map(() => 0);
  for (const c of calls) {
    const d = new Date(c.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const h = d.getHours();
    const i = HOUR_BUCKETS.findIndex((b) => h >= b.from && h < b.to);
    if (i >= 0) counts[i] += 1;
  }
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return HOUR_BUCKETS.map((b, i) => ({
    range: b.range,
    calls: counts[i],
    share: Math.round((counts[i] / total) * 100),
    accent: b.accent,
  }));
}

/* ---------- Sales funnel (from conversion stages) ---------- */
function buildFunnel(
  totalCalls: number,
  avgStages: { r12: number; r23: number; r34: number },
  salesConv: number,
  trafficConv: number
): FunnelStage[] {
  const leads = Math.max(totalCalls, 0);
  if (!leads) return [];

  // Stage ratios mavjud bo'lsa — to'liq 5 bosqichli voronka.
  if (avgStages.r12 || avgStages.r23 || avgStages.r34) {
    const s2 = Math.round(leads * (avgStages.r12 || 1));
    const s3 = Math.round(s2 * (avgStages.r23 || 1));
    const s4 = Math.round(s3 * (avgStages.r34 || 1));
    const closed = salesConv ? Math.round(leads * salesConv) : Math.round(s4 * 0.6);
    return [
      { label: "Kiruvchi lidlar", value: leads, hint: "Barcha qo'ng'iroqlar" },
      { label: "Malakalangan", value: s2, hint: "1→2 bosqich" },
      { label: "Taklif yuborilgan", value: s3, hint: "2→3 bosqich" },
      { label: "Muzokara", value: s4, hint: "3→4 bosqich" },
      { label: "Yopilgan bitim", value: Math.min(closed, s4), hint: "Won" },
    ];
  }

  // Aks holda — analitikaning trafik/sotuv konversiyasidan 3 bosqich.
  const qualified = Math.round(leads * (trafficConv || 0.5));
  const closed = Math.round(leads * (salesConv || 0.2));
  return [
    { label: "Kiruvchi lidlar", value: leads, hint: "Barcha qo'ng'iroqlar" },
    { label: "Malakalangan", value: qualified, hint: "Trafik konversiyasi" },
    { label: "Yopilgan bitim", value: closed, hint: "Sotuv konversiyasi" },
  ];
}

/* ---------- Seller status mapping ---------- */
const STATUS_MAP: Record<string, { status: SellerKPI["status"]; role: string }> = {
  active: { status: "online", role: "Faol menejer" },
  on_leave: { status: "away", role: "Ta'tilda" },
  flagged: { status: "away", role: "Bayroqli" },
  inactive: { status: "offline", role: "Faol emas" },
};

/* ============================================================
 * MAIN AGGREGATOR — bitta marta hammasini jonli yig'adi.
 * ============================================================ */
export async function fetchManagementData(
  _platformId: PlatformId,
  signal?: AbortSignal
): Promise<PlatformData> {
  // _platformId backend platforma filtrini bergach query'ga uzatiladi.
  const [analytics, managers, calls] = await Promise.all([
    fetchCallAnalytics(signal).catch(() => null),
    listManagers(signal).catch(() => []),
    listCalls({ limit: 1000 }, signal).catch(() => [] as CallRow[]),
  ]);

  const stats = await Promise.all(
    managers.map((m) => getManagerStats(m.id, signal).catch(() => null))
  );

  // Voronka bosqich nisbatlari — so'nggi qo'ng'iroqlardan namuna olib o'rtachalaymiz.
  const sampleIds = calls.slice(0, 6).map((c) => c.id);
  const details = await Promise.all(sampleIds.map((id) => getCall(id, signal).catch(() => null)));
  const convs = details.map((d) => d?.conversions).filter(Boolean) as NonNullable<
    Awaited<ReturnType<typeof getCall>>["conversions"]
  >[];
  const avgStage = (k: "stage_1_to_2" | "stage_2_to_3" | "stage_3_to_4") =>
    convs.length ? convs.reduce((s, c) => s + asRatio(c[k]), 0) / convs.length : 0;

  const days = buildDays(calls);

  /* ----- Comparison (Sabablarsiz munosabatlar dinamikasi) ----- */
  const comparison: ComparisonMetric[] = [
    {
      key: "low",
      label: "Past sifatli aloqalar",
      today: days[0].low,
      yesterday: days[1].low,
      week: sum(days, (d) => d.low, 0, 7),
      lastWeek: sum(days, (d) => d.low, 7, 14),
      unit: "",
      spark: spark(days, (d) => d.low),
      lowerIsBetter: true,
    },
    {
      key: "penalized",
      label: "Jarima olingan holatlar",
      today: days[0].penalized,
      yesterday: days[1].penalized,
      week: sum(days, (d) => d.penalized, 0, 7),
      lastWeek: sum(days, (d) => d.penalized, 7, 14),
      unit: "",
      spark: spark(days, (d) => d.penalized),
      lowerIsBetter: true,
    },
    {
      key: "short",
      label: "Qisqa uzilgan aloqalar",
      today: days[0].short,
      yesterday: days[1].short,
      week: sum(days, (d) => d.short, 0, 7),
      lastWeek: sum(days, (d) => d.short, 7, 14),
      unit: "",
      spark: spark(days, (d) => d.short),
      lowerIsBetter: true,
    },
  ];

  /* ----- Time buckets (Vaqt intervallari tahlili) ----- */
  const timeBuckets = buildTimeBuckets(calls);

  /* ----- General (Umumiy) ----- */
  const activeCount = managers.filter((m) => m.status === "active").length;
  const todayCalls = days[0].count;
  const avgKpiToday = days[0].count ? days[0].kpiSum / days[0].count : 0;
  const avgKpiYest = days[1].count ? days[1].kpiSum / days[1].count : 0;
  const avgDurToday = days[0].count ? days[0].durSum / days[0].count : 0;
  const avgDurYest = days[1].count ? days[1].durSum / days[1].count : 0;

  const callsDelta = deltaPct(todayCalls, days[1].count);
  const kpiDelta = deltaPct(avgKpiToday, avgKpiYest);
  const durDelta = deltaPct(avgDurToday, avgDurYest);

  const general: HealthMetric[] = [
    {
      key: "calls",
      label: "Bugungi qo'ng'iroqlar",
      value: todayCalls.toLocaleString(),
      delta: callsDelta.delta,
      trend: callsDelta.trend,
      accent: "cyan",
      icon: "phone",
      spark: spark(days, (d) => d.count),
    },
    {
      key: "score",
      label: "O'rtacha sifat bahosi",
      value: avgKpiToday ? avgKpiToday.toFixed(1) : "—",
      delta: kpiDelta.delta,
      trend: kpiDelta.trend,
      accent: "emerald",
      icon: "shield",
      spark: avgSpark(days, (d) => d.kpiSum, (d) => d.count),
    },
    {
      key: "duration",
      label: "O'rtacha davomiylik",
      value: avgDurToday ? formatSeconds(avgDurToday) : "—",
      delta: durDelta.delta,
      trend: durDelta.trend,
      accent: "violet",
      icon: "clock",
      spark: avgSpark(days, (d) => d.durSum, (d) => d.count),
    },
    {
      key: "active",
      label: "Faol menejerlar",
      value: `${activeCount} / ${managers.length}`,
      delta: `${managers.length} jami`,
      trend: "up",
      accent: "indigo",
      icon: "users",
      spark: spark(days, (d) => d.count),
    },
  ];

  /* ----- Strategic (Yirik ma'lumotlar) ----- */
  const weekCalls = sum(days, (d) => d.count, 0, 7);
  const lastWeekCalls = sum(days, (d) => d.count, 7, 14);
  const weekKpi = weekCalls ? sum(days, (d) => d.kpiSum, 0, 7) / weekCalls : 0;
  const lastWeekKpi = lastWeekCalls ? sum(days, (d) => d.kpiSum, 7, 14) / lastWeekCalls : 0;
  const weekBonus = sum(days, (d) => d.bonus, 0, 7);
  const lastWeekBonus = sum(days, (d) => d.bonus, 7, 14);
  const weekPenalty = sum(days, (d) => d.penalty, 0, 7);
  const lastWeekPenalty = sum(days, (d) => d.penalty, 7, 14);

  const strategic: StrategicTrend[] = [
    {
      label: "Haftalik qo'ng'iroqlar",
      value: weekCalls.toLocaleString(),
      sub: "so'nggi 7 kun",
      growth: pctChange(weekCalls, lastWeekCalls),
      spark: spark(days, (d) => d.count),
      accent: "indigo",
    },
    {
      label: "O'rtacha sifat bahosi",
      value: weekKpi ? weekKpi.toFixed(1) : "—",
      sub: "KPI / 100",
      growth: pctChange(weekKpi, lastWeekKpi),
      spark: avgSpark(days, (d) => d.kpiSum, (d) => d.count),
      accent: "emerald",
    },
    {
      label: "Bonus fondi",
      value: formatSom(weekBonus),
      sub: "so'nggi 7 kun",
      growth: pctChange(weekBonus, lastWeekBonus),
      spark: spark(days, (d) => d.bonus),
      accent: "cyan",
    },
    {
      label: "Jarimalar hajmi",
      value: formatSom(weekPenalty),
      sub: "so'nggi 7 kun",
      growth: pctChange(weekPenalty, lastWeekPenalty),
      spark: spark(days, (d) => d.penalty),
      accent: "violet",
      lowerIsBetter: true,
    },
  ];

  /* ----- ROP sellers ----- */
  const todayByManager = new Map<string, number>();
  const sToday = startOfDay(new Date());
  for (const c of calls) {
    const t = new Date(c.created_at).getTime();
    if (!Number.isNaN(t) && startOfDay(new Date(t)) === sToday) {
      todayByManager.set(c.manager_id, (todayByManager.get(c.manager_id) ?? 0) + 1);
    }
  }

  const sellers: SellerKPI[] = managers
    .map((m, i) => {
      const st = stats[i];
      const map = STATUS_MAP[m.status] ?? { status: "offline" as const, role: "Menejer" };
      return {
        id: m.id,
        name: m.name,
        role: map.role,
        status: map.status,
        calls: st?.total_calls ?? 0,
        avgDuration: formatSeconds(st?.avg_duration_sec ?? 0),
        score: Math.round(st?.avg_kpi_score ?? 0),
        planTarget: DEFAULT_DAILY_PLAN,
        planDone: todayByManager.get(m.id) ?? 0,
        bonus: st?.total_bonus ?? 0,
        penalty: st?.total_penalty ?? 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  /* ----- Funnel ----- */
  const totalCalls = analytics?.totalCalls ?? calls.length;
  const funnel = buildFunnel(
    totalCalls,
    { r12: avgStage("stage_1_to_2"), r23: avgStage("stage_2_to_3"), r34: avgStage("stage_3_to_4") },
    asRatio(analytics?.averages?.sales_conversion),
    asRatio(analytics?.averages?.traffic_conversion)
  );

  return { comparison, timeBuckets, general, strategic, sellers, funnel };
}
