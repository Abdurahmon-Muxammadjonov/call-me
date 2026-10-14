"use client";

/* XODIMLAR STATISTIKASI — Pulse Noir (04-Xodimlar-statistikasi.png), 2026-10-14.
 *
 * URL — holat: ?date=YYYY-MM-DD&op=<kalit>&q=<qidiruv>
 * Maketdagi "Bugun / Kecha / 7 kun / 30 kun" o'rniga "📅 Sana" kalendari
 * (Bugun / Kecha tugmalari kalendar ichida) — ma'lumot kunlik.
 * Eski sahifadagi hamma ma'lumot saqlangan: ball taqsimoti, ayblar, AI
 * tavsiyasi, skript bandlari, eng ko'p xatolar, konversiya, muammoli
 * qo'ng'iroqlar, bitim nega yo'qolgani. */

import { useMemo } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Card, DeltaPill, ExtBadge, Skeleton, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { DateButton } from "../../ui/DateButton";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { useUrlState } from "../../shell/useUrlState";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useStaffStats, type StaffRow } from "../../data/staff";
import { useOperatorDay } from "../../data/dayCalls";
import { Ring } from "../../charts";
import { pctTone, scoreTone, TONE_VARS, type Tone } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { addDays, dayMonth, hmOf, hoursMinutes, tashkentToday, type Loc } from "../../lib/dates";
import { avgDurationSec, opDayOf, ranked, score10, teamAvg, type Ranked } from "./model";

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

