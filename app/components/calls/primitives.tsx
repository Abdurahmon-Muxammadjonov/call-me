"use client";

/* =====================================================================
 * "Audio yozuvlar" sahifasining kichik qismlari: ball belgisi, holat
 * tabletkasi, yo'nalish ko'rsatkichi va formatlash yordamchilari.
 *
 * Ranglar globals.css'dagi --rec-* o'zgaruvchilaridan olinadi — ular
 * qorong'i va yorug' mavzu uchun alohida belgilangan, shu sabab bu
 * komponentlarda `dark:` variantlari kerak emas.
 * ===================================================================== */

export type Grade = "excellent" | "good" | "average" | "low";

export function gradeOf(score100: number): Grade {
  const s = score100 / 10;
  if (s >= 8) return "excellent";
  if (s >= 6.5) return "good";
  if (s >= 5) return "average";
  return "low";
}

export const GRADE_STYLE: Record<Grade, { color: string; bg: string }> = {
  excellent: { color: "var(--rec-green)", bg: "var(--rec-green-bg)" },
  good: { color: "var(--rec-yellow)", bg: "var(--rec-yellow-bg)" },
  average: { color: "var(--rec-yellow)", bg: "var(--rec-yellow-bg)" },
  low: { color: "var(--rec-orange)", bg: "var(--rec-orange-bg)" },
};

/* Ball 0-100 saqlanadi, ekranda 10 ballik ko'rinadi. */
export const toTen = (score100: number) => (score100 / 10).toFixed(1);

export const fmtClock = (sec: number | null | undefined) => {
  const n = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

export const fmtMoney = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.abs(Math.round(n)));

/** Izoh boshidagi "(Yangi lid)" / "(Eski baza)" dan skript nomini oladi. */
export function scriptNameOf(comment?: string | null): string | null {
  const m = String(comment || "").match(/^\((Yangi lid|Eski baza)\)/i);
  return m ? m[1] : null;
}

export function ScoreBadge({ score, label }: { score: number; label: string }) {
  const g = gradeOf(score);
  const st = GRADE_STYLE[g];
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="rounded-lg px-2 py-1 font-mono text-sm font-semibold tabular-nums"
        style={{ color: st.color, background: st.bg }}
      >
        {toTen(score)}
      </span>
      <span className="text-sm" style={{ color: st.color }}>
        {label}
      </span>
    </span>
  );
}

export function CallStatusBadge({
  reason,
  processing,
  labels,
}: {
  reason?: string | null;
  processing?: boolean;
  labels: { processing: string; unscored: string };
}) {
  if (processing) {
    return (
      <span className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--rec-text-2)" }}>
        <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--rec-bar)" }} />
        {labels.processing}
      </span>
    );
  }
  return (
    <span
      className="inline-flex rounded-lg px-2.5 py-1 text-xs font-medium"
      style={{ background: "var(--rec-btn-bg)", color: "var(--rec-text-2)", border: "1px solid var(--rec-btn-border)" }}
    >
      {reason || labels.unscored}
    </span>
  );
}

export function DirectionCell({ direction, labels }: { direction?: string | null; labels: { incoming: string; outgoing: string } }) {
  const incoming = direction === "incoming";
  const unknown = direction !== "incoming" && direction !== "outgoing";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm"
      style={{ color: incoming ? "var(--rec-accent-text)" : "var(--rec-text-3)" }}
    >
      <span aria-hidden>{incoming ? "↙" : unknown ? "•" : "↗"}</span>
      {unknown ? "—" : incoming ? labels.incoming : labels.outgoing}
    </span>
  );
}

/** Davomiylik chizig'i: uzunlik = sqrt(davomiylik / eng uzuni) × 56px. */
export function DurationBar({ seconds, max }: { seconds: number; max: number }) {
  const ratio = max > 0 ? Math.sqrt(Math.max(0, seconds) / max) : 0;
  const width = Math.max(3, Math.round(ratio * 56));
  return (
    <span className="inline-block h-1 rounded-full" style={{ width, background: "var(--rec-bar)" }} aria-hidden />
  );
}
