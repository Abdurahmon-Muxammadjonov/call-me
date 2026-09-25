"use client";

import { Play } from "lucide-react";
import { useT } from "../../lib/i18n";
import { type CallRow } from "../../lib/calls";
import {
  formatDayShort, formatDuration, formatMoney, formatScore, formatTime, scoreGrade,
} from "../../lib/format";
import { TONE } from "../kit";

/* =====================================================================
 * "Audio yozuvlar" jadvali (spetsifikatsiya 3.6 B).
 *
 * Ustunlar CSS grid bilan: 2.1fr .9fr 1fr 1.3fr 1.9fr 1.1fr 1.2fr,
 * oraliq 12px, chekinish 0 20px. Sarlavha 40px, qator 60px.
 * Butun qator bosiladi va panelni ochadi.
 * ===================================================================== */

const COLS = "2.1fr 0.9fr 1fr 1.3fr 1.9fr 1.1fr 1.2fr";

const HEAD_KEYS = [
  "rec.col.operator", "rec.col.time", "rec.col.direction", "rec.col.duration",
  "rec.col.result", "rec.col.money", "rec.col.action",
] as const;

const GRADE_KEY = {
  excellent: "rec.grade.excellent",
  good: "rec.grade.good",
  average: "rec.grade.average",
  low: "rec.grade.low",
} as const;

const GRADE_TONE = { excellent: "green", good: "amber", average: "amber", low: "orange" } as const;

/** Izoh boshidagi "(Yangi lid)" / "(Eski baza)" dan skript nomini oladi. */
function scriptNameOf(comment?: string | null): string | null {
  const m = String(comment || "").match(/^\((Yangi lid|Eski baza)\)/i);
  return m ? m[1] : null;
}

/** NATIJA ustuni — uchta holat, "—" hech qachon ishlatilmaydi. */
function ResultCell({ call }: { call: CallRow }) {
  const t = useT();
  const processing = call.status === "processing" || call.status === "queued";

  if (call.kpi_score > 0) {
    const grade = scoreGrade(call.kpi_score)!;
    const tone = TONE[GRADE_TONE[grade]];
    return (
      <span className="flex items-center gap-2.5">
        <span
          className="grid h-[30px] w-12 shrink-0 place-items-center rounded-lg font-mono text-sm font-semibold"
          style={{ background: tone.tint, color: tone.color }}
        >
          {formatScore(call.kpi_score)}
        </span>
        <span className="truncate text-[13px] font-medium" style={{ color: tone.color }}>
          {t(GRADE_KEY[grade])}
        </span>
      </span>
    );
  }

  if (processing) {
    return (
      <span className="flex items-center gap-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: "var(--chart)", boxShadow: "0 0 0 4px rgba(59,130,246,0.2)" }}
        />
        <span className="truncate text-[13px]" style={{ color: "var(--accent-text)" }}>
          {t("rec.processing")}
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs"
      style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)", color: "var(--text-3)" }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#6B7486" }} />
      <span className="truncate">{call.dropped_reason || t("rec.unscored")}</span>
    </span>
  );
}

