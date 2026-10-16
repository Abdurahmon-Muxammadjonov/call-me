"use client";

/* TAHLIL HOLATI — Pulse Noir (05-Tahlil-holati.png), 2026-10-14.
 *
 * URL — holat: ?date=&list=analyzed|not|<sabab>&page=&open=<id>&allOps=1
 * Ma'lumot: /analytics/analysis-status (shu kun + 7 kunlik dinamika),
 * ro'yxat va tafsilot — Audio yozuvlar bilan umumiy (CallTable, CallDetail).
 * Hamma son daily-summary bilan bir xil ta'rifda (total = barcha qo'ng'iroqlar). */

import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Card, ExtBadge, Skeleton } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { DateButton } from "../../ui/DateButton";
import { Ring } from "../../charts";
import { PageHeader, LiveEyebrow } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { useUrlState } from "../../shell/useUrlState";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useAnalysisStatus, useStatusHistory, type AnalysisStatus } from "../../data/status";
import { useCallsPage, useDaySummary, type CallFilter } from "../../data/calls";
import { coverageTone, TONE_VARS } from "../../lib/tones";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { dayMonth, hoursMinutes, weekdayName, type Loc } from "../../lib/dates";
import { CallTable } from "../calls/CallTable";
import { CallDetail } from "../calls/CallDetail";
import { useCallNames } from "../calls/AudioPage";

const PAGE = 10;
const REASON_COLORS = ["var(--pn-bad)", "var(--pn-warn)", "var(--pn-lilac)", "var(--pn-pink)", "var(--pn-slate)", "var(--pn-sky)", "var(--pn-peach)", "var(--pn-periwinkle)"];

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

function colorOf(reasons: AnalysisStatus["reasons"], reason: string): string {
  const i = reasons.findIndex((r) => r.reason === reason);
  return REASON_COLORS[(i < 0 ? 0 : i) % REASON_COLORS.length];
}

