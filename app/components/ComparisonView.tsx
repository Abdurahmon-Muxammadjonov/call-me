"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  fetchConversionHistory, fetchDailyMinutes, fetchDailySummary, fetchHourly,
  type ConversionDay, type DailyMinutesResult, type DailySummaryDay, type HourlyRow,
} from "../lib/api";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import {
  formatMinutes, formatNumber, formatPercent, formatScore, normalizeScore,
  tashkentDay, tashkentNowHm,
} from "../lib/format";
import { Card, CardHeader, DeltaChip, EmptyState, PageHeader, ProgressBar, SegmentedControl, Skeleton, deltaOf } from "./kit";
import { LineChart } from "./kit/charts";

/* =====================================================================
 * SOLISHTIRISH PANELI (spetsifikatsiya 3.3)
 *
 * Uch ko'rsatkich kartasi (joriy vs oldingi), soatlik grafik va kunlik
 * jadval. Jadval ASOSI — hamma qo'ng'iroqlar (daily-summary); operatorli
 * soni alohida kichik yozuvda ko'rsatiladi, shunda boshqa sahifalardagi
 * raqamlar bilan mos keladi.
 * ===================================================================== */

type Period = "day" | "week" | "month";

function periodDays(period: Period): { cur: string[]; prev: string[] } {
  const today = tashkentDay();
  if (period === "day") return { cur: [today], prev: [tashkentDay(-1)] };
  if (period === "week") {
    const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
    const cur = Array.from({ length: dow + 1 }, (_, i) => tashkentDay(-dow + i));
    return { cur, prev: cur.map((_, i) => tashkentDay(-dow - 7 + i)) };
  }
  const dayNum = Number(today.slice(8, 10));
  const cur = Array.from({ length: dayNum }, (_, i) => tashkentDay(-(dayNum - 1) + i));
  return { cur, prev: cur.map((_, i) => tashkentDay(-(dayNum - 1) - 30 + i)) };
}

const sumBy = (rows: DailySummaryDay[], days: string[], key: keyof DailySummaryDay) =>
  rows.filter((r) => days.includes(r.date)).reduce((s, r) => s + (Number(r[key]) || 0), 0);

