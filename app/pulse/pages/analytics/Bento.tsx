"use client";

/* Analitika bento'si (§6.2): hero plitka, ikki pastel plitka, konversiya.
 * O'lchamlar Main.dc.html dan. */

import Link from "next/link";
import type { ReactNode } from "react";
import { MiniBars, SemiGauge, type MiniBar } from "../../charts";
import { usePT, type PT } from "../../i18n";
import { fmtDec, fmtInt, fmtSigned, DASH } from "../../lib/format";
import { conversionTone, TONE_VARS } from "../../lib/tones";
import { gaugeFill, gaugeScaleMax, gaugeTick } from "../../lib/numbers";
import { dayMonthShort, hoursMinutes, isoWeekday, monthName, weekdayShort, type Loc } from "../../lib/dates";
import type { AnalyticsData, Period } from "../../data/analytics";

/* ------------------------------------------------------------------ Hero */

export function formatDeltaPct(current: number, previous: number | null): { text: string; up: boolean } | null {
  if (previous == null || previous === 0) return null;
  const d = ((current - previous) / previous) * 100;
  return { text: `${Math.abs(d).toFixed(1)}%`, up: d >= 0 };
}

function bucketLabel(period: Period, key: string, loc: Loc): string {
  if (period === "day") return `${key}:00`;
  return dayMonthShort(loc, key);
}

/* O'q yorliqlari o'z ustuni ostida (D14): kun — birinchi ustundan har 3-soat;
 * hafta — 7 kun; oy — 1, 8, 15, 22, 29. */
function axisLabel(period: Period, key: string, index: number, loc: Loc): string | null {
  if (period === "day") return index % 3 === 0 ? key : null;
  if (period === "week") return weekdayShort(loc, isoWeekday(key));
  const d = Number(key.slice(8, 10));
  return [1, 8, 15, 22, 29].includes(d) ? String(d) : null;
}

