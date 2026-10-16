"use client";

/* Qo'ng'iroqlar jadvali — Pulse Noir (06-Audio-yozuvlar.png, chap ustun), 2026-10-14.
 * Audio yozuvlar va Tahlil holati sahifalarida bir xil. Server sahifalaydi;
 * qator bosilsa tafsilot ochiladi, ▶ — tafsilot ochilib audio boshlanadi. */

import { usePT } from "../../i18n";
import { ExtBadge, IconButton, ScoreChip, StatusPill } from "../../ui/primitives";
import { TableHead, TableRow } from "../../ui/table";
import { Icon } from "../../ui/Icon";
import { scoreTone, TONE_VARS } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { hmOf } from "../../lib/dates";
import { clock } from "../../ui/AudioPlayer";
import type { CallRow } from "../../../lib/calls";

const TEMPLATE = "minmax(150px,1.3fr) 80px minmax(110px,0.9fr) minmax(150px,1.4fr) 84px 44px";

export function CallTable({
  rows,
  selectedId,
  playingId,
  onSelect,
  onPlay,
  nameOf,
  targetScore10,
  total,
  page,
  pageSize,
  onPage,
  loading,
  emptyText,
}: {
  rows: CallRow[];
  selectedId: string | null;
  playingId: string | null;
  onSelect: (r: CallRow) => void;
  onPlay: (r: CallRow) => void;
  nameOf: (r: CallRow) => string;
  targetScore10: number | null;
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  loading?: boolean;
  emptyText: string;
}) {
  const t = usePT();
  const maxDur = Math.max(60, ...rows.map((r) => Number(r.duration) || 0));
  const from = total ? page * pageSize + 1 : 0;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex min-w-0 flex-col">
      <div className="overflow-x-auto">
        <div role="table" aria-label={t("calls.table")} className="min-w-[680px]">
          <TableHead
            template={TEMPLATE}
            columns={[
              { key: "op", label: t("calls.col.op") },
              { key: "time", label: t("calls.col.time") },
              { key: "dur", label: t("calls.col.dur") },
              { key: "res", label: t("calls.col.result") },
              { key: "sum", label: t("calls.col.sum"), align: "right" },
              { key: "play", label: "" },
            ]}
          />
          {rows.length === 0 && !loading ? (
            <div className="px-6 py-12 text-center text-[14px] text-pn-muted">{emptyText}</div>
          ) : (
            rows.map((r) => {
              const s10 = r.kpi_score > 0 ? r.kpi_score / 10 : null;
              const st = scoreTone(s10, targetScore10);
              const processing = r.status === "processing" || r.status === "queued";
              const selected = r.id === selectedId;
              const dur = Number(r.duration) || 0;
              const money = r.bonus_amount > 0 ? `+${fmtInt(r.bonus_amount)}` : r.penalty_amount > 0 ? `−${fmtInt(r.penalty_amount)}` : DASH;
              const moneyColor = r.bonus_amount > 0 ? "var(--pn-good-text)" : r.penalty_amount > 0 ? "var(--pn-bad-text)" : "var(--pn-subtle)";
              const out = r.direction === "outgoing";
              return (
                <TableRow
                  key={r.id}
                  template={TEMPLATE}
                  height={60}
                  selected={selected}
                  onActivate={() => onSelect(r)}
                  testId={`CALL-ROW-${r.id}`}
                  label={nameOf(r)}
                >
                  <span className="flex min-w-0 items-center gap-3" title={nameOf(r)}>
                    <ExtBadge size="audio" selected={selected}>{r.operator_ext || "—"}</ExtBadge>
                    {/* Ism — "Xodimlarni boshqarish"dagi (2026-10-16); tagida mijoz turi. */}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-medium">{nameOf(r)}</span>
                      <span className="truncate text-[11px] text-pn-subtle">{Number(r.new_leads_count) > 0 ? t("calls.newLead") : t("calls.oldBase")}</span>
                    </span>
                  </span>
                  <span className="pn-mono flex items-center gap-1 text-[14px] font-semibold">
                    {hmOf(new Date(r.created_at))}
                    {r.direction !== "unknown" && r.direction && (
                      <Icon
                        name={out ? "arrowUpRight" : "arrowDownLeft"}
                        size={13}
                        className="text-pn-subtle"
                        title={out ? t("calls.outgoing") : t("calls.incoming")}
                      />
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="pn-mono w-[42px] text-[13px]">{clock(dur)}</span>
                    <span className="h-[4px] flex-1 overflow-hidden rounded-full bg-pn-panel-3">
                      <span className="block h-full rounded-full bg-pn-text-2" style={{ width: `${Math.max(3, (dur / maxDur) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    {processing ? (
                      <span className="flex items-center gap-2 text-[13px] text-pn-accent-strong">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-pn-accent" /> {t("calls.processingShort")}
                      </span>
                    ) : s10 != null ? (
                      <>
                        <ScoreChip tone={st.tone}>{fmtDec(s10)}</ScoreChip>
                        <span className="truncate text-[13px] font-medium" style={{ color: TONE_VARS[st.tone].text }}>{t(`tone.${st.label}` as "tone.good")}</span>
                        {r.is_problem && (
                          <span className="ml-auto shrink-0 text-pn-bad" title={r.problem_reason || t("calls.problemShort")}>
                            <Icon name="warning" size={15} title={t("calls.problemShort")} />
                          </span>
                        )}
                      </>
                    ) : (
                      <StatusPill tone="neutral" className="max-w-full truncate">{r.dropped_reason || t("calls.notScoredShort")}</StatusPill>
                    )}
                  </span>
                  <span className="pn-mono text-right text-[13px]" style={{ color: moneyColor }}>{money}</span>
                  <span className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      icon={playingId === r.id ? "pause" : "play"}
                      label={t("calls.play")}
                      size={38}
                      tone={selected ? "panel" : "panel-2"}
                      className={selected ? "bg-pn-accent! text-pn-accent-ink! border-pn-accent!" : undefined}
                      onClick={() => onPlay(r)}
                      testId={`CALL-PLAY-${r.id}`}
                    />
                  </span>
                </TableRow>
              );
            })
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-6 py-4">
        <span className="pn-mono text-[13px] text-pn-muted">
          {from}–{to} <span className="text-pn-subtle">/ {fmtInt(total)}</span>
        </span>
        <span className="flex gap-2">
          <IconButton icon="chevronLeft" label={t("calls.prevPage")} size={38} tone="panel-2" disabled={page === 0} onClick={() => onPage(page - 1)} testId="CALL-PREV" />
          <IconButton icon="chevronRight" label={t("calls.nextPage")} size={38} tone="panel-2" disabled={to >= total} onClick={() => onPage(page + 1)} testId="CALL-NEXT" />
        </span>
      </div>
    </div>
  );
}
