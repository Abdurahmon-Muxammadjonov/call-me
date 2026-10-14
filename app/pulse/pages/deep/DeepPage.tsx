"use client";

/* CHUQUR TAHLIL — Pulse Noir, 2026-10-14 (maket yo'q — 06 uslubida).
 *
 * URL — holat: ?date=&call=<id>&page=
 * Chapda tanlangan kunning qo'ng'iroqlari (server sahifalaydi), o'ngda
 * tanlangan qo'ng'iroqning to'liq auditi. Eski DeepAuditView'dagi hamma
 * blok saqlangan: umumiy baho, AI xulosasi, "ball nega shunday", pleer,
 * hissiyot/risk/jarima/bonus, mijoz haqida, kelishuv, keyingi qadamlar,
 * mezonlar, konversiya, yo'qotish sabablari, dialog. Qo'ng'iroqchadan va
 * Audio yozuvlardagi "To'liq tahlil"dan ?call= bilan kelinadi. */

import { useRef } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Card, ExtBadge, ScoreChip, Skeleton, IconButton } from "../../ui/primitives";
import { DateButton } from "../../ui/DateButton";
import { Ring } from "../../charts";
import { AudioPlayer, clock, type AudioPlayerHandle } from "../../ui/AudioPlayer";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { useUrlState } from "../../shell/useUrlState";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useCallDetail, useCallsPage } from "../../data/calls";
import { pctTone, scoreTone, TONE_VARS } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonth, hmOf, tashkentToday, type Loc } from "../../lib/dates";
import { useCallNames } from "../calls/AudioPage";
import type { CallDetail, CallRow } from "../../../lib/calls";

const PAGE = 15;

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

function Title({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="pn-card-title">{children}</h2>
      {sub && <div className="mt-1 text-[13px] text-pn-muted">{sub}</div>}
    </div>
  );
}

/* "− 2.0 · Band: nima qilmadi" qatorlari qizil, yo'qotilgan ball bilan. */
function AuditComment({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1">
      {text.split("\n").map((line, i) => {
        const tl = line.trim();
        if (!tl) return <div key={i} className="h-2" />;
        if (/^XATOLAR/i.test(tl)) return <div key={i} className="pn-eyebrow mt-2 text-pn-bad">{tl}</div>;
        if (tl.startsWith("−") || tl.startsWith("-")) {
          const m = tl.match(/^[−-]\s*([\d.]+)\s*·\s*(.+)$/);
          return (
            <p key={i} className="flex items-start gap-2 text-[13px] leading-[1.5] text-pn-bad-text">
              {m ? (
                <>
                  <span className="pn-mono mt-px shrink-0 rounded-md bg-pn-bad-tint px-[6px] text-[12px] font-semibold">−{m[1]}</span>
                  <span>{m[2]}</span>
                </>
              ) : (
                <span>{tl}</span>
              )}
            </p>
          );
        }
        return <p key={i} className="text-[13px] leading-[1.55] text-pn-text-2">{tl}</p>;
      })}
    </div>
  );
}

