"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Building2, Filter, Phone, TriangleAlert, UserPlus } from "lucide-react";
import { fetchDailySummary, fetchStaffStats, type DailySummaryDay, type StaffStatRow } from "../lib/api";
import { fetchCompanySettings, DEFAULT_COMPANY_SETTINGS, type CompanySettings } from "../lib/companySettings";
import { useSession } from "../lib/auth";
import { useLiveRefresh } from "../lib/useLiveRefresh";
import { useT } from "../lib/i18n";
import {
  formatDayLong, formatNumber, formatPercent, tashkentDay, tashkentNowHm,
} from "../lib/format";
import {
  AlertBanner, Card, CardHeader, EmptyState, IconButton, KpiTile,
  PageHeader, ProgressBar, SegmentedControl, Skeleton, StatusChip, deltaOf,
} from "./kit";
import { BarChart } from "./kit/charts";

/* =====================================================================
 * ANALITIKA (spetsifikatsiya 3.1)
 *
 * Barcha raqamlar serverdagi kunlik yakundan (/analytics/daily-summary).
 * Delta AYNI VAQT ORALIG'I bilan solishtiriladi: bugun 10:17 bo'lsa,
 * oldingi davr ham 10:17 gacha olinadi (until=HH:MM) — shunda kun
 * boshida "−100%" chiqmaydi.
 * ===================================================================== */

type Period = "day" | "week" | "month";

/** Davr uchun kunlar ro'yxati (Toshkent) va oldingi davr kunlari. */
function periodDays(period: Period): { cur: string[]; prev: string[] } {
  const today = tashkentDay();
  if (period === "day") return { cur: [today], prev: [tashkentDay(-1)] };
  if (period === "week") {
    const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // dushanba = 0
    const cur = Array.from({ length: dow + 1 }, (_, i) => tashkentDay(-dow + i));
    const prev = cur.map((_, i) => tashkentDay(-dow - 7 + i));
    return { cur, prev };
  }
  const dayNum = Number(today.slice(8, 10));
  const cur = Array.from({ length: dayNum }, (_, i) => tashkentDay(-(dayNum - 1) + i));
  const prev = cur.map((_, i) => tashkentDay(-(dayNum - 1) - 30 + i));
  return { cur, prev };
}

const sumBy = (rows: DailySummaryDay[], days: string[], key: keyof DailySummaryDay) =>
  rows.filter((r) => days.includes(r.date)).reduce((s, r) => s + (Number(r[key]) || 0), 0);