function Row({
  call, maxDuration, managerName, active, onOpen, onPlay,
}: {
  call: CallRow; maxDuration: number; managerName: string;
  active: boolean; onOpen: () => void; onPlay: () => void;
}) {
  const t = useT();
  const script = scriptNameOf(call.rop_comment);
  const incoming = call.direction === "incoming";
  const unknownDir = call.direction !== "incoming" && call.direction !== "outgoing";
  const ratio = maxDuration > 0 ? Math.sqrt(Math.max(0, call.duration) / maxDuration) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="grid cursor-pointer items-center px-5 transition-colors hover:bg-[var(--surface-4)]/50 focus-visible:outline-2 focus-visible:-outline-offset-2"
      style={{
        gridTemplateColumns: COLS,
        columnGap: 12,
        height: 60,
        borderBottom: "1px solid var(--divider)",
        background: active ? "var(--row-selected)" : undefined,
        outlineColor: "var(--accent-text)",
      }}
    >
      {/* OPERATOR */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="inline-flex h-7 min-w-12 shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-xs font-medium"
          style={
            active
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "var(--badge)", border: "1px solid var(--border-chip)", color: "var(--accent-badge)" }
          }
        >
          {call.operator_ext || "—"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium" style={{ color: "var(--text)" }}>{managerName}</span>
          {script && <span className="block truncate text-xs" style={{ color: "#8C95A6" }}>{script}</span>}
        </span>
      </div>

      {/* VAQT */}
      <div className="min-w-0">
        <span className="block font-mono text-sm" style={{ color: "var(--text)" }}>{formatTime(call.created_at)}</span>
        <span className="block text-xs" style={{ color: "#8C95A6" }}>{formatDayShort(call.created_at)}</span>
      </div>

      {/* YO'NALISH */}
      <div className="flex min-w-0 items-center gap-1.5 text-[13px]" style={{ color: "#B4BCCB" }}>
        <span aria-hidden style={{ fontSize: 16, color: incoming ? "var(--accent-icon)" : "#8C95A6" }}>
          {unknownDir ? "•" : incoming ? "↙" : "↗"}
        </span>
        <span className="truncate">{unknownDir ? "—" : incoming ? t("rec.incoming") : t("rec.outgoing")}</span>
      </div>

      {/* DAVOMIYLIK */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="min-w-11 font-mono text-sm" style={{ color: "var(--text-2)" }}>
          {formatDuration(call.duration)}
        </span>
        <span className="block h-1 w-14 shrink-0 overflow-hidden rounded-full" style={{ background: "var(--track-audio)" }} aria-hidden>
          <span className="block h-full rounded-full" style={{ width: Math.max(3, ratio * 56), background: "var(--chart)" }} />
        </span>
      </div>

      {/* NATIJA */}
      <div className="min-w-0"><ResultCell call={call} /></div>

      {/* JARIMA / BONUS */}
      <div className="min-w-0 font-mono text-[13px] font-medium">
        {call.bonus_amount > 0 ? (
          <span style={{ color: "var(--green)" }}>+{formatMoney(call.bonus_amount)}</span>
        ) : call.penalty_amount > 0 ? (
          <span style={{ color: "var(--orange)" }}>&#8722;{formatMoney(call.penalty_amount)}</span>
        ) : (
          <span style={{ color: "var(--subtle)" }}>&#8212;</span>
        )}
      </div>

      {/* AMAL */}
      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        {call.audio_url && (
          <button
            type="button"
            onClick={onPlay}
            aria-label={t("rec.listen")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] transition hover:opacity-80"
            style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)", color: "var(--text-2)" }}
          >
            <Play className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-11 items-center rounded-[10px] px-3.5 text-[13px] font-medium transition hover:opacity-85"
          style={{ background: "var(--view-btn-bg)", color: "var(--view-btn-text)" }}
        >
          {t("rec.view")}
        </button>
      </div>
    </div>
  );
}

export function CallsTable({
  calls, managerName, activeId, onOpen, onPlay,
}: {
  calls: CallRow[];
  managerName: (c: CallRow) => string;
  activeId: string | null;
  onOpen: (id: string) => void;
  onPlay: (c: CallRow) => void;
}) {
  const t = useT();
  const maxDuration = Math.max(1, ...calls.map((c) => Number(c.duration) || 0));

  if (calls.length === 0) {
    return <p className="py-14 text-center text-sm" style={{ color: "var(--muted)" }}>{t("rec.empty")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px]">
        <div
          className="grid items-center px-5 text-[11px] font-medium uppercase tracking-[0.1em]"
          style={{
            gridTemplateColumns: COLS,
            columnGap: 12,
            height: 40,
            color: "var(--subtle)",
            borderTop: "1px solid var(--divider-strong)",
            borderBottom: "1px solid var(--divider-strong)",
          }}
        >
          {HEAD_KEYS.map((k, i) => (
            <span key={k} className={i === HEAD_KEYS.length - 1 ? "text-right" : ""}>{t(k)}</span>
          ))}
        </div>

        {calls.map((c) => (
          <Row
            key={c.id}
            call={c}
            maxDuration={maxDuration}
            managerName={managerName(c)}
            active={activeId === c.id}
            onOpen={() => onOpen(c.id)}
            onPlay={() => onPlay(c)}
          />
        ))}
      </div>
    </div>
  );
}
