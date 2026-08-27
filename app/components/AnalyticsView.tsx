"use client";

/* "Analitika" — ilgari "Umumiy ko'rinish" (director-level company dashboard,
 * /dashboard root). Kunlik/Haftalik/Oylik almashtirgichi bosilganda backendga
 * qayta so'rov yubormaymiz — bir marta xom ma'lumot olinadi va tanlangan davr
 * oynasiga qarab CLIENT-side qayta hisoblanadi (qarang ../lib/analytics.ts —
 * shu faylning to'liq izohi bilan). ManagementView/ComparisonView'dagi kabi
 * bu sahifa ham to'g'ridan-to'g'ri o'zbekcha matn ishlatadi (i18n lug'atisiz)
 * — faqat global nav yorlig'i/sarlavha (AppShell chrome) lug'atda qoladi. */

import { useEffect, useRef, useState } from "react";
import { Icons } from "./Icons";
import { Card, SectionTitle, Sparkline, Skeleton, PillButton, accentGrad, accentText } from "./ui";
import {
  fetchAnalyticsRaw,
  computeAnalyticsData,
  PERIOD_LABEL,
  type AnalyticsData,
  type AnalyticsNorms,
  type AnalyticsRaw,
  type EmployeeAnalytics,
  type FunnelStage,
  type KpiAlert,
  type MaybeStat,
  type Period,
  type PeriodStat,
} from "../lib/analytics";
import { getSupabase } from "../lib/supabase";
import { useSession } from "../lib/auth";
import { fetchCompanySettings, toAnalyticsNorms, DEFAULT_COMPANY_SETTINGS } from "../lib/companySettings";

/* Real-time'dan kelgan bir nechta hodisani (masalan band jamoada ketma-ket
 * tahlil qilinayotgan qo'ng'iroqlar) BITTA qayta yuklashga birlashtiradi —
 * aks holda har bir yozuv butun og'ir pipeline'ni (2000 qo'ng'iroq + voronka
 * namunasi) qayta ishga tushirib, sahifa "qotib qolgandek" tuyulardi. */
const REALTIME_DEBOUNCE_MS = 4000;

const PERIODS: Period[] = ["day", "week", "month"];
const BACKEND_UNREACHABLE_MESSAGE = "Backend bilan aloqa yo'q. Iltimos qayta urinib ko'ring.";

/* Standart Accent (indigo/cyan/emerald/violet) to'rttagina rangni qamrab
 * oladi; bu sahifa reference dizaynidagi ko'k/yashil-firuza/binafsha/to'q
 * sariq/pushti to'plamini talab qiladi — shuning uchun kartalar uchun
 * alohida, xom Tailwind ranglariga asoslangan mini-palitra. */
const CARD_THEME = {
  blue: { icon: "bg-linear-to-br from-blue-500 to-blue-600", text: "text-blue-600 dark:text-blue-400", line: "#2563eb" },
  teal: { icon: "bg-linear-to-br from-emerald-500 to-teal-600", text: "text-emerald-600 dark:text-emerald-400", line: "#059669" },
  purple: { icon: "bg-linear-to-br from-violet-500 to-purple-600", text: "text-violet-600 dark:text-violet-400", line: "#7c3aed" },
  orange: { icon: "bg-linear-to-br from-orange-500 to-amber-600", text: "text-orange-600 dark:text-orange-400", line: "#ea580c" },
  rose: { icon: "bg-linear-to-br from-rose-500 to-pink-600", text: "text-rose-600 dark:text-rose-400", line: "#e11d48" },
} as const;
type CardColor = keyof typeof CARD_THEME;

