"use client";

import { useT } from "../../lib/i18n";
import { type CallRow } from "../../lib/calls";
import { AudioPlayer } from "./AudioPlayer";
import {
  CallStatusBadge,
  DirectionCell,
  DurationBar,
  ScoreBadge,
  fmtClock,
  fmtMoney,
  gradeOf,
  scriptNameOf,
} from "./primitives";

const HEAD_KEYS = [
  "rec.col.operator", "rec.col.time", "rec.col.direction", "rec.col.duration",
  "rec.col.result", "rec.col.money", "rec.col.action",
] as const;

function timeParts(iso: string) {
  const d = new Date(iso);
  return {
    time: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" }).format(d),
    day: new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", day: "2-digit", month: "short" }).format(d),
  };
}

function Row({
  call,
  maxDuration,
  managerName,
  active,
  onOpen,
}: {
  call: CallRow;
  maxDuration: number;
  managerName: string;
  active: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const gradeLabel = {
    excellent: t("rec.grade.excellent"),
    good: t("rec.grade.good"),
    average: t("rec.grade.average"),
    low: t("rec.grade.low"),
  } as Record<string, string>;
  const { time, day } = timeParts(call.created_at);
  const scored = call.kpi_score > 0;
  const processing = call.status === "processing" || call.status === "queued";
  const script = scriptNameOf(call.rop_comment);

  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer transition-colors"
      style={{
        height: 60,
        background: active ? "var(--rec-row-active)" : undefined,
        borderBottom: "1px solid var(--rec-divider)",
      }}
    >
      <td className="px-4">
        <div className="flex items-center gap-3">
          <span
            className="rounded-lg px-2 py-1 font-mono text-xs font-semibold"
            style={{
              background: active ? "var(--rec-accent)" : "var(--rec-btn-bg)",
              color: active ? "#fff" : "var(--rec-text-2)",
              border: active ? "none" : "1px solid var(--rec-btn-border)",
            }}
          >
            {call.operator_ext || "—"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium" style={{ color: "var(--rec-text)" }}>{managerName}</span>
            {script && <span className="block text-xs" style={{ color: "var(--rec-text-3)" }}>{script}</span>}
          </span>
        </div>
      </td>
      <td className="px-4">
        <span className="block font-mono text-sm tabular-nums" style={{ color: "var(--rec-text)" }}>{time}</span>
        <span className="block text-xs" style={{ color: "var(--rec-text-3)" }}>{day}</span>
      </td>
      <td className="px-4"><DirectionCell direction={call.direction} labels={{ incoming: t("rec.incoming"), outgoing: t("rec.outgoing") }} /></td>
      <td className="px-4">
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums" style={{ color: "var(--rec-text-2)" }}>{fmtClock(call.duration)}</span>
          <DurationBar seconds={call.duration} max={maxDuration} />
        </span>
      </td>
      <td className="px-4">
        {scored ? (
          <ScoreBadge score={call.kpi_score} label={gradeLabel[gradeOf(call.kpi_score)]} />
        ) : (
          <CallStatusBadge reason={call.dropped_reason} processing={processing} labels={{ processing: t("rec.processing"), unscored: t("rec.unscored") }} />
        )}
      </td>
      <td className="px-4 font-mono text-sm tabular-nums">
        {call.bonus_amount > 0 ? (
          <span style={{ color: "var(--rec-green)" }}>+{fmtMoney(call.bonus_amount)}</span>
        ) : call.penalty_amount > 0 ? (
          <span style={{ color: "var(--rec-orange)" }}>−{fmtMoney(call.penalty_amount)}</span>
        ) : (
          <span style={{ color: "var(--rec-text-3)" }}>—</span>
        )}
      </td>
      <td className="px-4">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {call.audio_url && (
            <div className="w-28">
              <AudioPlayer key={call.id} src={call.audio_url} callId={call.id} compact />
            </div>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="min-h-11 rounded-xl px-3 text-sm font-medium transition hover:opacity-85"
            style={{ background: "var(--rec-view-bg)", color: "var(--rec-view-text)" }}
          >
            {t("rec.view")}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CallsTable({
  calls,
  managerName,
  activeId,
  onOpen,
}: {
  calls: CallRow[];
  managerName: (c: CallRow) => string;
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const maxDuration = Math.max(1, ...calls.map((c) => Number(c.duration) || 0));

  if (calls.length === 0) {
    return (
      <p className="py-16 text-center text-sm" style={{ color: "var(--rec-text-2)" }}>
        {t("rec.empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--rec-border)" }}>
            {HEAD_KEYS.map((k, i) => (
              <th
                key={k}
                className={`px-4 pb-3 text-xs font-semibold uppercase tracking-wider ${i === HEAD_KEYS.length - 1 ? "text-right" : ""}`}
                style={{ color: "var(--rec-text-3)" }}
              >
                {t(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <Row
              key={c.id}
              call={c}
              maxDuration={maxDuration}
              managerName={managerName(c)}
              active={activeId === c.id}
              onOpen={() => onOpen(c.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
