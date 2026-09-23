"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { Card, SectionTitle, Skeleton } from "./ui";
import {
  fetchPopStats,
  fetchConversionHistory,
  fetchDailyMinutes,
  type PopStats,
  type PopBlock,
  type ConversionDay,
  type DailyMinutesResult,
} from "../lib/api";
import { AnalyticsErrorUI, categorizeError, type AnalyticsError } from "./AnalyticsErrorUI";

/* =====================================================================
 * Solishtirish paneli — alohida nav bo'limi.
 *
 * Kunlik / Haftalik / Oylik natijalar oldingi davr bilan YONMA-YON
 * solishtiriladi (jonli /analytics/pop). Pastda — har kunlik tarix
 * (/api/management/conversion-history) saqlanib turadi.
 * ===================================================================== */

const NUM = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 1 });

function Delta({ pct }: { pct: number }) {
  const flat = Math.abs(pct) < 0.05;
  const up = pct > 0;
  const tone = flat
    ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    : up
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
    : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`}>
      {flat ? "0%" : `${up ? "+" : ""}${pct.toFixed(1)}%`}
    </span>
  );
}

const ROWS: { label: string; unit: string; key: keyof PopBlock }[] = [
  { label: "Qo'ng'iroqlar", unit: "ta", key: "calls" },
  { label: "Davomiylik", unit: "min", key: "duration_minutes" },
  { label: "O'rtacha KPI", unit: "ball", key: "avg_kpi" },
];

function ComparisonCard({
  title,
  prevLabel,
  curLabel,
  block,
}: {
  title: string;
  prevLabel: string;
  curLabel: string;
  block: PopBlock;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="mb-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <th className="pb-2 text-left font-medium">Ko&apos;rsatkich</th>
            <th className="pb-2 text-right font-medium">{prevLabel}</th>
            <th className="pb-2 text-right font-medium">{curLabel}</th>
            <th className="pb-2 text-right font-medium">Farq</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const m = block[r.key];
            return (
              <tr key={r.key} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.label}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-400 dark:text-slate-500">
                  {NUM.format(m.previous)} <span className="text-xs">{r.unit}</span>
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                  {NUM.format(m.current)} <span className="text-xs font-normal text-slate-400">{r.unit}</span>
                </td>
                <td className="py-2.5 text-right">
                  <Delta pct={m.change_pct} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

const HISTORY_COLLAPSED = 4; // bosilmaganda nechta kun ko'rinadi

function HistoryCard({ days }: { days: ConversionDay[] }) {
  const [expanded, setExpanded] = useState(false);
  const all = [...days].reverse(); // eng so'nggi kun yuqorida
  const rows = expanded ? all : all.slice(0, HISTORY_COLLAPSED);
  const canToggle = all.length > HISTORY_COLLAPSED;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle title="Kunlik tarix" subtitle="Har kunlik natijalar saqlanadi — so'nggi kunlar" />
        {canToggle && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            title={expanded ? "Yig'ish" : "Hammasini ko'rsatish"}
            className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className={`h-4 w-4 transition-transform duration-300 ${expanded ? "" : "rotate-180"}`}
            >
              <path d="M3.5 10.5 8 6l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="pb-2 text-left font-medium">Sana</th>
              <th className="pb-2 text-right font-medium">Qo&apos;ng&apos;iroqlar</th>
              <th className="pb-2 text-right font-medium">Trafik konv.</th>
              <th className="pb-2 text-right font-medium">Sotuv konv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.date} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2.5 text-slate-600 dark:text-slate-300">{d.date}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-900 dark:text-white">{d.calls}</td>
                <td className="py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{NUM.format(d.traffic_conversion)}%</td>
                <td className="py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{NUM.format(d.sales_conversion)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* Kunlik gaplashuv daqiqalari — har kunda jami necha daqiqa gaplashilgan.
 * HAMMA audio hisobga olinadi (3 soniyalik ham, 40 daqiqalik ham), tahlil
 * qilingan-qilinmaganidan qat'i nazar. Kun Toshkent vaqti bo'yicha, shuning
 * uchun kechki (21:00 dagi) qo'ng'iroqlar ham SHU kunga tushadi. */
function fmtMinutes(min: number): string {
  if (min < 60) return `${NUM.format(min)} daq`;
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return `${h} soat ${m} daq`;
}

function DailyMinutesCard({ result }: { result: DailyMinutesResult }) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <Card className="p-6">
      <SectionTitle
        title="Kunlik gaplashuv (daqiqa)"
        subtitle={`Har kunda jami necha daqiqa gaplashilgan · ${result.summary.days} kun · ${result.summary.calls} qo'ng'iroq · jami ${fmtMinutes(result.summary.minutes)}`}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400 dark:border-slate-700">
              <th className="pb-2 font-medium">Kun</th>
              <th className="pb-2 text-right font-medium">Qo&apos;ng&apos;iroq</th>
              <th className="pb-2 text-right font-medium">Jami gaplashuv</th>
              <th className="pb-2 text-right font-medium">O&apos;rtacha</th>
            </tr>
          </thead>
          <tbody>
            {result.days.map((d) => {
              const avg = d.calls ? Math.round((d.minutes / d.calls) * 10) / 10 : 0;
              const isOpen = openDay === d.date;
              return (
                <tr
                  key={d.date}
                  onClick={() => setOpenDay(isOpen ? null : d.date)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="py-2.5">
                    <span className={d.date === todayKey ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-600 dark:text-slate-300"}>
                      {d.date}
                      {d.date === todayKey && " · bugun"}
                    </span>
                    {isOpen && d.operators.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {d.operators.map((o) => (
                          <li key={o.name} className="flex justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>{o.name}</span>
                            <span className="tabular-nums">
                              {o.calls} ta · {fmtMinutes(o.minutes)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{d.calls}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{fmtMinutes(d.minutes)}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{NUM.format(avg)} daq</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Kunni bosing — o&apos;sha kuni har bir operator qancha gaplashgani ko&apos;rinadi.
      </p>
    </Card>
  );
}

export function ComparisonView() {
  const [pop, setPop] = useState<PopStats | null>(null);
  const [history, setHistory] = useState<ConversionDay[] | null>(null);
  const [daily, setDaily] = useState<DailyMinutesResult | null>(null);
  const [error, setError] = useState<AnalyticsError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  // Avtomatik yangilanish: realtime ishlamasa ham panel eskirmaydi
  // (qarang: lib/useLiveRefresh.ts).
  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 30000); 

  const handleRetry = () => {
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    const ctrl = new AbortController();

    Promise.all([
      fetchPopStats(null, ctrl.signal),
      fetchConversionHistory(null, 30, ctrl.signal),
      // Kunlik daqiqalar alohida: backend eski bo'lsa ham panel ishlayversin.
      fetchDailyMinutes(30, ctrl.signal).catch(() => null),
    ])
      .then(([p, h, dm]) => {
        if (!ctrl.signal.aborted) {
          setError(null);
          setPop(p);
          setHistory(h);
          setDaily(dm);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          const analyticsError = categorizeError(err);
          setError(analyticsError);
          setIsLoading(false);
        }
      });

    return () => ctrl.abort();
  }, [reloadKey]);

  return (
    <div className="animate-slide-up space-y-6">
      <SectionTitle
        title="Solishtirish paneli"
        subtitle="Kunlik, haftalik va oylik natijalar — oldingi davr bilan yonma-yon"
      />

      {isLoading && !pop && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      )}

      {error && <AnalyticsErrorUI error={error} onRetry={handleRetry} />}

      {pop && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ComparisonCard title="Kunlik" prevLabel="Kecha" curLabel="Bugun" block={pop.daily} />
          <ComparisonCard title="Haftalik" prevLabel="O'tgan hafta" curLabel="Bu hafta" block={pop.weekly} />
          <ComparisonCard title="Oylik" prevLabel="O'tgan oy" curLabel="Bu oy" block={pop.monthly} />
        </div>
      )}

      {daily && daily.days.length > 0 && <DailyMinutesCard result={daily} />}

      {history && history.length > 0 && <HistoryCard days={history} />}
    </div>
  );
}
