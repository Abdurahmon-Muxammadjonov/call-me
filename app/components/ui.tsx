"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icons, type IconKey } from "./Icons";

/* ---------- Shared 1s clock ----------
 * A single ticking source the whole app subscribes to. useSyncExternalStore is
 * the React-blessed way to read an external, mutating source (the wall clock)
 * without a setState-in-effect cascade, and it's hydration-safe via the server
 * snapshot. Snapshot is second-resolution so the value is stable within a tick. */
function subscribeClock(cb: () => void): () => void {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const getClockSnapshot = () => Math.floor(Date.now() / 1000);
const getClockServerSnapshot = () => 0;

/** Current time, updated every second. `null` on the server / first paint. */
export function useNow(): Date | null {
  const seconds = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);
  return seconds === 0 ? null : new Date(seconds * 1000);
}

export type Accent = "indigo" | "cyan" | "emerald" | "violet";

export const accentText: Record<Accent, string> = {
  indigo: "text-indigo-500 dark:text-indigo-400",
  cyan: "text-cyan-500 dark:text-cyan-400",
  emerald: "text-emerald-500 dark:text-emerald-400",
  violet: "text-violet-500 dark:text-violet-400",
};

export const accentGrad: Record<Accent, string> = {
  indigo: "from-indigo-500 to-violet-500",
  cyan: "from-cyan-500 to-sky-500",
  emerald: "from-emerald-500 to-teal-500",
  violet: "from-violet-500 to-fuchsia-500",
};

export const accentGlow: Record<Accent, string> = {
  indigo: "shadow-[0_0_24px_-6px_rgba(99,102,241,0.55)]",
  cyan: "shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)]",
  emerald: "shadow-[0_0_24px_-6px_rgba(52,211,153,0.55)]",
  violet: "shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)]",
};

/* ---------- Brand logo ---------- */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-[0_0_22px_-4px_rgba(99,102,241,0.8)]">
        <span className="absolute inset-0 rounded-xl bg-linear-to-br from-indigo-500 to-cyan-400 opacity-60 blur-md" />
        <Icons.waveform className="relative h-5 w-5 text-white" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="bg-linear-to-r from-indigo-500 via-violet-500 to-cyan-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            Procell
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            AI Audit Core
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- Glass card ---------- */
export function Card({
  children,
  className = "",
  glow = false,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={`glass rounded-2xl ${glow ? "glow-ring" : ""} ${
        hover ? "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Section heading ---------- */
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ---------- Sparkline ---------- */
export function Sparkline({ data, accent }: { data: number[]; accent: Accent }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stops: Record<Accent, string> = {
    indigo: "#6366f1",
    cyan: "#22d3ee",
    emerald: "#34d399",
    violet: "#8b5cf6",
  };
  const id = `spark-${accent}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stops[accent]} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stops[accent]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={`url(#${id})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stops[accent]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ---------- Score helpers (Strict Anti-Gravity grading) ---------- */
export function scoreAccent(score: number): Accent {
  if (score >= 85) return "emerald";
  if (score >= 70) return "cyan";
  if (score >= 50) return "violet";
  return "indigo";
}

export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-500 dark:text-emerald-400";
  if (score >= 70) return "text-cyan-500 dark:text-cyan-400";
  if (score >= 50) return "text-amber-500 dark:text-amber-400";
  return "text-rose-500 dark:text-rose-400";
}

export function ScoreBar({ score }: { score: number }) {
  const grad =
    score >= 85
      ? "from-emerald-400 to-teal-400"
      : score >= 70
      ? "from-cyan-400 to-sky-400"
      : score >= 50
      ? "from-amber-400 to-orange-400"
      : "from-rose-400 to-pink-400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/50">
      <div
        className={`h-full rounded-full bg-linear-to-r ${grad} transition-all duration-700`}
        style={{ width: `${Math.max(score, 3)}%` }}
      />
    </div>
  );
}

/* ---------- Status badge ---------- */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    analyzed:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    processing:
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/30",
    queued:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/30",
    failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/30",
    online: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
    away: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/30",
    offline: "bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-slate-500/30",
  };
  const labels: Record<string, string> = {
    analyzed: "Tahlil qilindi",
    processing: "Jarayonda",
    queued: "Navbatda",
    failed: "Xatolik",
    online: "Onlayn",
    away: "Band",
    offline: "Oflayn",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        map[status] ?? map.offline
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] ?? status}
    </span>
  );
}

/* ---------- Theme toggle switch ---------- */
export function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label="Mavzuni almashtirish"
      className="group relative flex h-9 w-16 items-center rounded-full border border-slate-200/70 bg-slate-100/80 p-1 transition-all duration-300 dark:border-slate-700/60 dark:bg-slate-800/60"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br shadow-md transition-all duration-300 ${
          isDark
            ? "translate-x-7 from-cyan-400 to-emerald-400 text-slate-900"
            : "translate-x-0 from-amber-300 to-orange-400 text-white"
        }`}
      >
        {isDark ? <Icons.moon className="h-4 w-4" /> : <Icons.sun className="h-4 w-4" />}
      </span>
    </button>
  );
}