/** 3.3 A — ko'rsatkich kartasi: oldingi va joriy davr yonma-yon. */
function MetricCard({
  label, unit, prevLabel, curLabel, prev, cur, isScore,
}: {
  label: string; unit: string; prevLabel: string; curLabel: string;
  prev: number; cur: number; isScore?: boolean;
}) {
  const max = Math.max(prev, cur, 1);
  const fmt = (v: number) => (isScore ? formatScore(v) : formatNumber(v, unit.includes("daq") ? 1 : 0));
  const delta = deltaOf(cur, prev);
  const good = delta.tone !== "orange";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm" style={{ color: "var(--muted)" }}>{label}</span>
        <DeltaChip delta={delta} padded />
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-4xl font-semibold leading-none" style={{ color: "var(--text)" }}>{fmt(cur)}</span>
        <span className="text-sm" style={{ color: "var(--subtle)" }}>{unit}</span>
      </p>

      <div className="mt-4 space-y-2.5">
        {[
          { name: prevLabel, value: prev, color: "#3A4252", text: "var(--text-3)" },
          { name: curLabel, value: cur, color: good ? "var(--chart)" : "var(--orange)", text: "var(--text)" },
        ].map((r) => (
          <div key={r.name} className="grid items-center gap-2.5" style={{ gridTemplateColumns: "52px 1fr 76px" }}>
            <span className="truncate text-xs" style={{ color: r.text }}>{r.name}</span>
            <ProgressBar value={r.value} max={max} color={r.color} height={8} />
            <span className="text-right font-mono text-xs" style={{ color: r.text }}>{fmt(r.value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ComparisonView() {
  const t = useT();
  const [period, setPeriod] = useState<Period>("day");
  const [days, setDays] = useState<DailySummaryDay[] | null>(null);
  const [untilDays, setUntilDays] = useState<DailySummaryDay[] | null>(null);
  const [today, setToday] = useState<HourlyRow[] | null>(null);
  const [yesterday, setYesterday] = useState<HourlyRow[] | null>(null);
  const [minutes, setMinutes] = useState<DailyMinutesResult | null>(null);
  const [history, setHistory] = useState<ConversionDay[] | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 30000);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      const [d, u, h1, h2, m, hist] = await Promise.all([
        fetchDailySummary(40, ctrl.signal).catch(() => null),
        fetchDailySummary(40, ctrl.signal, tashkentNowHm()).catch(() => null),
        fetchHourly(tashkentDay(), ctrl.signal).catch(() => null),
        fetchHourly(tashkentDay(-1), ctrl.signal).catch(() => null),
        fetchDailyMinutes(30, ctrl.signal).catch(() => null),
        fetchConversionHistory(null, 30, ctrl.signal).catch(() => null),
      ]);
      if (ctrl.signal.aborted) return;
      setDays(d); setUntilDays(u); setToday(h1); setYesterday(h2); setMinutes(m); setHistory(hist);
    })();
    return () => ctrl.abort();
  }, [reloadKey]);

  const { cur, prev } = useMemo(() => periodDays(period), [period]);
  const rows = days ?? [];
  const prevRows = untilDays ?? rows;

  const callsCur = sumBy(rows, cur, "calls");
  const callsPrev = sumBy(prevRows, prev, "calls");
  const minCur = sumBy(rows, cur, "minutes");
  const minPrev = sumBy(prevRows, prev, "minutes");

  const scored = (src: DailySummaryDay[], ds: string[]) => {
    const list = src.filter((r) => ds.includes(r.date) && r.scored > 0);
    const total = list.reduce((s, r) => s + r.avg_score * r.scored, 0);
    const n = list.reduce((s, r) => s + r.scored, 0);
    return n > 0 ? total / n : 0;
  };
  const kpiCur = normalizeScore(scored(rows, cur)) ?? 0;
  const kpiPrev = normalizeScore(scored(prevRows, prev)) ?? 0;

  const vsLabel = period === "day" ? t("cmp.vs.day") : period === "week" ? t("cmp.vs.week") : t("cmp.vs.month");
  const prevLabel = period === "day" ? t("cmp.prev") : period === "week" ? t("cmp.prevWeek") : t("cmp.prevMonth");
  const curLabel = period === "day" ? t("cmp.cur") : period === "week" ? t("cmp.curWeek") : t("cmp.curMonth");

  /* Soatlik grafik — 09:00 dan 23:00 gacha. */
  const hourLabels = Array.from({ length: 15 }, (_, i) => String(i + 9).padStart(2, "0"));
  const hourSeries = (src: HourlyRow[] | null) =>
    hourLabels.map((h) => src?.find((x) => x.hour === Number(h))?.calls ?? 0);
  const peakHour = (today ?? []).slice().sort((a, b) => b.calls - a.calls)[0];

  /* Kunlik jadval — ASOS: hamma qo'ng'iroqlar. */
  const tableRows = rows.slice(0, 14);
  const maxMinutes = Math.max(1, ...tableRows.map((r) => r.minutes));
  const byDayOps = new Map(minutes?.days.map((d) => [d.date, d.operators]) ?? []);
  const convByDay = new Map(history?.map((h) => [h.date, h]) ?? []);

  const loading = days === null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("nav.comparison.label")}
        hint={t("cmp.hint")}
        right={
          <>
            <SegmentedControl<Period>
              value={period}
              onChange={setPeriod}
              options={[
                { value: "day", label: t("an.period.day") },
                { value: "week", label: t("an.period.week") },
                { value: "month", label: t("an.period.month") },
              ]}
            />
            <span
              className="inline-flex h-11 items-center rounded-xl px-3.5 text-[13px]"
              style={{ background: "var(--control)", border: "1px solid var(--border-control)", color: "var(--text-3)" }}
            >
              {vsLabel}
            </span>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={220} />)}
        </div>
      ) : (
        <>
          {/* A) Uch ko'rsatkich */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MetricCard label={t("cmp.calls")} unit={t("cmp.unit.calls")} prevLabel={prevLabel} curLabel={curLabel} prev={callsPrev} cur={callsCur} />
            <MetricCard label={t("cmp.duration")} unit={t("cmp.unit.min")} prevLabel={prevLabel} curLabel={curLabel} prev={minPrev} cur={minCur} />
            <MetricCard label={t("cmp.kpi")} unit={t("cmp.unit.score")} prevLabel={prevLabel} curLabel={curLabel} prev={kpiPrev} cur={kpiCur} isScore />
          </div>

          {/* B) Soatlik grafik */}
          <Card>
            <CardHeader
              title={t("cmp.chart.hours")}
              hint={peakHour && peakHour.calls > 0 ? t("cmp.chart.peak", { hour: `${String(peakHour.hour).padStart(2, "0")}:00` }) : undefined}
              right={
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-3)" }}>
                  <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: "var(--chart)" }} />{t("cmp.legend.today")}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--subtle) 0 5px, transparent 5px 10px)" }} />
                    {t("cmp.legend.yesterday")}
                  </span>
                </div>
              }
            />
            <div className="mt-4">
              <LineChart labels={hourLabels} current={hourSeries(today)} previous={hourSeries(yesterday)} />
            </div>
          </Card>

          {/* C) Kunlik gaplashuv jadvali */}
          <Card padded={false}>
            <div className="px-[22px] py-5">
              <CardHeader title={t("cmp.table.title")} hint={t("cmp.table.hint")} />
            </div>

            {tableRows.length === 0 ? (
              <EmptyState text={t("an.empty")} />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div
                    className="grid items-center px-[22px] text-[11px] font-medium uppercase tracking-[0.1em]"
                    style={{ gridTemplateColumns: "1.2fr 0.8fr 2.4fr 0.8fr 0.8fr 0.8fr 24px", columnGap: 16, height: 38, color: "var(--subtle)", borderTop: "1px solid var(--divider-strong)", borderBottom: "1px solid var(--divider-strong)" }}
                  >
                    <span>{t("cmp.col.day")}</span>
                    <span>{t("cmp.col.calls")}</span>
                    <span>{t("cmp.col.talk")}</span>
                    <span>{t("cmp.col.avg")}</span>
                    <span className="hidden xl:block">{t("cmp.col.traffic")}</span>
                    <span className="hidden xl:block">{t("cmp.col.sales")}</span>
                    <span />
                  </div>

                  {tableRows.map((d) => {
                    const open = openDay === d.date;
                    const ops = byDayOps.get(d.date) ?? [];
                    const conv = convByDay.get(d.date);
                    const unknownCalls = d.calls - d.operator_calls;
                    return (
                      <div key={d.date} style={{ background: open ? "var(--row-open)" : undefined }}>
                        <button
                          type="button"
                          onClick={() => setOpenDay(open ? null : d.date)}
                          aria-expanded={open}
                          className="grid w-full items-center px-[22px] text-left"
                          style={{ gridTemplateColumns: "1.2fr 0.8fr 2.4fr 0.8fr 0.8fr 0.8fr 24px", columnGap: 16, height: 52, borderBottom: "1px solid var(--divider)" }}
                        >
                          <span className="min-w-0">
                            <span className="block font-mono text-sm" style={{ color: "var(--text)" }}>{d.date.slice(8, 10)}-{d.date.slice(5, 7)}</span>
                            <span className="block text-[13px]" style={{ color: "var(--subtle)" }}>
                              {new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", weekday: "short" }).format(new Date(`${d.date}T12:00:00Z`))}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block font-mono text-sm" style={{ color: "var(--text-2)" }}>{formatNumber(d.calls)}</span>
                            {unknownCalls > 0 && (
                              <span className="block text-xs" style={{ color: "var(--subtle)" }}>
                                {t("cmp.operatorCalls", { n: formatNumber(d.operator_calls) })}
                              </span>
                            )}
                          </span>
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="min-w-0 flex-1">
                              <ProgressBar value={d.minutes} max={maxMinutes} color={open ? "var(--chart)" : "var(--chart-dim)"} height={8} />
                            </span>
                            <span className="shrink-0 font-mono text-[13px]" style={{ color: "var(--text-2)" }}>{formatMinutes(d.minutes)}</span>
                          </span>
                          <span className="font-mono text-[13px]" style={{ color: "var(--text-2)" }}>
                            {d.calls > 0 ? `${Math.round((d.minutes * 60) / d.calls)}s` : "—"}
                          </span>
                          <span className="hidden font-mono text-[13px] xl:block" style={{ color: "var(--text-2)" }}>
                            {conv ? formatPercent(conv.traffic_conversion) : "—"}
                          </span>
                          <span className="hidden font-mono text-[13px] xl:block" style={{ color: "var(--text-2)" }}>
                            {conv ? formatPercent(conv.sales_conversion) : "—"}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} style={{ color: "var(--subtle)" }} />
                        </button>

                        {open && (
                          <div className="grid gap-3 px-[22px] pb-[18px] pt-1 sm:grid-cols-2 xl:grid-cols-5">
                            {[...ops, ...(unknownCalls > 0 ? [{ name: t("cmp.unknown"), calls: unknownCalls, minutes: Math.max(0, d.minutes - ops.reduce((s, o) => s + o.minutes, 0)) }] : [])]
                              .sort((a, b) => b.minutes - a.minutes)
                              .map((o) => (
                                <div key={o.name} className="rounded-xl p-3.5" style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
                                  <p className="flex items-baseline justify-between gap-2">
                                    <span className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{o.name}</span>
                                    <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{formatNumber(o.calls)}</span>
                                  </p>
                                  <p className="mt-1 font-mono text-[17px] font-semibold" style={{ color: "var(--text)" }}>{formatMinutes(o.minutes)}</p>
                                  <div className="mt-2"><ProgressBar value={o.minutes} max={Math.max(1, d.minutes)} color="var(--chart)" height={4} /></div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
