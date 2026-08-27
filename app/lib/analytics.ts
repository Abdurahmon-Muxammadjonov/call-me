"use client";

/* "Analitika" sahifasining data-layer'i (ilgari "Umumiy ko'rinish").
 *
 * Yondashuv — loyihada allaqachon o'rnatilgan konventsiyaga amal qiladi
 * (qarang app/lib/management.ts): backend hozircha `period` query parametrini
 * qo'llab-quvvatlamaydi, shuning uchun Kunlik/Haftalik/Oylik tugmasi bosilganda
 * qayta so'rov yubormaymiz — bir marta xom qo'ng'iroqlar ro'yxatini olib,
 * tanlangan davr oynasiga qarab CLIENT-side qayta hisoblaymiz.
 *
 * Bundan mustasno — GET /analytics/overview (fetchPopStats) allaqachon
 * backend tomonida kunlik/haftalik/oylik agregatsiya qiladi ("Jami
 * qo'ng'iroqlar" kartasi shundan real current/previous/change_pct oladi).
 *
 * Bir qator maydon (kiruvchi/chiquvchi soni, yangi lid, avtosalonga
 * yuborilgan, yopilgan bitim, sozlanuvchi norma) hali `calls` jadvalida
 * saqlanmaydi — CallRow'da ixtiyoriy (`?`) sifatida e'lon qilingan.
 * Ular yo'q bo'lsa, tegishli widget FABRIKATSIYA qilingan raqam o'rniga
 * halol bo'sh holatni ko'rsatadi. Backend ularni qo'sha boshlagach, bu fayl
 * o'zgarishsiz jonli ma'lumotni ko'rsata boshlaydi. Qarang: PROMPT_BACKEND_ANALITIKA.md */

import { accentForId, initialsOf, type Accent } from "../components/ui";
import { fetchCallAnalytics, fetchPopStats, type CallAnalytics, type PopBlock, type PopStats } from "./api";
import { listCalls, listManagers, getCall, type CallDetail, type CallRow, type Manager, type Conversions } from "./calls";

export type Period = "day" | "week" | "month";

/* ---------- Norma chegaralari ----------
 * Backend hali `company_settings` (yoki shunga o'xshash) jadvalida
 * kompaniya bo'yicha sozlanuvchi norma qaytarmaydi — shuning uchun
 * standart qiymatlar shu yerda, `management.ts`dagi DEFAULT_DAILY_PLAN
 * bilan bir xil naqshda. Backend qo'shgach, bu konstantalar o'sha
 * qiymatlar bilan almashtiriladi (frontend tomoni allaqachon shunga tayyor
 * — qarang fetchAnalyticsData'ning `norms` argumenti). */
export interface AnalyticsNorms {
  /* "Uzun" (malakali) qo'ng'iroq deb hisoblanadigan minimal davomiylik (soniya). */
  qualifiedCallSeconds: number;
  /* Har davr uchun minimal "uzun" qo'ng'iroqlar soni — shundan kam bo'lsa
   * xodim "norma ostida" deb belgilanadi. */
  minQualifiedCalls: Record<Period, number>;
  /* Minimal o'rtacha sifat bahosi (0–100) — shundan kam bo'lsa ham
   * "norma ostida" belgisi qo'yiladi. */
  minEfficiencyScore: number;
}

export const DEFAULT_NORMS: AnalyticsNorms = {
  qualifiedCallSeconds: 60,
  minQualifiedCalls: { day: 40, week: 160, month: 640 },
  minEfficiencyScore: 50,
};

export const PERIOD_LABEL: Record<Period, string> = {
  day: "Kunlik",
  week: "Haftalik",
  month: "Oylik",
};

/* ---------- Umumiy tur yordamchilari ---------- */
export interface PeriodStat {
  value: number;
  /* null — davr ichida taqqoslash uchun yetarli ma'lumot yo'q (masalan,
   * oldingi davrda 0 ta qo'ng'iroq bo'lsa). */
  changePct: number | null;
  spark: number[];
}

