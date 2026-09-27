"use client";

/* SOLISHTIRISH (03-Solishtirish.png, Solishtirish.dc.html).
 *
 * URL — holat: ?period=day|week|month&a=YYYY-MM-DD&b=YYYY-MM-DD&open=YYYY-MM-DD
 * Boshqaruvlar: CMP-01 A tanlagich, CMP-02 B tanlagich, CMP-03 davr,
 * CMP-04 grafik (hover/←→), CMP-05 kun qatori (ochish/yopish),
 * CMP-06 "Yana N kun", CMP-07 "Kunlik solishtirish" (v1 cheklovi). */

import { forwardRef, useCallback, useRef, useState } from "react";
import { useLocale } from "../../../lib/i18n";
import { usePT, type PT } from "../../i18n";
import { Button, DeltaPill, Segmented, Skeleton } from "../../ui/primitives";
import { DatePicker, type PickerMode } from "../../ui/DatePicker";
import { Icon } from "../../ui/Icon";
import { PageHeader } from "../../shell/PageHeader";
import { usePageBusy } from "../../shell/pageStore";
import { pick, useUrlState } from "../../shell/useUrlState";
import { CompareChart, type ComparePoint } from "../../charts/CompareChart";
import { useCompare, defaultSides, type CompareData, type ComparePeriod, type Mover, type DayRow } from "../../data/compare";
import { useMe } from "../../data/me";
import { DASH, fmtDec, fmtInt } from "../../lib/format";
import { deltaTone, TONE_VARS } from "../../lib/tones";
import { divMax, niceCeil } from "../../lib/numbers";
import {
  addDays, dayMonthShort, hoursMinutes, isoWeekday, monthStart, monthYear, rangeLabel, tashkentToday,
  weekStart, weekdayName, weekdayShort, type Loc,
} from "../../lib/dates";

const PERIODS = ["day", "week", "month"] as const;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function normSide(period: ComparePeriod, v: string | null, today: string, fallback: string): string {
  if (!v || !ISO.test(v) || v > today) return fallback;
  if (period === "week") return weekStart(v);
  if (period === "month") return monthStart(v);
  return v;
}

/* "Kecha, 23-sen" / "Shu hafta" / "Avgust 2026" va jumla ichidagi so'z. */
type SideLabel = { pill: string; short: string; word: string };

function sideLabel(period: ComparePeriod, start: string, today: string, t: PT, loc: Loc): SideLabel {
  if (period === "day") {
    const date = dayMonthShort(loc, start);
    const rel = start === today ? t("cmp.today") : start === addDays(today, -1) ? t("cmp.yesterday") : null;
    return { pill: rel ? `${rel}, ${date}` : date, short: rel ?? date, word: rel ? rel.toLocaleLowerCase() : date };
  }
  if (period === "week") {
    const rel = start === weekStart(today) ? t("cmp.thisWeek") : start === addDays(weekStart(today), -7) ? t("cmp.lastWeek") : null;
    const range = rangeLabel(loc, start, addDays(start, 6), true);
    return { pill: rel ?? range, short: rel ?? range, word: rel ? rel.toLocaleLowerCase() : range };
  }
  const rel =
    start === monthStart(today) ? t("cmp.thisMonth") : start.slice(0, 7) === addDays(monthStart(today), -1).slice(0, 7) ? t("cmp.lastMonth") : null;
  const my = monthYear(loc, start);
  const cap = my.charAt(0).toUpperCase() + my.slice(1);
  return { pill: rel ?? cap, short: rel ?? cap, word: rel ? rel.toLocaleLowerCase() : my };
}

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pctDelta(a: number | null, b: number | null): number | null {
  if (a == null || b == null || a === 0) return null;
  return ((b - a) / a) * 100;
}

function fmtDelta(d: number | null): { text: string; arrow: "up" | "down" | null } | null {
  if (d == null) return null;
  return { text: `${Math.abs(d).toFixed(1)}%`, arrow: d > 0 ? "up" : d < 0 ? "down" : null };
}

