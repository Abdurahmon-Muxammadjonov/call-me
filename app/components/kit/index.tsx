"use client";

import type { CSSProperties, ReactNode } from "react";
import { formatDelta, formatNumber, type Delta } from "../../lib/format";

/* =====================================================================
 * DASHBOARD KOMPONENTLARI TO'PLAMI
 *
 * Ranglar globals.css dagi semantik tokenlardan (--surface, --muted,
 * --green ...). Mavzu almashganda token qiymati almashadi, shuning
 * uchun bu yerda `dark:` variantlari yo'q.
 *
 * O'lchamlar spetsifikatsiyadan: karta radiusi 16px, KPI plitka 14px,
 * tugma 10–12px, bosiladigan element ≥44px.
 * ===================================================================== */

export type Tone = "green" | "amber" | "orange" | "violet" | "teal" | "accent" | "neutral";

export const TONE: Record<Tone, { color: string; tint: string }> = {
  green: { color: "var(--green)", tint: "var(--green-tint)" },
  amber: { color: "var(--amber)", tint: "var(--amber-tint)" },
  orange: { color: "var(--orange)", tint: "var(--orange-tint)" },
  violet: { color: "var(--violet)", tint: "var(--violet-tint)" },
  teal: { color: "var(--teal)", tint: "var(--teal-tint)" },
  accent: { color: "var(--accent-icon)", tint: "var(--blue-tint)" },
  neutral: { color: "var(--muted)", tint: "var(--surface-4)" },
};

/* ---------- Card ---------- */
export function Card({
  children,
  className = "",
  padded = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`rounded-2xl ${padded ? "px-[22px] py-5" : "overflow-hidden"} ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", ...style }}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
        {hint && <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- LiveBadge ---------- */
export function LiveBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
      style={{ background: "rgba(74, 222, 154, 0.1)", color: "var(--green)" }}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--green)" }} />
      {label}
    </span>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({
  title,
  hint,
  live,
  right,
}: {
  title: string;
  hint?: string;
  live?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            {title}
          </h1>
          {live && <LiveBadge label={live} />}
        </div>
        {hint && <p className="mt-1.5 text-sm" style={{ color: "var(--muted)" }}>{hint}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}

/* ---------- Tugmalar ---------- */
export function PrimaryButton({ children, onClick, href, className = "" }: {
  children: ReactNode; onClick?: () => void; href?: string; className?: string;
}) {
  const cls = `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition hover:opacity-90 ${className}`;
  const style = { background: "var(--accent)", color: "var(--accent-fg)" };
  return href
    ? <a href={href} className={cls} style={style}>{children}</a>
    : <button type="button" onClick={onClick} className={cls} style={style}>{children}</button>;
}

export function SecondaryButton({ children, onClick, href, className = "", ariaLabel }: {
  children: ReactNode; onClick?: () => void; href?: string; className?: string; ariaLabel?: string;
}) {
  const cls = `inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-medium transition hover:opacity-85 ${className}`;
  const style = { background: "var(--control)", border: "1px solid var(--border-control)", color: "var(--text)" };
  return href
    ? <a href={href} className={cls} style={style} aria-label={ariaLabel}>{children}</a>
    : <button type="button" onClick={onClick} className={cls} style={style} aria-label={ariaLabel}>{children}</button>;
}

export function IconButton({ children, onClick, ariaLabel }: { children: ReactNode; onClick?: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid h-11 w-11 place-items-center rounded-xl transition hover:opacity-85"
      style={{ background: "var(--control)", border: "1px solid var(--border-control)", color: "var(--text-3)" }}
    >
      {children}
    </button>
  );
}

/* ---------- SegmentedControl ---------- */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  height = 36,
}: {
  value: T;
  options: { value: T; label: string; count?: number; countTone?: Tone; icon?: ReactNode }[];
  onChange: (v: T) => void;
  height?: number;
}) {
  return (
    <div
      className="inline-flex gap-1 rounded-xl p-1"
      style={{ background: "var(--field)", border: "1px solid var(--border)" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className="inline-flex items-center gap-2 rounded-[9px] px-4 text-[13px] font-medium transition"
            style={{
              height,
              background: active ? "var(--seg-active)" : "transparent",
              color: active ? "var(--text)" : "var(--text-3)",
            }}
          >
            {o.icon}
            {o.label}
            {o.count !== undefined && (
              <span
                className="font-mono text-xs"
                style={{
                  color: o.countTone
                    ? TONE[o.countTone].color
                    : active
                      ? "var(--accent-badge)"
                      : "var(--subtle)",
                }}
              >
                {formatNumber(o.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- DateChips ---------- */
export function DateChips({
  value,
  days,
  labels,
  onChange,
}: {
  value: string;
  days: string[];
  labels: (day: string, index: number) => string;
  onChange: (day: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {days.map((d, i) => {
        const active = d === value;
        const label = labels(d, i);
        const isDate = /^\d/.test(label);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={active}
            className={`inline-flex h-10 items-center rounded-[10px] px-4 text-[13px] ${isDate ? "font-mono" : ""} ${active ? "font-semibold" : "font-medium"}`}
            style={
              active
                ? { background: "var(--date-active-bg)", border: "1px solid var(--date-active-border)", color: "var(--text)" }
                : { background: "var(--control)", border: "1px solid var(--border-control)", color: "var(--text-3)" }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- DeltaChip ---------- */
export function DeltaChip({ delta, padded }: { delta: Delta; padded?: boolean }) {
  if (delta.pct === null) {
    return <span className="font-mono text-xs" style={{ color: "var(--faint)" }}>—</span>;
  }
  const tone = delta.tone === "green" ? TONE.green : delta.tone === "orange" ? TONE.orange : TONE.neutral;
  return (
    <span
      className={`inline-flex items-center rounded-full font-mono text-xs font-medium ${padded ? "px-2.5 py-1" : "px-2 py-[3px]"}`}
      style={{ background: tone.tint, color: tone.color }}
    >
      {delta.text}
    </span>
  );
}

export function deltaOf(current: number, previous: number, higherIsBetter = true) {
  return formatDelta(current, previous, higherIsBetter);
}

/* ---------- StatusChip ---------- */
export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className="inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-medium"
      style={{ background: TONE[tone].tint, color: TONE[tone].color }}
    >
      {label}
    </span>
  );
}

/* ---------- OperatorBadge ---------- */
export function OperatorBadge({ ext, size = "sm", active }: { ext: string | null | undefined; size?: "sm" | "lg"; active?: boolean }) {
  const text = ext || "—";
  if (size === "lg") {
    return (
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold"
        style={{ background: "var(--blue-tint)", color: "var(--accent-text)" }}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 min-w-[44px] shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-xs font-medium"
      style={
        active
          ? { background: "var(--accent)", color: "var(--accent-fg)" }
          : { background: "var(--badge)", border: "1px solid var(--border-chip)", color: "var(--accent-badge)" }
      }
    >
      {text}
    </span>
  );
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({
  value,
  max = 100,
  color = "var(--chart)",
  height = 6,
  track = "var(--track)",
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span className="block w-full overflow-hidden rounded-full" style={{ height, background: track }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%`, background: color }} />
    </span>
  );
}