function Summary({ s }: { s: AnalysisStatus }) {
  const t = usePT();
  const cov = s.total ? (s.analyzed / s.total) * 100 : 0;
  const segs = [
    { key: "__analyzed", label: t("as.analyzedLegend"), count: s.analyzed, color: "var(--pn-good)" },
    ...s.reasons.map((r) => ({ key: r.reason, label: r.reason, count: r.count, color: colorOf(s.reasons, r.reason) })),
  ].filter((x) => x.count > 0);
  return (
    <Card pad="lg" className="flex flex-col gap-6 @min-[1000px]/as:flex-row @min-[1000px]/as:items-center" data-testid="AS-SUMMARY">
      <div className="flex items-center gap-6 @min-[1000px]/as:w-[320px] @min-[1000px]/as:shrink-0">
        <div className="relative h-[128px] w-[128px] shrink-0">
          <Ring size={128} r={54} stroke={11} pct={cov} color={TONE_VARS[coverageTone(cov)].fg} track="var(--pn-track)" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="pn-display text-[32px] leading-none">{Math.round(cov)}%</span>
            <span className="mt-1 text-[11px] text-pn-muted">{t("as.coverage")}</span>
          </div>
        </div>
        <div>
          <div className="text-[13px] text-pn-muted">{t("as.total")}</div>
          <div className="pn-display mt-1 text-[44px] leading-none tracking-[-0.03em]">{fmtInt(s.total)}</div>
          <div className="mt-2 text-[12px] text-pn-muted">{t("as.talk", { t: hoursMinutes((s.analyzed_minutes + s.not_analyzed_minutes) * 60) })}</div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="flex items-baseline gap-2">
            <span className="pn-display text-[24px] text-pn-good">{fmtInt(s.analyzed)}</span>
            <span className="text-[13px] text-pn-muted">{t("as.analyzed")} · {t("as.hours", { t: hoursMinutes(s.analyzed_minutes * 60) })}</span>
          </span>
          <span className="flex items-baseline gap-2">
            <span className="pn-display text-[24px] text-pn-warn">{fmtInt(s.not_analyzed)}</span>
            <span className="text-[13px] text-pn-muted">{t("as.notAnalyzed")} · {t("as.hours", { t: hoursMinutes(s.not_analyzed_minutes * 60) })}</span>
          </span>
        </div>
        <div className="flex h-[38px] gap-[3px] overflow-hidden rounded-[10px]" aria-hidden>
          {segs.map((x) => (
            <span key={x.key} className="pn-grow h-full first:rounded-l-[10px] last:rounded-r-[10px]" style={{ flexGrow: x.count, flexBasis: 0, minWidth: 4, background: x.color }} title={`${x.label} · ${x.count}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 @min-[640px]/as:grid-cols-2 @min-[1200px]/as:grid-cols-4">
          {segs.map((x) => (
            <span key={x.key} className="flex min-w-0 items-center gap-2 text-[12px]">
              <span className="h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ background: x.color }} />
              <span className="min-w-0 flex-1 truncate text-pn-text-2" title={x.label}>{x.label}</span>
              <span className="pn-mono font-semibold">{fmtInt(x.count)}</span>
              <span className="pn-mono w-[46px] text-right text-pn-subtle">{s.total ? `${fmtDec((x.count / s.total) * 100)}%` : DASH}</span>
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ReasonCards({
  s,
  history,
  onListen,
}: {
  s: AnalysisStatus;
  history: Array<{ date: string; data: AnalysisStatus | null }>;
  onListen: (reason: string) => void;
}) {
  const t = usePT();
  if (!s.reasons.length) {
    return <Card className="flex items-center gap-3 text-[14px] text-pn-good"><Icon name="check" size={18} /> {t("as.allAnalyzed")}</Card>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 @min-[640px]/as:grid-cols-2 @min-[1100px]/as:grid-cols-3">
      {s.reasons.map((r) => {
        const series = [...history.map((h) => h.data?.reasons.find((x) => x.reason === r.reason)?.count ?? 0), r.count];
        const max = Math.max(1, ...series);
        const color = colorOf(s.reasons, r.reason);
        const hintKey = `as.hint.${r.reason}`;
        const hint = t(hintKey as "as.hint.Javobsiz");
        return (
          <Card pad="tile" key={r.reason} className="flex flex-col gap-3" data-testid={`AS-R-${r.reason}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[14px]">
                <span className="h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ background: color }} />
                <span className="truncate">{r.reason}</span>
              </span>
              <span className="pn-mono text-[12px] text-pn-subtle">{s.not_analyzed ? `${fmtDec((r.count / s.not_analyzed) * 100)}%` : DASH}</span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <span className="pn-display text-[36px] leading-none tracking-[-0.03em]">{fmtInt(r.count)}</span>
              <span className="flex h-9 items-end gap-[5px]" aria-hidden>
                {series.map((v, i) => (
                  <span key={i} className="pn-bar w-[10px] rounded-t-[3px] rounded-b-[1px]" style={{ height: Math.max(3, Math.round((v / max) * 36)), background: i === series.length - 1 ? color : "var(--pn-bar-dim)" }} />
                ))}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-pn-divider pt-3">
              <span className="min-w-0 text-[12px] leading-[1.4] text-pn-muted">{hint === hintKey ? "" : hint}</span>
              <button type="button" onClick={() => onListen(r.reason)} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-pn-text hover:opacity-80" data-testid={`AS-LISTEN-${r.reason}`}>
                <Icon name="play" size={11} /> {t("as.listen")}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OpsTable({ s, showAll, onToggle }: { s: AnalysisStatus; showAll: boolean; onToggle: () => void }) {
  const t = usePT();
  const rows = [...s.operators].sort((a, b) => b.analyzed + b.skipped - (a.analyzed + a.skipped));
  const max = Math.max(1, ...rows.map((r) => r.analyzed + r.skipped));
  const shown = showAll ? rows : rows.slice(0, 8);
  const tpl = "minmax(150px,1.2fr) minmax(160px,2.4fr) 110px 90px 70px";
  return (
    <Card pad="none" className="overflow-hidden" data-testid="AS-OPS">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-[22px] pb-4">
        <div>
          <h2 className="pn-card-title">{t("as.ops")}</h2>
          <div className="mt-1 text-[13px] text-pn-muted">{t("as.opsSub")}</div>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-pn-muted">
          <span className="flex items-center gap-2"><span className="h-[10px] w-[10px] rounded-[3px] bg-pn-good" />{t("as.analyzedLegend")}</span>
          <span className="flex items-center gap-2"><span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: "var(--pn-not-analyzed)" }} />{t("as.notAnalyzed")}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="pn-table-head grid items-center border-y border-pn-border px-6" style={{ gridTemplateColumns: tpl, columnGap: 16, height: 38 }}>
            <span>{t("as.col.op")}</span><span>{t("as.col.bar")}</span><span className="text-right">{t("as.col.counts")}</span><span className="text-right">{t("as.col.time")}</span><span className="text-right">{t("as.col.cov")}</span>
          </div>
          {shown.map((o) => {
            const total = o.analyzed + o.skipped;
            const ext = o.operator.match(/(\d+)\s*$/)?.[1] ?? null;
            const cov = total ? (o.analyzed / total) * 100 : 0;
            return (
              <div key={o.operator} className="grid items-center border-b border-pn-divider px-6" style={{ gridTemplateColumns: tpl, columnGap: 16, minHeight: 50 }}>
                <span className="flex min-w-0 items-center gap-3">
                  {ext && <ExtBadge size="tahlil">{ext}</ExtBadge>}
                  <span className="truncate text-[14px]">{o.operator === "Aniqlanmagan" ? t("as.unknownOp") : o.operator}</span>
                </span>
                <span className="flex h-[8px] gap-[3px]" style={{ width: `${(total / max) * 100}%` }}>
                  {o.analyzed > 0 && <span className="pn-grow h-full rounded-full bg-pn-good" style={{ flexGrow: o.analyzed, flexBasis: 0 }} />}
                  {o.skipped > 0 && <span className="pn-grow h-full rounded-full" style={{ flexGrow: o.skipped, flexBasis: 0, background: "var(--pn-not-analyzed)" }} />}
                </span>
                <span className="pn-mono text-right text-[13px]"><span className="text-pn-good">{o.analyzed}</span> <span className="text-pn-subtle">·</span> <span className="text-pn-warn">{o.skipped}</span></span>
                <span className="pn-mono text-right text-[13px] text-pn-text-2">{t("as.hours", { t: hoursMinutes(o.analyzed_minutes * 60) })}</span>
                <span className="flex justify-end">
                  <span className="pn-mono inline-flex h-6 items-center rounded-[7px] px-2 text-[12px] font-semibold" style={{ background: TONE_VARS[coverageTone(cov)].tint, color: TONE_VARS[coverageTone(cov)].text }}>
                    {Math.round(cov)}%
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {rows.length > 8 && (
        <button type="button" onClick={onToggle} className="w-full py-4 text-center text-[13px] text-pn-text-2 hover:text-pn-text" data-testid="AS-OPS-more">
          {showAll ? t("as.less") : t("as.more", { n: rows.length - 8 })}
        </button>
      )}
    </Card>
  );
}

export function StatusPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const q = useAnalysisStatus(sel.date);
  const history = useStatusHistory(sel.date);
  const sum = useDaySummary(sel.date);
  const nameOf = useCallNames();
  const list = url.get("list") ?? "not";
  const page = Math.max(0, Number(url.get("page")) || 0);
  const openId = url.get("open");
  const filter: CallFilter = list === "analyzed" ? "scored" : "unscored";
  const reason = list !== "analyzed" && list !== "not" ? list : null;
  const calls = useCallsPage({ date: sel.date, filter, reason, page, pageSize: PAGE });
  const s = q.data;
  const dayRow = sum.data?.find((r) => r.date === sel.date);
  const avg10 = dayRow && dayRow.scored ? dayRow.avg_score / 10 : null;

  usePageBusy(q.isFetching && q.isPlaceholderData);

  const setList = (v: string) => url.set({ list: v === "not" ? null : v, page: null, open: null });
  const listen = (r: string) => {
    setList(r);
    requestAnimationFrame(() => document.getElementById("as-list")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const eyebrow = `${weekdayName(loc, sel.date)}, ${dayMonth(loc, sel.date)}`;
  const chip = (key: string, label: string, n: number, tone?: "good" | "warn") => (
    <button
      key={key}
      type="button"
      onClick={() => setList(key)}
      aria-pressed={list === key}
      data-testid={`AS-CHIP-${key}`}
      className={cx(
        "pn-press inline-flex h-9 items-center gap-2 rounded-full border px-[14px] text-[13px]",
        list === key
          ? "border-pn-seg-active-bg bg-pn-seg-active-bg font-semibold text-pn-seg-active-text"
          : tone
            ? "border-transparent"
            : "border-pn-border-2 text-pn-text-2 hover:bg-pn-panel-2"
      )}
      style={list !== key && tone ? { background: TONE_VARS[tone].tint, color: TONE_VARS[tone].text } : undefined}
    >
      {label} · <span className="pn-mono">{fmtInt(n)}</span>
    </button>
  );

  return (
    <div className="@container/as flex flex-col gap-5">
      <PageHeader
        eyebrow={sel.isToday ? <LiveEyebrow>{eyebrow}</LiveEyebrow> : <span className="pn-eyebrow">{eyebrow}</span>}
        title={t("as.title")}
        sub={t("as.sub")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={(d) => url.set({ date: d === sel.today ? null : d, page: null, open: null })} testId="AS-DATE" />
            <HeaderBell />
          </>
        }
      />
      {!s ? (
        q.isError ? <Card className="text-[14px] text-pn-muted">{t("as.error")}</Card> : <Skeleton className="h-[220px] rounded-[26px]" />
      ) : s.total === 0 ? (
        <Card className="py-12 text-center text-[14px] text-pn-muted">{t("as.empty")}</Card>
      ) : (
        <div className="flex flex-col gap-5 transition-opacity" style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }}>
          <Summary s={s} />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="pn-h2 text-[22px] font-bold tracking-[-0.02em]">{t("as.why")}</h2>
            <span className="text-[13px] text-pn-muted">{t("as.whySub", { n: fmtInt(s.not_analyzed) })}</span>
          </div>
          <ReasonCards s={s} history={history} onListen={listen} />
          <OpsTable s={s} showAll={url.get("allOps") === "1"} onToggle={() => url.set({ allOps: url.get("allOps") === "1" ? null : "1" })} />
          <div id="as-list" className="flex scroll-mt-4 flex-col gap-4 @min-[1100px]/as:flex-row @min-[1100px]/as:items-start">
            <Card pad="none" className="min-w-0 overflow-hidden @min-[1100px]/as:flex-[1.6_1_0]">
              <div className="flex flex-wrap gap-2 px-5 py-4">
                {chip("analyzed", t("as.chip.analyzed"), s.analyzed, "good")}
                {chip("not", t("as.chip.not"), s.not_analyzed, "warn")}
                {s.reasons.map((r) => chip(r.reason, r.reason, r.count))}
              </div>
              <CallTable
                rows={calls.data?.rows ?? []}
                selectedId={openId}
                playingId={null}
                onSelect={(r) => url.set({ open: r.id })}
                onPlay={(r) => url.set({ open: r.id })}
                nameOf={nameOf}
                targetScore10={me?.norms.targetScore10 ?? null}
                total={calls.data?.total ?? 0}
                page={page}
                pageSize={PAGE}
                onPage={(p) => url.set({ page: p ? String(p) : null })}
                loading={calls.isLoading}
                emptyText={t("calls.empty")}
              />
            </Card>
            {openId && (
              <div className="min-w-0 @min-[1100px]/as:sticky @min-[1100px]/as:top-4 @min-[1100px]/as:flex-[1_1_0]">
                <CallDetail
                  key={openId}
                  id={openId}
                  name={(() => { const r = calls.data?.rows.find((x) => x.id === openId); return r ? nameOf(r) : ""; })()}
                  dayAvg10={avg10}
                  targetScore10={me?.norms.targetScore10 ?? null}
                  loc={loc}
                  onClose={() => url.set({ open: null })}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
