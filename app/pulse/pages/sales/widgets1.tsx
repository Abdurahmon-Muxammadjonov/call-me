"use client";

/* Sotuv dashboardi vidjetlari (1): KPI, reja/fakt, qarzdorlik, voronka,
 * dinamika, tezkor ko'rsatkichlar, maydon taqsimoti, oylar taqqoslash. */

import { useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PT } from "../../i18n";
import { Button, Segmented } from "../../ui/primitives";
import { SelectInput } from "../../ui/form";
import { TONE_VARS } from "../../lib/tones";
import { fmtInt } from "../../lib/format";
import { useWidth } from "../../charts";
import type { Comparison, Debt, Dynamics, FieldDist, Funnel, Kpis, PlanFact, Quick } from "../../data/sales";
import { ACCENTS, Bar, CountUp, GrowthLine, IconTile, Muted, ROW, ROW_BAR, ROW_VAL, WidgetCard, pctText, shortSum, sumText } from "./kit";

type Base = { t: PT; loading: boolean; error: boolean; index: number; onSettings?: () => void };
const BLUE = "#3B82F6";
const RED = "#F05252";

/* ------------------------------------------------------------------ KPI */
export function KpiWidget({ d, t, loading, error, index, onSettings }: Base & { d: Kpis | null }) {
  const cards = d ? [
    { k: "month", icon: "trendUp" as const, color: ACCENTS.money, label: t("sd.k.month"), value: d.month.value, fmt: (v: number) => sumText(t, v), g: d.month.growth, money: true, sub: t("sd.k.monthPrev", { v: fmtInt(d.month.prev) }) },
    { k: "today", icon: "clock" as const, color: "#0EA5E9", label: t("sd.k.today"), value: d.today.value, fmt: (v: number) => sumText(t, v), g: d.today.growth, money: true, sub: t("sd.k.todayPrev", { t: d.today.until, v: fmtInt(d.today.prev) }) },
    { k: "new", icon: "users" as const, color: "#A855F7", label: t("sd.k.newClients"), value: d.newClients.value, fmt: (v: number) => `${fmtInt(v)} ${t("sd.pcs")}`, g: { pct: d.newClients.prev > 0 ? Math.round(((d.newClients.value - d.newClients.prev) / d.newClients.prev) * 1000) / 10 : null, abs: d.newClients.value - d.newClients.prev }, sub: t("sd.k.prev", { v: `${fmtInt(d.newClients.prev)} ${t("sd.pcs")}` }) },
    { k: "count", icon: "checkSquare" as const, color: "#34D399", label: t("sd.k.salesCount"), value: d.salesCount.value, fmt: (v: number) => `${fmtInt(v)} ${t("sd.pcs")}`, g: d.salesCount.growth, sub: t("sd.k.prev", { v: `${fmtInt(d.salesCount.prev)} ${t("sd.pcs")}` }) },
    { k: "conv", icon: "target" as const, color: "#FACC15", label: t("sd.k.conversion"), value: d.conversion.value, fmt: (v: number) => pctText(Math.round(v * 10) / 10), g: d.conversion.value != null && d.conversion.prev != null && d.conversion.prev > 0 ? { pct: Math.round(((d.conversion.value - d.conversion.prev) / d.conversion.prev) * 1000) / 10, abs: d.conversion.value - d.conversion.prev } : null, sub: t("sd.k.prev", { v: pctText(d.conversion.prev) }) },
    { k: "avg", icon: "stats" as const, color: "#EC4899", label: t("sd.k.avgCheck"), value: d.avgCheck.value, fmt: (v: number) => sumText(t, v), g: d.avgCheck.value != null && d.avgCheck.prev ? { pct: Math.round(((d.avgCheck.value - d.avgCheck.prev) / d.avgCheck.prev) * 1000) / 10, abs: d.avgCheck.value - d.avgCheck.prev } : null, money: true, sub: t("sd.k.prev", { v: d.avgCheck.prev != null ? fmtInt(d.avgCheck.prev) : "—" }), warn: d.avgCheck.noPrice > 0 ? t("sd.k.noPrice", { n: d.avgCheck.noPrice }) : null },
  ] : [];
  return (
    <WidgetCard id="kpis" title={t("sd.w.kpis")} icon="stats" accent={ACCENTS.money} loading={loading} error={error} index={index} onSettings={onSettings}>
      <div className="grid grid-cols-2 gap-2 @min-[420px]/w:gap-3 @min-[760px]/w:grid-cols-3 @min-[1180px]/w:grid-cols-6">
        {cards.map((c) => (
          <div key={c.k} className="flex min-w-0 flex-col gap-1 rounded-xl bg-pn-panel-2 p-[10px] @min-[420px]/w:p-3" data-testid={`SD-kpi-${c.k}`}>
            <span className="flex min-w-0 items-center gap-2"><IconTile icon={c.icon} color={c.color} /><span className="min-w-0 truncate text-[12px] text-pn-muted">{c.label}</span></span>
            <span className="pn-mono mt-1 truncate text-[16px] font-semibold leading-tight tabular-nums @min-[420px]/w:text-[19px] @min-[760px]/w:text-[22px] @min-[1180px]/w:text-[20px]">
              {/* Telefonda summa qisqa (416,5 mln so'm) — to'liq raqam sig'maydi. */}
              {c.money ? (
                <>
                  <span className="@min-[520px]/w:hidden"><CountUp value={c.value} format={(v) => `${shortSum(t, v)} ${t("cm.som")}`} /></span>
                  <span className="hidden @min-[520px]/w:inline"><CountUp value={c.value} format={c.fmt} /></span>
                </>
              ) : <CountUp value={c.value} format={c.fmt} />}
            </span>
            <span className="text-[12px]"><GrowthLine g={c.g} money={c.money} t={t} /></span>
            <Muted>({c.sub})</Muted>
            {"warn" in c && c.warn && <span className="text-[12px]" style={{ color: TONE_VARS.bad.text }}>{c.warn}</span>}
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* ------------------------------------------------------------ Reja / fakt */
export function PlanFactWidget({ d, t, loading, error, index, canEdit, onEdit }: Base & { d: PlanFact | null; canEdit: boolean; onEdit: () => void }) {
  return (
    <WidgetCard
      id="planFact" title={t("sd.w.planFact")} icon="target" accent={ACCENTS.launch} loading={loading} error={error} index={index}
      actions={canEdit && <Button variant="link" icon="pencil" onClick={onEdit} testId="SD-plan-edit">{d?.plan ? t("sd.edit") : t("sd.plan.add")}</Button>}
    >
      {!d || !d.plan ? (
        <div className="flex flex-col gap-1"><p className="text-[14px] text-pn-muted">{t("sd.plan.none")}</p><Muted>{t("sd.plan.hint")}</Muted></div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <span className="pn-mono text-[22px] font-semibold"><CountUp value={d.fact} format={(v) => fmtInt(v)} /> <span className="text-[14px] text-pn-muted">/ {fmtInt(d.plan.amount)} {t("cm.som")}</span></span>
            <span className="pn-mono text-[14px]" style={{ color: TONE_VARS.good.text }}>{pctText(d.pct)}</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-pn-panel-3">
            <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ background: RED }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, d.pct ?? 0)}%` }} transition={{ duration: 0.6 }} />
            <span className="absolute inset-y-0 w-[2px] bg-pn-text" style={{ left: `${Math.min(100, d.timePct)}%` }} title={t("sd.plan.time")} />
          </div>
          <Muted>{t("sd.plan.line", { from: d.plan.period_from, to: d.plan.period_to, paid: fmtInt(d.paid), exp: fmtInt(d.expected), left: d.daysLeft })}</Muted>
        </div>
      )}
    </WidgetCard>
  );
}

/* ------------------------------------------------------------ Qarzdorlik */
export function DebtWidget({ d, t, loading, error, index, onSettings }: Base & { d: Debt | null }) {
  const max = Math.max(1, ...(d?.managers ?? []).map((m) => m.sum));
  return (
    <WidgetCard id="debt" title={t("sd.w.debt")} icon="warning" accent={ACCENTS.debt} scope={t("sd.scope.now")} loading={loading} error={error} index={index} onSettings={onSettings}
      footnote={t("sd.scope.note")} empty={d && d.total === 0 ? t("cm.noDebt") : undefined}>
      {d && (
        <div className="flex flex-col gap-3">
          <div>
            <Muted>{t("sd.debt.total")}</Muted>
            <p className="pn-mono text-[26px] font-semibold" style={{ color: RED }}><CountUp value={d.total} format={(v) => sumText(t, v)} /></p>
          </div>
          <ul className="flex flex-col gap-[10px]">
            {d.managers.slice(0, 12).map((m, i) => (
              <li key={m.name} className={ROW}>
                <span className="truncate" style={{ color: TONE_VARS.bad.text }}>{m.name}</span>
                <span className={ROW_BAR}><Bar pct={(m.sum / max) * 100} color={RED} i={i} /></span>
                <span className={`pn-mono whitespace-nowrap text-right text-[12px] text-pn-muted ${ROW_VAL}`}>{fmtInt(m.sum)} · {m.count} {t("sd.pcs")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}

/* ---------------------------------------------------------------- Voronka */
const STAGE_COLORS = ["#60A5FA", "#34D399", "#A855F7", "#FACC15", "#0EA5E9", "#EC4899", "#84CC16", "#F59E0B", "#94A3B8"];
export function FunnelWidget({ d, t, loading, error, index, onSettings, onPickPipeline }: Base & { d: Funnel | null; onPickPipeline: (id: number) => void }) {
  return (
    <WidgetCard id="funnel" title={t("sd.w.funnel")} icon="layers" accent={ACCENTS.funnel} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.total === 0 ? t("sd.empty.leads") : undefined}
      footnote={d && <>{t("sd.funnel.conv", { p: pctText(d.conv) })}{d.mode === "pipelines" && ` · ${t("sd.funnel.hint")}`}</>}>
      {d && (
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] text-pn-muted">{t("sd.funnel.total")}: <b className="pn-mono text-pn-text">{fmtInt(d.total)}</b></p>
          <Row label={t("sd.funnel.total")} pct={100} color="#94A3B8" right={fmtInt(d.total)} i={0} />
          {d.rows.map((r, i) => (
            <Row
              key={r.id}
              i={i + 1}
              label={d.mode === "pipelines" ? <button type="button" onClick={() => onPickPipeline(r.id)} className="truncate text-left text-[#60A5FA] hover:underline">{r.name}</button> : r.name}
              pct={r.share}
              color={d.mode === "stages" && r.kind && r.kind !== "none" ? (r.kind === "lost" ? RED : "#22C55E") : STAGE_COLORS[i % STAGE_COLORS.length]}
              right={`${fmtInt(r.leads)} (${pctText(r.share)})`}
              extra={d.mode === "pipelines" ? t("sd.funnel.sales", { n: r.sales ?? 0, p: pctText(r.conv ?? null) }) : undefined}
            />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

function Row({ label, pct, color, right, extra, i }: { label: ReactNode; pct: number; color: string; right: string; extra?: string; i: number }) {
  return (
    <div className={ROW}>
      <span className="min-w-0 truncate">{label}</span>
      <span className={ROW_BAR}><Bar pct={pct} color={color} i={i} /></span>
      <span className={`pn-mono whitespace-nowrap text-right text-[12px] ${ROW_VAL}`}>
        {right}
        {extra && <span className="block text-[11px] text-pn-subtle">{extra}</span>}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- Dinamika */
function pointLabel(t: PT, key: string, gran: Dynamics["gran"]): string {
  if (gran === "month") return `${key.slice(5, 7)}.${key.slice(0, 4)}`;
  return `${key.slice(8, 10)}.${key.slice(5, 7)}`;
}

export function DynamicsWidget({ d, t, loading, error, index, onSettings, gran, onGran }: Base & { d: Dynamics | null; gran: Dynamics["gran"]; onGran: (g: Dynamics["gran"]) => void }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const H = 200;
  const chart = useMemo(() => {
    if (!d || w < 40) return null;
    const cur = d.current.points;
    const prev = d.previous.points;
    const n = Math.max(cur.length, prev.length, 1);
    const max = Math.max(1, ...cur.map((p) => p.sum), ...prev.map((p) => p.sum));
    const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * (w - 8) + 4);
    const y = (v: number) => H - 18 - (v / max) * (H - 36);
    const line = (pts: typeof cur) => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.sum).toFixed(1)}`).join(" ");
    const area = cur.length ? `${line(cur)} L${x(cur.length - 1).toFixed(1)},${H - 18} L${x(0).toFixed(1)},${H - 18} Z` : "";
    const ticks = [0, 0.5, 1].map((f) => ({ y: y(max * f), label: shortSum(t, max * f) }));
    return { cur, prev, x, y, line, area, ticks, n };
  }, [d, w, t]);
  const tabs = (
    <Segmented<Dynamics["gran"]> value={gran} onChange={onGran} ariaLabel={t("sd.w.dynamics")} testId="SD-gran"
      options={[{ value: "day", label: t("an.period.day") }, { value: "week", label: t("an.period.week") }, { value: "month", label: t("an.period.month") }]} />
  );
  const hp = hover != null && chart ? chart.cur[hover] : null;
  const hpPrev = hover != null && chart ? chart.prev[hover] : null;
  return (
    <WidgetCard id="dynamics" title={t("sd.w.dynamics")} icon="trendUp" accent={ACCENTS.chart} actions={tabs} loading={loading} error={error} index={index} onSettings={onSettings}
      footnote={d && (
        <>
          {d.best && `${t("sd.dyn.best")}: ${pointLabel(t, d.best.key, d.gran)} — ${fmtInt(d.best.sum)}`}
          {d.worst && ` · ${t("sd.dyn.worst")}: ${pointLabel(t, d.worst.key, d.gran)} — ${fmtInt(d.worst.sum)}`}
          {d.avg != null && ` · ${t("sd.dyn.avg")}: ${fmtInt(d.avg)}`}
          <span className="block">{t("sd.dyn.partialNote")}</span>
        </>
      )}>
      {d && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 @min-[440px]/w:grid-cols-2">
            <div className="rounded-xl bg-pn-panel-2 p-3"><Muted>{t("sd.dyn.total")}</Muted><p className="pn-mono text-[16px] font-semibold">{sumText(t, d.current.sum)}<span className="text-[12px] font-normal text-pn-muted"> · {t("sd.dyn.sales", { n: d.current.count })}</span></p></div>
            <div className="rounded-xl bg-pn-panel-2 p-3"><Muted>{t("sd.dyn.prev")}</Muted><p className="pn-mono text-[16px] font-semibold text-pn-muted">{sumText(t, d.previous.sum)}<span className="text-[12px] font-normal"> · {t("sd.dyn.sales", { n: d.previous.count })}</span></p></div>
          </div>
          <div ref={ref} className="relative w-full" style={{ height: H }}
            onPointerMove={(e) => {
              if (!chart) return;
              const r = e.currentTarget.getBoundingClientRect();
              const i = Math.round(((e.clientX - r.left - 4) / Math.max(1, w - 8)) * (chart.n - 1));
              setHover(Math.max(0, Math.min(chart.n - 1, i)));
            }}
            onPointerLeave={() => setHover(null)}>
            {chart && (
              <svg width={w} height={H} role="img" aria-label={t("sd.w.dynamics")}>
                <defs>
                  <linearGradient id="sd-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {chart.ticks.map((tk) => (
                  <g key={tk.y}>
                    <line x1={0} x2={w} y1={tk.y} y2={tk.y} stroke="currentColor" className="text-pn-border-2" strokeDasharray="2 4" />
                    <text x={2} y={tk.y - 4} className="fill-pn-subtle text-[10px]">{tk.label}</text>
                  </g>
                ))}
                {chart.prev.length > 0 && <path d={chart.line(chart.prev)} fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 5" opacity={0.7} />}
                <motion.path d={chart.area} fill="url(#sd-area)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.6, duration: 0.4 }} />
                <motion.path d={chart.line(chart.cur)} fill="none" stroke={BLUE} strokeWidth={2.2} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.8, ease: "easeOut" }} />
                {chart.cur.length <= 62 && chart.cur.map((p, i) => <circle key={p.key} cx={chart.x(i)} cy={chart.y(p.sum)} r={hover === i ? 4.5 : 2.5} fill={BLUE} />)}
                {hover != null && <line x1={chart.x(hover)} x2={chart.x(hover)} y1={8} y2={H - 18} stroke="currentColor" className="text-pn-border-3" />}
                {[0, Math.floor((chart.cur.length - 1) / 2), chart.cur.length - 1].filter((v, i, a) => v >= 0 && a.indexOf(v) === i).map((i) => (
                  <text key={i} x={chart.x(i)} y={H - 4} textAnchor={i === 0 ? "start" : i === chart.cur.length - 1 ? "end" : "middle"} className="fill-pn-subtle text-[10px]">
                    {chart.cur[i] && pointLabel(t, chart.cur[i].key, d.gran)}{chart.cur[i]?.partial ? "*" : ""}
                  </text>
                ))}
              </svg>
            )}
            {hp && chart && (
              <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-pn-border-3 bg-pn-panel px-3 py-2 text-[12px] shadow-lg"
                style={{ left: Math.min(Math.max(0, chart.x(hover!) - 80), Math.max(0, w - 170)) }}>
                <p className="font-semibold">{pointLabel(t, hp.key, d.gran)}{hp.partial ? "*" : ""}</p>
                <p className="pn-mono">{sumText(t, hp.sum)} · {t("sd.dyn.sales", { n: hp.count })}</p>
                {hpPrev && <p className="pn-mono text-pn-muted">{t("sd.dyn.prev")}: {sumText(t, hpPrev.sum)}</p>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-[12px] text-pn-muted">
            <span className="flex items-center gap-2"><span className="h-[3px] w-4 rounded-full" style={{ background: BLUE }} />{d.current.range.from} – {d.current.range.to}</span>
            <span className="flex items-center gap-2"><span className="h-0 w-4 border-t-2 border-dashed border-[#94A3B8]" />{d.previous.range.from} – {d.previous.range.to}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

/* ------------------------------------------------- Tezkor ko'rsatkichlar */
export function QuickWidget({ d, t, loading, error, index, onSettings }: Base & { d: Quick | null }) {
  const items = d ? [
    { icon: "users" as const, color: "#60A5FA", label: t("sd.q.best"), value: d.bestManager?.name ?? "—", sub: d.bestManager ? sumText(t, d.bestManager.sum) : "" },
    { icon: "globe" as const, color: "#34D399", label: t("sd.q.source"), value: d.topSource?.name ?? "—", sub: d.topSource ? `${fmtInt(d.topSource.leads)} ${t("sd.pcs")} (${pctText(d.topSource.share)})` : "" },
    { icon: "stats" as const, color: "#EC4899", label: t("sd.k.avgCheck"), value: sumText(t, d.avgCheck), sub: "" },
    { icon: "target" as const, color: "#FACC15", label: t("sd.k.conversion"), value: pctText(d.conversion), sub: t("sd.q.convSub") },
  ] : [];
  return (
    <WidgetCard id="quick" title={t("sd.w.quick")} icon="sparkle" accent={ACCENTS.quick} loading={loading} error={error} index={index} onSettings={onSettings}>
      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-3">
            <IconTile icon={it.icon} color={it.color} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-pn-muted">{it.label}</span>
              <span className="block truncate text-[14px] font-semibold">{it.value}</span>
              {it.sub && <span className="pn-mono block text-[12px] text-pn-subtle">{it.sub}</span>}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/* ---------------------------------------------------- Maydon taqsimoti */
export function FieldWidget({ d, t, loading, error, index, onSettings, onField }: Base & { d: FieldDist | null; onField: (id: string | null) => void }) {
  const max = Math.max(1, ...(d?.rows ?? []).map((r) => r.leads));
  const picker = d && d.fields.length > 0 && (
    <SelectInput value={d.field ? String(d.field.id) : ""} onChange={(e) => onField(e.target.value || null)} className="h-8! max-w-[200px] py-0! pr-9! pl-3! text-[12px]!" aria-label={t("sd.field.pick")} data-testid="SD-field-pick">
      {d.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </SelectInput>
  );
  return (
    <WidgetCard id="field" title={d?.field?.name ?? t("sd.w.field")} icon="filter" accent={ACCENTS.field} scope={t("sd.scope.all")} actions={picker} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && !d.field ? t("sd.field.none") : undefined}
      footnote={d?.field && t("sd.field.foot", { n: fmtInt(d.notFilled), k: d.shown ?? d.rows.length })}>
      {d?.field && (
        <div className="flex flex-col gap-[10px]">
          <p className="text-[13px] text-pn-muted">{t("sd.dyn.total")}: <b className="pn-mono text-pn-text">{fmtInt(d.total)}</b> {t("sd.lead")}</p>
          {d.rows.map((r, i) => (
            <div key={r.answer} className={ROW}>
              <span className="truncate" title={r.answer}>{r.answer}</span>
              <span className={ROW_BAR}><Bar pct={(r.leads / max) * 100} color={BLUE} i={i} /></span>
              <span className={`pn-mono whitespace-nowrap text-right text-[12px] ${ROW_VAL}`}>
                {fmtInt(r.leads)} {t("sd.lead")}
                <span className="block text-[11px] text-pn-subtle">{t("sd.field.share", { p: pctText(r.share), n: r.sales })}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

/* ---------------------------------------------------- Oylar taqqoslash */
export function ComparisonWidget({ d, t, loading, error, index, onSettings }: Base & { d: Comparison | null }) {
  return (
    <WidgetCard id="comparison" title={t("sd.w.comparison")} icon="compare" accent={ACCENTS.compare} loading={loading} error={error} index={index} onSettings={onSettings}
      footnote={d?.current?.partialDays && t("sd.cmp.foot", { v: fmtInt(d.current.base) })}>
      {d && (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-pn-subtle">
              <th className="py-2 font-medium">{t("sd.cmp.month")}</th>
              <th className="py-2 text-right font-medium">{t("sd.cmp.sales")}</th>
              <th className="py-2 text-right font-medium">{t("sd.cmp.growth")}</th>
            </tr>
          </thead>
          <tbody>
            {d.rows.map((r) => (
              <tr key={r.month} className={`border-t border-pn-border-2 hover:bg-pn-panel-2 ${r.partialDays ? "bg-pn-panel-2 font-semibold" : ""}`}>
                <td className="py-2">{r.month}{r.partialDays ? ` (1–${r.partialDays})` : ""}</td>
                <td className="pn-mono py-2 text-right">{fmtInt(r.value)}</td>
                <td className="py-2 text-right"><GrowthLine g={r.growth} money t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </WidgetCard>
  );
}