/* ---------- MiniBars ---------- */
export function MiniBars({ values, color, bars = 14 }: { values: number[]; color: string; bars?: number }) {
  const data = values.slice(-bars);
  const max = Math.max(1, ...data);
  return (
    <span className="flex items-end gap-[3px]" style={{ height: 32 }} aria-hidden>
      {data.map((v, i) => (
        <span
          key={i}
          className="w-[5px] rounded-sm"
          style={{
            height: Math.max(2, (v / max) * 32),
            background: i === data.length - 1 ? color : "var(--bar-dim)",
          }}
        />
      ))}
    </span>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ values, width = 140, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span style={{ width, height }} aria-hidden />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 4) + 2;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={rising ? "var(--green)" : "var(--orange)"}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- KpiTile ---------- */
export function KpiTile({
  label,
  value,
  unit,
  icon,
  tone = "accent",
  delta,
  spark,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: ReactNode;
  tone?: Tone;
  delta?: Delta;
  spark?: number[];
  hint?: string;
}) {
  const t = TONE[tone];
  return (
    <div
      className="flex flex-col gap-3.5 rounded-[14px] p-[18px]"
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px]" style={{ background: t.tint, color: t.color }}>
              {icon}
            </span>
          )}
          <span className="truncate text-[13px]" style={{ color: "var(--muted)" }}>{label}</span>
        </span>
        {delta && <DeltaChip delta={delta} />}
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-[30px] font-semibold leading-none tracking-[-0.02em]" style={{ color: "var(--text)" }}>
            {value}
          </span>
          {unit && <span className="text-sm" style={{ color: "var(--subtle)" }}>{unit}</span>}
        </span>
        {spark && spark.length > 1 && <MiniBars values={spark} color={t.color} />}
      </div>

      {hint && <p className="text-xs" style={{ color: "var(--subtle)" }}>{hint}</p>}
    </div>
  );
}

/* ---------- AlertBanner ---------- */
export function AlertBanner({ icon, title, hint, right }: { icon?: ReactNode; title: string; hint?: string; right?: ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-[14px] py-3 pl-4 pr-3"
      style={{ background: "var(--alert-bg)", border: "1px solid var(--alert-border)" }}
    >
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--orange-tint)", color: "var(--orange)" }}>
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</p>
        {hint && <p className="mt-0.5 text-[13px]" style={{ color: "var(--muted)" }}>{hint}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/* ---------- Bo'sh holat / skeleton ---------- */
export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm" style={{ color: "var(--muted)" }}>{text}</p>
      {action}
    </div>
  );
}

export function Skeleton({ height = 64, className = "" }: { height?: number; className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl ${className}`} style={{ height, background: "var(--surface-3)" }} />
  );
}