export function ComparePage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const today = tashkentToday();
  const period = pick(url.get("period"), PERIODS, "day") as ComparePeriod;
  const { a: defA, b: defB } = defaultSides(period, today);
  const a = normSide(period, url.get("a"), today, defA);
  const b = normSide(period, url.get("b"), today, defB);
  const { data: me } = useMe();
  const q = useCompare(period, a, b);
  usePageBusy(q.isFetching && q.isPlaceholderData);

  const la = sideLabel(period, a, today, t, loc);
  const lb = sideLabel(period, b, today, t, loc);
  const mode: PickerMode = period === "day" ? "single" : period === "week" ? "week" : "month";
  const aRef = useRef<HTMLButtonElement>(null);
  const bRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState<"a" | "b" | null>(null);

  const setPeriod = useCallback((p: ComparePeriod) => url.set({ period: p === "day" ? null : p, a: null, b: null, open: null }), [url]);
  const setSide = (side: "a" | "b", v: string) =>
    url.set({ [side]: v === (side === "a" ? defA : defB) ? null : v, open: null });

  const data = q.data;
  return (
    <div className="@container/cmp flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("cmp.eyebrow")}</span>}
        title={t("cmp.title")}
        actions={
          <>
            <div
              role="group"
              aria-label={t("cmp.sides")}
              className="flex items-center gap-[6px] rounded-full border border-pn-border bg-pn-panel p-1"
            >
              <SideButton
                ref={aRef}
                side="a"
                label={la.pill}
                aria={t("cmp.pickA", { label: la.pill })}
                onClick={() => setPickerOpen((o) => (o === "a" ? null : "a"))}
                expanded={pickerOpen === "a"}
              />
              <span className="text-[12px] text-pn-subtle">vs</span>
              <SideButton
                ref={bRef}
                side="b"
                label={lb.pill}
                aria={t("cmp.pickB", { label: lb.pill })}
                onClick={() => setPickerOpen((o) => (o === "b" ? null : "b"))}
                expanded={pickerOpen === "b"}
              />
            </div>
            <Segmented<ComparePeriod>
              size="md"
              value={period}
              onChange={setPeriod}
              ariaLabel={t("an.period.aria")}
              testId="CMP-03"
              options={[
                { value: "day", label: t("an.period.day"), testId: "CMP-03-day" },
                { value: "week", label: t("an.period.week"), testId: "CMP-03-week" },
                { value: "month", label: t("an.period.month"), testId: "CMP-03-month" },
              ]}
            />
            <DatePicker
              open={pickerOpen === "a"}
              onClose={() => setPickerOpen(null)}
              anchorRef={aRef}
              mode={mode}
              value={a}
              today={today}
              min={me?.company.firstDataDay}
              loc={loc}
              label={t("cmp.pickA", { label: la.pill })}
              onSelect={(v) => setSide("a", v)}
              testId="CMP-01-picker"
            />
            <DatePicker
              open={pickerOpen === "b"}
              onClose={() => setPickerOpen(null)}
              anchorRef={bRef}
              mode={mode}
              value={b}
              today={today}
              min={me?.company.firstDataDay}
              loc={loc}
              label={t("cmp.pickB", { label: lb.pill })}
              onSelect={(v) => setSide("b", v)}
              testId="CMP-02-picker"
            />
          </>
        }
      />

      {!data ? (
        q.isError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-8" data-testid="CMP-ERROR">
            <h2 className="pn-card-title">{t("cmp.error")}</h2>
            <p className="text-[14px] text-pn-muted">{t("an.errorSub")}</p>
            <Button variant="light" onClick={() => void q.refetch()}>{t("common.retry")}</Button>
          </div>
        ) : (
          <CompareSkeleton withHeader={false} />
        )
      ) : (
        <div className="flex flex-col gap-5 transition-opacity" style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }} aria-busy={q.isPlaceholderData || undefined}>
          <div className="grid grid-cols-1 gap-4 @min-[720px]/cmp:grid-cols-3">
            <MetricCard
              testId="CMP-M-calls"
              name={t("cmp.m.calls")}
              unit={t("cmp.u.calls")}
              a={data.totals.a.calls}
              b={data.totals.b.calls}
              fmt={fmtInt}
              max={niceCeil(Math.max(data.totals.a.calls, data.totals.b.calls) * 1.07)}
              la={la.word}
              lb={lb.word}
            />
            <MetricCard
              testId="CMP-M-talk"
              name={t("cmp.m.talk")}
              unit={t("cmp.u.talk")}
              a={data.totals.a.minutes}
              b={data.totals.b.minutes}
              fmt={fmtInt}
              max={niceCeil(Math.max(data.totals.a.minutes, data.totals.b.minutes) * 1.07)}
              la={la.word}
              lb={lb.word}
            />
            <MetricCard
              testId="CMP-M-score"
              name={t("cmp.m.score")}
              unit={t("cmp.u.score")}
              a={data.totals.a.score10}
              b={data.totals.b.score10}
              fmt={(v) => fmtDec(v)}
              max={10}
              la={la.word}
              lb={lb.word}
            />
          </div>

          <ChartCard data={data} la={la} lb={lb} loc={loc} />

          <div className="flex flex-col gap-4 @min-[1000px]/cmp:flex-row">
            <MoversCard
              movers={q.movers}
              loading={q.moversLoading}
              error={q.moversError}
              la={la.word}
              lb={lb.word}
              onDay={() => setPeriod("day")}
            />
            <DailyTalkCard
              days={data.days}
              today={today}
              loc={loc}
              openDay={url.get("open") ?? data.days[0]?.date ?? null}
              onToggle={(d, isOpen) => url.set({ open: isOpen ? "none" : d })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ A/B tugma */

const SideButton = forwardRef<
  HTMLButtonElement,
  { side: "a" | "b"; label: string; aria: string; onClick: () => void; expanded: boolean }
>(function SideButton({ side, label, aria, onClick, expanded }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-testid={side === "a" ? "CMP-01" : "CMP-02"}
      aria-label={aria}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onClick}
      className="pn-press flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full bg-pn-panel-3 pl-2 pr-[14px] text-[13px] font-medium text-pn-text hover:bg-pn-border-3"
    >
      {side === "a" ? (
        <span className="pn-mono grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-pn-muted text-[10px] font-bold text-pn-text-2">
          A
        </span>
      ) : (
        <span className="pn-mono grid h-[22px] w-[22px] place-items-center rounded-full bg-pn-accent text-[10px] font-bold text-pn-accent-ink">
          B
        </span>
      )}
      {label}
    </button>
  );
});

