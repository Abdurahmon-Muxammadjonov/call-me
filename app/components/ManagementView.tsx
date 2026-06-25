"use client";

import { useEffect, useRef, useState } from "react";
import { Icons } from "./Icons";
import {
  Card,
  SectionTitle,
  Sparkline,
  Skeleton,
  PillButton,
  accentGrad,
  accentText,
  accentGlow,
  scoreColor,
  type Accent,
} from "./ui";
import {
  fetchPlatforms,
  fetchManagementData,
  formatSom,
  pctChange,
  type Platform,
  type PlatformId,
  type PlatformData,
  type ComparisonMetric,
  type TimeBucket,
  type HealthMetric,
  type StrategicTrend,
  type SellerKPI,
  type FunnelStage,
} from "../lib/management";

/* =====================================================================
 * Boshqaruv paneli — Apple-clean executive workspace.
 *   1. Sub-platform (tenant) switcher
 *   2. Period analytics cards (Today vs Yesterday / Week vs Last week)
 *   3. Three-tier dashboards (Umumiy / Strategik / ROP)
 *   4. Sales funnel (Voronka)
 * Each section is a small, fully-typed component so it can be reused or
 * lifted out wholesale. Data is keyed by the active platform.
 * ===================================================================== */

type ManagementTab = "general" | "strategic" | "rop";

const TABS: { id: ManagementTab; label: string; sub: string; icon: keyof typeof Icons }[] = [
  { id: "general", label: "Umumiy", sub: "Operatsion holat", icon: "grid" },
  { id: "strategic", label: "Yirik ma'lumotlar", sub: "Strategik makro trendlar", icon: "trendingUp" },
  { id: "rop", label: "ROP tahlili", sub: "Sotuv bo'limi boshlig'i", icon: "target" },
];

export function ManagementView() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformId, setPlatformId] = useState<PlatformId | null>(null);
  const [tab, setTab] = useState<ManagementTab>("general");
  const [data, setData] = useState<PlatformData | null>(null);
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  // Bumped to force a re-fetch on manual retry.
  const [reloadKey, setReloadKey] = useState(0);

  // Platformalar ro'yxati (backend bergach ko'p platforma; hozir bitta jonli).
  useEffect(() => {
    let alive = true;
    fetchPlatforms()
      .then((list) => {
        if (!alive) return;
        setPlatforms(list);
        setPlatformId((cur) => cur ?? list[0]?.id ?? null);
      })
      .catch(() => alive && setPlatforms([]));
    return () => {
      alive = false;
    };
  }, []);

  // Tanlangan platforma bo'yicha barcha ko'rsatkichlarni jonli yuklash.
  // setState faqat async callback ichida — effekt tanasida sinxron emas
  // (loyiha konvensiyasi: setState-in-effect cascade'idan qochish).
  useEffect(() => {
    if (!platformId) return;
    const ctrl = new AbortController();
    fetchManagementData(platformId, ctrl.signal)
      .then((d) => {
        setData(d);
        setStatus("online");
      })
      .catch((e) => {
        if ((e as Error)?.name !== "AbortError") setStatus("offline");
      });
    return () => ctrl.abort();
  }, [platformId, reloadKey]);

  const platform = platforms.find((p) => p.id === platformId) ?? platforms[0] ?? null;
  const accent: Accent = platform?.accent ?? "indigo";

  return (
    <div key={platformId ?? "init"} className="animate-slide-up space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionTitle
          title="Boshqaruv paneli"
          subtitle="Uch darajali rahbariyat ko'rinishi — jonli ko'rsatkichlar"
        />
        {platform && (
          <PlatformSwitcher
            platforms={platforms}
            active={platform}
            onSelect={setPlatformId}
            live={status === "online"}
          />
        )}
      </div>

      {status === "loading" && <LoadingState />}

      {status === "offline" && !data && (
        <OfflineState onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {data && (
        <>
          {/* 2. Period analytics */}
          <PeriodAnalytics comparison={data.comparison} timeBuckets={data.timeBuckets} />


          {/* 3. Three-tier dashboards */}
          <Card className="overflow-hidden">
            <TabBar tab={tab} onChange={setTab} accent={accent} />
            <div key={tab} className="animate-fade-in p-5 sm:p-6">
              {tab === "general" && <GeneralPanel metrics={data.general} />}
              {tab === "strategic" && <StrategicPanel trends={data.strategic} />}
              {tab === "rop" && <RopPanel sellers={data.sellers} accent={accent} />}
            </div>
          </Card>

          {/* 4. Sales funnel */}
          <SalesFunnel stages={data.funnel} accent={accent} />
        </>
      )}
    </div>
  );
}

/* ---------- Loading / offline states ---------- */
function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-14" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <Skeleton className="h-72" />
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
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {"Backendga ulanib bo'lmadi"}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {"Jonli ko'rsatkichlarni yuklab bo'lmadi. Server ishlayotganini tekshiring."}
        </p>
      </div>
      <PillButton icon="scan" onClick={onRetry}>
        Qayta urinish
      </PillButton>
    </Card>
  );
}

