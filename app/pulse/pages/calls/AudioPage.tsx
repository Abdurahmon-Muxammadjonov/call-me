"use client";

/* AUDIO YOZUVLAR — Pulse Noir (06-Audio-yozuvlar.png), 2026-10-14.
 *
 * URL — holat: ?date=&f=all|scored|unscored|low|problem&operator=&sort=&page=&open=<id>
 * Ro'yxat SERVERDA filtrlanadi va sahifalanadi (avval kunning hamma
 * qo'ng'iroqlari brauzerga tortilardi). Boshqa sahifalardan havola:
 * /dashboard/recordings?operator=104&date=…&sort=score.asc (eng pastini tinglash). */

import { useCallback, useState } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Card, DeltaPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { DateButton } from "../../ui/DateButton";
import { PageHeader, LiveEyebrow } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { pick, useUrlState } from "../../shell/useUrlState";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useMe } from "../../data/me";
import { useManagerNames } from "../../data/dayCalls";
import { useCallsPage, useDaySummary, type CallFilter, type CallSort } from "../../data/calls";
import { addDays, dayMonth, hmOf, type Loc } from "../../lib/dates";
import { fmtDec, fmtInt, DASH } from "../../lib/format";
import { listAllCalls, type CallRow } from "../../../lib/calls";
import { downloadCsv } from "../../../lib/exportCsv";
import { CallTable } from "./CallTable";
import { CallDetail } from "./CallDetail";

const FILTERS = ["all", "scored", "unscored", "low", "problem"] as const;
const SORTS = ["time", "score.asc", "score.desc", "duration.desc"] as const;
const PAGE = 12;

function cx(...p: Array<string | false | null | undefined>) {
  return p.filter(Boolean).join(" ");
}

function Tile({ label, value, unit, delta, tone, testId }: { label: string; value: string; unit?: string; delta?: React.ReactNode; tone?: string; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 px-6 py-5" data-testid={testId}>
      <span className="truncate text-[13px] text-pn-muted">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="pn-display text-[30px] leading-none tracking-[-0.02em]" style={{ color: tone }}>{value}</span>
        {unit && <span className="pn-mono text-[12px] text-pn-muted">{unit}</span>}
        {delta}
      </span>
    </div>
  );
}

export function useCallNames() {
  const { data: me } = useMe();
  const names = useManagerNames(me?.company.id);
  return useCallback(
    (r: CallRow) => (r.manager_id && names.data?.get(r.manager_id)) || (r.operator_ext ? `Operator ${r.operator_ext}` : "—"),
    [names.data]
  );
}