/* Bironta widget uchun umuman ma'lumot yo'q bo'lsa (backend hali maydonni
 * bermaydi) — butun stat `null` bo'ladi, komponent bo'sh holatni chizadi. */
export type MaybeStat = PeriodStat | null;

export interface FunnelStage {
  label: string;
  value: number;
  hint: string;
}

export interface KpiAlert {
  employeeId: string;
  employeeName: string;
  reason: string;
}

export interface EmployeeAnalytics {
  id: string;
  name: string;
  initials: string;
  accent: Accent;
  /* null — bu davrda xodimning hech qanday qo'ng'irog'i yo'q. */
  efficiency: number | null;
  spark: number[];
  outgoing: number | null;
  incoming: number | null;
  newLeads: number | null;
  sales: number | null;
  callCount: number;
  qualifiedCalls: number;
  belowNorm: boolean;
  belowNormReason: string | null;
}

export interface AnalyticsData {
  period: Period;
  totalCalls: PeriodStat;
  newLeads: MaybeStat;
  sentToDealer: MaybeStat;
  conversion: PeriodStat;
  saleToClosedPct: number | null;
  incoming: number | null;
  outgoing: number | null;
  didntAnswer: MaybeStat;
  poorLead: MaybeStat;
  funnel: FunnelStage[];
  employees: EmployeeAnalytics[];
  alerts: KpiAlert[];
  norms: AnalyticsNorms;
}

/* ---------- Kun-oynasi asosidagi kesh (management.ts bilan bir xil naqsh) ---------- */
interface DayBucket {
  count: number;
  kpiSum: number;
  incoming: number;
  outgoing: number;
  newLeads: number;
  sentToDealer: number;
  closedDeals: number;
  unanswered: number;
  badLeads: number;
  qualified: number;
  hasIncomingData: boolean;
  hasNewLeadData: boolean;
  hasDealerData: boolean;
  hasUnansweredData: boolean;
  hasBadLeadData: boolean;
}

function emptyDay(): DayBucket {
  return {
    count: 0,
    kpiSum: 0,
    incoming: 0,
    outgoing: 0,
    newLeads: 0,
    sentToDealer: 0,
    closedDeals: 0,
    unanswered: 0,
    badLeads: 0,
    qualified: 0,
    hasIncomingData: false,
    hasNewLeadData: false,
    hasDealerData: false,
    hasUnansweredData: false,
    hasBadLeadData: false,
  };
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const DAY_MS = 86_400_000;
/* Oylik oyna + oldingi oyni ham qamrab olishi uchun 61 kunlik tarix yetarli. */
const HISTORY_DAYS = 61;

function buildDays(calls: CallRow[], norms: AnalyticsNorms): DayBucket[] {
  const days: DayBucket[] = Array.from({ length: HISTORY_DAYS }, emptyDay);
  const sToday = startOfDay(new Date());
  for (const c of calls) {
    const t = new Date(c.created_at).getTime();
    if (Number.isNaN(t)) continue;
    const idx = Math.floor((sToday - startOfDay(new Date(t))) / DAY_MS);
    if (idx < 0 || idx >= HISTORY_DAYS) continue;
    const b = days[idx];
    b.count += 1;
    b.kpiSum += Number(c.kpi_score) || 0;
    if ((Number(c.duration) || 0) >= norms.qualifiedCallSeconds) b.qualified += 1;
    if (c.incoming_count != null || c.outgoing_count != null) {
      b.hasIncomingData = true;
      b.incoming += Number(c.incoming_count) || 0;
      b.outgoing += Number(c.outgoing_count) || 0;
    }
    if (c.new_leads_count != null) {
      b.hasNewLeadData = true;
      b.newLeads += Number(c.new_leads_count) || 0;
    }
    if (c.sent_to_dealer_count != null) {
      b.hasDealerData = true;
      b.sentToDealer += Number(c.sent_to_dealer_count) || 0;
    }
    if (c.closed_deals_count != null) {
      b.closedDeals += Number(c.closed_deals_count) || 0;
    }
    if (c.unanswered_count != null) {
      b.hasUnansweredData = true;
      b.unanswered += Number(c.unanswered_count) || 0;
    }
    if (c.bad_leads_count != null) {
      b.hasBadLeadData = true;
      b.badLeads += Number(c.bad_leads_count) || 0;
    }
  }
  return days;
}

type Sel = (d: DayBucket) => number;
function sumRange(days: DayBucket[], sel: Sel, from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i++) s += sel(days[i]);
  return s;
}
function anyFlag(days: DayBucket[], sel: (d: DayBucket) => boolean, from: number, to: number): boolean {
  for (let i = from; i < to; i++) if (sel(days[i])) return true;
  return false;
}
/** Kronologik 7 kunlik seriya (eskisi → bugun) — sparklinelar uchun. */
function spark7(days: DayBucket[], sel: Sel): number[] {
  const a: number[] = [];
  for (let i = 6; i >= 0; i--) a.push(sel(days[i]));
  return a;
}
function avgSpark7(days: DayBucket[], sum: Sel, count: Sel): number[] {
  const a: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const n = count(days[i]);
    a.push(n ? sum(days[i]) / n : 0);
  }
  return a;
}

