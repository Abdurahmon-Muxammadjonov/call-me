"use client";

/* Qo'ng'iroq tafsiloti — Pulse Noir (06-Audio-yozuvlar.png, o'ng panel), 2026-10-14.
 * Eski CallDetailPanel'dagi hamma ma'lumot saqlangan: pleer, muhim
 * lahzalar (bosilsa audio o'sha joyga o'tadi), ball va bonus/jarima,
 * muammo bloki, qisqacha xulosa, skript bandlari, xatolar, transkripsiya,
 * baholanmagan bo'lsa — sababi. */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePT } from "../../i18n";
import { Button, ExtBadge, IconButton, Skeleton, StatusPill } from "../../ui/primitives";
import { Ring } from "../../charts";
import { AudioPlayer, clock, type AudioPlayerHandle } from "../../ui/AudioPlayer";
import { scoreTone, pctTone, TONE_VARS } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonthShort, hmOf, tashkentToday, type Loc } from "../../lib/dates";
import { useCallDetail } from "../../data/calls";
import type { CallDetail as CallDetailT } from "../../../lib/calls";

/* rop_comment: "Natija: … Kuchli tomoni: … Yaxshilash kerak: … XATOLAR: − 1.2 · …" */
export function parseComment(text: string) {
  const clean = String(text || "");
  const [head, ...rest] = clean.split(/XATOLAR:?/i);
  const pick = (label: string) => {
    const m = head.match(new RegExp(`${label}:\\s*([^]*?)(?=(Natija:|Kuchli tomoni:|Yaxshilash kerak:|$))`, "i"));
    return m ? m[1].trim() : "";
  };
  const mistakes = (rest.join("") || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("−") || l.startsWith("-"))
    .map((l) => {
      const m = l.match(/^[−-]\s*([\d.]+)\s*·\s*(.+)$/);
      return m ? { minus: m[1], text: m[2] } : { minus: null as string | null, text: l.replace(/^[−-]\s*/, "") };
    });
  return { result: pick("Natija"), strong: pick("Kuchli tomoni"), improve: pick("Yaxshilash kerak"), mistakes };
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="pn-eyebrow">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

function Transcript({ d, onSeek }: { d: CallDetailT; onSeek: (s: number) => void }) {
  const t = usePT();
  const segs = Array.isArray(d.transcript_segments) ? d.transcript_segments : [];
  if (!segs.length) return <p className="whitespace-pre-line text-[13px] leading-[1.6] text-pn-text-2">{d.transcript || t("calls.noTranscript")}</p>;
  const first = segs.find((s) => s.speaker)?.speaker;
  return (
    <ul className="flex flex-col gap-3">
      {segs.map((s, i) => {
        const op = s.speaker === first;
        return (
          <li key={i} className={op ? "pr-6" : "pl-6"}>
            <div className="mb-1 flex items-center gap-2 text-[11px]">
              <span className="font-semibold" style={{ color: op ? "var(--pn-accent-strong, var(--pn-accent))" : "var(--pn-subtle)" }}>
                {op ? t("calls.seller") : t("calls.client")}
              </span>
              {typeof s.start === "number" && (
                <button type="button" onClick={() => onSeek(Number(s.start))} className="pn-mono text-pn-subtle hover:text-pn-text hover:underline">
                  {clock(s.start)}
                </button>
              )}
            </div>
            <p className="rounded-[12px] px-3 py-2 text-[13px] leading-[1.5]" style={{ background: op ? "var(--pn-panel-3)" : "var(--pn-panel-2)" }}>
              {s.text}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function CallDetail({
  id,
  name,
  dayAvg10,
  targetScore10,
  loc,
  autoPlay,
  onClose,
}: {
  id: string;
  name: string;
  dayAvg10: number | null;
  targetScore10: number | null;
  loc: Loc;
  autoPlay?: boolean;
  onClose: () => void;
}) {
  const t = usePT();
  const q = useCallDetail(id);
  const d = q.data;
  const player = useRef<AudioPlayerHandle>(null);
  const [view, setView] = useState<"analysis" | "transcript">("analysis");
  const [allStages, setAllStages] = useState(false);
  const parsed = useMemo(() => parseComment(d?.rop_comment || ""), [d?.rop_comment]);

  useEffect(() => {
    if (autoPlay && d?.audio_url) player.current?.seek(0);
  }, [autoPlay, d?.audio_url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const score10 = d && d.kpi_score > 0 ? d.kpi_score / 10 : null;
  const st = scoreTone(score10, targetScore10);
  const processing = d?.status === "processing" || d?.status === "queued";
  const stages = (d?.criteria_scores || []).map((c) => ({ title: c.title, score: Number(c.score) || 0 }));
  const moments = Array.isArray(d?.key_moments) ? d!.key_moments! : [];
  const dir = d?.direction === "incoming" ? t("calls.incoming") : d?.direction === "outgoing" ? t("calls.outgoing") : null;
  const lead = d ? (Number(d.new_leads_count) > 0 ? t("calls.newLead") : t("calls.oldBase")) : null;

  return (
    <aside className="flex flex-col gap-5 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-6" aria-label={t("calls.detail")} data-testid="CALL-DETAIL">
      <header className="flex items-start gap-3">
        <ExtBadge size="card" selected>{d?.operator_ext || "—"}</ExtBadge>
        <div className="min-w-0 flex-1">
          <h2 className="pn-card-title truncate">{name}</h2>
          {d && (
            <div className="mt-1 truncate text-[12px] text-pn-muted">
              {[dir, lead, `${dayMonthShort(loc, tashkentToday(new Date(d.created_at)))}, ${hmOf(new Date(d.created_at))}`].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <IconButton icon="close" label={t("calls.close")} size={38} tone="panel-2" onClick={onClose} testId="CALL-DETAIL-close" />
      </header>

      {!d ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[120px] rounded-[20px]" />
          <Skeleton className="h-[90px] rounded-[16px]" />
          <Skeleton className="h-[160px] rounded-[16px]" />
        </div>
      ) : (
        <>
          {d.audio_url && (
            <AudioPlayer
              key={d.id}
              ref={player}
              src={d.audio_url}
              seed={d.id}
              durationHint={d.duration}
              markers={moments.map((m) => ({ time: m.time, tone: m.kind }))}
              labels={{ play: t("calls.play"), pause: t("calls.pause"), back: t("calls.back10"), fwd: t("calls.fwd10"), rate: t("calls.rate") }}
            />
          )}

          {view === "transcript" ? (
            <Section title={t("calls.transcript")} right={<button type="button" onClick={() => setView("analysis")} className="text-[12px] text-pn-text-2 hover:text-pn-text">{t("calls.backToAnalysis")}</button>}>
              <Transcript d={d} onSeek={(s) => player.current?.seek(s)} />
            </Section>
          ) : (
            <>
              {moments.length > 0 && (
                <Section title={t("calls.moments")}>
                  <ul className="flex flex-col gap-2">
                    {moments.map((m, i) => {
                      const tone = m.kind === "good" ? "good" : m.kind === "bad" ? "bad" : "neutral";
                      return (
                        <li key={i}>
                          <button type="button" onClick={() => player.current?.seek(m.time)} className="flex w-full items-center gap-3 text-left text-[13px] hover:opacity-90">
                            <span className="pn-mono inline-flex h-7 items-center rounded-[8px] px-2 text-[12px] font-semibold" style={{ background: TONE_VARS[tone].tint, color: TONE_VARS[tone].text }}>
                              {clock(m.time)}
                            </span>
                            <span className="min-w-0 flex-1">{m.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {processing ? (
                <div className="flex items-center gap-3 rounded-[16px] bg-pn-panel-2 px-4 py-4 text-[14px] text-pn-text-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-pn-accent" />
                  {t("calls.processing")}
                </div>
              ) : score10 == null ? (
                <div className="rounded-[16px] bg-pn-panel-2 px-4 py-4">
                  <div className="text-[14px] font-semibold">{t("calls.notScored", { reason: d.dropped_reason || DASH })}</div>
                  {d.summary && <p className="mt-2 text-[13px] leading-[1.5] text-pn-text-2">{d.summary}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 border-t border-pn-divider pt-5">
                    <div className="relative h-[64px] w-[64px] shrink-0">
                      <Ring size={64} r={26} stroke={6} pct={score10 * 10} color={TONE_VARS[st.tone].fg} track="var(--pn-track)" />
                      <div className="pn-display absolute inset-0 grid place-items-center text-[18px]">{fmtDec(score10)}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[16px] font-semibold" style={{ color: TONE_VARS[st.tone].text }}>{t(`tone.${st.label}` as "tone.good")}</span>
                        <span className="text-[12px] text-pn-subtle">/ {t("calls.tenScale")}</span>
                      </div>
                      {dayAvg10 != null && (
                        <div className="mt-1 text-[12px] text-pn-muted">
                          {score10 >= dayAvg10 ? t("calls.aboveAvg", { v: fmtDec(score10 - dayAvg10) }) : t("calls.belowAvg", { v: fmtDec(dayAvg10 - score10) })}
                        </div>
                      )}
                    </div>
                    {(d.bonus_amount > 0 || d.penalty_amount > 0) && (
                      <div className="text-right">
                        <div className="text-[11px] text-pn-subtle">{d.bonus_amount > 0 ? t("calls.bonus") : t("calls.penalty")}</div>
                        <div className="pn-mono text-[16px] font-semibold" style={{ color: d.bonus_amount > 0 ? "var(--pn-good-text)" : "var(--pn-bad-text)" }}>
                          {d.bonus_amount > 0 ? `+${fmtInt(d.bonus_amount)}` : `−${fmtInt(d.penalty_amount)}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {d.is_problem && d.problem_reason && (
                    <div className="rounded-[16px] border px-4 py-3" style={{ background: "var(--pn-bad-tint)", borderColor: "var(--pn-alert-border)" }}>
                      <div className="pn-eyebrow mb-1 text-pn-bad">
                        {t("calls.problem")}
                        {d.problem_severity && ` · ${t(`calls.sev.${d.problem_severity}` as "calls.sev.high")}`}
                      </div>
                      <p className="text-[13px] leading-[1.5]">{d.problem_reason}</p>
                    </div>
                  )}

                  {(d.summary || parsed.result) && (
                    <Section title={t("calls.summary")}>
                      <p className="text-[13px] leading-[1.55] text-pn-text-2">{d.summary || parsed.result}</p>
                    </Section>
                  )}

                  {stages.length > 0 && (
                    <Section
                      title={t("calls.stages")}
                      right={
                        stages.length > 5 && (
                          <button type="button" onClick={() => setAllStages((v) => !v)} className="text-[12px] text-pn-text-2 hover:text-pn-text">
                            {allStages ? t("calls.less") : t("calls.all", { n: stages.length })}
                          </button>
                        )
                      }
                    >
                      <ul className="flex flex-col gap-3">
                        {(allStages ? stages : stages.slice(0, 5)).map((c) => {
                          const tone = pctTone(c.score);
                          return (
                            <li key={c.title}>
                              <div className="mb-[6px] flex items-baseline justify-between gap-3 text-[13px]">
                                <span className="min-w-0 truncate">{c.title}</span>
                                <span className="pn-mono shrink-0" style={{ color: TONE_VARS[tone].text }}>{c.score}%</span>
                              </div>
                              <div className="h-[5px] overflow-hidden rounded-full bg-pn-panel-3">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(2, c.score)}%`, background: TONE_VARS[tone].fg }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </Section>
                  )}

                  {parsed.mistakes.length > 0 && (
                    <Section title={t("calls.mistakes")}>
                      <ul className="flex flex-col gap-2">
                        {parsed.mistakes.map((m, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                            <span className="min-w-0">{m.text}</span>
                            {m.minus && <span className="pn-mono shrink-0 font-semibold text-pn-bad">−{m.minus} {t("stp.detail.pts")}</span>}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}
                </>
              )}

              {d.dropped_reason && score10 == null && !processing && (
                <StatusPill tone="neutral" plain className="self-start">{d.dropped_reason}</StatusPill>
              )}
            </>
          )}

          <div className="mt-auto grid grid-cols-2 gap-3 pt-2">
            <Button variant="primary" href={`/dashboard/deep-audit?call=${d.id}`} testId="CALL-DETAIL-deep">{t("calls.fullAnalysis")}</Button>
            <Button variant="outline" onClick={() => setView((v) => (v === "transcript" ? "analysis" : "transcript"))} testId="CALL-DETAIL-transcript">
              {view === "transcript" ? t("calls.backToAnalysis") : t("calls.transcript")}
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
