"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle, Skeleton } from "./ui";
import {
  fetchPopStats,
  fetchConversionHistory,
  type PopStats,
  type PopBlock,
  type ConversionDay,
} from "../lib/api";

/* =====================================================================
 * "Solishtirish paneli" — alohida nav bo'limi.
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
    ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
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
      <h3 className="mb-4 text-base font-semibold tracking-tight text-neutral-900 dark:text-white">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
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
              <tr key={r.key} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-2.5 text-neutral-600 dark:text-neutral-300">{r.label}</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-400 dark:text-neutral-500">
                  {NUM.format(m.previous)} <span className="text-xs">{r.unit}</span>
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {NUM.format(m.current)} <span className="text-xs font-normal text-neutral-400">{r.unit}</span>
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
            className="shrink-0 rounded-full border border-neutral-200 p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
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
            <tr className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              <th className="pb-2 text-left font-medium">Sana</th>
              <th className="pb-2 text-right font-medium">Qo&apos;ng&apos;iroqlar</th>
              <th className="pb-2 text-right font-medium">Trafik konv.</th>
              <th className="pb-2 text-right font-medium">Sotuv konv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.date} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-2.5 text-neutral-600 dark:text-neutral-300">{d.date}</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-900 dark:text-white">{d.calls}</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">{NUM.format(d.traffic_conversion)}%</td>
                <td className="py-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">{NUM.format(d.sales_conversion)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ComparisonView() {
  const [pop, setPop] = useState<PopStats | null>(null);
  const [history, setHistory] = useState<ConversionDay[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setError(false);
    Promise.all([fetchPopStats(null, ctrl.signal), fetchConversionHistory(null, 30, ctrl.signal)])
      .then(([p, h]) => {
        setPop(p);
        setHistory(h);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError(true);
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="animate-slide-up space-y-6">
      <SectionTitle
        title="Solishtirish paneli"
        subtitle="Kunlik, haftalik va oylik natijalar — oldingi davr bilan yonma-yon"
      />

      {!pop && !error && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      )}

      {error && (
        <Card className="p-5">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Ma&apos;lumot yuklanmadi. Backend (/analytics/pop) ulanganini va{" "}
            <code>calls_pop_stats</code> funksiyasi yaratilganini tekshiring.
          </p>
        </Card>
      )}

      {pop && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ComparisonCard title="Kunlik" prevLabel="Kecha" curLabel="Bugun" block={pop.daily} />
          <ComparisonCard title="Haftalik" prevLabel="O'tgan hafta" curLabel="Bu hafta" block={pop.weekly} />
          <ComparisonCard title="Oylik" prevLabel="O'tgan oy" curLabel="Bu oy" block={pop.monthly} />
        </div>
      )}

      {history && history.length > 0 && <HistoryCard days={history} />}
    </div>
  );
}