export function AnalyticsView() {
  const session = useSession();
  const [period, setPeriod] = useState<Period>("day");
  const [reloadKey, setReloadKey] = useState(0);

  // Kompaniyaning o'zi sozlagan KPI normalari (GET /company/settings) —
  // backend hali bermasa/bo'lmasa DEFAULT_COMPANY_SETTINGS bilan boshlanadi
  // va shu bilan ishlayveradi (fetchCompanySettings hech qachon throw
  // qilmaydi, faqat AbortError'dan tashqari — qarang lib/companySettings.ts).
  const [norms, setNorms] = useState<AnalyticsNorms>(() => toAnalyticsNorms(DEFAULT_COMPANY_SETTINGS));

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCompanySettings(session?.token, ctrl.signal)
      .then((s) => setNorms(toAnalyticsNorms(s)))
      .catch(() => {
        /* AbortError — komponent unmount bo'lganda, e'tiborsiz qoldiriladi */
      });
    return () => ctrl.abort();
  }, [session?.token, reloadKey]);

  // Xom ma'lumot (qo'ng'iroqlar/menejerlar/PoP/analitika) — faqat mount va
  // real-time o'zgarishda qayta olinadi, davr almashtirilganda EMAS.
  const [raw, setRaw] = useState<AnalyticsRaw | null>(null);
  const [rawStatus, setRawStatus] = useState<"loading" | "online" | "offline">("loading");

  // Tanlangan davr uchun hisoblangan natija — `raw` xotirada tayyor bo'lgach
  // tarmoqqa deyarli tegmasdan (voronka namunasi asosan keshdan) hisoblanadi.
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dataStatus, setDataStatus] = useState<"loading" | "online" | "offline">("loading");

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalyticsRaw(ctrl.signal)
      .then((r) => {
        setRaw(r);
        setRawStatus("online");
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setRawStatus("offline");
      });
    return () => ctrl.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!raw) return;
    const ctrl = new AbortController();
    computeAnalyticsData(raw, period, ctrl.signal, norms)
      .then((d) => {
        setData(d);
        setDataStatus("online");
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setDataStatus("offline");
      });
    return () => ctrl.abort();
  }, [raw, period, norms]);

  /* Realtime: `calls`/`managers` o'zgarsa, xom ma'lumot qayta olinadi — lekin
   * bir nechta hodisa ketma-ket kelsa (band jamoada tez-tez bo'ladi),
   * debounce ularni bitta qayta yuklashga birlashtiradi. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const bump = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setReloadKey((k) => k + 1), REALTIME_DEBOUNCE_MS);
    };
    const channel = supabase
      .channel("analytics-calls-managers")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "managers" }, bump)
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  // `data` kelgan davr bilan tanlangan davr mos kelmasa (birinchi yuklanish
  // yoki davr hozirgina almashtirilgan) — hali "stale". Bu render vaqtida
  // hisoblanadi (qo'shimcha effekt/setState kerak emas), pastdagi skeleton/
  // bo'sh holatlarni shundan boshqaradi.
  const stale = data?.period !== period;
  const status = rawStatus === "offline" ? "offline" : dataStatus === "offline" ? "offline" : rawStatus === "loading" || dataStatus === "loading" ? "loading" : "online";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LiveBadge status={stale && status !== "offline" ? "loading" : status} />
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {stale && status !== "offline" && <LoadingSkeleton />}

      {stale && status === "offline" && <OfflineState onRetry={() => setReloadKey((k) => k + 1)} />}

      {!stale && data && <AnalyticsBody data={data} />}
    </div>
  );
}

/* ============================ Header row ============================ */
function LiveBadge({ status }: { status: "loading" | "online" | "offline" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        status === "online"
          ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400"
          : status === "offline"
          ? "bg-rose-500/10 text-rose-600 ring-rose-500/30 dark:text-rose-400"
          : "bg-slate-500/10 text-slate-500 ring-slate-500/30"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "online" ? "animate-pulse" : ""}`} />
      {status === "online" ? "Backend ulangan · jonli ma'lumot" : status === "offline" ? "Backend oflayn" : "Yuklanmoqda..."}
    </span>
  );
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-slate-100/70 p-1 dark:border-slate-700/60 dark:bg-slate-800/60">
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
            value === p
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {PERIOD_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

/* ============================ Loading / offline ============================ */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

function OfflineState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 p-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
        <Icons.plug className="h-7 w-7" />
      </span>
      <div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{"Backendga ulanib bo'lmadi"}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{BACKEND_UNREACHABLE_MESSAGE}</p>
      </div>
      <PillButton icon="scan" onClick={onRetry}>
        Qayta urinish
      </PillButton>
    </Card>
  );
}

/* ============================ Body ============================ */
function AnalyticsBody({ data }: { data: AnalyticsData }) {
  const leadToDealPct = data.funnel.length
    ? Math.round((data.funnel[3].value / Math.max(data.funnel[0].value, 1)) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      <KpiAlertBanner alerts={data.alerts} period={data.period} norms={data.norms} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TopStatCard label="Jami qo'ng'iroqlar" stat={data.totalCalls} color="blue" icon="phone" />
        <TopStatCard label="Yangi lidlar (Yangi Lid)" stat={data.newLeads} color="teal" icon="spark" />
        <TopStatCard label="Avtosalonga yuborildi" stat={data.sentToDealer} color="purple" icon="building" />
        <TopStatCard
          label="Konversiya (Lid→Bitim)"
          stat={data.conversion}
          color="orange"
          icon="funnel"
          format={(v) => `${v}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <IncomingOutgoingCard incoming={data.incoming} outgoing={data.outgoing} />
        <ConversionFunnelCard funnel={data.funnel} leadToDealPct={leadToDealPct} saleToClosedPct={data.saleToClosedPct} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SmallStatCard label="Lid ko'tarmadi" stat={data.didntAnswer} color="orange" />
        <SmallStatCard label="Sifatsiz lid" stat={data.poorLead} color="rose" />
        <SmallBadgeCard label="Avtosalonga yuborilganlar" stat={data.sentToDealer} color="purple" icon="building" />
      </div>

      <TeamGrid employees={data.employees} period={data.period} />
    </div>
  );
}