/* ============================ 1. TENANT SWITCHER ============================ */
function PlatformSwitcher({
  platforms,
  active,
  onSelect,
  live,
}: {
  platforms: Platform[];
  active: Platform;
  onSelect: (id: PlatformId) => void;
  live: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Faqat bitta platforma bo'lsa, ochiladigan ro'yxat shart emas.
  const multi = platforms.length > 1;

  // Close on outside click / Escape — standard menu hygiene.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => multi && setOpen((o) => !o)}
        className={`group flex w-64 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-left backdrop-blur-md transition-all duration-300 dark:border-slate-700/60 dark:bg-slate-800/40 ${
          multi ? "hover:bg-white/80 dark:hover:bg-slate-800/70" : "cursor-default"
        }`}
      >
        <span
          className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br text-xs font-bold text-white shadow-md ${accentGrad[active.accent]}`}
        >
          {active.initials}
          {live && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
            {active.name}
          </span>
          <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
            {active.tagline}
          </span>
        </span>
        {multi ? (
          <Icons.chevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        ) : (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              live ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/10 text-slate-400"
            }`}
          >
            {live ? "Jonli" : "Oflayn"}
          </span>
        )}
      </button>

      {open && multi && (
        <div className="glass glow-ring absolute right-0 z-50 mt-2 w-72 animate-slide-up overflow-hidden rounded-2xl p-1.5 shadow-2xl">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Tor biznes uchun alohida platforma
          </p>
          {platforms.map((p) => {
            const isActive = p.id === active.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-linear-to-r from-indigo-500/12 to-cyan-400/10 ring-1 ring-indigo-500/20 dark:ring-cyan-400/20"
                    : "hover:bg-slate-500/5"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br text-xs font-bold text-white shadow-sm ${accentGrad[p.accent]}`}
                >
                  {p.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
                    {p.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400 dark:text-slate-500">
                    {p.tagline}
                  </span>
                </span>
                {isActive && <Icons.check className={`h-4 w-4 ${accentText[p.accent]}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================ DELTA PILL ============================ */
function DeltaPill({
  current,
  previous,
  lowerIsBetter = false,
  className = "",
}: {
  current: number;
  previous: number;
  lowerIsBetter?: boolean;
  className?: string;
}) {
  const pct = pctChange(current, previous);
  const flat = Math.abs(pct) < 0.05;
  // "good" = the change is in the desired direction for this metric.
  const good = flat ? false : lowerIsBetter ? pct < 0 : pct > 0;
  const tone = flat
    ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
    : good
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  const Arrow = pct >= 0 ? Icons.arrowUp : Icons.arrowDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone} ${className}`}
    >
      {!flat && <Arrow className="h-3 w-3" />}
      {flat ? "0%" : `${Math.abs(pct).toFixed(1)}%`}
    </span>
  );
}

/* ============================ 2. PERIOD ANALYTICS ============================ */
function PeriodAnalytics({
  comparison,
  timeBuckets,
}: {
  comparison: ComparisonMetric[];
  timeBuckets: TimeBucket[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ComparisonCard metrics={comparison} />
      <TimeIntervalCard buckets={timeBuckets} />
    </div>
  );
}

function ComparisonCard({ metrics }: { metrics: ComparisonMetric[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle
        title="Sabablarsiz munosabatlar dinamikasi"
        subtitle="Kam bo'lgani yaxshi — kunlik va haftalik taqqoslash"
      />
      <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
        {metrics.map((m) => (
          <li key={m.key} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                {m.label}
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-white">
                {m.today}
                <span className="ml-1.5 text-xs font-medium text-slate-400">bugun</span>
              </p>
            </div>

            <div className="hidden w-24 sm:block">
              <Sparkline data={m.spark} accent="violet" />
            </div>

            <div className="flex w-32 shrink-0 flex-col items-end gap-1.5">
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Kecha
                </span>
                <DeltaPill current={m.today} previous={m.yesterday} lowerIsBetter={m.lowerIsBetter} />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Hafta
                </span>
                <DeltaPill current={m.week} previous={m.lastWeek} lowerIsBetter={m.lowerIsBetter} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TimeIntervalCard({ buckets }: { buckets: TimeBucket[] }) {
  const peak = buckets.reduce((a, b) => (b.calls > a.calls ? b : a), buckets[0]);
  const max = Math.max(...buckets.map((b) => b.calls));
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle
        title="Vaqt intervallari tahlili"
        subtitle={`Eng yuqori yuklama: ${peak.range}`}
      />
      <ul className="space-y-4">
        {buckets.map((b) => (
          <li key={b.range}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {b.range}
              </span>
              <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {b.calls.toLocaleString()}
                <span className="ml-1.5 text-xs font-medium text-slate-400">{b.share}%</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/60">
              <div
                className={`h-full rounded-full bg-linear-to-r ${accentGrad[b.accent]} transition-all duration-700`}
                style={{ width: `${Math.max((b.calls / max) * 100, 4)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ============================ 3. TAB BAR + PANELS ============================ */
function TabBar({
  tab,
  onChange,
  accent,
}: {
  tab: ManagementTab;
  onChange: (t: ManagementTab) => void;
  accent: Accent;
}) {
  return (
    <div className="flex gap-1 border-b border-slate-200/60 p-1.5 dark:border-slate-800/60">
      {TABS.map((t) => {
        const Icon = Icons[t.icon];
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`group flex flex-1 items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${
              active
                ? `bg-linear-to-r ${accentGrad[accent]} text-white shadow-md`
                : "text-slate-500 hover:bg-slate-500/5 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:flex sm:flex-col sm:items-start sm:leading-tight">
              <span>{t.label}</span>
              <span className={`text-[10px] font-medium ${active ? "text-white/80" : "text-slate-400"}`}>
                {t.sub}
              </span>
            </span>
            <span className="sm:hidden">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 3a. Umumiy (operational health) ---------- */
function GeneralPanel({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => {
        const Icon = Icons[m.icon as keyof typeof Icons];
        const TrendIcon = m.trend === "up" ? Icons.arrowUp : Icons.arrowDown;
        return (
          <div
            key={m.key}
            className={`rounded-2xl border border-slate-200/60 bg-white/50 p-5 transition-all duration-300 hover:scale-[1.02] dark:border-slate-800/60 dark:bg-slate-900/30 ${accentGlow[m.accent]}`}
          >
            <div className="flex items-start justify-between">
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br text-white shadow-md ${accentGrad[m.accent]}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                  m.trend === "up"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                }`}
              >
                <TrendIcon className="h-3 w-3" />
                {m.delta}
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-white">
              {m.value}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.label}</p>
            <div className="mt-3">
              <Sparkline data={m.spark} accent={m.accent} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 3b. Yirik ma'lumotlar (strategic) ---------- */
function StrategicPanel({ trends }: { trends: StrategicTrend[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {trends.map((t) => {
        const rising = t.growth >= 0;
        // "good" = the move is in the metric's desired direction.
        const good = t.lowerIsBetter ? !rising : rising;
        return (
          <div
            key={t.label}
            className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 p-6 dark:border-slate-800/60 dark:bg-slate-900/30"
          >
            <div
              className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br opacity-10 blur-2xl ${accentGrad[t.accent]}`}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.label}</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    good
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {rising ? <Icons.arrowUp className="h-3 w-3" /> : <Icons.arrowDown className="h-3 w-3" />}
                  {Math.abs(t.growth).toFixed(1)}%
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-white">
                {t.value}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t.sub}</p>
              <div className="mt-4">
                <Sparkline data={t.spark} accent={t.accent} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 3c. ROP deep analysis (per-seller KPIs) ---------- */
function RopPanel({ sellers, accent }: { sellers: SellerKPI[]; accent: Accent }) {
  const totalBonus = sellers.reduce((s, x) => s + x.bonus, 0);
  const totalPenalty = sellers.reduce((s, x) => s + x.penalty, 0);
  const planDone = sellers.reduce((s, x) => s + x.planDone, 0);
  const planTarget = sellers.reduce((s, x) => s + x.planTarget, 0);
  const planPct = planTarget ? Math.round((planDone / planTarget) * 100) : 0;

  if (!sellers.length) {
    return (
      <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        {"Menejerlar topilmadi — backendda hali sotuvchilar yo'q."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat icon="users" label="Sotuvchilar" value={`${sellers.length}`} accent="indigo" />
        <SummaryStat icon="target" label="Kunlik reja" value={`${planPct}%`} accent={accent} />
        <SummaryStat icon="trophy" label="Bonus fondi" value={formatSom(totalBonus)} accent="emerald" />
        <SummaryStat icon="coins" label="Jarimalar" value={formatSom(totalPenalty)} accent="violet" />
      </div>

      {/* Seller table — desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/60 bg-slate-500/5 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800/60">
              <th className="px-4 py-3 font-semibold">Sotuvchi</th>
              <th className="px-4 py-3 font-semibold">{"Qo'ng'iroq"}</th>
              <th className="px-4 py-3 font-semibold">{"O'rt. davomiylik"}</th>
              <th className="px-4 py-3 font-semibold">Sifat bahosi</th>
              <th className="px-4 py-3 font-semibold">Kunlik reja</th>
              <th className="px-4 py-3 text-right font-semibold">Bonus / Jarima</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
            {sellers.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-slate-500/3">
                <td className="px-4 py-3">
                  <SellerIdentity seller={s} />
                </td>
                <td className="px-4 py-3 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {s.calls}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {s.avgDuration}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold tabular-nums ${scoreColor(s.score)}`}>
                    {s.score}
                  </span>
                </td>
                <td className="px-4 py-3 w-44">
                  <PlanTracker done={s.planDone} target={s.planTarget} />
                </td>
                <td className="px-4 py-3 text-right">
                  <BonusPenalty bonus={s.bonus} penalty={s.penalty} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Seller cards — mobile */}
      <div className="space-y-3 lg:hidden">
        {sellers.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-200/60 bg-white/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/30"
          >
            <div className="flex items-center justify-between">
              <SellerIdentity seller={s} />
              <span className={`text-lg font-bold tabular-nums ${scoreColor(s.score)}`}>{s.score}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Field label="Qo'ng'iroq" value={`${s.calls}`} />
              <Field label="O'rt. davomiylik" value={s.avgDuration} />
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Kunlik reja
              </p>
              <PlanTracker done={s.planDone} target={s.planTarget} />
            </div>
            <div className="mt-3 flex justify-end">
              <BonusPenalty bonus={s.bonus} penalty={s.penalty} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Icons;
  label: string;
  value: string;
  accent: Accent;
}) {
  const Icon = Icons[icon];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/50 p-3.5 dark:border-slate-800/60 dark:bg-slate-900/30">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br text-white shadow-sm ${accentGrad[accent]}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-bold tabular-nums text-slate-800 dark:text-white">
          {value}
        </p>
        <p className="truncate text-[11px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function SellerIdentity({ seller }: { seller: SellerKPI }) {
  const initials = seller.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dot =
    seller.status === "online"
      ? "bg-emerald-400"
      : seller.status === "away"
      ? "bg-amber-400"
      : "bg-slate-400";
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-500 via-violet-500 to-cyan-400 text-xs font-bold text-white">
        {initials}
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${dot}`}
        />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">
          {seller.name}
        </p>
        <p className="truncate text-xs text-slate-400">{seller.role}</p>
      </div>
    </div>
  );
}

/** Kunlik Reja execution tracker. */
function PlanTracker({ done, target }: { done: number; target: number }) {
  const pct = Math.min(Math.round((done / target) * 100), 100);
  const met = done >= target;
  const grad = met ? "from-emerald-400 to-teal-400" : "from-indigo-400 to-cyan-400";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">
          {done}/{target}
        </span>
        <span className={`font-semibold tabular-nums ${met ? "text-emerald-500" : "text-slate-400"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/60">
        <div
          className={`h-full rounded-full bg-linear-to-r ${grad} transition-all duration-700`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  );
}

function BonusPenalty({ bonus, penalty }: { bonus: number; penalty: number }) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      {bonus > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          <Icons.arrowUp className="h-3 w-3" />
          {formatSom(bonus)}
        </span>
      )}
      {penalty > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
          <Icons.arrowDown className="h-3 w-3" />
          {formatSom(penalty)}
        </span>
      )}
      {bonus === 0 && penalty === 0 && <span className="text-xs text-slate-400">—</span>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

/* ============================ 4. SALES FUNNEL ============================ */
function SalesFunnel({ stages, accent }: { stages: FunnelStage[]; accent: Accent }) {
  const top = stages[0]?.value || 1;
  const overall = stages.length
    ? Math.round((stages[stages.length - 1].value / top) * 100)
    : 0;

  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle
        title="Sotuv voronkasi"
        subtitle="Liddan yopilgan bitimgacha — konversiya yo'qotishlari"
        action={
          stages.length ? (
            <span className="inline-flex items-center gap-2 rounded-xl bg-slate-500/5 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800/40">
              <Icons.funnel className={`h-4 w-4 ${accentText[accent]}`} />
              <span className="text-slate-500 dark:text-slate-400">Umumiy konversiya</span>
              <span className={accentText[accent]}>{overall}%</span>
            </span>
          ) : undefined
        }
      />

      {!stages.length && (
        <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {"Voronka uchun yetarli qo'ng'iroq ma'lumoti yo'q."}
        </p>
      )}

      <div className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.value / top) * 100, 18);
          const prev = i === 0 ? null : stages[i - 1];
          const step = prev ? Math.round((stage.value / prev.value) * 100) : 100;
          const dropoff = prev ? prev.value - stage.value : 0;
          return (
            <FunnelRow
              key={stage.label}
              stage={stage}
              widthPct={widthPct}
              accent={accent}
              isFirst={i === 0}
              isLast={i === stages.length - 1}
              step={step}
              dropoff={dropoff}
            />
          );
        })}
      </div>
    </Card>
  );
}

function FunnelRow({
  stage,
  widthPct,
  accent,
  isFirst,
  isLast,
  step,
  dropoff,
}: {
  stage: FunnelStage;
  widthPct: number;
  accent: Accent;
  isFirst: boolean;
  isLast: boolean;
  step: number;
  dropoff: number;
}) {
  // The final stage is the "won" outcome — highlight it in emerald regardless
  // of the platform accent so the closed-deal row reads as success.
  const grad = isLast ? "from-emerald-500 to-teal-400" : accentGrad[accent];
  return (
    <div>
      {/* Conversion connector to the previous stage */}
      {!isFirst && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs">
          <span
            className={`font-semibold tabular-nums ${
              step >= 60 ? "text-emerald-500" : step >= 35 ? "text-amber-500" : "text-rose-500"
            }`}
          >
            ↘ {step}%
          </span>
          {dropoff > 0 && (
            <span className="text-slate-400">
              -{dropoff.toLocaleString()} {"yo'qotildi"}
            </span>
          )}
        </div>
      )}

      <div className="mx-auto transition-all duration-700" style={{ width: `${widthPct}%` }}>
        <div
          className={`flex items-center justify-between rounded-2xl bg-linear-to-r px-4 py-3.5 text-white shadow-md ${grad}`}
        >
          <span className="min-w-0 truncate text-sm font-semibold">{stage.label}</span>
          <span className="ml-3 shrink-0 text-lg font-bold tabular-nums">
            {stage.value.toLocaleString()}
          </span>
        </div>
        <p className="mt-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
          {stage.hint}
        </p>
      </div>
    </div>
  );
}