export function HeroTile({ data, loc }: { data: AnalyticsData; loc: Loc }) {
  const t = usePT();
  const p = data.period;
  const delta = formatDeltaPct(data.total.current, data.total.previous);
  const n = data.buckets.length;
  const barW = n <= 15 ? 11 : Math.max(4, Math.floor((221 - 4 * (n - 1)) / n));
  const bars: MiniBar[] = data.buckets.map((b) => ({
    key: b.key,
    value: b.count,
    color: b.isCurrent ? "var(--pn-accent-ink)" : "var(--pn-on-accent-dim)",
  }));
  const prev = data.total.previous;
  const sub =
    prev == null
      ? null
      : t(`an.hero.${data.range.cutoff ? "cut" : "full"}.${p}` as "an.hero.cut.day", { n: fmtInt(prev) });

  return (
    <section
      data-testid="AN-HERO"
      className="flex flex-col rounded-[26px] bg-pn-accent px-[26px] py-6 text-pn-accent-ink @min-[560px]/an:col-span-2 @min-[1040px]/an:row-span-2"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">{t(`an.hero.${p}` as "an.hero.day")}</span>
        {delta && (
          <span
            data-testid="AN-HERO-delta"
            className="pn-mono inline-flex h-[30px] items-center rounded-full bg-pn-on-accent-faint px-3 text-[13px] font-semibold"
          >
            {delta.up ? "↑" : "↓"} {delta.text}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div data-testid="AN-HERO-total" className="pn-display text-[84px] leading-[0.9] tracking-[-0.045em]">
            {fmtInt(data.total.current)}
          </div>
          {sub && <div className="mt-3 text-[14px] text-pn-on-accent-muted">{sub}</div>}
        </div>
        {n > 0 && (
          <div className="flex flex-col gap-[6px]">
            <MiniBars
              bars={bars}
              height={76}
              barWidth={barW}
              gap={4}
              radius={4}
              minH={4}
              futureColor="var(--pn-on-accent-faint)"
              ariaLabel={t("an.hero.bars")}
              testId="AN-05"
              tooltip={(b) => t("an.tip.count", { label: bucketLabel(p, b.key, loc), n: fmtInt(b.value) })}
            />
            <div className="pn-mono flex text-[10px] font-medium text-pn-on-accent-muted" style={{ gap: 4 }} aria-hidden>
              {data.buckets.map((b, i) => (
                <span key={b.key} className="flex justify-center overflow-visible whitespace-nowrap" style={{ width: barW }}>
                  {axisLabel(p, b.key, i, loc)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto grid grid-cols-3 border-t border-pn-on-accent-faint pt-4 max-[559px]:mt-6">
        <HeroStat value={data.talkSec == null ? DASH : hoursMinutes(data.talkSec)} label={t("an.hero.talk")} first />
        <HeroStat
          value={fmtInt(data.longCalls)}
          label={t("an.hero.long", { s: data.norms.longCallSec ?? DASH })}
        />
        <HeroStat
          value={data.peak ? (p === "day" ? `${data.peak.key}:00` : dayMonthShort(loc, data.peak.key)) : DASH}
          label={data.peak ? t(p === "day" ? "an.hero.peakHour" : "an.hero.peakDay", { n: fmtInt(data.peak.count) }) : ""}
          testId="AN-HERO-peak"
        />
      </div>
    </section>
  );
}

function HeroStat({ value, label, first, testId }: { value: ReactNode; label: string; first?: boolean; testId?: string }) {
  return (
    <div className={first ? "pr-[14px]" : "border-l border-pn-on-accent-faint px-[14px]"} data-testid={testId}>
      <div className="pn-display text-[26px] leading-none tracking-[-0.02em]">{value}</div>
      {label && <div className="mt-[6px] text-[12px] text-pn-on-accent-muted">{label}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Pastel */

export function PastelTile({
  tone,
  title,
  value,
  previous,
  series,
  sub,
  canConnect,
  noCrm,
  loc,
  period,
  testId,
}: {
  tone: "lilac" | "sky";
  title: string;
  value: number | null;
  previous: number | null;
  series: Array<{ key: string; count: number }> | null;
  sub: string | null;
  canConnect: boolean;
  noCrm: boolean;
  loc: Loc;
  period: Period;
  testId: string;
}) {
  const t = usePT();
  const missing = value == null;
  const bars: MiniBar[] = (series ?? []).map((s, i, arr) => ({
    key: s.key,
    value: s.count,
    color: i === arr.length - 1 ? "var(--pn-pastel-ink)" : "var(--pn-pastel-dim)",
  }));
  return (
    <section
      data-testid={testId}
      className={`flex min-h-[172px] flex-col justify-between rounded-[26px] px-[22px] py-5 text-pn-pastel-ink ${
        tone === "lilac" ? "bg-pn-lilac" : "bg-pn-sky"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[14px] font-semibold">{title}</span>
        {!missing && previous != null && (
          <span className="pn-mono inline-flex h-[26px] shrink-0 items-center rounded-full bg-pn-pastel-faint px-[10px] text-[12px] font-semibold">
            {fmtSigned(value - previous)}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="pn-display text-[52px] leading-[0.9] tracking-[-0.04em]">{missing ? DASH : fmtInt(value)}</div>
          <div className="mt-2 text-[12px] text-pn-pastel-muted">
            {missing ? (noCrm ? t("an.pastel.noCrm") : t("an.pastel.noData")) : sub}
          </div>
          {missing && canConnect && (
            <Link
              href="/dashboard/amocrm"
              data-testid="AN-06"
              className="mt-2 inline-block text-[12px] font-semibold underline underline-offset-2"
            >
              {t("an.pastel.connect")}
            </Link>
          )}
        </div>
        {!missing && bars.length > 0 && (
          <MiniBars
            bars={bars}
            height={44}
            barWidth={6}
            gap={3}
            radius={2}
            minH={3}
            ariaLabel={t("an.pastel.bars", { label: title })}
            testId={`AN-07-${tone}`}
            tooltip={(b) => t("an.tip.count", { label: seriesLabel(period, b.key, loc), n: fmtInt(b.value) })}
          />
        )}
      </div>
    </section>
  );
}

function seriesLabel(period: Period, key: string, loc: Loc): string {
  if (period === "month") return `${monthName(loc, Number(key.slice(5, 7)))} ${key.slice(0, 4)}`;
  return dayMonthShort(loc, key);
}

/* ------------------------------------------------------------ Konversiya */

export function ConversionTile({ data, t }: { data: AnalyticsData; t: PT }) {
  const c = data.conversion;
  const target = data.norms.conversionTargetPct;
  const pct = c?.pct ?? null;
  const tone = conversionTone(pct, target);
  const color = tone === "neutral" ? "var(--pn-text-2)" : TONE_VARS[tone].fg;
  const scale = gaugeScaleMax(target, pct);
  const prevWord = t(`an.prev.${data.period}` as "an.prev.day");
  const L = data.labels;
  return (
    <section
      data-testid="AN-CONV"
      className="flex min-w-0 flex-wrap items-center gap-6 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-[18px] @min-[560px]/an:col-span-2"
    >
      <SemiGauge fill={c ? gaugeFill(pct, scale) : 0} color={color} tick={target != null ? gaugeTick(target, scale) : null}>
        {pct == null ? DASH : `${fmtDec(pct)}%`}
      </SemiGauge>
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold">
            {t("an.conv.title", { from: L.leads.short, to: L.deals.short })}
          </span>
          {target != null && (
            <span className="whitespace-nowrap text-[12px] text-pn-muted">
              {t("an.conv.target")} <span className="pn-mono text-pn-text">{fmtThreshold(target)}%</span>
            </span>
          )}
        </div>
        {c && (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-pn-subtle">
            <ChainChip n={c.leads} label={L.leads.short} />
            {c.offers != null && (
              <>
                <span aria-hidden>→</span>
                <ChainChip n={c.offers} label={L.offers.short} />
              </>
            )}
            <span aria-hidden>→</span>
            <ChainChip n={c.deals} label={L.deals.short} />
          </div>
        )}
        <div className="text-[13px] text-pn-muted" data-testid="AN-CONV-foot">
          {c && target != null && pct != null ? (
            pct >= target ? (
              <span className="text-pn-good">
                {t("an.conv.done")} · <span className="pn-mono">+{fmtDec(pct - target)} pp</span>
              </span>
            ) : (
              <>
                {t("an.conv.gap")}{" "}
                <span className="pn-mono" style={{ color: tone === "bad" ? "var(--pn-bad)" : "var(--pn-warn)" }}>
                  {fmtDec(target - pct)} pp
                </span>
                {c.previousPct != null && (
                  <>
                    {" "}· {prevWord} <span className="pn-mono text-pn-text-2">{fmtDec(c.previousPct)}%</span>
                  </>
                )}
              </>
            )
          ) : c?.previousPct != null ? (
            <>
              {prevWord} <span className="pn-mono text-pn-text-2">{fmtDec(c.previousPct)}%</span>
            </>
          ) : c == null ? (
            t("an.pastel.noData")
          ) : null}
        </div>
      </div>
    </section>
  );
}

function fmtThreshold(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function ChainChip({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-[6px] rounded-full bg-pn-panel-3 px-3 text-pn-text">
      <span className="pn-mono font-semibold">{fmtInt(n)}</span>
      {label}
    </span>
  );
}