export function AnalyticsView() {
  const t = useT();
  const session = useSession();
  const [period, setPeriod] = useState<Period>("day");
  const [full, setFull] = useState<DailySummaryDay[] | null>(null);
  const [untilRows, setUntilRows] = useState<DailySummaryDay[] | null>(null);
  const [staff, setStaff] = useState<StaffStatRow[] | null>(null);
  const [norms, setNorms] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [reloadKey, setReloadKey] = useState(0);
  const [showBelow, setShowBelow] = useState(false);

  useLiveRefresh(useCallback(() => setReloadKey((k) => k + 1), []), 30000);

  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      const [f, s, n] = await Promise.all([
        fetchDailySummary(40, ctrl.signal).catch(() => null),
        fetchStaffStats(undefined, ctrl.signal).then((r) => r.rows).catch(() => null),
        fetchCompanySettings(session?.token, ctrl.signal).catch(() => DEFAULT_COMPANY_SETTINGS),
      ]);
      if (ctrl.signal.aborted) return;
      setFull(f);
      setStaff(s);
      setNorms(n);
    })();
    return () => ctrl.abort();
  }, [reloadKey, session?.token]);

  /* Oldingi davrni ayni vaqtgacha olish — alohida so'rov (until=HH:MM). */
  useEffect(() => {
    const ctrl = new AbortController();
    void (async () => {
      try {
        const rows = await fetchDailySummary(40, ctrl.signal, tashkentNowHm());
        if (!ctrl.signal.aborted) setUntilRows(rows);
      } catch { /* eski server — to'liq kun bilan ishlaymiz */ }
    })();
    return () => ctrl.abort();
  }, [reloadKey]);

  const { cur, prev } = useMemo(() => periodDays(period), [period]);
  const rows = full ?? [];
  /* Joriy davr — to'liq; oldingi davr — ayni vaqtgacha (bo'lsa). */
  const prevRows = untilRows ?? rows;

  const metric = (key: keyof DailySummaryDay, higherIsBetter = true) => {
    const c = sumBy(rows, cur, key);
    const p = sumBy(prevRows, prev, key);
    return { value: c, prev: p, delta: deltaOf(c, p, higherIsBetter) };
  };

  const calls = metric("calls");
  const leads = metric("leads");
  const invited = metric("invited");
  const closed = metric("closed");
  const longCalls = metric("long_calls");
  const incoming = metric("incoming");
  const outgoing = metric("outgoing");

  const convCur = leads.value > 0 ? (closed.value / leads.value) * 100 : 0;
  const convPrev = leads.prev > 0 ? (closed.prev / leads.prev) * 100 : 0;

  const spark = (key: keyof DailySummaryDay) =>
    rows.slice(0, 14).reverse().map((r) => Number(r[key]) || 0);

  /* 3.1 C — so'nggi 14 kun (eskidan yangiga). */
  const chartDays = rows.slice(0, 14).reverse();
  const today = tashkentDay();

  /* 3.1 A — norma ostidagi operatorlar. */
  const normDay = norms.min_qualified_calls_day;
  const below = (staff ?? [])
    .map((s) => ({ ...s, long: Math.round((s.minutes * 60) / Math.max(1, norms.qualified_call_seconds)) }))
    .filter((s) => s.calls > 0 && s.long < normDay)
    .sort((a, b) => a.long - b.long);

  const loading = full === null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("nav.overview.label")}
        live={t("rec.live")}
        hint={`${t("an.hint")} · ${formatDayLong(today)}`}
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
            <IconButton ariaLabel={t("rec.notifications")}><Bell className="h-[18px] w-[18px]" /></IconButton>
          </>
        }
      />

      {/* A) Ogohlantirish banneri */}
      {below.length > 0 && (
        <AlertBanner
          icon={<TriangleAlert className="h-[18px] w-[18px]" />}
          title={t("an.alert.title", { n: below.length })}
          hint={t("an.alert.hint", { norm: normDay })}
          right={
            <>
              {below.slice(0, 3).map((s) => (
                <span
                  key={s.key}
                  className="inline-flex h-7 items-center gap-2 rounded-full px-3 text-xs"
                  style={{ background: "var(--surface-4)", border: "1px solid var(--border-chip)", color: "var(--text-2)" }}
                >
                  {s.name}
                  <span className="font-mono" style={{ color: "var(--orange)" }}>{s.long}/{normDay}</span>
                </span>
              ))}
              {below.length > 3 && (
                <span className="inline-flex h-7 items-center rounded-full px-3 text-xs" style={{ background: "var(--surface-4)", color: "var(--muted)" }}>
                  +{below.length - 3}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowBelow((v) => !v)}
                className="inline-flex h-11 items-center rounded-xl px-3.5 text-[13px] font-semibold"
                style={{ background: "rgba(251,146,60,0.16)", color: "var(--orange-soft)" }}
              >
                {t("an.alert.open")}
              </button>
            </>
          }
        />
      )}

      {showBelow && below.length > 0 && (
        <Card>
          <ul className="space-y-2">
            {below.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                <span style={{ color: "var(--text-2)" }}>{s.name}</span>
                <span className="font-mono" style={{ color: "var(--orange)" }}>{s.long} / {normDay}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* B) 4 ta KPI */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={120} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label={t("an.kpi.calls")} tone="accent" icon={<Phone className="h-4 w-4" />}
            value={formatNumber(calls.value)} delta={calls.delta} spark={spark("calls")}
            hint={t("an.kpi.prev", { v: formatNumber(calls.prev) })}
          />
          <KpiTile
            label={t("an.kpi.leads")} tone="green" icon={<UserPlus className="h-4 w-4" />}
            value={formatNumber(leads.value)} delta={leads.delta} spark={spark("leads")}
            hint={t("an.kpi.prev", { v: formatNumber(leads.prev) })}
          />
          <KpiTile
            label={t("an.kpi.invited")} tone="violet" icon={<Building2 className="h-4 w-4" />}
            value={formatNumber(invited.value)} delta={invited.delta} spark={spark("invited")}
            hint={t("an.kpi.prev", { v: formatNumber(invited.prev) })}
          />
          <KpiTile
            label={t("an.kpi.conversion")} tone="orange" icon={<Filter className="h-4 w-4" />}
            value={formatPercent(convCur)} delta={deltaOf(convCur, convPrev)}
            hint={t("an.kpi.prev", { v: formatPercent(convPrev) })}
          />
        </div>
      )}

      {/* C) Dinamika + voronka */}
      <div className="flex flex-col gap-5 xl:flex-row">
        <Card className="min-w-0 xl:flex-[1.7]">
          <CardHeader
            title={t("an.dyn.title")}
            hint={t("an.dyn.hint")}
            right={
              <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-3)" }}>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "var(--chart)" }} />{t("an.legend.calls")}</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5" style={{ background: "var(--teal)" }} />{t("an.legend.long", { n: norms.qualified_call_seconds })}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--violet)" }} />{t("an.legend.deals")}</span>
              </div>
            }
          />
          {chartDays.length === 0 ? (
            <EmptyState text={t("an.empty")} />
          ) : (
            <div className="mt-4">
              <BarChart
                height={180}
                data={chartDays.map((d) => ({
                  label: new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", day: "numeric", month: "short" }).format(new Date(`${d.date}T12:00:00Z`)),
                  value: d.calls,
                  line: d.long_calls,
                  highlight: d.date === today,
                }))}
              />
              {/* Bitimlar qatori */}
              <div className="mt-2 flex gap-3 overflow-x-auto pl-[34px]">
                {chartDays.map((d) => (
                  <span
                    key={d.date}
                    className="grid h-5 min-w-[22px] shrink-0 place-items-center rounded-md px-1 font-mono text-[11px]"
                    style={
                      d.closed > 0
                        ? { background: "rgba(167,139,250,0.16)", color: "var(--violet-soft)" }
                        : { color: "var(--faint)" }
                    }
                  >
                    {d.closed}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="min-w-0 xl:flex-1">
          <CardHeader
            title={t("an.funnel.title")}
            right={
              <span className="flex items-baseline gap-2 text-[13px]" style={{ color: "var(--muted)" }}>
                {t("an.funnel.lead2deal")}
                <span className="font-mono text-base font-semibold" style={{ color: "var(--green)" }}>{formatPercent(convCur)}</span>
              </span>
            }
          />
          <ul className="mt-4 space-y-1.5">
            {[
              { label: t("an.funnel.calls"), value: calls.value, color: "var(--chart)" },
              { label: t("an.funnel.long", { n: norms.qualified_call_seconds }), value: longCalls.value, color: "var(--teal)" },
              { label: t("an.funnel.leads"), value: leads.value, color: "var(--green)" },
              { label: t("an.funnel.invited"), value: invited.value, color: "var(--violet)" },
              { label: t("an.funnel.closed"), value: closed.value, color: "var(--amber)" },
            ].filter((s) => s.value > 0 || s.label === t("an.funnel.calls")).map((s, i, arr) => {
              const first = arr[0].value || 1;
              const dropFrom = i > 0 ? arr[i - 1].value : null;
              const drop = dropFrom && dropFrom > 0 ? (s.value / dropFrom) * 100 : null;
              return (
                <li key={s.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px]" style={{ color: "var(--text-2)" }}>{s.label}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {drop !== null && <span className="font-mono text-[11px]" style={{ color: "var(--subtle)" }}>↓ {drop.toFixed(1)}%</span>}
                      <span className="font-mono text-[13px] font-semibold" style={{ color: "var(--text)" }}>{formatNumber(s.value)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5"><ProgressBar value={s.value} max={first} color={s.color} height={8} /></div>
                </li>
              );
            })}
          </ul>

          <hr className="my-4" style={{ borderColor: "var(--divider-strong)" }} />

          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{t("an.dir.title")}</span>
            <span className="text-[13px]" style={{ color: "var(--muted)" }}>
              {t("an.dir.total", { n: formatNumber(incoming.value + outgoing.value) })}
            </span>
          </div>
          <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            <span style={{ width: `${(outgoing.value / Math.max(1, incoming.value + outgoing.value)) * 100}%`, background: "var(--chart)", borderRadius: 5 }} />
            <span style={{ width: `${(incoming.value / Math.max(1, incoming.value + outgoing.value)) * 100}%`, background: "var(--teal)", borderRadius: 5 }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
            <span>{t("rec.outgoing")} <span className="font-mono" style={{ color: "var(--text)" }}>{formatNumber(outgoing.value)}</span> · {formatPercent((outgoing.value / Math.max(1, incoming.value + outgoing.value)) * 100)}</span>
            <span>{t("rec.incoming")} <span className="font-mono" style={{ color: "var(--text)" }}>{formatNumber(incoming.value)}</span> · {formatPercent((incoming.value / Math.max(1, incoming.value + outgoing.value)) * 100)}</span>
          </div>
        </Card>
      </div>

      {/* D) Jamoa samaradorligi */}
      <TeamTable staff={staff} norms={norms} period={period} />
    </div>
  );
}

/** 3.1 D — operatorlar jadvali. */
function TeamTable({ staff, norms, period }: { staff: StaffStatRow[] | null; norms: CompanySettings; period: Period }) {
  const t = useT();
  const COLS = "1.5fr 0.8fr 2fr 0.8fr 0.8fr 0.8fr 0.7fr 1.1fr";
  const normDay = norms.min_qualified_calls_day;
  const periodLabel = period === "day" ? t("an.period.day") : period === "week" ? t("an.period.week") : t("an.period.month");

  const rows = (staff ?? []).map((s) => ({
    ...s,
    long: Math.round((s.minutes * 60) / Math.max(1, norms.qualified_call_seconds)),
  })).sort((a, b) => b.long / normDay - a.long / normDay);

  return (
    <Card padded={false}>
      <div className="px-[22px] py-5">
        <CardHeader
          title={t("an.team.title")}
          hint={t("an.team.hint", { period: periodLabel, n: rows.length, norm: normDay })}
          right={<Link href="/dashboard/staff-stats" className="text-[13px] font-medium" style={{ color: "var(--accent-text)" }}>{t("an.team.all")}</Link>}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState text={t("an.empty")} />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className="grid items-center px-[22px] text-[11px] font-medium uppercase tracking-[0.1em]"
              style={{ gridTemplateColumns: COLS, columnGap: 16, height: 38, color: "var(--subtle)", borderTop: "1px solid var(--divider-strong)", borderBottom: "1px solid var(--divider-strong)" }}
            >
              <span>{t("an.team.col.operator")}</span>
              <span>{t("an.team.col.calls")}</span>
              <span>{t("an.team.col.long", { n: norms.qualified_call_seconds })}</span>
              <span className="hidden xl:block">{t("an.team.col.incoming")}</span>
              <span className="hidden xl:block">{t("an.team.col.outgoing")}</span>
              <span>{t("an.team.col.leads")}</span>
              <span>{t("an.team.col.sales")}</span>
              <span>{t("an.team.col.status")}</span>
            </div>

            {rows.map((s) => {
              const ok = s.long >= normDay;
              return (
                <div
                  key={s.key}
                  className="grid items-center px-[22px]"
                  style={{ gridTemplateColumns: COLS, columnGap: 16, height: 48, borderBottom: "1px solid var(--divider)" }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="inline-flex h-7 min-w-11 shrink-0 items-center justify-center rounded-lg px-1.5 font-mono text-xs"
                      style={{ background: "var(--badge)", border: "1px solid var(--border-chip)", color: "var(--accent-badge)" }}
                    >
                      {s.name.replace(/\D/g, "") || "—"}
                    </span>
                    <span className="truncate text-sm" style={{ color: "var(--text)" }}>{s.name}</span>
                  </span>
                  <span className="font-mono text-[13px]" style={{ color: "var(--text-2)" }}>{formatNumber(s.calls)}</span>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="min-w-0 flex-1">
                      <ProgressBar value={s.long} max={normDay} color={ok ? "var(--green)" : "var(--orange)"} height={6} />
                    </span>
                    <span className="shrink-0 font-mono text-xs font-medium" style={{ color: ok ? "var(--green)" : "var(--orange)" }}>
                      {s.long} / {normDay}
                    </span>
                  </span>
                  <span className="hidden font-mono text-[13px] xl:block" style={{ color: "var(--text-2)" }}>—</span>
                  <span className="hidden font-mono text-[13px] xl:block" style={{ color: "var(--text-2)" }}>—</span>
                  <span className="font-mono text-[13px]" style={{ color: "var(--text-2)" }}>—</span>
                  <span className="font-mono text-[13px]" style={{ color: "var(--text-2)" }}>—</span>
                  <span><StatusChip label={ok ? t("an.team.ok") : t("an.team.below")} tone={ok ? "green" : "orange"} /></span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