/* ---------- Generic pill button ---------- */
export function PillButton({
  children,
  icon,
  accent = "indigo",
  onClick,
  variant = "solid",
}: {
  children: ReactNode;
  icon?: IconKey;
  accent?: Accent;
  onClick?: () => void;
  variant?: "solid" | "ghost";
}) {
  const Icon = icon ? Icons[icon] : null;
  return (
    <button
      onClick={onClick}
      className={
        variant === "solid"
          ? `inline-flex items-center gap-2 rounded-xl bg-linear-to-r ${accentGrad[accent]} px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`
          : "inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-300 hover:scale-[1.02] hover:bg-white/80 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
      }
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ---------- Skeleton (backend loading) ---------- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/* ---------- Confirmation modal (yes / no) ---------- */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Ha",
  cancelLabel = "Yo'q",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // close on Escape while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        onClick={onCancel}
        className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm"
      />
      <div className="glass glow-ring relative w-full max-w-sm animate-slide-up rounded-2xl p-6 text-center shadow-2xl">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg ${
            tone === "danger"
              ? "bg-linear-to-br from-rose-500 to-pink-500"
              : "bg-linear-to-br from-indigo-500 to-cyan-400"
          }`}
        >
          {tone === "danger" ? <Icons.logout className="h-6 w-6" /> : <Icons.shield className="h-6 w-6" />}
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200/70 bg-white/50 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-300 hover:scale-[1.02] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02] ${
              tone === "danger"
                ? "bg-linear-to-r from-rose-500 to-pink-500"
                : "bg-linear-to-r from-indigo-500 to-cyan-400"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- TypeWriter (transcription cursor effect) ---------- */
export function TypeWriter({ text, speed = 22 }: { text: string; speed?: number }) {
  const [count, setCount] = useState(0);
  // Reset progress when the text changes — done during render (the React-blessed
  // way to derive state from props) rather than a setState inside an effect.
  const [prevText, setPrevText] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setCount(0);
  }

  // Reveal one more character per tick until the whole string is shown.
  useEffect(() => {
    if (count >= text.length) return;
    const id = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(id);
  }, [count, text.length, speed]);

  return (
    <span>
      {text.slice(0, count)}
      <span className="ml-0.5 inline-block h-[1em] w-0.5 -translate-y-px animate-blink bg-current align-middle" />
    </span>
  );
}

/* ---------- Live clock (call-center feel) ---------- */
export function LiveClock({ className = "" }: { className?: string }) {
  const now = useNow();

  if (!now) return <span className={className}>--:--:--</span>;
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {hh}:{mm}:{ss}
    </span>
  );
}
