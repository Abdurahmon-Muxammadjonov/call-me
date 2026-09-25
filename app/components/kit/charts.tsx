"use client";

import { useId } from "react";

/* =====================================================================
 * GRAFIKLAR — yengil SVG komponentlar.
 *
 * Loyihada recharts yo'q edi; spetsifikatsiya bo'yicha yangi kutubxona
 * qo'shilmadi. Shu sabab kerakli uchta shakl shu yerda yozilgan:
 * gradient/soyasiz, faqat gorizontal to'r chiziqlari, animatsiya 300ms
 * dan oshmaydi.
 * ===================================================================== */

const AXIS_FONT = { fontFamily: "var(--font-geist-mono)", fontSize: 11, fill: "var(--subtle)" } as const;

/** Gorizontal to'r chiziqlari + Y o'qi yozuvlari. */
function Grid({ width, height, max, lines = 4, padLeft }: {
  width: number; height: number; max: number; lines?: number; padLeft: number;
}) {
  return (
    <g aria-hidden>
      {Array.from({ length: lines + 1 }, (_, i) => {
        const y = height - (i / lines) * height;
        const value = Math.round((i / lines) * max);
        return (
          <g key={i}>
            <line x1={padLeft} x2={width} y1={y} y2={y} stroke="var(--grid-line)" strokeWidth={1} />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" {...AXIS_FONT}>{value}</text>
          </g>
        );
      })}
    </g>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  /** Ustiga qo'yiladigan chiziq (masalan uzun qo'ng'iroqlar). */
  line?: number;
  highlight?: boolean;
}

/**
 * Ustunli grafik + ixtiyoriy chiziq (Analitika 3.1 C).
 * Ustun kengligi 20px, bugungi kun --chart, qolganlari --chart-dim.
 */
export function BarChart({
  data, height = 180, lineColor = "var(--teal)", barWidth = 20,
}: {
  data: BarDatum[]; height?: number; lineColor?: string; barWidth?: number;
}) {
  const padLeft = 34;
  const width = Math.max(240, padLeft + data.length * (barWidth + 12));
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.line ?? 0)));
  const step = (width - padLeft) / Math.max(1, data.length);
  const x = (i: number) => padLeft + step * i + step / 2;
  const y = (v: number) => height - (v / max) * height;

  const linePts = data.filter((d) => d.line !== undefined).map((d, i) => `${x(i)},${y(d.line ?? 0)}`);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height + 24} role="img" style={{ minWidth: "100%" }}>
        <Grid width={width} height={height} max={max} padLeft={padLeft} />
        {data.map((d, i) => (
          <rect
            key={d.label}
            x={x(i) - barWidth / 2}
            y={y(d.value)}
            width={barWidth}
            height={Math.max(1, height - y(d.value))}
            rx={5}
            fill={d.highlight ? "var(--chart)" : "var(--chart-dim)"}
          />
        ))}
        {linePts.length > 1 && (
          <polyline points={linePts.join(" ")} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}
        <line x1={padLeft} x2={width} y1={height} y2={height} stroke="var(--axis-line)" strokeWidth={1} />
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={height + 16} textAnchor="middle" {...AXIS_FONT} fill={d.highlight ? "var(--text)" : "var(--subtle)"}>
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/**
 * Ikki chiziqli grafik: joriy davr (to'ldirish bilan) va oldingisi
 * (punktir) — Solishtirish paneli 3.3 B.
 */
export function LineChart({
  labels, current, previous, height = 190,
}: {
  labels: string[]; current: number[]; previous: number[]; height?: number;
}) {
  const gradId = useId();
  const padLeft = 34;
  const width = Math.max(320, padLeft + labels.length * 44);
  const max = Math.max(1, ...current, ...previous);
  const x = (i: number) => padLeft + (i / Math.max(1, labels.length - 1)) * (width - padLeft - 8);
  const y = (v: number) => height - (v / max) * height;
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height + 24} role="img" style={{ minWidth: "100%" }}>
        <Grid width={width} height={height} max={max} padLeft={padLeft} />
        {current.length > 1 && (
          <>
            <path d={`${path(current)} L${x(current.length - 1)},${height} L${x(0)},${height} Z`} fill={`url(#${gradId})`} />
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.12)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0.12)" />
            </linearGradient>
          </>
        )}
        {previous.length > 1 && (
          <path d={path(previous)} fill="none" stroke="var(--subtle)" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />
        )}
        {current.length > 1 && (
          <path d={path(current)} fill="none" stroke="var(--chart)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}
        <line x1={padLeft} x2={width} y1={height} y2={height} stroke="var(--axis-line)" strokeWidth={1} />
        {labels.map((l, i) => (
          <text key={l} x={x(i)} y={height + 16} textAnchor="middle" {...AXIS_FONT}>{l}</text>
        ))}
      </svg>
    </div>
  );
}

/** Vertikal ustunlar — Boshqaruvdagi "Vaqt intervallari" (3.2 B). */
export function IntervalBars({
  items,
}: {
  items: { label: string; value: number; share: string; top?: boolean }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex items-end justify-between gap-3">
      {items.map((i) => (
        <div key={i.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="font-mono text-sm font-semibold" style={{ color: i.top ? "var(--orange-soft)" : "var(--text-2)" }}>
            {i.value}
          </span>
          <span
            className="w-full max-w-14 rounded-t-lg"
            style={{
              height: Math.max(6, (i.value / max) * 110),
              background: i.top ? "var(--orange)" : "var(--chart-dim)",
              borderRadius: "8px 8px 3px 3px",
            }}
            aria-hidden
          />
          <span className="truncate text-xs" style={{ color: "var(--subtle)" }}>{i.label}</span>
          <span className="font-mono text-[11px]" style={{ color: "var(--subtle)" }}>{i.share}</span>
        </div>
      ))}
    </div>
  );
}
