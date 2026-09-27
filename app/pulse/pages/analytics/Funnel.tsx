"use client";

/* Voronka kartasi (§6.2 Row 2 · 2) va pastdagi chiquvchi/kiruvchi bloki
 * (D1: qator min-height 372, karta mazmunga qarab o'sadi). */

import { SplitBar } from "../../charts";
import { usePT } from "../../i18n";
import { fmtInt } from "../../lib/format";
import type { AnalyticsData, FunnelStage } from "../../data/analytics";

const STAGE_COLOR: Record<FunnelStage, string> = {
  calls: "var(--pn-accent)",
  long: "var(--pn-lilac)",
  leads: "var(--pn-sky)",
  offers: "var(--pn-peach)",
  deals: "var(--pn-good)",
};

export function FunnelCard({ data }: { data: AnalyticsData }) {
  const t = usePT();
  const s = data.norms.longCallSec ?? "—";
  const label = (st: FunnelStage) =>
    st === "calls"
      ? t("an.funnel.calls")
      : st === "long"
        ? t("an.funnel.long", { s })
        : st === "leads"
          ? data.labels.leads.singular
          : st === "offers"
            ? data.labels.offers.singular
            : data.labels.deals.singular;
  const dir = data.direction;
  const total = dir ? dir.outgoing + dir.incoming : 0;

  return (
    <section
      data-testid="AN-FUNNEL"
      className="flex min-w-0 flex-col gap-3 rounded-[26px] border border-pn-border bg-pn-panel px-6 py-[22px] @min-[1040px]/an:flex-[1_1_0]"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="pn-card-title">{t("an.funnel.title")}</h2>
        <span className="text-[12px] text-pn-muted">{t(`an.funnel.when.${data.period}` as "an.funnel.when.day")}</span>
      </div>
      <div className="pn-table-head grid grid-cols-[minmax(0,1fr)_64px_56px] gap-x-[10px]" role="row">
        <span role="columnheader">{t("an.funnel.stage")}</span>
        <span role="columnheader" className="text-right">{t("an.funnel.conv")}</span>
        <span role="columnheader" className="text-right">{t("an.funnel.count")}</span>
      </div>
      <div className="flex flex-col gap-1" role="table" aria-label={t("an.funnel.title")}>
        {data.funnel.map((f, i) => {
          const prev = i > 0 ? data.funnel[i - 1].count : 0;
          const conv = i > 0 && prev > 0 ? `${((f.count / prev) * 100).toFixed(1)}%` : "";
          return (
            <div
              key={f.stage}
              role="row"
              data-testid={`AN-10-${f.stage}`}
              className="-mx-[10px] grid h-[38px] grid-cols-[minmax(0,1fr)_64px_56px] items-center gap-x-[10px] rounded-[10px] px-[10px]"
              style={f.stage === "deals" ? { background: "color-mix(in srgb, var(--pn-good) 8%, transparent)" } : undefined}
            >
              <span role="cell" className="flex min-w-0 items-center gap-[10px] text-[14px] text-pn-text-4">
                <span className="h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ background: STAGE_COLOR[f.stage] }} />
                <span className="truncate">{label(f.stage)}</span>
              </span>
              <span role="cell" className="pn-mono text-right text-[12px] font-medium text-pn-muted">{conv}</span>
              <span role="cell" className="pn-mono text-right text-[15px] font-semibold">{fmtInt(f.count)}</span>
            </div>
          );
        })}
      </div>
      {dir && (
        <div className="mt-auto flex flex-col gap-[10px] border-t border-pn-border pt-[14px]" data-testid="AN-DIR">
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold">{t("an.dir.title")}</span>
            <span className="text-pn-muted">{t("an.dir.total", { n: fmtInt(total) })}</span>
          </div>
          <SplitBar a={dir.outgoing} b={dir.incoming} colorA="var(--pn-accent)" colorB="var(--pn-sky)" />
          <div className="flex justify-between text-[12px] text-pn-muted">
            <span>
              {t("an.dir.out")} <span className="pn-mono text-pn-text">{fmtInt(dir.outgoing)}</span>
            </span>
            <span>
              {t("an.dir.in")} <span className="pn-mono text-pn-text">{fmtInt(dir.incoming)}</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
