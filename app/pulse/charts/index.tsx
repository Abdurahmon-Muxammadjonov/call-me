"use client";

/* Grafik primitivlari (spetsifikatsiya §3.3) — kutubxonasiz, oddiy SVG/CSS.
 * Ma'lumot o'zgarganda halqalar stroke-dashoffset, ustunlar balandligi
 * 240 ms da o'tadi (§4.5); prefers-reduced-motion da darhol. Ustunlarda
 * scaleY o'rniga height: scaleY burchak radiusini ezib yuboradi (4 px
 * "kelajak" ustunlari maketdagidek dumaloq qolishi kerak). */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* ------------------------------------------------------ o'lcham kuzatish */

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0]?.contentRect.width ?? 0);
      setW((prev) => (prev === width ? prev : width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* -------------------------------------------- ustun kursori (hover/klaviatura)
 * Grafik konteyneri fokuslanadi, ←/→ faol ustunni siljitadi; sichqoncha
 * ustida bo'lsa x bo'yicha ustun tanlanadi. Tooltip faol ustun ustida. */

export function useColumnCursor(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !count) return;
      const i = Math.min(count - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * count)));
      setActive(i);
    },
    [count]
  );
  const onPointerLeave = useCallback(() => setActive(null), []);
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!count) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActive((a) => {
          const base = a ?? (e.key === "ArrowRight" ? -1 : count);
          return Math.min(count - 1, Math.max(0, base + (e.key === "ArrowRight" ? 1 : -1)));
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(count - 1);
      } else if (e.key === "Escape") {
        setActive(null);
      }
    },
    [count]
  );
  const onBlur = useCallback(() => setActive(null), []);
  return { active, setActive, bind: { onPointerMove, onPointerLeave, onKeyDown, onBlur } };
}

/* Faol ustun ustidagi kichik tooltip (grafik ichida, absolute). */
export function ChartTooltip({
  x,
  children,
  containerWidth,
  top = -8,
}: {
  /* ustun markazi, px (konteynerga nisbatan) */
  x: number;
  children: ReactNode;
  containerWidth: number;
  top?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (ref.current) setW(ref.current.offsetWidth);
  }, [children]);
  const left = Math.max(0, Math.min(x - w / 2, Math.max(0, containerWidth - w)));
  return (
    <div
      ref={ref}
      role="status"
      className="pn-tooltip pointer-events-none absolute z-10 whitespace-nowrap rounded-[14px] border border-pn-border-3 px-3 py-2 text-[12px] leading-snug text-pn-text"
      style={{ left, top, transform: "translateY(-100%)", visibility: w ? "visible" : "hidden" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ MiniBars
 * Hero soatlik ustunlari va pastel plitkalar (§6.2). Balandlik
 * max(minH, round(v / max × height)). `null` — kelajak (minH, `futureColor`). */

export interface MiniBar {
  key: string;
  value: number | null;
  color: string;
}

export function MiniBars({
  bars,
  height,
  barWidth,
  gap,
  radius,
  minH,
  futureColor,
  tooltip,
  ariaLabel,
  testId,
  className,
}: {
  bars: MiniBar[];
  height: number;
  barWidth: number;
  gap: number;
  radius: number;
  minH: number;
  futureColor?: string;
  tooltip?: (bar: MiniBar, index: number) => ReactNode;
  ariaLabel: string;
  testId?: string;
  className?: string;
}) {
  const max = Math.max(0, ...bars.map((b) => b.value ?? 0));
  const width = bars.length * barWidth + Math.max(0, bars.length - 1) * gap;
  const cursor = useColumnCursor(bars.length);
  const a = cursor.active;
  return (
    <div
      className={`relative outline-none ${className ?? ""}`}
      style={{ width, height }}
      tabIndex={tooltip ? 0 : undefined}
      role="img"
      aria-label={ariaLabel}
      data-testid={testId}
      {...(tooltip ? cursor.bind : {})}
    >
      <div className="flex h-full items-end" style={{ gap }}>
        {bars.map((b, i) => {
          const h = b.value == null ? minH : Math.max(minH, max > 0 ? Math.round((b.value / max) * height) : minH);
          return (
            <div
              key={b.key}
              data-testid={testId ? `${testId}-bar-${i}` : undefined}
              data-value={b.value ?? ""}
              className="pn-bar shrink-0"
              style={{
                width: barWidth,
                height: h,
                borderRadius: radius,
                background: b.value == null ? futureColor ?? b.color : b.color,
                opacity: a != null && a !== i ? 0.72 : 1,
              }}
            />
          );
        })}
      </div>
      {tooltip && a != null && bars[a] && (
        <ChartTooltip x={a * (barWidth + gap) + barWidth / 2} containerWidth={width}>
          {tooltip(bars[a], a)}
        </ChartTooltip>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- SemiGauge
 * 180×104: trek `M 14 94 A 76 76 0 0 1 166 94`, pathLength=100 (§6.2). */

export function SemiGauge({
  fill,
  color,
  tick,
  children,
}: {
  /* 0–100 */
  fill: number;
  color: string;
  tick?: { x1: number; y1: number; x2: number; y2: number } | null;
  children?: ReactNode;
}) {
  const d = "M 14 94 A 76 76 0 0 1 166 94";
  return (
    <div className="relative h-[104px] w-[180px] shrink-0">
      <svg width="180" height="104" viewBox="0 0 180 104" aria-hidden>
        <path d={d} fill="none" stroke="var(--pn-track-inner)" strokeWidth="14" strokeLinecap="round" />
        {fill > 0 && (
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={100 - fill}
            className="pn-ring"
          />
        )}
        {tick && (
          <line x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="var(--pn-text)" strokeWidth="2.5" strokeLinecap="round" />
        )}
      </svg>
      <div className="pn-display absolute inset-x-0 bottom-[2px] text-center text-[30px] leading-none tracking-[-0.03em]">
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Ring
 * Jadvaldagi 28 px halqa (r 11, chiziq 4) va boshqa o'lchamlar. */

export function Ring({
  size = 28,
  r = 11,
  stroke = 4,
  pct,
  color,
  track = "var(--pn-track-inner)",
}: {
  size?: number;
  r?: number;
  stroke?: number;
  pct: number;
  color: string;
  track?: string;
}) {
  const c = size / 2;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      {p > 0 && (
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          strokeDashoffset={100 - p}
          transform={`rotate(-90 ${c} ${c})`}
          className="pn-ring"
        />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------ SplitBar
 * Chiquvchi / kiruvchi (§6.2 Voronka pasti): ikki bo'lak, orasi 3 px. */

export function SplitBar({
  a,
  b,
  colorA,
  colorB,
  height = 10,
}: {
  a: number;
  b: number;
  colorA: string;
  colorB: string;
  height?: number;
}) {
  const total = a + b;
  const pa = total > 0 ? (a / total) * 100 : 0;
  const pb = total > 0 ? 100 - pa : 0;
  return (
    <div className="flex w-full" style={{ height, gap: a > 0 && b > 0 ? 3 : 0 }} aria-hidden>
      {total === 0 ? (
        <div className="w-full bg-pn-bar-dim" style={{ borderRadius: height / 2 }} />
      ) : (
        <>
          {a > 0 && <div className="pn-grow" style={{ width: `${pa}%`, borderRadius: height / 2, background: colorA }} />}
          {b > 0 && <div className="pn-grow" style={{ width: `${pb}%`, borderRadius: height / 2, background: colorB }} />}
        </>
      )}
    </div>
  );
}
