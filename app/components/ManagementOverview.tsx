"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, LayoutGrid, Shield, Target, TrendingUp, Users } from "lucide-react";
import { fetchDailySummary, fetchHourly, fetchStaffStats, type DailySummaryDay, type HourlyRow, type StaffStatRow } from "../lib/api";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import { formatDayLong, formatDuration, formatNumber, formatPercent, formatScore, tashkentDay, tashkentNowHm } from "../lib/format";
import { Card, CardHeader, DeltaChip, EmptyState, KpiTile, PageHeader, PrimaryButton, SegmentedControl, Skeleton, deltaOf } from "./kit";
import { IntervalBars } from "./kit/charts";

/* =====================================================================
 * BOSHQARUV PANELI — "Umumiy" darajasi (spetsifikatsiya 3.2).
 *
 * Uch daraja segmenti saqlanadi; "Yirik ma'lumotlar" va "ROP tahlili"
 * eski ko'rinishga yo'naltiriladi (ularning mantig'i o'zgarmadi).
 * ===================================================================== */

export type MgLevel = "general" | "strategic" | "rop";

const INTERVALS: [number, number][] = [[9, 12], [12, 15], [15, 18], [18, 21], [21, 23]];

export function ManagementOverview({
  level, onLevel, children,
}: {
  level: MgLevel; onLevel: (l: MgLevel) => void; children?: React.ReactNode;
}) {
  const t = useT();
  const [days, setDays] = useState<DailySummaryDay[] | null>(null);
  const [untilDays, setUntilDays] = useState<DailySummaryDay[] | null>(null);
  const [hours, setHours] = useState<HourlyRow[] | null>(null);
  const [staff, setStaff] = useState<StaffStatRow[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 30000);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      const [d, u, h, s] = await Promise.all([
        fetchDailySummary(14, ctrl.signal).catch(() => null),
        fetchDailySummary(14, ctrl.signal, tashkentNowHm()).catch(() => null),
        fetchHourly(undefined, ctrl.signal).catch(() => null),
        fetchStaffStats(undefined, ctrl.signal).then((r) => r.rows).catch(() => null),
      ]);
      if (ctrl.signal.aborted) return;
      setDays(d); setUntilDays(u); setHours(h); setStaff(s);
    })();
    return () => ctrl.abort();
  }, [reloadKey]);

  const today = tashkentDay();
  const rows = days ?? [];
  const cur = rows.find((r) => r.date === today);
  const prevFull = rows.find((r) => r.date === tashkentDay(-1));
  /* Kechani AYNI SHU VAQTGACHA olamiz — kun boshida "−100%" bo'lmasligi uchun. */
  const prev = (untilDays ?? rows).find((r) => r.date === tashkentDay(-1)) ?? prevFull;

  const avgDurationSec = cur && cur.calls > 0 ? (cur.minutes * 60) / cur.calls : 0;
  const prevDurationSec = prev && prev.calls > 0 ? (prev.minutes * 60) / prev.calls : 0;

  const activeOps = (staff ?? []).filter((s) => s.calls > 0).length;
  const totalOps = (staff ?? []).length;

  /* 3.2 B — salbiy holatlar (kamaygani yaxshi). */
  const last7 = rows.slice(0, 7).reverse();
  const negRows = [
    { key: "lowQuality", label: t("mg.neg.lowQuality"), pick: (d: DailySummaryDay) => d.low_score },
    { key: "penalty", label: t("mg.neg.penalty"), pick: (d: DailySummaryDay) => Math.round(d.penalty_sum / 1000) },
    { key: "short", label: t("mg.neg.short"), pick: (d: DailySummaryDay) => Math.max(0, d.calls - d.long_calls) },
    { key: "unanswered", label: t("mg.neg.unanswered"), pick: (d: DailySummaryDay) => d.unanswered },
    { key: "badLead", label: t("mg.neg.badLead"), pick: (d: DailySummaryDay) => d.bad_leads },
  ];

  /* 3.2 B o'ng — vaqt intervallari. */
  const intervals = useMemo(() => {
    const h = hours ?? [];
    const total = h.reduce((s, x) => s + x.calls, 0);
    const items = INTERVALS.map(([from, to]) => ({
      label: `${String(from).padStart(2, "0")}–${String(to).padStart(2, "0")}`,
      value: h.filter((x) => x.hour >= from && x.hour < to).reduce((s, x) => s + x.calls, 0),
    }));
    const max = Math.max(0, ...items.map((i) => i.value));
    return {
      total,
      items: items.map((i) => ({
        ...i,
        share: total > 0 ? formatPercent((i.value / total) * 100, 0) : "0%",
        top: i.value === max && max > 0,
      })),
    };
  }, [hours]);

  const peak = intervals.items.find((i) => i.top);
  const peakShare = intervals.total > 0 && peak ? (peak.value / intervals.total) * 100 : 0;

  const loading = days === null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("nav.management.label")}
        live={t("rec.live")}
        hint={`${t("mg.hint")} · ${formatDayLong(today)}`}
        right={
          <SegmentedControl<MgLevel>
            value={level}
            onChange={onLevel}
            height={40}
            options={[
              { value: "general", label: t("mg.tab.general"), icon: <LayoutGrid className="h-[15px] w-[15px]" /> },
              { value: "strategic", label: t("mg.tab.strategic"), icon: <TrendingUp className="h-[15px] w-[15px]" /> },
              { value: "rop", label: t("mg.tab.rop"), icon: <Target className="h-[15px] w-[15px]" /> },
            ]}
          />
        }
      />

      {level !== "general" ? (
        children
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={120} />)}
        </div>
      ) : (
        <>
          {/* A) 4 ta KPI */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label={t("mg.kpi.calls")} tone="teal" icon={<TrendingUp className="h-4 w-4" />}
              value={formatNumber(cur?.calls ?? 0)} unit="ta"
              delta={deltaOf(cur?.calls ?? 0, prev?.calls ?? 0)}
              spark={rows.slice(0, 14).reverse().map((r) => r.calls)}
            />
            <KpiTile
              label={t("mg.kpi.quality")} tone="green" icon={<Shield className="h-4 w-4" />}
              value={formatScore(cur?.avg_score)} unit="/ 10"
              delta={deltaOf(cur?.avg_score ?? 0, prev?.avg_score ?? 0)}
              spark={rows.slice(0, 14).reverse().map((r) => r.avg_score)}
            />
            <KpiTile
              label={t("mg.kpi.duration")} tone="orange" icon={<Clock className="h-4 w-4" />}
              value={formatDuration(avgDurationSec)} unit="daq"
              delta={deltaOf(avgDurationSec, prevDurationSec)}
            />
            <KpiTile
              label={t("mg.kpi.operators")} tone="accent" icon={<Users className="h-4 w-4" />}
              value={`${activeOps} / ${totalOps || activeOps}`}
              hint={activeOps > 0 && activeOps === totalOps ? t("mg.kpi.allActive") : undefined}
            />
          </div>

          {/* B) Salbiy holatlar + vaqt intervallari */}
          <div className="flex flex-col gap-5 xl:flex-row">
            <Card className="min-w-0 xl:flex-[1.3]">
              <CardHeader
                title={t("mg.neg.title")}
                hint={t("mg.neg.hint")}
                right={
                  <div className="hidden gap-5 text-[11px] uppercase tracking-[0.1em] sm:flex" style={{ color: "var(--subtle)" }}>
                    <span className="w-[170px] text-right">{t("mg.neg.vsYesterday")}</span>
                    <span className="w-[172px] text-right">{t("mg.neg.vsWeek")}</span>
                  </div>
                }
              />
              <ul className="mt-3">
                {negRows.map((r) => {
                  const series = last7.map(r.pick);
                  const todayVal = cur ? r.pick(cur) : 0;
                  const yVal = prev ? r.pick(prev) : 0;
                  const weekAvg = series.length > 1 ? series.slice(0, -1).reduce((s, x) => s + x, 0) / (series.length - 1) : 0;
                  const max = Math.max(1, ...series);
                  return (
                    <li
                      key={r.key}
                      className="grid items-center gap-5 py-3"
                      style={{ gridTemplateColumns: "1.4fr 170px 172px", borderTop: "1px solid var(--grid-line)" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm" style={{ color: "var(--text-2)" }}>{r.label}</p>
                        <p className="mt-0.5 flex items-baseline gap-2">
                          <span className="font-mono text-[26px] font-semibold leading-none" style={{ color: "var(--text)" }}>
                            {formatNumber(todayVal)}
                          </span>
                          <span className="text-xs" style={{ color: "var(--subtle)" }}>{t("mg.neg.today")}</span>
                        </p>
                      </div>
                      <div className="flex items-end justify-end gap-1.5" aria-hidden>
                        {series.map((v, i) => (
                          <span
                            key={i}
                            className="w-[18px]"
                            style={{
                              height: Math.max(3, (v / max) * 48),
                              background: i === series.length - 1 ? "var(--orange)" : "var(--bar-dim)",
                              borderRadius: "4px 4px 1px 1px",
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <DeltaChip delta={deltaOf(todayVal, yVal, false)} padded />
                        <DeltaChip delta={deltaOf(todayVal, weekAvg, false)} padded />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="min-w-0 xl:flex-1">
              <CardHeader
                title={t("mg.hours.title")}
                hint={peak ? t("mg.hours.hint", { range: peak.label }) : undefined}
              />
              <div className="mt-4">
                {intervals.total === 0 ? (
                  <EmptyState text={t("an.empty")} />
                ) : (
                  <IntervalBars items={intervals.items} />
                )}
              </div>
              {peakShare > 30 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: "var(--surface-3)", color: "var(--text-2)" }}>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: "rgba(59,130,246,0.16)", color: "var(--accent-text)" }}
                  >
                    {t("mg.hours.advice")}
                  </span>
                  {t("mg.hours.adviceText", { pct: Math.round(peakShare) })}
                </div>
              )}
            </Card>
          </div>

          {/* C) Sotuv voronkasi — amoCRM ulanmagan */}
          <Card>
            <CardHeader title={t("mg.funnel.title")} />
            <div className="mt-2">
              <EmptyState
                text={t("mg.funnel.empty")}
                action={
                  <Link href="/dashboard/amocrm">
                    <PrimaryButton>{t("mg.funnel.connect")}</PrimaryButton>
                  </Link>
                }
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