const mmss = (sec: number | null) => {
  if (sec == null) return DASH;
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* --------------------------------------------------------- Ball taqsimoti */

function Distribution({ rows, avg, target }: { rows: Ranked[]; avg: number | null; target: number | null }) {
  const t = usePT();
  const scored = rows.filter((r) => r.s10 != null);
  const pos = (v: number) => `${(v / 10) * 100}%`;
  // Bir xil balldagi nuqtalar ustma-ust tushmasin — qatorlarga taqsimlanadi.
  const lanes = new Map<number, number>();
  return (
    <Card className="flex min-w-0 flex-col @min-[1100px]/st:flex-[2_1_0]" data-testid="ST-DIST">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="pn-card-title">{t("stp.dist.title")}</h2>
        <div className="flex items-center gap-4 text-[12px] text-pn-muted">
          {avg != null && <span className="border-l-2 border-pn-text pl-2">{t("stp.dist.avg", { v: fmtDec(avg) })}</span>}
          {target != null && <span className="border-l-2 border-dashed border-pn-good pl-2">{t("stp.dist.target", { v: fmtDec(target) })}</span>}
        </div>
      </div>
      {scored.length === 0 ? (
        <div className="grid flex-1 place-items-center py-8 text-[14px] text-pn-muted">{t("stp.dist.empty")}</div>
      ) : (
        <div className="relative mt-6 h-[88px]">
          <div className="absolute inset-x-0 top-[34px] flex h-[10px] overflow-hidden rounded-full" aria-hidden>
            <span className="h-full" style={{ width: "50%", background: "var(--pn-bad-tint)" }} />
            <span className="h-full" style={{ width: "30%", background: "var(--pn-warn-tint)" }} />
            <span className="h-full" style={{ width: "20%", background: "var(--pn-good-tint)" }} />
          </div>
          {target != null && (
            <span className="absolute top-[6px] h-[66px] border-l-2 border-dashed border-pn-good" style={{ left: pos(target) }} aria-hidden />
          )}
          {avg != null && <span className="absolute top-[10px] h-[58px] border-l-2 border-pn-text" style={{ left: pos(avg) }} aria-hidden />}
          {scored.map((r) => {
            const v = r.s10!;
            const bucket = Math.round(v * 4);
            const lane = lanes.get(bucket) ?? 0;
            lanes.set(bucket, lane + 1);
            const st = scoreTone(v, target);
            return (
              <span
                key={r.key}
                title={`${r.name} · ${fmtDec(v)}`}
                className="absolute h-[14px] w-[14px] -translate-x-1/2 rounded-full border-2 border-pn-panel"
                style={{ left: pos(v), top: 32 - (lane % 3) * 14 + (lane >= 3 ? 30 : 0), background: TONE_VARS[st.tone].fg }}
              />
            );
          })}
          <div className="pn-mono absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-pn-subtle">
            {Array.from({ length: 11 }, (_, i) => <span key={i}>{i}</span>)}
          </div>
        </div>
      )}
    </Card>
  );
}

function TeamCard({ rows, avg, target, norm, opsOf }: {
  rows: Ranked[];
  avg: number | null;
  target: number | null;
  norm: number | null;
  opsOf: (r: StaffRow) => { longCalls: number } | undefined;
}) {
  const t = usePT();
  const scored = rows.filter((r) => r.s10 != null);
  const best = scored[0];
  const worst = scored[scored.length - 1];
  const active = rows.filter((r) => r.calls > 0);
  const meeting = norm != null ? active.filter((r) => (opsOf(r)?.longCalls ?? 0) >= norm).length : null;
  const st = scoreTone(avg, target);
  return (
    <Card className="flex min-w-0 flex-col justify-between gap-4 @min-[1100px]/st:flex-[1_1_0]" data-testid="ST-TEAM">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] text-pn-muted">{t("stp.team.title")}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="pn-display text-[44px] leading-none tracking-[-0.03em]" style={{ color: TONE_VARS[st.tone].text }}>
              {avg == null ? DASH : fmtDec(avg)}
            </span>
            <span className="text-[15px] text-pn-muted">/ 10</span>
          </div>
        </div>
        {target != null && avg != null && (
          <div className="text-right">
            <div className="text-[12px] text-pn-muted">{t("stp.team.toTarget")}</div>
            <div className="pn-mono mt-1 text-[20px] font-semibold">{avg >= target ? "✓" : t("stp.team.points", { v: fmtDec(target - avg) })}</div>
          </div>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-pn-panel-3">
        <div className="pn-grow h-full rounded-full" style={{ width: `${((avg ?? 0) / 10) * 100}%`, background: TONE_VARS[st.tone].fg }} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[12px] text-pn-muted">{t("stp.team.norm")}</div>
          <div className="pn-mono mt-1 text-[15px] font-semibold">{meeting == null ? DASH : `${meeting} / ${active.length}`}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[12px] text-pn-muted">{t("stp.team.best")}</div>
          <div className="pn-mono mt-1 truncate text-[15px] font-semibold">{best ? `${best.ext ?? best.name} · ${fmtDec(best.s10)}` : DASH}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[12px] text-pn-muted">{t("stp.team.worst")}</div>
          <div className="pn-mono mt-1 truncate text-[15px] font-semibold">{worst && worst !== best ? `${worst.ext ?? worst.name} · ${fmtDec(worst.s10)}` : DASH}</div>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- Operator kartochkasi */

function OpCard({ r, prev, selected, target, onSelect }: {
  r: Ranked;
  prev: number | null;
  selected: boolean;
  target: number | null;
  onSelect: () => void;
}) {
  const t = usePT();
  const st = scoreTone(r.s10, target);
  const delta = r.s10 != null && prev != null ? Math.round((r.s10 - prev) * 10) / 10 : null;
  const top = r.top_mistakes[0];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`ST-CARD-${r.key}`}
      className={cx(
        "pn-press flex min-w-0 flex-col gap-4 rounded-[22px] border bg-pn-panel px-5 py-[18px] text-left transition-colors",
        selected ? "border-pn-accent bg-pn-panel-2" : "border-pn-border hover:bg-pn-panel-2"
      )}
    >
      <div className="flex w-full items-center gap-3">
        <ExtBadge size="card" selected={selected}>{r.ext ?? r.name.slice(0, 2).toUpperCase()}</ExtBadge>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{r.name}</div>
          <div className="text-[12px] text-pn-muted">{t("stp.card.calls", { n: fmtInt(r.calls) })}</div>
        </div>
        <span className="pn-mono text-[12px] text-pn-subtle">#{r.rank}</span>
      </div>
      <div className="flex w-full items-end justify-between gap-3">
        <div className="flex items-baseline gap-1">
          <span className="pn-display text-[36px] leading-none tracking-[-0.03em]" style={{ color: TONE_VARS[st.tone].text }}>
            {r.s10 == null ? DASH : fmtDec(r.s10)}
          </span>
          <span className="text-[13px] text-pn-subtle">/ 10</span>
        </div>
        {delta != null && delta !== 0 && (
          <DeltaPill tone={delta > 0 ? "good" : "bad"} size="sm" arrow={delta > 0 ? "up" : "down"}>
            {fmtDec(Math.abs(delta))}
          </DeltaPill>
        )}
      </div>
      <div className="flex w-full items-center justify-between gap-2">
        {top ? (
          <span
            title={t("stp.card.lostTotal", { n: top.count, v: fmtDec(top.points_lost) })}
            className="inline-flex h-7 min-w-0 max-w-[70%] items-center rounded-full px-3 text-[12px] font-medium"
            style={{ background: "var(--pn-bad-tint)", color: "var(--pn-bad-text)" }}
          >
            <span className="truncate">{top.label}</span>&nbsp;−{fmtDec(top.points_lost / Math.max(1, top.count))}
          </span>
        ) : (
          <span className="text-[12px] text-pn-subtle">{r.scored_calls ? t("stp.card.noMistakes") : t("stp.card.notScored")}</span>
        )}
        <span className="pn-mono inline-flex items-center gap-1 text-[12px] text-pn-muted">
          <Icon name="clock" size={13} /> {mmss(avgDurationSec(r))}
        </span>
      </div>
    </button>
  );
}

/* --------------------------------------------------------- Tafsilot paneli */

function Detail({ r, total, prev, op, norm, target, date, loc }: {
  r: Ranked;
  total: number;
  prev: number | null;
  op: { longCalls: number; incoming: number; outgoing: number } | undefined;
  norm: number | null;
  target: number | null;
  date: string;
  loc: Loc;
}) {
  const t = usePT();
  const st = scoreTone(r.s10, target);
  const ok = norm != null && op ? op.longCalls >= norm : null;
  const delta = r.s10 != null && prev != null ? Math.round((r.s10 - prev) * 10) / 10 : null;
  const maxLost = Math.max(1, ...r.top_mistakes.map((m) => m.count));
  const ext = r.ext ?? r.key;
  const recHref = `/dashboard/recordings?operator=${encodeURIComponent(ext)}&date=${date}`;
  return (
    <Card pad="lg" className="flex flex-col gap-5 @min-[1100px]/st:sticky @min-[1100px]/st:top-4" data-testid="ST-DETAIL">
      <div className="flex items-start gap-3">
        <ExtBadge size="card" selected>{r.ext ?? r.name.slice(0, 2).toUpperCase()}</ExtBadge>
        <div className="min-w-0 flex-1">
          <h2 className="pn-card-title truncate">{r.name}</h2>
          <div className="mt-1 text-[12px] text-pn-muted">
            {t("stp.detail.sub", { rank: r.rank, total, calls: fmtInt(r.calls), talk: hoursMinutes(r.minutes * 60) })}
          </div>
        </div>
        {ok != null && <StatusPill tone={ok ? "good" : "bad"} plain>{ok ? t("ctl.rop.ok") : t("ctl.rop.behind")}</StatusPill>}
      </div>

      <div className="flex items-center gap-5 rounded-[20px] bg-pn-panel-2 px-5 py-4">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <Ring size={76} r={31} stroke={7} pct={(r.s10 ?? 0) * 10} color={TONE_VARS[st.tone].fg} track="var(--pn-track)" />
          <div className="pn-display absolute inset-0 grid place-items-center text-[22px]">{r.s10 == null ? DASH : fmtDec(r.s10)}</div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
          <div><div className="text-pn-muted">{t("stp.detail.scored")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold">{fmtInt(r.scored_calls)}</div></div>
          <div><div className="text-pn-muted">{t("stp.detail.norm")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold" style={{ color: ok == null ? undefined : TONE_VARS[ok ? "good" : "bad"].text }}>{op ? `${op.longCalls} / ${norm ?? DASH}` : DASH}</div></div>
          <div><div className="text-pn-muted">{t("stp.detail.incoming")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold">{op ? `${op.incoming} · ${op.outgoing}` : DASH}</div></div>
          <div><div className="text-pn-muted">{t("stp.detail.vsPrev")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold" style={{ color: delta == null || delta === 0 ? undefined : TONE_VARS[delta > 0 ? "good" : "bad"].text }}>{delta == null ? DASH : `${delta > 0 ? "↑" : delta < 0 ? "↓" : ""} ${fmtDec(Math.abs(delta))}`}</div></div>
        </div>
      </div>

      {r.top_mistakes.length > 0 && (
        <section>
          <div className="pn-eyebrow mb-3 text-pn-bad">{t("stp.detail.mistakes")}</div>
          <div className="flex flex-col gap-3">
            {r.top_mistakes.slice(0, 4).map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">{m.label}</span>
                  <span className="pn-mono shrink-0 font-semibold text-pn-bad" title={t("stp.card.lostTotal", { n: m.count, v: fmtDec(m.points_lost) })}>
                    −{fmtDec(m.points_lost / Math.max(1, m.count))} {t("stp.detail.pts")}
                  </span>
                </div>
                <div className="mt-[6px] flex items-center gap-3">
                  <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-pn-panel-3">
                    <div className="h-full rounded-full bg-pn-bad" style={{ width: `${(m.count / maxLost) * 100}%` }} />
                  </div>
                  <span className="pn-mono text-[11px] text-pn-subtle">{m.count} / {r.scored_calls}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(r.advice?.length || r.faults.length > 0) && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <span className="pn-eyebrow text-pn-good">{r.advice?.length ? t("stp.detail.advice") : t("stp.detail.faults")}</span>
            {r.advice?.length && r.advice_generated_at && (
              <span className="text-[11px] text-pn-subtle">
                {t("stp.detail.aiAt", { at: `${dayMonth(loc, tashkentToday(new Date(r.advice_generated_at)))} ${hmOf(new Date(r.advice_generated_at))}` })}
              </span>
            )}
          </div>
          <ol className="flex flex-col gap-2">
            {(r.advice?.length ? r.advice : r.faults).slice(0, 4).map((a, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-[1.45] text-pn-text-2">
                <span className="pn-mono grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pn-good-tint text-[11px] text-pn-good-text">{i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {r.stages.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="pn-eyebrow">{t("stp.detail.stages", { n: r.stages.length })}</span>
            <span className="text-[11px] text-pn-subtle">{t("stp.detail.stagesHint")}</span>
          </div>
          <div className="grid grid-cols-7 gap-[6px]">
            {r.stages.map((s, i) => {
              const tone: Tone = pctTone(s.pct);
              return (
                <span
                  key={s.title}
                  title={`${s.title} · ${s.pct}%`}
                  className="flex flex-col items-center justify-center rounded-[8px] py-[5px]"
                  style={{ background: TONE_VARS[tone].tint, color: TONE_VARS[tone].text }}
                >
                  <span className="pn-mono text-[9px] opacity-70">{i + 1}</span>
                  <span className="pn-mono text-[11px] font-semibold">{s.pct}%</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3 rounded-[16px] bg-pn-panel-2 px-4 py-3 text-[12px]">
        <div><div className="text-pn-muted">{t("stp.detail.conversion")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold">{r.leads ? `${fmtDec(r.conversion)}%` : DASH}</div></div>
        <div><div className="text-pn-muted">{t("stp.detail.leads")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold">{r.leads} · {r.closed}</div></div>
        <div><div className="text-pn-muted">{t("stp.detail.problems")}</div><div className="pn-mono mt-[2px] text-[15px] font-semibold" style={{ color: r.problems ? "var(--pn-bad-text)" : undefined }}>{r.problems}</div></div>
      </section>

      {r.lost_reasons.length > 0 && (
        <section>
          <div className="pn-eyebrow mb-2">{t("stp.detail.lost")}</div>
          <div className="flex flex-wrap gap-2">
            {r.lost_reasons.slice(0, 5).map((l) => (
              <span key={l.reason} className="inline-flex h-7 items-center gap-2 rounded-full bg-pn-panel-3 px-3 text-[12px]">
                {l.reason} <span className="pn-mono text-pn-subtle">{l.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-auto grid grid-cols-2 gap-3">
        <Button variant="primary" href={recHref} testId="ST-DETAIL-calls">{t("stp.detail.calls")}</Button>
        <Button variant="outline" href={`${recHref}&sort=score.asc`} testId="ST-DETAIL-worst">{t("stp.detail.worst")}</Button>
      </div>
      <span className="sr-only">{dayMonth(loc, date)}</span>
    </Card>
  );
}

/* --------------------------------------------------------- Sahifa */

export function StaffPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const q = useStaffStats(sel.date);
  const prevQ = useStaffStats(addDays(sel.date, -1));
  const ops = useOperatorDay(me?.company.id, sel.date);
  const query = (url.get("q") ?? "").trim().toLowerCase();
  const target = me?.norms.targetScore10 ?? null;
  const norm = me?.norms.dailyLongCallsNorm ?? null;

  usePageBusy(q.isFetching && q.isPlaceholderData);

  const rows = useMemo(() => ranked(q.data ?? []), [q.data]);
  const prevBy = useMemo(() => new Map((prevQ.data ?? []).map((r) => [r.key, score10(r)])), [prevQ.data]);
  const shown = query ? rows.filter((r) => r.name.toLowerCase().includes(query) || (r.ext ?? "").includes(query)) : rows;
  const selectedKey = url.get("op") ?? shown[0]?.key ?? null;
  const selected = rows.find((r) => r.key === selectedKey) ?? shown[0];
  const avg = teamAvg(rows);
  const totalCalls = rows.reduce((s, r) => s + r.calls, 0);
  const totalScored = rows.reduce((s, r) => s + r.scored_calls, 0);
  const opsOf = (r: StaffRow) => opDayOf(r, ops.data);

  return (
    <div className="@container/st flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("stp.eyebrow", { ops: rows.length, calls: fmtInt(totalCalls), scored: fmtInt(totalScored) })}</span>}
        title={t("stp.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={(d) => { sel.setDate(d); }} testId="ST-DATE" />
            <label className="flex h-[46px] w-[240px] items-center gap-2 rounded-full border border-pn-border bg-pn-panel px-4 text-pn-subtle focus-within:border-pn-border-3">
              <Icon name="search" size={16} />
              <input
                type="search"
                value={url.get("q") ?? ""}
                onChange={(e) => url.set({ q: e.target.value || null })}
                placeholder={t("stp.search")}
                aria-label={t("stp.search")}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-pn-text outline-none placeholder:text-pn-subtle"
                data-testid="ST-SEARCH"
              />
            </label>
            <HeaderBell />
          </>
        }
      />

      {!q.data ? (
        q.isError ? (
          <Card className="text-[14px] text-pn-muted" data-testid="ST-ERROR">{t("stp.error")}</Card>
        ) : (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[170px] rounded-[26px]" />
            <div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[170px] rounded-[22px]" />)}</div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-5 transition-opacity" style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }}>
          <div className="flex flex-col gap-4 @min-[1100px]/st:flex-row">
            <Distribution rows={rows} avg={avg} target={target} />
            <TeamCard rows={rows} avg={avg} target={target} norm={norm} opsOf={opsOf} />
          </div>
          {rows.length === 0 ? (
            <Card className="py-12 text-center text-[14px] text-pn-muted" data-testid="ST-EMPTY">{t("stp.empty", { date: dayMonth(loc, sel.date) })}</Card>
          ) : (
            <div className="flex flex-col gap-4 @min-[1100px]/st:flex-row @min-[1100px]/st:items-start">
              <div className="grid min-w-0 flex-[2.2_1_0] grid-cols-1 gap-4 @min-[560px]/st:grid-cols-2 @min-[1100px]/st:grid-cols-3">
                {shown.map((r) => (
                  <OpCard
                    key={r.key}
                    r={r}
                    prev={prevBy.get(r.key) ?? null}
                    target={target}
                    selected={selected?.key === r.key}
                    onSelect={() => {
                      url.set({ op: r.key });
                      // Tor ekranda tafsilot kartochkalar ostida — unga o'tkazamiz.
                      requestAnimationFrame(() => {
                        const el = document.getElementById("st-detail");
                        if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }}
                  />
                ))}
                {shown.length === 0 && <Card className="col-span-full text-center text-[14px] text-pn-muted">{t("stp.noMatch")}</Card>}
              </div>
              {selected && (
                <div id="st-detail" className="min-w-0 scroll-mt-4 @min-[1100px]/st:flex-[1_1_0]">
                  <Detail
                    r={selected}
                    total={rows.length}
                    prev={prevBy.get(selected.key) ?? null}
                    op={opsOf(selected)}
                    norm={norm}
                    target={target}
                    date={sel.date}
                    loc={loc}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

