"use client";

/* Dinamika kartasi (§6.2 Row 2 · 1): qo'ng'iroqlar ustunlari, uzun
 * suhbatlar chizig'i, bitimlar pill'lari. Y o'qi niceTicks (D8), o'q
 * suyuq kenglikda. Hover yoki ←/→ bilan ustun tooltip'i (AN-09). */

import { ChartTooltip, useColumnCursor, useWidth } from "../../charts";
import { usePT } from "../../i18n";
import { fmtInt } from "../../lib/format";
import { niceTicks } from "../../lib/numbers";
import { dayMonthShort, monthName, rangeLabel, type Loc } from "../../lib/dates";
import type { AnalyticsData, DynamicsPoint, Period } from "../../data/analytics";

const H = 180;

function xLabel(period: Period, key: string, loc: Loc): string {
  if (period === "day") return String(Number(key.slice(8, 10)));
  if (period === "week") return dayMonthShort(loc, key);
  const m = monthName(loc, Number(key.slice(5, 7)), "short");
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function fullLabel(period: Period, key: string, loc: Loc): string {
  if (period === "month") return `${monthName(loc, Number(key.slice(5, 7)))} ${key.slice(0, 4)}`;
  return dayMonthShort(loc, key);
}

export function DynamicsCard({ data, loc }: { data: AnalyticsData; loc: Loc }) {
  const t = usePT();
  const pts: DynamicsPoint[] = data.dynamics;
  const n = pts.length;
  const longSec = data.norms.longCallSec;
  const hasDeals = pts.some((p) => p.deals != null);
  const ticks = niceTicks(Math.max(0, ...pts.map((p) => p.calls)), 4);
  const yMax = ticks[ticks.length - 1] || 1;
  const [plotRef, W] = useWidth<HTMLDivElement>();
  const col = n ? W / n : 0;
  const barW = col < 45 ? col * 0.49 : 22;
  const cursor = useColumnCursor(n);
  const a = cursor.active;
  const sub =
    data.period === "day" && n
      ? t("an.dyn.sub.day", { range: rangeLabel(loc, pts[0].key, pts[n - 1].key) })
      : t(`an.dyn.sub.${data.period}` as "an.dyn.sub.week");
  const line = pts
    .map((p, i) => `${(i * col + col / 2).toFixed(1)},${(H - (Math.min(p.long, yMax) / yMax) * H).toFixed(1)}`)
    .join(" ");

  return (
    <section
      data-testid="AN-DYN"
      className="flex min-w-0 flex-col gap-[18px] rounded-[26px] border border-pn-border bg-pn-panel px-6 py-[22px] @min-[1040px]/an:flex-[1.9_1_0]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="pn-card-title">{t("an.dyn.title")}</h2>
          <p className="pn-card-sub">{sub}</p>
        </div>
        <div className="flex flex-wrap gap-4 pt-1 text-[12px] text-pn-text-3">
          <span className="flex items-center gap-[7px]">
            <span className="h-[10px] w-[10px] rounded-[3px] bg-pn-accent" />
            {t("an.dyn.calls")}
          </span>
          <span className="flex items-center gap-[7px]">
            <span className="h-[2px] w-4 rounded-[1px] bg-pn-lilac-line" />
            {t("an.dyn.long", { s: longSec ?? "—" })}
          </span>
          {hasDeals && (
            <span className="flex items-center gap-[7px]">
              <span className="h-[10px] w-[10px] rounded-full bg-pn-peach" />
              {t("an.dyn.deals")}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-[10px]">
        <div
          className="pn-mono flex h-[180px] w-[34px] shrink-0 flex-col items-end justify-between text-[11px] text-pn-subtle"
          aria-hidden
        >
          {[...ticks].reverse().map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
          <div
            ref={plotRef}
            className="relative h-[180px] outline-none"
            tabIndex={0}
            role="img"
            aria-label={t("an.dyn.aria")}
            data-testid="AN-09"
            {...cursor.bind}
          >
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
              <div className="h-px bg-pn-grid" />
              <div className="h-px bg-pn-grid" />
              <div className="h-px bg-pn-grid" />
              <div className="h-px bg-pn-grid" />
              <div className="h-px bg-pn-axis" />
            </div>
            <div className="absolute inset-0 flex items-end" aria-hidden>
              {pts.map((p, i) => (
                <div key={p.key} className="flex h-full items-end justify-center" style={{ width: col }}>
                  <div
                    className="pn-bar"
                    data-testid={`AN-09-bar-${i}`}
                    data-value={p.calls}
                    style={{
                      width: barW,
                      height: Math.max(3, (Math.min(p.calls, yMax) / yMax) * H),
                      borderRadius: "7px 7px 2px 2px",
                      background: i === n - 1 ? "var(--pn-accent)" : "var(--pn-bar-dim)",
                      opacity: a != null && a !== i ? 0.72 : 1,
                    }}
                  />
                </div>
              ))}
            </div>
            {W > 0 && n > 0 && (
              <svg className="pointer-events-none absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
                <polyline
                  points={line}
                  fill="none"
                  stroke="var(--pn-lilac-line)"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {a != null && pts[a] && (
              <ChartTooltip x={a * col + col / 2} containerWidth={W}>
                <div className="font-semibold">{fullLabel(data.period, pts[a].key, loc)}</div>
                <div className="pn-mono mt-1 text-pn-text-2">
                  {t("an.dyn.calls")} {fmtInt(pts[a].calls)} · {t("an.dyn.long", { s: longSec ?? "—" })} {fmtInt(pts[a].long)}
                  {pts[a].deals != null && ` · ${t("an.dyn.deals")} ${fmtInt(pts[a].deals)}`}
                </div>
              </ChartTooltip>
            )}
          </div>
          <div className="flex" aria-hidden>
            {pts.map((p, i) => (
              <div
                key={p.key}
                className="pn-mono overflow-visible whitespace-nowrap text-center text-[11px]"
                style={{ width: col, color: i === n - 1 ? "var(--pn-text)" : "var(--pn-subtle)" }}
              >
                {xLabel(data.period, p.key, loc)}
              </div>
            ))}
          </div>
          {hasDeals && (
            <div className="flex" aria-hidden>
              {pts.map((p) => (
                <div key={p.key} className="flex justify-center" style={{ width: col }}>
                  <span
                    className="pn-mono flex h-[22px] items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{
                      // Tor ustunda (telefon) pill'lar bir-biriga tegmasin.
                      minWidth: Math.max(14, Math.min(22, col - 3)),
                      paddingInline: col < 28 ? 2 : 5,
                      ...(p.deals
                        ? { background: "var(--pn-peach)", color: "var(--pn-pastel-ink)" }
                        : { background: "transparent", color: "var(--pn-subtle)" }),
                    }}
                  >
                    {p.deals ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