/* ---------------------------------------------------------- Metrika kartasi */

function MetricCard({
  name,
  unit,
  a,
  b,
  fmt,
  max,
  la,
  lb,
  testId,
}: {
  name: string;
  unit: string;
  a: number | null;
  b: number | null;
  fmt: (v: number | null) => string;
  max: number;
  la: string;
  lb: string;
  testId: string;
}) {
  const d = pctDelta(a, b);
  const delta = fmtDelta(d);
  const tone = deltaTone(d, "up");
  const scale = max > 0 ? max : 1;
  const pa = a == null ? null : Math.max(0, Math.min(100, (a / scale) * 100));
  const pb = b == null ? null : Math.max(0, Math.min(100, (b / scale) * 100));
  const segColor = tone === "neutral" ? "var(--pn-bar-dim-2)" : TONE_VARS[tone].fg;
  return (
    <section data-testid={testId} className="flex flex-col gap-[10px] rounded-[26px] border border-pn-border bg-pn-panel px-6 pb-[18px] pt-[22px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] text-pn-muted">{name}</span>
        {delta && (
          <DeltaPill tone={tone} size="md" arrow={delta.arrow} testId={`${testId}-delta`}>
            {delta.text}
          </DeltaPill>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="pn-display text-[46px] leading-none tracking-[-0.04em]" data-testid={`${testId}-b`}>{fmt(b)}</span>
        <span className="text-[14px] text-pn-subtle">{unit}</span>
        <span className="ml-auto text-[13px] text-pn-muted">
          {la} <span className="pn-mono text-pn-text-2" data-testid={`${testId}-a`}>{fmt(a)}</span>
        </span>
      </div>
      <div className="relative mt-1 h-[58px]" aria-hidden>
        <div className="absolute inset-x-0 top-[28px] h-[2px] rounded-[1px] bg-pn-track" />
        {pa != null && pb != null && (
          <div
            className="pn-grow absolute top-[27px] h-1 rounded-[2px]"
            style={{ left: `${Math.min(pa, pb)}%`, width: `${Math.max(0.6, Math.abs(pb - pa))}%`, background: segColor }}
          />
        )}
        {pa != null && (
          <>
            <div
              className="absolute top-[22px] -ml-2 h-4 w-4 rounded-full border-[2.5px] border-pn-muted bg-pn-panel"
              style={{ left: `${pa}%` }}
            />
            <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11px] text-pn-muted" style={{ left: `${pa}%` }}>
              {la}
            </span>
          </>
        )}
        {pb != null && (
          <>
            <div className="absolute top-5 -ml-[10px] h-5 w-5 rounded-full border-[3px] border-pn-panel bg-pn-accent" style={{ left: `${pb}%` }} />
            <span
              className="absolute top-[44px] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-pn-text"
              style={{ left: `${pb}%` }}
            >
              {lb}
            </span>
          </>
        )}
      </div>
      <div className="pn-mono flex justify-between text-[11px] text-pn-subtle">
        <span>0</span>
        <span>{fmtInt(max)}</span>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Grafik */

function ChartCard({ data, la, lb, loc }: { data: CompareData; la: SideLabel; lb: SideLabel; loc: Loc }) {
  const t = usePT();
  const pts: ComparePoint[] = data.series;
  const isDay = data.period === "day";
  const unitLabel = (i: number) => {
    const k = pts[i]?.key ?? "";
    if (isDay) return `${k}:00`;
    if (data.period === "week") return weekdayName(loc, k);
    return String(Number(k.slice(8, 10)));
  };
  const peakOf = (side: "a" | "b") => {
    let best = -1;
    pts.forEach((p, i) => {
      const v = p[side];
      if (v != null && v > 0 && (best < 0 || v > (pts[best][side] ?? -1))) best = i;
    });
    return best;
  };
  const pa = peakOf("a");
  const pb = peakOf("b");
  const vol = fmtDelta(pctDelta(data.totals.a.calls, data.totals.b.calls));
  const parts: string[] = [];
  if (pa >= 0 && pb >= 0) {
    parts.push(
      pa === pb
        ? t("cmp.peak.same", { when: t("cmp.peak.at", { h: unitLabel(pb) }) })
        : t("cmp.peak.diff", { b: lb.word, bw: unitLabel(pb), a: la.word, aw: unitLabel(pa) })
    );
  }
  if (vol) parts.push(t("cmp.volume", { d: `${vol.arrow === "down" ? "−" : "+"}${vol.text}` }));

  return (
    <section data-testid="CMP-CHART" className="flex flex-col gap-4 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-[22px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="pn-card-title">{t(isDay ? "cmp.chart.hours" : "cmp.chart.days")}</h2>
          {parts.length > 0 && <p className="pn-card-sub">{parts.join(" · ")}</p>}
        </div>
        <div className="flex gap-[18px] pt-1 text-[12px] text-pn-text-3">
          <span className="flex items-center gap-[7px]">
            <span className="h-[3px] w-[18px] rounded-[2px] bg-pn-accent-strong" />
            {lb.short}
          </span>
          <span className="flex items-center gap-[7px]">
            <span className="h-0 w-[18px] border-t-2 border-dashed border-pn-muted" />
            {la.short}
          </span>
        </div>
      </div>
      {pts.length ? (
        <CompareChart
          points={pts}
          nowIndex={data.nowIndex}
          testId="CMP-04"
          ariaLabel={t("cmp.chart.aria", { a: la.pill, b: lb.pill })}
          xLabel={(p, i) =>
            isDay ? p.key : data.period === "week" ? weekdayShort(loc, isoWeekday(p.key)) : i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : ""
          }
          tooltip={(p, i) => {
            const d = pctDelta(p.a, p.b);
            const f = fmtDelta(d);
            const tone = deltaTone(d, "up");
            const title = isDay
              ? `${p.key}:00 – ${String((Number(p.key) + 1) % 24).padStart(2, "0")}:00`
              : data.period === "week"
                ? `${weekdayShort(loc, i)} · ${dayMonthShort(loc, p.key)}`
                : dayMonthShort(loc, p.key);
            return (
              <>
                <div className="pn-mono text-[13px] font-semibold">{title}</div>
                <TipRow color="var(--pn-accent)" label={lb.short} value={p.b} />
                <TipRow color="var(--pn-muted)" label={la.short} value={p.a} />
                <div className="h-px bg-pn-border-3" />
                <div className="flex justify-between">
                  <span className="text-pn-muted">{t("cmp.tip.diff")}</span>
                  <span className="pn-mono font-semibold" style={{ color: tone === "neutral" ? "var(--pn-text-2)" : TONE_VARS[tone].fg }}>
                    {f ? `${f.arrow === "down" ? "−" : "+"}${f.text}` : DASH}
                  </span>
                </div>
              </>
            );
          }}
        />
      ) : (
        <p className="py-10 text-center text-[14px] text-pn-muted">{t("common.empty")}</p>
      )}
    </section>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-[7px] text-pn-text-2">
        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="pn-mono font-semibold">{fmtInt(value)}</span>
    </div>
  );
}

/* ------------------------------------------------- Kim o'sdi, kim tushdi */

function MoversCard({
  movers,
  loading,
  error,
  la,
  lb,
  onDay,
}: {
  movers: Mover[] | null;
  loading: boolean;
  error: boolean;
  la: string;
  lb: string;
  onDay: () => void;
}) {
  const t = usePT();
  const max = divMax((movers ?? []).map((m) => m.delta));
  return (
    <section data-testid="CMP-MOVERS" className="flex min-w-0 flex-col gap-[14px] rounded-[26px] border border-pn-border bg-pn-panel px-6 py-[22px] @min-[1000px]/cmp:flex-[1_1_0]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="pn-card-title">{t("cmp.movers.title")}</h2>
          <p className="pn-card-sub">{t("cmp.movers.sub", { a: la, b: lb })}</p>
        </div>
        <div className="flex gap-3 text-[12px] text-pn-text-3">
          <span className="flex items-center gap-[6px]"><span className="h-[10px] w-[10px] rounded-[3px] bg-pn-bad" />{t("cmp.movers.down")}</span>
          <span className="flex items-center gap-[6px]"><span className="h-[10px] w-[10px] rounded-[3px] bg-pn-good" />{t("cmp.movers.up")}</span>
        </div>
      </div>
      {movers == null && !loading && !error ? (
        <div className="flex flex-col items-start gap-3 py-2">
          <p className="text-[14px] text-pn-muted">{t("cmp.movers.onlyDay")}</p>
          <Button variant="light" onClick={onDay} testId="CMP-07">{t("cmp.movers.toDay")}</Button>
        </div>
      ) : loading && !movers ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={20} r={6} />)}
        </div>
      ) : error && !movers ? (
        <p className="text-[14px] text-pn-muted">{t("common.error")}</p>
      ) : !movers?.length ? (
        <p className="py-6 text-[14px] text-pn-muted">{t("cmp.movers.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {movers.map((m) => {
            const up = m.delta >= 0;
            const w = (Math.abs(m.delta) / max) * 50;
            const color = up ? "var(--pn-good)" : "var(--pn-bad)";
            return (
              <li key={m.key} data-testid={`CMP-MV-${m.ext ?? m.key}`} className="grid h-[29px] grid-cols-[104px_minmax(0,1fr)_96px] items-center gap-x-3">
                <span className="truncate whitespace-nowrap text-[13px] text-pn-text-2">
                  {m.name ?? (m.ext ? <OperatorFallback ext={m.ext} /> : DASH)}
                </span>
                <div className="relative h-[14px]" aria-hidden>
                  <div className="absolute -bottom-[6px] -top-[6px] left-1/2 w-px bg-pn-border-3" />
                  <div
                    className="pn-grow absolute top-0 h-[14px] rounded-[4px]"
                    style={up ? { left: "50%", width: `${w}%`, background: color } : { right: "50%", width: `${w}%`, background: color }}
                  />
                </div>
                <span className="pn-mono whitespace-nowrap text-right text-[12px] font-medium text-pn-muted">
                  {fmtDec(m.from)} → <span className="font-semibold" style={{ color }}>{fmtDec(m.to)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* "Operator {ext}" — kengaytma raqami mono shriftda (manbadagidek). */
function OperatorFallback({ ext }: { ext: string }) {
  const t = usePT();
  const [pre, post = ""] = t("operator.fallback", { ext: "\u0000" }).split("\u0000");
  return (
    <>
      {pre}
      <span className="pn-mono">{ext}</span>
      {post}
    </>
  );
}

/* ---------------------------------------------------------- Kunlik gaplashuv */

const DAYS_INITIAL = 7;
const GRID = "minmax(0,1.25fr) minmax(0,1fr) minmax(0,1.8fr) 64px 20px";

function DailyTalkCard({
  days,
  today,
  loc,
  openDay,
  onToggle,
}: {
  days: DayRow[];
  today: string;
  loc: Loc;
  openDay: string | null;
  onToggle: (day: string, isOpen: boolean) => void;
}) {
  const t = usePT();
  const [all, setAll] = useState(false);
  const openIdx = days.findIndex((d) => d.date === openDay);
  const shown = all || openIdx >= DAYS_INITIAL ? days : days.slice(0, DAYS_INITIAL);
  const maxMin = Math.max(1, ...days.map((d) => d.minutes));
  return (
    <section data-testid="CMP-DAYS" className="flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-pn-border bg-pn-panel @min-[1000px]/cmp:flex-[1.25_1_0]">
      <div className="px-6 pb-4 pt-[22px]">
        <h2 className="pn-card-title">{t("cmp.days.title")}</h2>
        <p className="pn-card-sub">{t("cmp.days.sub")}</p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="pn-table-head grid h-9 items-center border-y border-pn-border px-6" style={{ gridTemplateColumns: GRID, columnGap: 14 }}>
            <div>{t("cmp.days.col.day")}</div>
            <div>{t("cmp.days.col.calls")}</div>
            <div>{t("cmp.days.col.talk")}</div>
            <div className="text-right">{t("cmp.days.col.avg")}</div>
            <div />
          </div>
          {shown.map((d) => {
            const open = d.date === openDay;
            const noOp = d.calls - d.operatorCalls;
            const ops = [...d.operators];
            if (noOp > 0) {
              ops.push({
                name: t("cmp.days.unknown"),
                calls: noOp,
                minutes: Math.max(0, d.minutes - d.operators.reduce((s, o) => s + o.minutes, 0)),
              });
            }
            ops.sort((x, y) => y.minutes - x.minutes);
            const opMax = Math.max(1, ...ops.map((o) => o.minutes));
            const dow = weekdayName(loc, d.date);
            return (
              <div key={d.date} className="border-b border-pn-divider" style={open ? { background: "var(--pn-row-open)" } : undefined}>
                <button
                  type="button"
                  data-testid={`CMP-05-${d.date}`}
                  aria-expanded={open}
                  onClick={() => onToggle(d.date, open)}
                  className="pn-focus-inset grid min-h-[52px] w-full items-center px-6 py-[6px] text-left text-[14px] text-pn-text"
                  style={{ gridTemplateColumns: GRID, columnGap: 14 }}
                >
                  <div>
                    <div className="pn-mono">{d.date.slice(8, 10)}-{d.date.slice(5, 7)}</div>
                    <div className="mt-[2px] text-[12px] text-pn-muted">
                      {capFirst(dow)}
                      {d.date === today && ` · ${t("cmp.days.today")}`}
                    </div>
                  </div>
                  <div>
                    <div className="pn-mono">{fmtInt(d.calls)}</div>
                    {noOp > 0 && <div className="mt-[2px] text-[11px] text-pn-warn">{t("cmp.days.opNote", { n: fmtInt(d.operatorCalls) })}</div>}
                  </div>
                  <div className="flex items-center gap-[10px]">
                    <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-pn-panel-3">
                      <div
                        className="pn-grow h-2 rounded-[4px]"
                        style={{ width: `${((d.minutes / maxMin) * 100).toFixed(1)}%`, background: open ? "var(--pn-accent)" : "var(--pn-bar-dim-2)" }}
                      />
                    </div>
                    <span className="pn-mono min-w-11 text-right text-[13px]">{hoursMinutes(d.minutes * 60)}</span>
                  </div>
                  <div className="pn-mono text-right text-[13px] text-pn-text-3">
                    {d.calls ? t("cmp.days.avg", { v: (d.minutes / d.calls).toFixed(d.minutes / d.calls < 1 ? 2 : 1) }) : DASH}
                  </div>
                  <Icon name={open ? "chevronUp" : "chevronDown"} size={16} stroke={2} className="text-pn-subtle" />
                </button>
                {open && (
                  <div className="px-6 pb-4 pt-[2px]" data-testid={`CMP-05-${d.date}-panel`}>
                    {ops.length ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ops.map((o) => (
                          <div key={o.name} className="flex h-10 items-center gap-[10px] rounded-xl bg-pn-panel-2 px-3">
                            <span className="min-w-8 max-w-[45%] truncate text-[12px] font-semibold text-pn-text-2">{o.name}</span>
                            <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-pn-track">
                              <div className="h-1 bg-pn-accent" style={{ width: `${((o.minutes / opMax) * 100).toFixed(1)}%` }} />
                            </div>
                            <span className="pn-mono text-[13px] font-semibold">{hoursMinutes(o.minutes * 60)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-pn-muted">{t("cmp.days.noOps")}</p>
                    )}
                    {(d.traffic != null || d.sales != null) && (
                      <p className="mt-3 text-[12px] text-pn-muted">
                        {t("cmp.days.conv", {
                          t: d.traffic == null ? DASH : `${fmtDec(d.traffic)}%`,
                          s: d.sales == null ? DASH : `${fmtDec(d.sales)}%`,
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {days.length > DAYS_INITIAL && (
        <button
          type="button"
          data-testid="CMP-06"
          onClick={() => setAll((v) => !v)}
          className="pn-press flex h-[52px] items-center justify-center text-[13px] font-medium text-pn-muted hover:text-pn-text"
        >
          {all ? t("cmp.days.less") : t("cmp.days.more", { n: days.length - DAYS_INITIAL })}
        </button>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Skelet */

export function CompareSkeleton({ withHeader = true }: { withHeader?: boolean }) {
  return (
    <div className="@container/cmp flex flex-col gap-5" aria-busy="true" data-testid="CMP-SKELETON">
      {withHeader && (
        <div className="flex flex-wrap items-end justify-between gap-6 pt-[10px]">
          <div>
            <Skeleton w={200} h={12} r={6} />
            <Skeleton w={260} h={40} r={10} className="mt-[10px]" />
          </div>
          <div className="flex gap-[10px]">
            <Skeleton w={318} h={46} r={999} />
            <Skeleton w={206} h={46} r={999} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 @min-[720px]/cmp:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} h={220} r={26} />)}
      </div>
      <Skeleton h={332} r={26} />
      <div className="flex flex-col gap-4 @min-[1000px]/cmp:flex-row">
        <Skeleton h={480} r={26} className="@min-[1000px]/cmp:flex-[1_1_0]" />
        <Skeleton h={480} r={26} className="@min-[1000px]/cmp:flex-[1.25_1_0]" />
      </div>
    </div>
  );
}