function Dialog({ d, onSeek }: { d: CallDetail; onSeek: (s: number) => void }) {
  const t = usePT();
  const segs = Array.isArray(d.transcript_segments) ? d.transcript_segments : [];
  if (!segs.length) return <p className="whitespace-pre-line text-[13px] leading-[1.6] text-pn-text-2">{d.transcript || t("calls.noTranscript")}</p>;
  const first = segs.find((s) => s.speaker)?.speaker;
  return (
    <ul className="flex max-h-[520px] flex-col gap-3 overflow-y-auto pr-2">
      {segs.map((s, i) => {
        const op = s.role ? s.role === "seller" : s.speaker === first; // Gemini roli bo'lsa — shu
        return (
          <li key={i} className={op ? "pr-8" : "pl-8"}>
            <div className="mb-1 flex items-center gap-2 text-[11px]">
              <span className="font-semibold" style={{ color: op ? "var(--pn-accent-strong, var(--pn-accent))" : "var(--pn-subtle)" }}>{op ? t("calls.seller") : t("calls.client")}</span>
              {typeof s.start === "number" && (
                <button type="button" onClick={() => onSeek(Number(s.start))} className="pn-mono text-pn-subtle hover:text-pn-text hover:underline">{clock(s.start)}</button>
              )}
            </div>
            <p className="rounded-[12px] px-3 py-2 text-[13px] leading-[1.5]" style={{ background: op ? "var(--pn-panel-3)" : "var(--pn-panel-2)" }}>{s.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[14px] bg-pn-panel-2 px-4 py-3">
      <div className="text-[12px] text-pn-muted">{label}</div>
      <div className="mt-1 truncate text-[14px] font-semibold" style={{ color: tone }}>{value}</div>
    </div>
  );
}

function Audit({ id, name, loc, target }: { id: string; name: string; loc: Loc; target: number | null }) {
  const t = usePT();
  const q = useCallDetail(id);
  const player = useRef<AudioPlayerHandle>(null);
  const d = q.data;
  if (!d) {
    return q.isError ? <Card className="text-[14px] text-pn-muted">{t("deep.notFound")}</Card> : (
      <div className="flex flex-col gap-4"><Skeleton className="h-[260px] rounded-[26px]" /><Skeleton className="h-[160px] rounded-[26px]" /></div>
    );
  }
  const s10 = d.kpi_score > 0 ? d.kpi_score / 10 : null;
  const st = scoreTone(s10, target);
  const crit = d.criteria_scores ?? [];
  const steps = d.next_steps ?? [];
  const when = `${dayMonth(loc, tashkentToday(new Date(d.created_at)))}, ${hmOf(new Date(d.created_at))}`;
  return (
    <div className="flex flex-col gap-4" data-testid="DEEP-AUDIT">
      <div className="flex flex-col gap-4 @min-[900px]/dp:flex-row">
        <Card className="flex flex-col items-center justify-center gap-3 text-center @min-[900px]/dp:w-[260px] @min-[900px]/dp:shrink-0">
          <div className="pn-eyebrow">{t("deep.overall")}</div>
          <div className="relative h-[150px] w-[150px]">
            <Ring size={150} r={64} stroke={12} pct={(s10 ?? 0) * 10} color={TONE_VARS[st.tone].fg} track="var(--pn-track)" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="pn-display text-[40px] leading-none" style={{ color: TONE_VARS[st.tone].text }}>{s10 == null ? DASH : fmtDec(s10)}</span>
              <span className="text-[12px] text-pn-subtle">/ 10</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {d.operator_ext && <ExtBadge size="tahlil">{d.operator_ext}</ExtBadge>}
            <span className="text-[14px] font-semibold">{name}</span>
          </div>
          <div className="text-[12px] text-pn-muted">{when} · {clock(d.duration)}</div>
        </Card>
        <Card className="min-w-0 flex-1">
          <Title sub={`${t("deep.duration")} · ${clock(d.duration)}`}>{t("deep.summary")}</Title>
          {!d.transcript ? (
            <div className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.55]" style={{ background: "var(--pn-warn-tint)", color: "var(--pn-warn-text)" }}>
              {t("deep.noTalk", { d: clock(d.duration) })}
            </div>
          ) : (
            <p className="whitespace-pre-line text-[14px] leading-[1.6] text-pn-text-2">{d.summary || d.rop_comment || t("deep.noComment")}</p>
          )}
          {d.rop_comment && d.rop_comment !== d.summary && (
            <div className="mt-4 rounded-[16px] bg-pn-panel-2 px-4 py-3">
              <div className="pn-eyebrow mb-2">{t("deep.why")}</div>
              <AuditComment text={d.rop_comment} />
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 @min-[700px]/dp:grid-cols-4">
            <Mini label={t("deep.sentiment")} value={d.sentiment || DASH} />
            <Mini label={t("deep.risk")} value={d.risk || DASH} />
            <Mini label={t("calls.penalty")} value={d.penalty_amount ? fmtInt(d.penalty_amount) : "0"} tone={d.penalty_amount ? "var(--pn-bad-text)" : undefined} />
            <Mini label={t("calls.bonus")} value={d.bonus_amount ? fmtInt(d.bonus_amount) : "0"} tone={d.bonus_amount ? "var(--pn-good-text)" : undefined} />
          </div>
        </Card>
      </div>

      {d.audio_url && (
        <Card>
          <Title sub={t("deep.listenSub")}>{t("deep.listen")}</Title>
          <AudioPlayer
            key={d.id}
            ref={player}
            src={d.audio_url}
            seed={d.id}
            durationHint={d.duration}
            markers={(d.key_moments ?? []).map((m) => ({ time: m.time, tone: m.kind }))}
            labels={{ play: t("calls.play"), pause: t("calls.pause"), back: t("calls.back10"), fwd: t("calls.fwd10"), rate: t("calls.rate") }}
          />
          {(d.key_moments ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(d.key_moments ?? []).map((m, i) => {
                const tone = m.kind === "good" ? "good" : m.kind === "bad" ? "bad" : "neutral";
                return (
                  <button key={i} type="button" onClick={() => player.current?.seek(m.time)} className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12px]" style={{ background: TONE_VARS[tone].tint, color: TONE_VARS[tone].text }}>
                    <span className="pn-mono font-semibold">{clock(m.time)}</span> {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {(d.client_info || d.final_agreement || steps.length > 0) && (
        <div className="grid grid-cols-1 gap-4 @min-[900px]/dp:grid-cols-3">
          {d.client_info && <Card><Title>{t("deep.client")}</Title><p className="whitespace-pre-line text-[13px] leading-[1.55] text-pn-text-2">{d.client_info}</p></Card>}
          {d.final_agreement && <Card><Title>{t("deep.agreement")}</Title><p className="whitespace-pre-line text-[13px] leading-[1.55] text-pn-text-2">{d.final_agreement}</p></Card>}
          {steps.length > 0 && (
            <Card>
              <Title>{t("deep.next")}</Title>
              <ol className="flex flex-col gap-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[13px] leading-[1.45] text-pn-text-2">
                    <span className="pn-mono grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pn-accent-soft text-[11px] text-pn-accent-strong">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 @min-[900px]/dp:grid-cols-2">
        <Card>
          <Title>{t("deep.criteria")}</Title>
          {crit.length ? (
            <ul className="flex flex-col gap-3">
              {crit.map((c, i) => {
                const tone = pctTone(Number(c.score));
                return (
                  <li key={`${c.title}-${i}`}>
                    <div className="mb-[6px] flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0">{c.title}</span>
                      <span className="pn-mono shrink-0 font-semibold" style={{ color: TONE_VARS[tone].text }}>{Math.round(Number(c.score))}</span>
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-pn-panel-3">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Number(c.score))}%`, background: TONE_VARS[tone].fg }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-pn-muted">{t("deep.noCriteria")}</p>
          )}
          {d.conversions && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Mini label={t("deep.traffic")} value={`${fmtDec(Number(d.conversions.traffic_conversion))}%`} />
              <Mini label={t("deep.sales")} value={`${fmtDec(Number(d.conversions.sales_conversion))}%`} />
            </div>
          )}
          {d.lost_reasons.length > 0 && (
            <div className="mt-5">
              <div className="pn-eyebrow mb-2">{t("deep.lost")}</div>
              <ul className="flex flex-col gap-2">
                {d.lost_reasons.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: "var(--pn-bad-tint)" }}>
                    <span>{r.reason_text}</span>
                    <span className="pn-mono font-semibold text-pn-bad-text">×{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card>
          <Title sub={t("deep.dialogSub")}>{t("deep.dialog")}</Title>
          <Dialog d={d} onSeek={(s) => player.current?.seek(s)} />
        </Card>
      </div>
    </div>
  );
}

export function DeepPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const page = Math.max(0, Number(url.get("page")) || 0);
  const DP_FILTERS = ["all", "scored", "low", "problem", "unscored"] as const;
  type DpFilter = (typeof DP_FILTERS)[number];
  const filter = (DP_FILTERS as readonly string[]).includes(url.get("f") ?? "") ? (url.get("f") as DpFilter) : "all";
  const list = useCallsPage({ date: sel.date, filter, page, pageSize: PAGE });
  const nameOf = useCallNames();
  const rows = list.data?.rows ?? [];
  const callId = url.get("call") ?? rows[0]?.id ?? null;
  const callRow = rows.find((r) => r.id === callId);
  const total = list.data?.total ?? 0;
  usePageBusy(list.isFetching && list.isPlaceholderData);

  const pick = (r: CallRow) => {
    url.set({ call: r.id });
    requestAnimationFrame(() => {
      const el = document.getElementById("dp-audit");
      if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="@container/dp flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{dayMonth(loc, sel.date)} · {t("deep.callsCount", { n: fmtInt(total) })}</span>}
        title={t("deep.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={(d) => url.set({ date: d === sel.today ? null : d, page: null, call: null })} testId="DP-DATE" />
            <HeaderBell />
          </>
        }
      />
      <div className="flex flex-col gap-4 @min-[1100px]/dp:flex-row @min-[1100px]/dp:items-start">
        <Card pad="none" className="overflow-hidden @min-[1100px]/dp:sticky @min-[1100px]/dp:top-4 @min-[1100px]/dp:w-[340px] @min-[1100px]/dp:shrink-0">
          <div className="px-5 pt-5 pb-3">
            <h2 className="pn-card-title">{t("deep.pick")}</h2>
            <div className="mt-1 text-[12px] text-pn-muted">{t("deep.pickSub")}</div>
            <select
              value={filter}
              onChange={(e) => url.set({ f: e.target.value === "all" ? null : e.target.value, page: null, call: null })}
              aria-label={t("filter.label")}
              data-testid="DP-FILTER"
              className="mt-3 h-10 w-full cursor-pointer rounded-full border border-pn-border-2 bg-pn-field px-4 text-[13px] text-pn-text outline-none"
            >
              {DP_FILTERS.map((x) => <option key={x} value={x}>{t(`calls.f.${x}` as "calls.f.all")}</option>)}
            </select>
          </div>
          <ul className="flex max-h-[640px] flex-col overflow-y-auto" role="listbox" aria-label={t("deep.pick")}>
            {rows.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-pn-muted">{list.isLoading ? "…" : t("calls.empty")}</li>}
            {rows.map((r) => {
              const s10 = r.kpi_score > 0 ? r.kpi_score / 10 : null;
              const active = r.id === callId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => pick(r)}
                    data-testid={`DP-CALL-${r.id}`}
                    className={cx("flex w-full items-center gap-3 border-t border-pn-divider px-5 py-3 text-left transition-colors", active ? "bg-pn-row-selected" : "hover:bg-pn-row-open")}
                  >
                    <ExtBadge size="tahlil" selected={active}>{r.operator_ext || "—"}</ExtBadge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{nameOf(r)}</span>
                      <span className="pn-mono text-[11px] text-pn-subtle">{hmOf(new Date(r.created_at))} · {clock(r.duration)}</span>
                    </span>
                    {s10 != null ? (
                      <ScoreChip tone={scoreTone(s10, me?.norms.targetScore10 ?? null).tone}>{fmtDec(s10)}</ScoreChip>
                    ) : (
                      <span className="max-w-[90px] truncate text-[11px] text-pn-subtle">{r.dropped_reason || DASH}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {total > PAGE && (
            <div className="flex items-center justify-between border-t border-pn-divider px-5 py-3">
              <span className="pn-mono text-[12px] text-pn-muted">{page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} / {fmtInt(total)}</span>
              <span className="flex gap-2">
                <IconButton icon="chevronLeft" label={t("calls.prevPage")} size={38} tone="panel-2" disabled={page === 0} onClick={() => url.set({ page: page - 1 ? String(page - 1) : null })} />
                <IconButton icon="chevronRight" label={t("calls.nextPage")} size={38} tone="panel-2" disabled={(page + 1) * PAGE >= total} onClick={() => url.set({ page: String(page + 1) })} />
              </span>
            </div>
          )}
        </Card>
        <div id="dp-audit" className="min-w-0 flex-1 scroll-mt-4">
          {callId ? (
            <Audit key={callId} id={callId} name={callRow ? nameOf(callRow) : ""} loc={loc} target={me?.norms.targetScore10 ?? null} />
          ) : (
            <Card className="py-12 text-center text-[14px] text-pn-muted">{t("deep.empty")}</Card>
          )}
        </div>
      </div>
    </div>
  );
}
