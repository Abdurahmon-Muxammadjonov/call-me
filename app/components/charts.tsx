"use client";

/* Lightweight SVG charts for the dashboard — no charting library, so they
 * inherit the app's fonts/colors and stay tiny. Width is measured with a
 * ResizeObserver so axes/labels render in real pixels (a stretched viewBox
 * would distort text). Hover shows a crosshair + tooltip for the nearest
 * point. Respects the dashboard's light/dark palette via currentColor and
 * slate tokens. */

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface TrendSeries {
  name: string;
  color: string;
  values: number[];
  /* Dashed line — e.g. a secondary/derived series. */
  dashed?: boolean;
}

function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * p;
}

/* Catmull-Rom → cubic bezier for a smooth line through every point. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function AreaTrendChart({
  labels,
  series,
  height = 240,
  formatValue = (v) => v.toLocaleString(),
}: {
  labels: string[];
  series: TrendSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = Math.max(0, height - pad.top - pad.bottom);
  const n = labels.length;

  const maxV = useMemo(() => niceMax(Math.max(1, ...series.flatMap((s) => s.values))), [series]);
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / maxV) * innerH;

  const gridSteps = 4;
  // Stable per-instance id for the gradient defs (useId is SSR-safe and pure).
  const gridId = `grad-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // Show every k-th x label so they never collide.
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 64))));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!n || !innerW) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.left;
    const i = Math.round((px / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block overflow-visible"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`${gridId}-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid + y labels */}
          {Array.from({ length: gridSteps + 1 }).map((_, gi) => {
            const v = (maxV / gridSteps) * gi;
            const yy = y(v);
            return (
              <g key={gi}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={yy}
                  y2={yy}
                  className="stroke-slate-200/80 dark:stroke-white/[0.06]"
                  strokeDasharray={gi === 0 ? undefined : "3 4"}
                />
                <text
                  x={pad.left - 8}
                  y={yy + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] tabular-nums dark:fill-slate-500"
                >
                  {formatValue(Math.round(v))}
                </text>
              </g>
            );
          })}

          {/* x labels */}
          {labels.map((l, i) =>
            i % labelEvery === 0 || i === n - 1 ? (
              <text
                key={i}
                x={x(i)}
                y={height - 8}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                className="fill-slate-400 text-[10px] dark:fill-slate-500"
              >
                {l}
              </text>
            ) : null
          )}

          {/* Series */}
          {series.map((s, si) => {
            const pts: [number, number][] = s.values.map((v, i) => [x(i), y(v)]);
            const line = smoothPath(pts);
            const area = `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
            return (
              <g key={si}>
                {!s.dashed && <path d={area} fill={`url(#${gridId}-${si})`} />}
                <path
                  d={line}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? "4 4" : undefined}
                />
              </g>
            );
          })}

          {/* Crosshair + points */}
          {hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={pad.top + innerH}
                className="stroke-slate-300 dark:stroke-white/20"
                strokeDasharray="3 3"
              />
              {series.map((s, si) => (
                <circle
                  key={si}
                  cx={x(hover)}
                  cy={y(s.values[hover] ?? 0)}
                  r={4}
                  fill={s.color}
                  className="stroke-white dark:stroke-[#0f1421]"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>
      )}

      {/* Tooltip (HTML, so it can use the app's card styling) */}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#0f1421]/95"
          style={{
            left: Math.min(Math.max(x(hover) - 72, 0), Math.max(0, width - 150)),
          }}
        >
          <p className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">{labels[hover]}</p>
          {series.map((s, si) => (
            <div key={si} className="flex items-center justify-between gap-4 py-0.5">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-white">
                {formatValue(s.values[hover] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Compact vertical bars — for per-bucket comparisons (e.g. calls per
 * employee, per hour). Same measuring/tooltip approach as the area chart. */
export function BarChart({
  labels,
  values,
  color = "#3b82f6",
  height = 200,
  formatValue = (v) => v.toLocaleString(),
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 8, bottom: 28, left: 36 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = Math.max(0, height - pad.top - pad.bottom);
  const n = values.length;
  const maxV = niceMax(Math.max(1, ...values));
  const slot = n ? innerW / n : 0;
  const barW = Math.max(6, Math.min(36, slot * 0.6));
  const y = (v: number) => pad.top + innerH - (v / maxV) * innerH;

  return (
    <div ref={ref} className="relative w-full select-none">
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" onMouseLeave={() => setHover(null)}>
          {Array.from({ length: 5 }).map((_, gi) => {
            const v = (maxV / 4) * gi;
            return (
              <g key={gi}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y(v)}
                  y2={y(v)}
                  className="stroke-slate-200/80 dark:stroke-white/[0.06]"
                  strokeDasharray={gi === 0 ? undefined : "3 4"}
                />
                <text x={pad.left - 8} y={y(v) + 3.5} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums dark:fill-slate-500">
                  {formatValue(Math.round(v))}
                </text>
              </g>
            );
          })}
          {values.map((v, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const isH = hover === i;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={pad.left + slot * i} y={pad.top} width={slot} height={innerH} fill="transparent" />
                <rect
                  x={cx - barW / 2}
                  y={y(v)}
                  width={barW}
                  height={Math.max(0, y(0) - y(v))}
                  rx={6}
                  fill={color}
                  opacity={isH ? 1 : 0.75}
                  className="transition-opacity"
                />
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px] dark:fill-slate-500">
                  {labels[i]}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#0f1421]/95"
          style={{ left: Math.min(Math.max(pad.left + slot * hover + slot / 2 - 50, 0), Math.max(0, width - 110)) }}
        >
          <span className="text-slate-500 dark:text-slate-400">{labels[hover]}</span>{" "}
          <span className="font-semibold tabular-nums text-slate-800 dark:text-white">{formatValue(values[hover] ?? 0)}</span>
        </div>
      )}
    </div>
  );
}