/* ============================ 2. KPI ogohlantirish banneri ============================ */
function KpiAlertBanner({ alerts, period, norms }: { alerts: KpiAlert[]; period: Period; norms: AnalyticsNorms }) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts.length) return null;
  const visible = expanded ? alerts : alerts.slice(0, 2);
  const hiddenCount = alerts.length - visible.length;

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] px-5 py-4 dark:bg-rose-500/10">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
        <span className="font-bold tracking-wide text-rose-600 dark:text-rose-400">KPI OGOHLANTIRISH</span>
        <span className="text-slate-500 dark:text-slate-400">
          · {alerts.length} xodim norma ostida (&lt;{norms.minQualifiedCalls[period]} ta &gt;{norms.qualifiedCallSeconds}s
          qo&apos;ng&apos;iroq)
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {visible.map((a) => (
          <span key={a.employeeId} className="inline-flex items-center gap-1.5 text-sm">
            <Icons.alertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
            <span className="font-medium text-rose-700 dark:text-rose-300">{a.employeeName}</span>
            <span className="text-rose-600/80 dark:text-rose-400/80">— {a.reason}</span>
          </span>
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            +{hiddenCount} ta yana
            <Icons.chevronDown className="h-3 w-3" />
          </button>
        )}
        {expanded && alerts.length > 2 && (
          <button
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            Yig&apos;ish
            <Icons.chevronDown className="h-3 w-3 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================ 3. Top KPI kartalar ============================ */
function DeltaBadge({ changePct }: { changePct: number | null }) {
  if (changePct == null) return null;
  const up = changePct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
        up
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      }`}
    >
      {up ? <Icons.arrowUp className="h-3 w-3" /> : <Icons.arrowDown className="h-3 w-3" />}
      {Math.abs(changePct).toFixed(1)}%
    </span>
  );
}

function TopStatCard({
  label,
  stat,
  color,
  icon,
  format,
}: {
  label: string;
  stat: PeriodStat | MaybeStat;
  color: CardColor;
  icon: keyof typeof Icons;
  format?: (v: number) => string;
}) {
  const theme = CARD_THEME[color];
  const Icon = Icons[icon];
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-xl text-white shadow-md ${theme.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <DeltaBadge changePct={stat?.changePct ?? null} />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-white">
        {stat ? (format ? format(stat.value) : stat.value.toLocaleString()) : "—"}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-3">
        {stat ? (
          <Sparkline data={stat.spark} color={theme.line} />
        ) : (
          <p className="text-xs text-slate-400">{"Backend hali bu ko'rsatkichni qaytarmayapti"}</p>
        )}
      </div>
    </Card>
  );
}

/* ============================ 4.1 Kiruvchi vs Chiquvchi (donut) ============================ */
function IncomingOutgoingCard({ incoming, outgoing }: { incoming: number | null; outgoing: number | null }) {
  if (incoming == null || outgoing == null) {
    return (
      <Card className="p-6">
        <SectionTitle title="Kiruvchi vs Chiquvchi" subtitle="Vxodyashie / Chiquvchi qo'ng'iroqlar" />
        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Backend hali kiruvchi/chiquvchi taqsimotini qaytarmayapti."}
        </p>
      </Card>
    );
  }
  const total = incoming + outgoing || 1;
  const outPct = Math.round((outgoing / total) * 100);
  const inPct = 100 - outPct;
  return (
    <Card className="p-6">
      <SectionTitle title="Kiruvchi vs Chiquvchi" subtitle="Vxodyashie / Chiquvchi qo'ng'iroqlar" />
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(#2563eb 0% ${outPct}%, #059669 ${outPct}% 100%)`,
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 16px), #000 calc(100% - 16px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 16px), #000 calc(100% - 16px))",
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">{total.toLocaleString()}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jami</span>
          </div>
        </div>
        <div className="min-w-40 flex-1 space-y-3">
          <LegendRow color="#2563eb" label="Chiquvchi" count={outgoing} pct={outPct} />
          <LegendRow color="#059669" label="Kiruvchi" count={incoming} pct={inPct} />
        </div>
      </div>
    </Card>
  );
}

