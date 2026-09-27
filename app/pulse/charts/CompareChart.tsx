"use client";

/* Ikki davr solishtirma grafigi (Solishtirish › "Soatlar bo'yicha"):
 * B — to'ldirilgan maydon + 3 px chiziq (yorug'da --accent-strong, §4.3),
 * A — 2 px uzuq chiziq. Tooltip hover yoki ←/→ ga ergashadi, hover
 * bo'lmasa B cho'qqisida turadi (D10). "Hozir" chizig'i joriy vaqt
 * tushgan birlikda (D15). O'q qiymatlari niceTicks (D8). */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useColumnCursor, useWidth } from "./index";
import { niceTicks } from "../lib/numbers";

const H = 200;

export interface ComparePoint {
  key: string;
  a: number | null;
  b: number | null;
}

export function CompareChart({
  points,
  nowIndex,
  xLabel,
  tooltip,
  ariaLabel,
  testId,
}: {
  points: ComparePoint[];
  nowIndex: number | null;
  xLabel: (p: ComparePoint, i: number) => string;
  tooltip: (p: ComparePoint, i: number) => ReactNode;
  ariaLabel: string;
  testId?: string;
}) {
  const n = points.length;
  const max = Math.max(0, ...points.map((p) => Math.max(p.a ?? 0, p.b ?? 0)));
  const ticks = niceTicks(max, 3);
  const yMax = ticks[ticks.length - 1] || 1;
  const [ref, W] = useWidth<HTMLDivElement>();
  const step = n > 1 ? W / (n - 1) : 0;
  const x = (i: number) => i * step;
  const y = (v: number) => H - (Math.min(v, yMax) / yMax) * H;
  const cursor = useColumnCursor(n, { points: true });

  // Hover bo'lmasa — B cho'qqisi (D10).
  let peak = -1;
  points.forEach((p, i) => {
    if (p.b != null && (peak < 0 || p.b > (points[peak].b ?? -1))) peak = i;
  });
  const active = cursor.active ?? (peak >= 0 ? peak : null);

  const bIdx = points.map((p, i) => (p.b == null ? -1 : i)).filter((i) => i >= 0);
  const lastB = bIdx.length ? bIdx[bIdx.length - 1] : -1;
  const bPts = bIdx.map((i) => `${x(i).toFixed(1)},${y(points[i].b!).toFixed(1)}`);
  const aPts = points
    .map((p, i) => (p.a == null ? null : `${x(i).toFixed(1)},${y(p.a).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  const area = bPts.length ? `M${x(bIdx[0]).toFixed(1)},${H} L${bPts.join(" L")} L${x(lastB).toFixed(1)},${H} Z` : "";

  // Tooltip joylashuvi: nuqtaning o'ng tomonida, joy bo'lmasa chapda.
  const tipRef = useRef<HTMLDivElement>(null);
  const [tipW, setTipW] = useState(188);
  useEffect(() => {
    if (tipRef.current) setTipW(tipRef.current.offsetWidth);
  }, [active, points]);
  const ax = active != null ? x(active) : 0;
  const tipLeft = ax + 16 + tipW > W ? ax - 16 - tipW : ax + 16;

  return (
    <div className="flex gap-3">
      <div
        className="pn-mono flex h-[200px] w-[30px] shrink-0 flex-col items-end justify-between text-[11px] text-pn-subtle"
        aria-hidden
      >
        {[...ticks].reverse().map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
        <div
          ref={ref}
          className="relative h-[200px] outline-none"
          tabIndex={0}
          role="img"
          aria-label={ariaLabel}
          data-testid={testId}
          {...cursor.bind}
        >
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
            <div className="h-px bg-pn-grid" />
            <div className="h-px bg-pn-grid" />
            <div className="h-px bg-pn-grid" />
            <div className="h-px bg-pn-axis" />
          </div>
          {W > 0 && n > 0 && (
            <svg className="absolute inset-0 overflow-visible" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
              {area && <path d={area} fill="var(--pn-accent-area)" />}
              {aPts && (
                <polyline points={aPts} fill="none" stroke="var(--pn-muted)" strokeWidth="2" strokeDasharray="6 6" strokeLinejoin="round" />
              )}
              {bPts.length > 0 && (
                <polyline
                  points={bPts.join(" ")}
                  fill="none"
                  stroke="var(--pn-accent-strong)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {nowIndex != null && (
                <line
                  data-testid={testId ? `${testId}-now` : undefined}
                  x1={x(nowIndex)}
                  y1={0}
                  x2={x(nowIndex)}
                  y2={H}
                  stroke="var(--pn-bar-dim-2)"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                />
              )}
              {nowIndex != null && nowIndex === lastB && active !== lastB && points[lastB]?.b != null && (
                <circle cx={x(lastB)} cy={y(points[lastB].b!)} r="5" fill="var(--pn-panel)" stroke="var(--pn-accent-strong)" strokeWidth="2.5" />
              )}
              {active != null && points[active] && (
                <>
                  {points[active].a != null && (
                    <circle cx={ax} cy={y(points[active].a!)} r="5" fill="var(--pn-panel)" stroke="var(--pn-muted)" strokeWidth="2.5" />
                  )}
                  {points[active].b != null && (
                    <circle cx={ax} cy={y(points[active].b!)} r="6" fill="var(--pn-accent)" stroke="var(--pn-panel)" strokeWidth="3" />
                  )}
                </>
              )}
            </svg>
          )}
          {active != null && points[active] && W > 0 && (
            <div
              ref={tipRef}
              role="status"
              data-testid={testId ? `${testId}-tip` : undefined}
              className="pn-tooltip pointer-events-none absolute top-[26px] flex w-[188px] flex-col gap-2 rounded-[14px] border border-pn-border-3 px-[14px] py-3 text-[13px]"
              style={{ left: Math.max(0, tipLeft) }}
            >
              {tooltip(points[active], active)}
            </div>
          )}
        </div>
        <div className="relative h-[14px]" aria-hidden>
          {W > 0 &&
            points.map((p, i) => {
              const label = xLabel(p, i);
              if (!label) return null;
              return (
                <span
                  key={p.key}
                  className="pn-mono absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px]"
                  style={{ left: x(i), color: i === active ? "var(--pn-text)" : "var(--pn-subtle)" }}
                >
                  {label}
                </span>
              );
            })}
        </div>
      </div>
    </div>
  );
}