/* [from, to) kun-indeks oralig'i — 0 = bugun. */
function windowFor(period: Period): { cur: [number, number]; prev: [number, number] } {
  if (period === "day") return { cur: [0, 1], prev: [1, 2] };
  if (period === "week") return { cur: [0, 7], prev: [7, 14] };
  return { cur: [0, 30], prev: [30, 60] };
}

/** `created_at` [dayFrom, dayTo) kun-indeks oralig'iga tushgan qo'ng'iroqlar. */
function callsInWindow(calls: CallRow[], dayFrom: number, dayTo: number): CallRow[] {
  const sToday = startOfDay(new Date());
  return calls.filter((c) => {
    const t = new Date(c.created_at).getTime();
    if (Number.isNaN(t)) return false;
    const idx = Math.floor((sToday - startOfDay(new Date(t))) / DAY_MS);
    return idx >= dayFrom && idx < dayTo;
  });
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

/* Ratio 0–1 yoki 0–100 shaklida kelishi mumkin — 0–1 ga normallashtiramiz. */
function asRatio(v: number | undefined | null): number {
  const n = Number(v) || 0;
  return n > 1 ? n / 100 : n;
}

/* ---------- Voronka — bir davr oynasi uchun namunadan konversiya nisbatlari -----
 * `getCall` natijalari module-darajasida keshlanadi: Kunlik/Haftalik/Oylik
 * oynalari ko'p hollarda bir xil so'nggi qo'ng'iroqlarni qamrab oladi
 * (masalan bugungi qo'ng'iroqlar hafta va oy oynasida ham bor), shuning
 * uchun davr almashtirilganda aksariyat namuna keshdan keladi — qayta
 * tarmoq so'rovi yubormaydi. Sahifa umrini oshirib ketmasligi uchun
 * hajmi ~2000 qo'ng'iroqning namunaviy qismi bilan chegaralangan holda
 * qoladi (real jamoada bir necha yuzta yozuv, ahamiyatsiz xotira). */
const callDetailCache = new Map<string, CallDetail | null>();
async function getCallCached(id: string, signal?: AbortSignal): Promise<CallDetail | null> {
  const cached = callDetailCache.get(id);
  if (cached !== undefined) return cached;
  const detail = await getCall(id, signal).catch(() => null);
  callDetailCache.set(id, detail);
  return detail;
}

async function sampleFunnelRatios(
  calls: CallRow[],
  signal: AbortSignal | undefined,
  sampleSize: number
): Promise<{ r12: number; r23: number; r34: number } | null> {
  const sample = calls.slice(0, sampleSize);
  if (!sample.length) return null;
  // `conversions` allaqachon ro'yxat qatorida bo'lsa (backend qo'shsa),
  // hech qanday qo'shimcha so'rov kerak emas — faqat yo'q bo'lgan
  // qo'ng'iroqlar uchun (keshlangan) GET /api/calls/:id ga boramiz.
  const convs = (
    await Promise.all(
      sample.map(async (c) => {
        if (c.conversions) return c.conversions;
        const detail = await getCallCached(c.id, signal);
        return detail?.conversions ?? null;
      })
    )
  ).filter(Boolean) as Conversions[];
  if (!convs.length) return null;
  const avg = (k: "stage_1_to_2" | "stage_2_to_3" | "stage_3_to_4") =>
    convs.reduce((s, c) => s + asRatio(c[k]), 0) / convs.length;
  return { r12: avg("stage_1_to_2"), r23: avg("stage_2_to_3"), r34: avg("stage_3_to_4") };
}

function buildFunnel(leadCount: number, ratios: { r12: number; r23: number; r34: number } | null): FunnelStage[] {
  if (!leadCount || !ratios) return [];
  const contact = Math.round(leadCount * (ratios.r12 || 0.6));
  const offer = Math.round(contact * (ratios.r23 || 0.5));
  const deal = Math.round(offer * (ratios.r34 || 0.4));
  return [
    { label: "Yangi lid", value: leadCount, hint: "Barcha kiruvchi lidlar" },
    { label: "Aloqa", value: Math.min(contact, leadCount), hint: "Bog'lanish o'rnatildi" },
    { label: "Taklif", value: Math.min(offer, contact), hint: "Taklif yuborildi" },
    { label: "Kelishuv", value: Math.min(deal, offer), hint: "Yopilgan bitim" },
  ];
}

/* ============================================================
 * MA'LUMOT OLISH vs HISOBLASH — ikkiga ajratilgan.
 *
 * Avval bu ikkisi bitta funksiyada birlashgan edi va Kunlik/Haftalik/Oylik
 * tugmasi bosilganda HAR SAFAR to'liq qayta ishga tushardi: 2000 tagacha
 * qo'ng'iroq, menejerlar, PoP statistikasi, umumiy analitika — va ustiga
 * voronka namunasi uchun yana o'ndan ortiq alohida `getCall` so'rovi.
 * `fetchPopStats` esa allaqachon kunlik/haftalik/oylik BARCHASINI bitta
 * javobda qaytaradi — demak davr almashtirilganda bu og'ir picha qayta
 * yuklanishi shart emas edi, shu sahifa "qotib qolgandek" tuyulishining
 * asosiy sababi shu edi.
 *
 * Endi: `fetchAnalyticsRaw()` faqat bir marta (yuklanganda / real real-time
 * o'zgarishda) chaqiriladi; `computeAnalyticsData()` esa davr almashtirilganda
 * xotiradagi xom ma'lumotdan hisoblaydi — tarmoqqa faqat voronka namunasi
 * uchun boradi, u ham `getCallCached` orqali ko'p hollarda keshdan keladi. */
export interface AnalyticsRaw {
  calls: CallRow[];
  managers: Manager[];
  pop: PopStats | null;
  analytics: CallAnalytics | null;
}

export async function fetchAnalyticsRaw(signal?: AbortSignal): Promise<AnalyticsRaw> {
  const [calls, managers, pop, analytics] = await Promise.all([
    listCalls({ limit: 2000 }, signal),
    listManagers(signal).catch(() => [] as Manager[]),
    fetchPopStats(null, signal).catch(() => null),
    fetchCallAnalytics(signal).catch(() => null),
  ]);
  return { calls, managers, pop, analytics };
}

export async function computeAnalyticsData(
  raw: AnalyticsRaw,
  period: Period,
  signal?: AbortSignal,
  norms: AnalyticsNorms = DEFAULT_NORMS
): Promise<AnalyticsData> {
  const { calls, managers, pop, analytics } = raw;

  const days = buildDays(calls, norms);
  const { cur, prev } = windowFor(period);
  const [curFrom, curTo] = cur;
  const [prevFrom, prevTo] = prev;

  const curCalls = callsInWindow(calls, curFrom, curTo);

  /* ----- Jami qo'ng'iroqlar — backend PoP'dan (real, davr-boshqarilgan) ----- */
  const popBlock: PopBlock | null = pop ? pop[period === "day" ? "daily" : period === "week" ? "weekly" : "monthly"] : null;
  const totalCalls: PeriodStat = {
    value: popBlock?.calls.current ?? sumRange(days, (d) => d.count, curFrom, curTo),
    changePct: popBlock ? popBlock.calls.change_pct : pctChange(sumRange(days, (d) => d.count, curFrom, curTo), sumRange(days, (d) => d.count, prevFrom, prevTo)),
    spark: spark7(days, (d) => d.count),
  };

  /* ----- Yangi lidlar / Avtosalonga yuborildi / Lid ko'tarmadi / Sifatsiz lid -----
   * Faqat kamida bitta qo'ng'iroqda tegishli maydon kelgan bo'lsa hisoblanadi —
   * aks holda backend hali bermayapti, `null` qaytariladi (fabrikatsiya yo'q). */
  const hasNewLeadData = anyFlag(days, (d) => d.hasNewLeadData, curFrom, HISTORY_DAYS);
  const newLeads: MaybeStat = hasNewLeadData
    ? {
        value: sumRange(days, (d) => d.newLeads, curFrom, curTo),
        changePct: pctChange(sumRange(days, (d) => d.newLeads, curFrom, curTo), sumRange(days, (d) => d.newLeads, prevFrom, prevTo)),
        spark: spark7(days, (d) => d.newLeads),
      }
    : null;

  const hasDealerData = anyFlag(days, (d) => d.hasDealerData, curFrom, HISTORY_DAYS);
  const sentToDealer: MaybeStat = hasDealerData
    ? {
        value: sumRange(days, (d) => d.sentToDealer, curFrom, curTo),
        changePct: pctChange(sumRange(days, (d) => d.sentToDealer, curFrom, curTo), sumRange(days, (d) => d.sentToDealer, prevFrom, prevTo)),
        spark: spark7(days, (d) => d.sentToDealer),
      }
    : null;

  const hasUnansweredData = anyFlag(days, (d) => d.hasUnansweredData, curFrom, HISTORY_DAYS);
  const didntAnswer: MaybeStat = hasUnansweredData
    ? {
        value: sumRange(days, (d) => d.unanswered, curFrom, curTo),
        changePct: pctChange(sumRange(days, (d) => d.unanswered, curFrom, curTo), sumRange(days, (d) => d.unanswered, prevFrom, prevTo)),
        spark: spark7(days, (d) => d.unanswered),
      }
    : null;

  const hasBadLeadData = anyFlag(days, (d) => d.hasBadLeadData, curFrom, HISTORY_DAYS);
  const poorLead: MaybeStat = hasBadLeadData
    ? {
        value: sumRange(days, (d) => d.badLeads, curFrom, curTo),
        changePct: pctChange(sumRange(days, (d) => d.badLeads, curFrom, curTo), sumRange(days, (d) => d.badLeads, prevFrom, prevTo)),
        spark: spark7(days, (d) => d.badLeads),
      }
    : null;

  /* ----- Kiruvchi vs Chiquvchi (donut) ----- */
  const hasIncomingData = anyFlag(days, (d) => d.hasIncomingData, curFrom, curTo);
  const incoming = hasIncomingData ? sumRange(days, (d) => d.incoming, curFrom, curTo) : null;
  const outgoing = hasIncomingData ? sumRange(days, (d) => d.outgoing, curFrom, curTo) : null;

  /* ----- Voronka + Konversiya (Lid→Bitim / Sotuv→Yopilgan) -----
   * Joriy va oldingi oyna uchun namunadan konversiya nisbatlarini olamiz —
   * ManagementView'dagi SalesFunnel bilan bir xil yondashuv. */
  const [curRatios, prevRatios] = await Promise.all([
    sampleFunnelRatios(curCalls, signal, 6),
    sampleFunnelRatios(callsInWindow(calls, prevFrom, prevTo), signal, 4),
  ]);

  const fallbackRatios = analytics
    ? { r12: 0.6, r23: 0.5, r34: asRatio(analytics.averages.sales_conversion) || 0.4 }
    : null;
  const funnel = buildFunnel(curCalls.length, curRatios ?? fallbackRatios);

  const curConvPct = funnel.length ? (funnel[3].value / Math.max(funnel[0].value, 1)) * 100 : 0;
  const prevLeadCount = sumRange(days, (d) => d.count, prevFrom, prevTo);
  const prevFunnel = buildFunnel(prevLeadCount, prevRatios ?? fallbackRatios);
  const prevConvPct = prevFunnel.length ? (prevFunnel[3].value / Math.max(prevFunnel[0].value, 1)) * 100 : 0;

  const conversion: PeriodStat = {
    value: Math.round(curConvPct * 10) / 10,
    changePct: pctChange(curConvPct, prevConvPct),
    spark: spark7(days, (d) => (d.qualified && d.count ? (d.qualified / d.count) * 100 : 0)),
  };
  const saleToClosedPct = curRatios ? Math.round((curRatios.r34 || 0) * 1000) / 10 : analytics ? Math.round(asRatio(analytics.averages.sales_conversion) * 1000) / 10 : null;

  /* ----- Jamoa samaradorligi (har xodim) ----- */
  const employees: EmployeeAnalytics[] = managers.map((m) => {
    const empCalls = curCalls.filter((c) => c.manager_id === m.id);
    const callCount = empCalls.length;
    const qualifiedCalls = empCalls.filter((c) => (Number(c.duration) || 0) >= norms.qualifiedCallSeconds).length;
    const efficiency = callCount ? Math.round(empCalls.reduce((s, c) => s + (Number(c.kpi_score) || 0), 0) / callCount) : null;

    const sumOpt = (sel: (c: CallRow) => number | null | undefined): number | null => {
      const withData = empCalls.filter((c) => sel(c) != null);
      if (!withData.length) return null;
      return withData.reduce((s, c) => s + (Number(sel(c)) || 0), 0);
    };

    const belowCalls = qualifiedCalls < norms.minQualifiedCalls[period];
    const belowScore = efficiency != null && efficiency < norms.minEfficiencyScore;
    let belowNormReason: string | null = null;
    if (belowCalls) {
      belowNormReason = `${qualifiedCalls} ta uzun qo'ng'iroq (norma: ${norms.minQualifiedCalls[period]})`;
    } else if (belowScore) {
      belowNormReason = `o'rtacha ball ${efficiency} (norma: ${norms.minEfficiencyScore})`;
    }

    /* Mgr id bo'yicha kunlik bucketlar — sparkline va samaradorlik trendi uchun. */
    const empDays = buildDays(
      calls.filter((c) => c.manager_id === m.id),
      norms
    );

    return {
      id: m.id,
      name: m.name,
      initials: initialsOf(m.name),
      accent: accentForId(m.id),
      efficiency,
      spark: avgSpark7(empDays, (d) => d.kpiSum, (d) => d.count),
      outgoing: sumOpt((c) => c.outgoing_count),
      incoming: sumOpt((c) => c.incoming_count),
      newLeads: sumOpt((c) => c.new_leads_count),
      sales: sumOpt((c) => c.closed_deals_count),
      callCount,
      qualifiedCalls,
      belowNorm: belowCalls || belowScore,
      belowNormReason,
    };
  });

  const alerts: KpiAlert[] = employees
    .filter((e) => e.belowNorm && e.belowNormReason)
    .map((e) => ({ employeeId: e.id, employeeName: e.name, reason: e.belowNormReason! }));

  return {
    period,
    totalCalls,
    newLeads,
    sentToDealer,
    conversion,
    saleToClosedPct,
    incoming,
    outgoing,
    didntAnswer,
    poorLead,
    funnel,
    employees,
    alerts,
    norms,
  };
}