function LegendRow({ color, label, count, pct }: { color: string; label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">{count.toLocaleString()}</span>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-400">{pct}%</span>
    </div>
  );
}

/* ============================ 4.2 Konversiya voronkasi ============================ */
function ConversionFunnelCard({
  funnel,
  leadToDealPct,
  saleToClosedPct,
}: {
  funnel: FunnelStage[];
  leadToDealPct: number;
  saleToClosedPct: number | null;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle title="Konversiya voronkasi" subtitle="Lid tezligi: bosqichma-bosqich" />
        <div className="flex gap-5">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lid → Bitim</p>
            <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">{leadToDealPct.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sotuv → Yopilgan</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {saleToClosedPct != null ? `${saleToClosedPct.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {!funnel.length ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Voronka uchun yetarli qo'ng'iroq ma'lumoti yo'q."}
        </p>
      ) : (
        <div className="space-y-3">
          {funnel.map((stage) => {
            const widthPct = Math.max((stage.value / Math.max(funnel[0].value, 1)) * 100, 14);
            const ofFirstPct = Math.round((stage.value / Math.max(funnel[0].value, 1)) * 100);
            return (
              <div key={stage.label} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{stage.label}</span>
                <div className="h-9 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800/60">
                  <div
                    className="flex h-full items-center rounded-lg bg-linear-to-r from-blue-600 to-teal-500 px-3 text-sm font-bold text-white transition-all duration-700"
                    style={{ width: `${widthPct}%` }}
                  >
                    {stage.value.toLocaleString()}
                  </div>
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-semibold text-slate-400">{ofFirstPct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ============================ 5. Kichik statistik kartalar ============================ */
function SmallStatCard({ label, stat, color }: { label: string; stat: MaybeStat; color: CardColor }) {
  const theme = CARD_THEME[color];
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
        {stat ? stat.value.toLocaleString() : "—"}
      </p>
      <div className="mt-3">
        {stat ? (
          <Sparkline data={stat.spark} color={theme.line} />
        ) : (
          <p className="text-xs text-slate-400">Ma&apos;lumot kutilmoqda</p>
        )}
      </div>
    </Card>
  );
}

function SmallBadgeCard({
  label,
  stat,
  color,
  icon,
}: {
  label: string;
  stat: MaybeStat;
  color: CardColor;
  icon: keyof typeof Icons;
}) {
  const theme = CARD_THEME[color];
  const Icon = Icons[icon];
  return (
    <Card className="flex items-center justify-between p-5">
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
          {stat ? stat.value.toLocaleString() : "—"}
        </p>
      </div>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md ${theme.icon}`}>
        <Icon className="h-6 w-6" />
      </span>
    </Card>
  );
}

/* ============================ 6. Jamoa samaradorligi ============================ */
function TeamGrid({ employees, period }: { employees: EmployeeAnalytics[]; period: Period }) {
  return (
    <div>
      <SectionTitle
        title="Jamoa samaradorligi"
        action={
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {PERIOD_LABEL[period]} · {employees.length} xodim
          </span>
        }
      />
      {!employees.length ? (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Xodimlar topilmadi.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((e) => (
            <EmployeeCard key={e.id} emp={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ emp }: { emp: EmployeeAnalytics }) {
  return (
    <Card
      className="p-5"
      style={
        emp.belowNorm
          ? {
              borderColor: "rgba(244,63,94,0.5)",
              boxShadow: "0 0 0 1px rgba(244,63,94,0.35), 0 14px 30px -16px rgba(244,63,94,0.5)",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-linear-to-br text-sm font-bold text-white ${accentGrad[emp.accent]}`}
        >
          {emp.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{emp.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-medium ${accentText[emp.accent]}`}>
              Samaradorlik: {emp.efficiency != null ? `${emp.efficiency}%` : "—"}
            </span>
            {emp.belowNorm && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                Norma ostida
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Sparkline data={emp.spark} accent={emp.accent} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MetricCell label="chiquvchi" value={emp.outgoing} />
        <MetricCell label="kiruvchi" value={emp.incoming} />
        <MetricCell label="yangi lid" value={emp.newLeads} />
        <MetricCell label="sotuv" value={emp.sales} />
      </div>
    </Card>
  );
}

function MetricCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-white">{value != null ? value.toLocaleString() : "—"}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  );
}
