"use client";

import { useState, type SVGProps } from "react";

/* =====================================================================
 * "Vaqt Intervallari Tahlili" — period-over-period comparison widget.
 *
 * Apple ultra-minimalist: white surfaces, neutral-100 hairline dividers,
 * generous whitespace, crisp micro-typography, subtle green/red delta pills.
 *
 * Pure & presentational — receives a dynamic backend payload via props,
 * holds NO mock data, and does no fetching. Dark-mode parity is preserved
 * so it sits cleanly inside the SalesPulse dashboard.
 * ===================================================================== */

export type PeriodKey = "daily" | "weekly" | "monthly";

/** One period's figure: current value + the value of the previous period. */
export interface PeriodDatum {
  current: number;
  previous: number;
  /** Override the comparison phrase, e.g. "kechagiga qaraganda". */
  comparisonLabel?: string;
}

/** The dynamic payload the backend sends. */
export interface TimeIntervalData {
  /** Metric name shown as the widget subtitle, e.g. "Qo'ng'iroqlar". */
  metricLabel: string;
  /** Unit suffix appended to every value, e.g. "ta qo'ng'iroq" | "minut". */
  unit: string;
  daily: PeriodDatum;
  weekly: PeriodDatum;
  monthly: PeriodDatum;
}

const PERIODS: { key: PeriodKey; label: string; comparison: string }[] = [
  { key: "daily", label: "Kunlik", comparison: "kechagiga qaraganda" },
  { key: "weekly", label: "Haftalik", comparison: "o'tgan haftaga qaraganda" },
  { key: "monthly", label: "Oylik", comparison: "o'tgan oyga qaraganda" },
];

const NUM = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 });

type Direction = "up" | "down" | "flat";

function computeDelta(current: number, previous: number): { dir: Direction; pct: number } {
  if (!previous) return { dir: current > 0 ? "up" : "flat", pct: current > 0 ? 100 : 0 };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return { dir: "flat", pct: 0 };
  return { dir: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

/* ---------- Crisp micro triangle ---------- */
function Triangle({ up, ...props }: { up: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 8 8" aria-hidden className="h-2 w-2" {...props}>
      <path d={up ? "M4 0 8 6H0Z" : "M0 2h8L4 8Z"} fill="currentColor" />
    </svg>
  );
}

/* ---------- Delta pill ---------- */
function DeltaBadge({ datum, comparison }: { datum: PeriodDatum; comparison: string }) {
  const { dir, pct } = computeDelta(datum.current, datum.previous);
  const phrase = datum.comparisonLabel ?? comparison;

  const tone =
    dir === "up"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
      : dir === "down"
      ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-tight transition-colors duration-300 ${tone}`}
    >
      {dir !== "flat" && <Triangle up={dir === "up"} />}
      <span className="tabular-nums">
        {dir === "flat" ? (
          <>{phrase} o&apos;zgarishsiz</>
        ) : (
          <>
            {pct.toFixed(1)}% {phrase} {dir === "up" ? "yuqori" : "past"}
          </>
        )}
      </span>
    </span>
  );
}

/* ---------- Shared metric block (value + label + pill + previous) ---------- */
function MetricBlock({
  unit,
  datum,
  comparison,
}: {
  unit: string;
  datum: PeriodDatum;
  comparison: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-4xl font-semibold tracking-tight text-neutral-900 tabular-nums dark:text-white sm:text-5xl">
        {NUM.format(datum.current)}
        <span className="ml-2 align-baseline text-base font-medium text-neutral-400 dark:text-neutral-500 sm:text-lg">
          {unit}
        </span>
      </p>
      <DeltaBadge datum={datum} comparison={comparison} />
      <div className="mt-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Oldingi davr:{" "}
          <span className="font-medium text-neutral-500 tabular-nums dark:text-neutral-400">
            {NUM.format(datum.previous)} {unit}
          </span>
        </p>
      </div>
    </div>
  );
}

export interface TimeIntervalAnalysisProps {
  data: TimeIntervalData;
  /** "tabs" (Apple segmented control) or "grid" (three cards). Default: "tabs". */
  layout?: "tabs" | "grid";
  className?: string;
}

export function TimeIntervalAnalysis({
  data,
  layout = "tabs",
  className = "",
}: TimeIntervalAnalysisProps) {
  const [active, setActive] = useState<PeriodKey>("daily");
  const activeIndex = PERIODS.findIndex((p) => p.key === active);

  return (
    <section
      className={`rounded-3xl border border-neutral-100 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950 sm:p-8 ${className}`}
    >
      {/* Header */}
      <header className="mb-7">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
          Vaqt Intervallari Tahlili
        </h2>
        <p className="mt-1 text-[13px] text-neutral-400 dark:text-neutral-500">
          {data.metricLabel} — davrlararo taqqoslash
        </p>
      </header>

      {layout === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PERIODS.map((p) => (
            <div
              key={p.key}
              className="rounded-2xl border border-neutral-100 p-5 transition-all duration-300 hover:border-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-700"
            >
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                {p.label}
              </p>
              <MetricBlock unit={data.unit} datum={data[p.key]} comparison={p.comparison} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Apple-style segmented control with a sliding indicator */}
          <div className="relative mb-8 grid grid-cols-3 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
            <span
              className="absolute inset-y-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-neutral-700"
              style={{
                width: "calc((100% - 0.5rem) / 3)",
                transform: `translateX(${activeIndex * 100}%)`,
              }}
            />
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                className={`relative z-10 rounded-full py-2 text-sm font-medium transition-colors duration-300 ${
                  active === p.key
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* `key` triggers a fade each time the active period changes */}
          <div key={active} className="animate-fade-in">
            <MetricBlock
              unit={data.unit}
              datum={data[active]}
              comparison={PERIODS[activeIndex].comparison}
            />
          </div>
        </>
      )}
    </section>
  );
}