export function AudioPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const { data: me } = useMe();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const filter = pick(url.get("f"), FILTERS, "all") as CallFilter;
  const sort = pick(url.get("sort"), SORTS, "time") as CallSort;
  const operator = url.get("operator")?.trim() || null;
  const page = Math.max(0, Number(url.get("page")) || 0);
  const openId = url.get("open");
  const [autoPlay, setAutoPlay] = useState(false);
  const [exporting, setExporting] = useState(false);
  const target = me?.norms.targetScore10 ?? null;
  const low = me?.norms.lowScoreThreshold10 ?? 5;

  // "Eng pastini tinglash" — past ball birinchi, faqat baholanganlar.
  const effFilter: CallFilter = sort === "score.asc" && filter === "all" ? "scored" : filter;
  const q = useCallsPage({ date: sel.date, filter: effFilter, operator, sort, page, pageSize: PAGE });
  const sum = useDaySummary(sel.date);
  const nameOf = useCallNames();
  usePageBusy(q.isFetching && q.isPlaceholderData);

  const dayRow = sum.data?.find((r) => r.date === sel.date);
  const prevRow = sum.data?.find((r) => r.date === addDays(sel.date, -1));
  const avg10 = dayRow && dayRow.scored ? dayRow.avg_score / 10 : null;
  const prevAvg10 = prevRow && prevRow.scored ? prevRow.avg_score / 10 : null;
  const callsDelta = dayRow && prevRow && prevRow.calls ? ((dayRow.calls - prevRow.calls) / prevRow.calls) * 100 : null;

  const counts: Record<CallFilter, number | null> = {
    all: dayRow?.calls ?? null,
    scored: dayRow?.scored ?? null,
    unscored: dayRow ? dayRow.calls - dayRow.scored : null,
    low: dayRow?.low_score ?? null,
    problem: null,
  };

  const set = useCallback((patch: Record<string, string | null>) => url.set(patch), [url]);
  const rows = q.data?.rows ?? [];
  const selectedRow = rows.find((r) => r.id === openId);

  const doExport = useCallback(async () => {
    setExporting(true);
    try {
      const all = await listAllCalls({ date: sel.date, ...(effFilter === "scored" ? { analyzed: true } : effFilter === "unscored" ? { analyzed: false } : {}), ...(effFilter === "problem" ? { problem: true } : {}) });
      const list = operator ? all.filter((c) => c.operator_ext === operator) : all;
      downloadCsv(
        `audio-yozuvlar-${sel.date}.csv`,
        ["sana", "vaqt", "operator", "yo'nalish", "davomiylik (soniya)", "holat/sabab", "ball", "jarima", "bonus"],
        list.map((c) => [
          sel.date, hmOf(new Date(c.created_at)), nameOf(c), c.direction ?? "",
          Number(c.duration) || 0, c.kpi_score > 0 ? "" : c.dropped_reason || c.status || "",
          c.kpi_score > 0 ? fmtDec(c.kpi_score / 10) : "", Math.round(Number(c.penalty_amount) || 0), Math.round(Number(c.bonus_amount) || 0),
        ])
      );
    } finally {
      setExporting(false);
    }
  }, [sel.date, effFilter, operator, nameOf]);

  return (
    <div className="@container/au flex flex-col gap-5">
      <PageHeader
        eyebrow={sel.isToday ? <LiveEyebrow>{t("calls.eyebrow")}</LiveEyebrow> : <span className="pn-eyebrow">{dayMonth(loc, sel.date)}</span>}
        title={t("calls.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={(d) => set({ date: d === sel.today ? null : d, page: null, open: null })} testId="AU-DATE" />
            <Button variant="secondary" icon="download" loading={exporting} onClick={() => void doExport()} testId="AU-EXPORT">{t("calls.export")}</Button>
            <HeaderBell />
          </>
        }
      />

      <Card pad="none" className="grid grid-cols-2 divide-pn-border @min-[900px]/au:grid-cols-4 @min-[900px]/au:divide-x">
        <Tile
          label={sel.isToday ? t("calls.tile.today") : t("calls.tile.day", { date: dayMonth(loc, sel.date) })}
          value={dayRow ? fmtInt(dayRow.calls) : DASH}
          delta={callsDelta != null && <DeltaPill tone={callsDelta >= 0 ? "good" : "bad"} size="sm" arrow={callsDelta >= 0 ? "up" : "down"}>{fmtDec(Math.abs(callsDelta))}%</DeltaPill>}
          testId="AU-T-calls"
        />
        <Tile
          label={t("calls.tile.scored")}
          value={dayRow ? fmtInt(dayRow.scored) : DASH}
          unit={dayRow && dayRow.calls ? t("calls.tile.share", { p: Math.round((dayRow.scored / dayRow.calls) * 100) }) : undefined}
          testId="AU-T-scored"
        />
        <Tile
          label={t("calls.tile.avg")}
          value={avg10 == null ? DASH : fmtDec(avg10)}
          delta={avg10 != null && prevAvg10 != null && avg10 !== prevAvg10 && <DeltaPill tone={avg10 > prevAvg10 ? "good" : "bad"} size="sm" arrow={avg10 > prevAvg10 ? "up" : "down"}>{fmtDec(Math.abs(avg10 - prevAvg10))}</DeltaPill>}
          testId="AU-T-avg"
        />
        <Tile
          label={t("calls.tile.low", { n: low })}
          value={dayRow ? fmtInt(dayRow.low_score) : DASH}
          unit={dayRow?.low_score ? t("calls.tile.attention") : undefined}
          tone={dayRow?.low_score ? "var(--pn-bad)" : undefined}
          testId="AU-T-low"
        />
      </Card>

      <div className="flex flex-col gap-4 @min-[1100px]/au:flex-row @min-[1100px]/au:items-start">
        <Card pad="none" className="min-w-0 overflow-hidden @min-[1100px]/au:flex-[1.6_1_0]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div role="tablist" aria-label={t("calls.filter")} className="flex flex-wrap gap-1 rounded-full border border-pn-border bg-pn-panel-2 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={filter === f}
                  data-testid={`AU-F-${f}`}
                  onClick={() => set({ f: f === "all" ? null : f, page: null })}
                  className={cx(
                    "pn-press inline-flex h-9 items-center gap-2 rounded-full px-[14px] text-[13px]",
                    filter === f ? "bg-pn-seg-active-bg font-semibold text-pn-seg-active-text" : "text-pn-muted hover:text-pn-text"
                  )}
                >
                  {t(`calls.f.${f}` as "calls.f.all")}
                  {counts[f] != null && <span className={cx("pn-mono text-[12px]", filter !== f && f === "low" && "text-pn-bad")}>{fmtInt(counts[f])}</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label={t("calls.sort")}
                value={sort}
                onChange={(e) => set({ sort: e.target.value === "time" ? null : e.target.value, page: null })}
                className="h-10 rounded-full border border-pn-border bg-pn-panel-2 px-3 text-[13px] text-pn-text outline-none"
                data-testid="AU-SORT"
              >
                {SORTS.map((s) => <option key={s} value={s}>{t(`calls.s.${s}` as "calls.s.time")}</option>)}
              </select>
              <label className="flex h-10 w-[150px] items-center gap-2 rounded-full border border-pn-border bg-pn-panel-2 px-3 text-pn-subtle">
                <Icon name="search" size={15} />
                <input
                  value={operator ?? ""}
                  onChange={(e) => set({ operator: e.target.value.replace(/\D/g, "") || null, page: null })}
                  inputMode="numeric"
                  placeholder={t("calls.operatorPh")}
                  aria-label={t("calls.operatorPh")}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-pn-text outline-none placeholder:text-pn-subtle"
                  data-testid="AU-OPERATOR"
                />
              </label>
            </div>
          </div>
          <div style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }} className="transition-opacity">
            <CallTable
              rows={rows}
              selectedId={openId}
              playingId={autoPlay ? openId : null}
              onSelect={(r) => { setAutoPlay(false); set({ open: r.id }); }}
              onPlay={(r) => { setAutoPlay(true); set({ open: r.id }); }}
              nameOf={nameOf}
              targetScore10={target}
              total={q.data?.total ?? 0}
              page={page}
              pageSize={PAGE}
              onPage={(p) => set({ page: p ? String(p) : null })}
              loading={q.isLoading}
              emptyText={q.isError ? t("calls.error") : t("calls.empty")}
            />
          </div>
        </Card>
        {openId && (
          <div className="min-w-0 @min-[1100px]/au:sticky @min-[1100px]/au:top-4 @min-[1100px]/au:flex-[1_1_0]">
            <CallDetail
              key={openId}
              id={openId}
              name={selectedRow ? nameOf(selectedRow) : ""}
              dayAvg10={avg10}
              targetScore10={target}
              loc={loc}
              autoPlay={autoPlay}
              onClose={() => { setAutoPlay(false); set({ open: null }); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

