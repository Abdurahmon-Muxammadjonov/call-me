"use client";

/* Sotuv dashboardi vidjetlari (2): yo'qotilganlar, manbalar, kanallar,
 * menejerlar, reklama kreativlari, AI qo'ng'iroq tahlili, zapusk rejasi,
 * xulosa va tavsiyalar. */

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { PT } from "../../i18n";
import { Button, ExtBadge } from "../../ui/primitives";
import { TONE_VARS } from "../../lib/tones";
import { fmtInt } from "../../lib/format";
import type { AiCalls, Creatives, Insights, Launch, Lost, Managers, MgrRow, MgrTotal, Sources } from "../../data/sales";
import { ACCENTS, Bar, CountUp, GrowthLine, Info, Muted, PALETTE, ROW, ROW_BAR, ROW_VAL, WidgetCard, colorOf, pctText, sumText, talkText } from "./kit";

type Base = { t: PT; loading: boolean; error: boolean; index: number; onSettings?: () => void };
const RED = "#F05252";
const BLUE = "#3B82F6";

/* -------------------------------------------------------- Yo'qotilganlar */
export function LostWidget({ d, t, loading, error, index, onSettings }: Base & { d: Lost | null }) {
  return (
    <WidgetCard id="lost" title={t("sd.w.lost")} icon="close" accent={ACCENTS.lost} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.total === 0 ? t("sd.lost.none") : undefined}>
      {d && (
        <div className="flex flex-col">
          <p className="mb-2 text-[13px] text-pn-muted">{t("sd.dyn.total")}: <b className="pn-mono text-pn-text">{fmtInt(d.total)}</b></p>
          {d.byStage && <Info tone="warn">{t("sd.lost.byStage")}</Info>}
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-pn-subtle">
                <th className="w-8 py-2 font-medium">№</th><th className="py-2 font-medium">{t("sd.lost.reason")}</th>
                <th className="py-2 text-right font-medium">{t("sd.lost.count")}</th><th className="w-[30%] py-2 pl-3 font-medium">{t("sd.lost.share")}</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={r.reason} className="border-t border-pn-border-2 hover:bg-pn-panel-2">
                  <td className="py-2 text-pn-subtle">{i + 1}</td>
                  <td className="max-w-0 truncate py-2" title={r.reason}>{r.reason === "—" ? t("sd.lost.unknown") : r.reason}</td>
                  <td className="pn-mono py-2 text-right">{fmtInt(r.count)}</td>
                  <td className="py-2 pl-3"><span className="flex items-center gap-2"><Bar pct={r.share} color="#EC4899" i={i} h={6} /><span className="pn-mono w-12 shrink-0 text-right text-[12px]">{pctText(r.share)}</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}

/* ------------------------------------------------------- Lid manbalari */
export function SourcesWidget({ d, t, loading, error, index, onSettings }: Base & { d: Sources | null }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const rows = d ? d.leads.slice(0, 9) : [];
  const rest = d ? d.leads.slice(9).reduce((s, r) => s + r.leads, 0) : 0;
  const segs = d ? [...rows.map((r) => ({ name: r.name, v: r.leads })), ...(rest ? [{ name: t("sd.src.other"), v: rest }] : [])] : [];
  const R = 70, C = 2 * Math.PI * R;
  let off = 0;
  const label = (n: string) => (n === "—" ? t("sd.src.unknown") : n);
  return (
    <WidgetCard id="sources" title={t("sd.w.sources")} icon="globe" accent={ACCENTS.source} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.total === 0 ? t("sd.empty.leads") : undefined}>
      {d && (
        <div className="flex flex-col items-center gap-4 @min-[520px]/w:flex-row @min-[520px]/w:items-start">
          <svg viewBox="0 0 180 180" className="h-[160px] w-[160px] shrink-0 @min-[520px]/w:h-[180px] @min-[520px]/w:w-[180px]" role="img" aria-label={t("sd.w.sources")}>
            <g transform="rotate(-90 90 90)">
              <circle cx={90} cy={90} r={R} fill="none" stroke="currentColor" className="text-pn-panel-3" strokeWidth={22} />
              {segs.map((s, i) => {
                const len = (s.v / d.total) * C;
                const el = (
                  <motion.circle key={s.name} cx={90} cy={90} r={R} fill="none" strokeWidth={hover === s.name ? 26 : 22}
                    stroke={i < rows.length ? colorOf(d.order, s.name) : PALETTE[8]} strokeDashoffset={-off}
                    initial={reduce ? false : { strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${Math.max(0, len - 1.5)} ${C}` }}
                    transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : i * 0.05, ease: "easeOut" }}
                    onPointerEnter={() => setHover(s.name)} onPointerLeave={() => setHover(null)}>
                    <title>{`${label(s.name)}: ${fmtInt(s.v)} (${pctText(Math.round((s.v / d.total) * 1000) / 10)})`}</title>
                  </motion.circle>
                );
                off += len;
                return el;
              })}
            </g>
            <text x={90} y={88} textAnchor="middle" className="fill-pn-text pn-mono text-[22px] font-semibold">{fmtInt(d.total)}</text>
            <text x={90} y={108} textAnchor="middle" className="fill-pn-subtle text-[11px]">{t("sd.src.totalLeads")}</text>
          </svg>
          <table className="w-full text-[13px]">
            <tbody>
              {segs.map((s, i) => (
                <tr key={s.name} className={`border-t border-pn-border-2 first:border-t-0 ${hover === s.name ? "bg-pn-panel-2" : ""}`} onPointerEnter={() => setHover(s.name)} onPointerLeave={() => setHover(null)}>
                  <td className="py-[6px]"><span className="inline-block h-[10px] w-[10px] rounded-full align-middle" style={{ background: i < rows.length ? colorOf(d.order, s.name) : PALETTE[8] }} /></td>
                  <td className="max-w-0 truncate py-[6px] pl-2">{label(s.name)}</td>
                  <td className="pn-mono py-[6px] text-right">{fmtInt(s.v)}</td>
                  <td className="pn-mono py-[6px] pl-3 text-right text-pn-muted">{pctText(Math.round((s.v / d.total) * 1000) / 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}

export function ChannelsWidget({ d, t, loading, error, index, onSettings }: Base & { d: Sources | null }) {
  const max = Math.max(1, ...(d?.channels ?? []).map((c) => c.sum));
  return (
    <WidgetCard id="channels" title={t("sd.w.channels")} icon="transfer" accent={ACCENTS.source} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.channels.length === 0 ? t("cm.empty") : undefined}>
      {d && (
        <ul className="flex flex-col gap-[10px]">
          {d.channels.slice(0, 12).map((c, i) => (
            <li key={c.name} className={ROW}>
              <span className="truncate">{c.name === "—" ? t("sd.src.unknown") : c.name}</span>
              <span className={ROW_BAR}><Bar pct={(c.sum / max) * 100} color={colorOf(d.order, c.name)} i={i} /></span>
              <span className={`pn-mono whitespace-nowrap text-right text-[12px] text-right ${ROW_VAL}`}>{sumText(t, c.sum)} · {pctText(c.sumShare)}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

/* --------------------------------------------------------- Menejerlar */
const AVATAR = ["#60A5FA", "#34D399", "#A855F7", "#FACC15", "#EC4899", "#0EA5E9", "#84CC16", "#F59E0B"];
function Avatar({ name, i }: { name: string; i: number }) {
  const c = AVATAR[i % AVATAR.length];
  return <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold" style={{ background: `color-mix(in srgb, ${c} 22%, transparent)`, color: c }}>{(name.trim()[0] ?? "?").toUpperCase()}</span>;
}

export function ManagersWidget({ d, t, loading, error, index, onSettings }: Base & { d: Managers | null }) {
  const [showSystem, setShowSystem] = useState(false);
  const stages = d?.stages ?? null;
  const head = [t("sd.m.leads"), t("sd.m.inWork"), t("sd.m.sales"), t("sd.m.sum"), t("sd.m.conv"), t("sd.m.avg"), t("sd.m.talk"), t("sd.m.oldest")];
  const cells = (r: MgrRow | (MgrTotal & { oldestDays?: null; name?: string }), growthRow?: MgrRow) => [
    <>{fmtInt(r.leads)}{growthRow && <span className="block text-[10px] text-pn-subtle"><GrowthLine g={growthRow.leadsGrowth} t={t} /></span>}</>,
    fmtInt(r.inWork),
    <>{fmtInt(r.sales)}{growthRow && <span className="block text-[10px] text-pn-subtle"><GrowthLine g={growthRow.salesGrowth} t={t} /></span>}</>,
    <>{fmtInt(r.sum)}{growthRow && <span className="block text-[10px] text-pn-subtle"><GrowthLine g={growthRow.sumGrowth} money t={t} /></span>}</>,
    pctText(r.conv),
    r.avg != null ? fmtInt(r.avg) : "—",
    "talkSec" in r ? talkText(t, (r as MgrRow).talkSec ?? null, (r as MgrRow).calls ?? null) : "—",
    "oldestDays" in r && r.oldestDays != null ? `${r.oldestDays}${t("sd.d")}` : "—",
  ];
  return (
    <WidgetCard id="managers" title={t("sd.w.managers")} icon="users" accent={ACCENTS.team} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.rows.length === 0 && d.system.rows.length === 0 ? t("sd.empty.leads") : undefined}
      footnote={<>{stages ? "" : `${t("sd.m.stagesHint")} · `}{t("sd.m.callsNote")}</>}>
      {d && (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[920px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-pn-subtle">
                <th className="w-8 py-2 font-medium">№</th>
                <th className="sticky left-0 z-[1] bg-pn-panel py-2 pr-2 font-medium">{t("sd.m.manager")}</th>
                {head.map((h) => <th key={h} className="py-2 pl-3 text-right font-medium">{h}</th>)}
                {stages?.map((s) => <th key={s.id} className="max-w-[90px] truncate py-2 pl-3 text-right font-medium" title={s.name}>{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={String(r.id)} className="border-t border-pn-border-2 hover:bg-pn-panel-2">
                  <td className="py-2 text-pn-subtle">{i + 1}</td>
                  <td className="sticky left-0 z-[1] bg-pn-panel py-2 pr-2"><span className="flex items-center gap-2"><Avatar name={r.name} i={i} /><span className="max-w-[140px] truncate">{r.name}</span>{r.ext && <ExtBadge size="audio">{r.ext}</ExtBadge>}</span></td>
                  {cells(r, r).map((c, j) => <td key={j} className="pn-mono py-2 pl-3 text-right align-top">{c}</td>)}
                  {stages?.map((s) => <td key={s.id} className="pn-mono py-2 pl-3 text-right">{r.stages[String(s.id)] ?? "·"}</td>)}
                </tr>
              ))}
              <TotalRow label={t("sd.m.totalActive")} r={d.totals.active} stages={stages} cells={cells} />
              <tr className="border-t border-pn-border-2">
                <td />
                <td colSpan={9 + (stages?.length ?? 0)} className="py-2">
                  <button type="button" onClick={() => setShowSystem((v) => !v)} className="text-[12px] text-pn-muted hover:text-pn-text">
                    {showSystem ? "▾" : "▸"} {t("sd.m.system", { n: d.system.rows.length })} — {fmtInt(d.system.total.sales)} {t("sd.m.sales").toLowerCase()} · {fmtInt(d.system.total.sum)}
                  </button>
                </td>
              </tr>
              {showSystem && d.system.rows.map((r, i) => (
                <tr key={`s${String(r.id)}`} className="border-t border-pn-border-2 text-pn-muted hover:bg-pn-panel-2">
                  <td />
                  <td className="sticky left-0 z-[1] bg-pn-panel py-2 pr-2"><span className="flex items-center gap-2"><Avatar name={r.name} i={i + 3} /><span className="max-w-[140px] truncate">{r.name}</span></span></td>
                  {cells(r).map((c, j) => <td key={j} className="pn-mono py-2 pl-3 text-right">{c}</td>)}
                  {stages?.map((s) => <td key={s.id} className="pn-mono py-2 pl-3 text-right">{r.stages[String(s.id)] ?? "·"}</td>)}
                </tr>
              ))}
              <TotalRow label={t("sd.m.totalAll")} r={d.totals.all} stages={stages} cells={cells} strong />
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}

function TotalRow({ label, r, stages, cells, strong }: { label: string; r: MgrTotal; stages: Array<{ id: number }> | null; cells: (r: MgrTotal & { oldestDays?: null }) => React.ReactNode[]; strong?: boolean }) {
  return (
    <tr className={`border-t border-pn-border-3 ${strong ? "font-semibold" : ""}`}>
      <td />
      <td className="sticky left-0 z-[1] bg-pn-panel py-2 pr-2">{label}</td>
      {cells({ ...r, oldestDays: null }).map((c, j) => <td key={j} className="pn-mono py-2 pl-3 text-right">{c}</td>)}
      {stages?.map((s) => <td key={s.id} />)}
    </tr>
  );
}

/* -------------------------------------------------- Reklama kreativlari */
export function CreativesWidget({ d, t, loading, error, index, onSettings }: Base & { d: Creatives | null }) {
  const max = Math.max(1, ...(d?.rows ?? []).map((r) => r.sales));
  const best = d?.rows.find((r) => r.sales > 0) ?? null;
  return (
    <WidgetCard id="creatives" title={t("sd.w.creatives")} icon="play" accent={ACCENTS.ads} scope={t("sd.scope.all")} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.total === 0 ? t("sd.ads.none") : undefined}
      footnote={d && d.total > 0 && t("sd.ads.foot", { a: d.withSales, b: d.total, c: d.noResult })}>
      {d && (
        <div className="flex flex-col gap-[10px]">
          {!d.metaConnected && <Info>{t("sd.ads.noMeta")}</Info>}
          <p className="text-[13px] text-pn-muted">{t("sd.ads.best")}: <b className="text-pn-text">{best ? `${best.id} — ${sumText(t, best.sum)}` : "—"}</b></p>
          {d.rows.slice(0, 10).map((r, i) => (
            <div key={r.id} className={ROW}>
              <span className="truncate" title={r.id}>{r.id}</span>
              <span className={ROW_BAR}><Bar pct={(r.sales / max) * 100} color={BLUE} i={i} /></span>
              <span className={`pn-mono whitespace-nowrap text-right text-[12px] text-right ${ROW_VAL}`}>{r.sales} {t("sd.pcs")} / {fmtInt(r.leads)} {t("sd.lead")}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

/* ------------------------------------------------ AI qo'ng'iroq tahlili */
const RESULT_COLOR: Record<string, string> = { paid: "#22C55E", qualified: "#60A5FA", unqualified: RED, unknown: "#94A3B8" };
const TOPIC_COLOR: Record<string, string> = { sales: "#60A5FA", followup: "#A855F7", short: "#FACC15" };
export function AiWidget({ d, t, loading, error, index, onSettings }: Base & { d: AiCalls | null }) {
  return (
    <WidgetCard id="ai" title={t("sd.w.ai")} icon="sparkle" accent={ACCENTS.ai} loading={loading} error={error} index={index} onSettings={onSettings}
      empty={d && d.total === 0 ? t("sd.ai.none") : undefined} footnote={t("sd.m.callsNote")}>
      {d && (
        <div className="flex flex-col gap-4">
          <Muted>{t("sd.ai.meta", { a: fmtInt(d.analyzed), b: fmtInt(d.total), p: pctText(d.coverage), at: d.lastAt ? d.lastAt.slice(0, 16).replace("T", " ") : "—" })}</Muted>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full border-4" style={{ borderColor: "#A855F7" }}><span className="pn-mono text-[13px] font-semibold">{d.avg ?? "—"}</span></span>
            <span><span className="block text-[12px] text-pn-muted">{t("sd.ai.avg")}</span><span className="pn-mono text-[18px] font-semibold"><CountUp value={d.avg} format={(v) => (Math.round(v * 10) / 10).toFixed(1)} /> / 10</span></span>
          </div>
          <div>
            <p className="pn-section-label mb-2 text-pn-muted">{t("sd.ai.result")}</p>
            <ul className="flex flex-col gap-2">
              {d.results.map((r, i) => (
                <li key={r.key} className={ROW}>
                  <span className="truncate">{t(`sd.ai.r.${r.key}` as "sd.ai.r.paid")}</span>
                  <span className={ROW_BAR}><Bar pct={r.share} color={RESULT_COLOR[r.key] ?? "#94A3B8"} i={i} /></span>
                  <span className={`pn-mono text-[12px] text-right ${ROW_VAL}`}>{fmtInt(r.count)} ({pctText(r.share)})</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="pn-section-label mb-2 text-pn-muted">{t("sd.ai.operators")}</p>
            <ul className="flex flex-col gap-2">
              {d.operators.slice(0, 10).map((o, i) => (
                <li key={o.ext} className={ROW}>
                  <span className="truncate">{o.name}</span>
                  <span className={ROW_BAR}><Bar pct={o.score * 10} color={o.score >= 7 ? "#22C55E" : o.score >= 5 ? "#FACC15" : RED} i={i} /></span>
                  <span className={`pn-mono text-right text-[12px] ${ROW_VAL}`}>{o.score} · {o.count} {t("sd.pcs")}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="pn-section-label mb-2 text-pn-muted">{t("sd.ai.topic")}</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
              {d.topics.map((tp) => (
                <li key={tp.key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: TOPIC_COLOR[tp.key] ?? "#94A3B8" }} />{t(`sd.ai.t.${tp.key}` as "sd.ai.t.sales")} <b className="pn-mono">{fmtInt(tp.count)}</b></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

/* --------------------------------------------------------- Zapusk rejasi */
export function LaunchWidget({ d, t, loading, error, index, canEdit, onEdit }: Base & { d: Launch | null; canEdit: boolean; onEdit: () => void }) {
  const reduce = useReducedMotion();
  const has = d && d.plan;
  const L = has ? d : null;
  const pct = (v: number) => (L && L.plan.amount ? Math.min(100, (v / L.plan.amount) * 100) : 0);
  return (
    <WidgetCard id="launch" title={t("sd.w.launch")} icon="target" accent={ACCENTS.launch} loading={loading} error={error} index={index}
      actions={canEdit && <Button variant="link" icon="pencil" onClick={onEdit} testId="SD-launch-edit">{has ? t("sd.edit") : t("sd.plan.add")}</Button>}>
      {!L ? (
        <div className="flex flex-col gap-1"><p className="text-[14px] text-pn-muted">{t("sd.launch.none")}</p><Muted>{t("sd.launch.hint")}</Muted></div>
      ) : (
        <div className="flex flex-col gap-4">
          <Muted>{L.plan.title ? `${L.plan.title} · ` : ""}{t("sd.launch.sub", { from: L.plan.period_from, to: L.plan.period_to, d: L.day, n: L.totalDays, left: L.daysLeft })}</Muted>
          <div className="relative h-4 overflow-hidden rounded-full bg-pn-panel-3">
            <motion.span className="absolute inset-y-0 left-0" style={{ background: "#94A3B8", opacity: 0.45 }} initial={reduce ? false : { width: 0 }} animate={{ width: `${pct(L.totalPotential)}%` }} transition={{ duration: 0.6 }} />
            <motion.span className="absolute inset-y-0 left-0 rounded-r-full" style={{ background: RED }} initial={reduce ? false : { width: 0 }} animate={{ width: `${pct(L.fact)}%` }} transition={{ duration: 0.6, delay: 0.1 }} />
            <span className="absolute inset-y-0 w-[2px] bg-pn-text" style={{ left: `${Math.min(100, L.timePct)}%` }} title={t("sd.plan.time")} />
          </div>
          <div className="grid grid-cols-2 gap-3 @min-[700px]/w:grid-cols-5">
            <Tile label={t("sd.launch.plan")} value={fmtInt(L.plan.amount)} />
            <Tile label={t("sd.launch.fact")} value={fmtInt(L.fact)} color={RED} sub={t("sd.launch.factSub", { p: pctText(L.factPct) })} />
            <Tile label={t("sd.launch.expected")} value={fmtInt(L.expected)} sub={t("sd.launch.expectedSub")} />
            <Tile label={t("sd.launch.potential")} value={fmtInt(L.potential)} sub={`${L.potentialLeads} ${t("sd.lead")} × ${fmtInt(L.avgCheck)}`} />
            <Tile label={t("sd.launch.toPlan")} value={fmtInt(L.toPlan)} sub={t("sd.launch.perDay", { v: fmtInt(L.perDay) })} />
          </div>
          <p className="pn-mono break-words text-[12px] text-pn-muted">{t("sd.launch.formula", { total: fmtInt(L.totalPotential), p: pctText(L.totalPotentialPct), paid: fmtInt(L.paid), exp: fmtInt(L.expected), pot: fmtInt(L.potential) })}</p>
          <div className="grid grid-cols-1 gap-4 @min-[1000px]/w:grid-cols-[1.4fr_1fr]">
            <SimpleTable
              head={[t("sd.launch.pipeline"), t("sd.m.leads"), t("sd.launch.sold"), t("sd.launch.agreed"), t("sd.launch.paid"), t("sd.launch.expected"), t("sd.launch.potLeads")]}
              rows={L.pipelines.map((p) => [p.name, fmtInt(p.leads), fmtInt(p.sold), fmtInt(p.agreed), fmtInt(p.paid), fmtInt(p.expected), fmtInt(p.potential)])}
              total={[t("sd.total"), fmtInt(L.pipelines.reduce((s, p) => s + p.leads, 0)), fmtInt(L.pipelines.reduce((s, p) => s + p.sold, 0)), fmtInt(L.fact), fmtInt(L.paid), fmtInt(L.expected), fmtInt(L.potentialLeads)]}
            />
            <SimpleTable
              head={[t("sd.m.manager"), t("sd.launch.sold"), t("sd.launch.agreed"), t("sd.launch.paid"), t("sd.launch.expected")]}
              rows={L.managers.map((m) => [m.name, fmtInt(m.sold), fmtInt(m.agreed), fmtInt(m.paid), fmtInt(m.expected)])}
            />
          </div>
          {L.warnings.unpaidFull.count > 0 && <p className="text-[12px]" style={{ color: TONE_VARS.bad.text }}>{t("sd.launch.warnUnpaid", { n: L.warnings.unpaidFull.count, v: fmtInt(L.warnings.unpaidFull.sum) })}</p>}
          <Muted>{L.warnings.lost > 0 && `${t("sd.launch.lost", { n: fmtInt(L.warnings.lost) })} · `}{t("sd.launch.fields")}</Muted>
        </div>
      )}
    </WidgetCard>
  );
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-pn-panel-2 p-3">
      <span className="block truncate text-[12px] text-pn-muted">{label}</span>
      <span className="pn-mono block truncate text-[17px] font-semibold" style={color ? { color } : undefined}>{value}</span>
      {sub && <span className="block truncate text-[11px] text-pn-subtle">{sub}</span>}
    </div>
  );
}

function SimpleTable({ head, rows, total }: { head: string[]; rows: string[][]; total?: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-[12px]">
        <thead><tr className="text-left text-[10px] uppercase tracking-wide text-pn-subtle">{head.map((h, i) => <th key={h} className={`py-2 font-medium ${i ? "pl-3 text-right" : ""}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i} className="border-t border-pn-border-2 hover:bg-pn-panel-2">{r.map((c, j) => <td key={j} className={`py-[6px] ${j ? "pn-mono pl-3 text-right" : "max-w-[180px] truncate"}`}>{c}</td>)}</tr>)}
          {total && <tr className="border-t border-pn-border-3 font-semibold">{total.map((c, j) => <td key={j} className={`py-[6px] ${j ? "pn-mono pl-3 text-right" : ""}`}>{c}</td>)}</tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------ Xulosa va tavsiyalar */
const fmtVars = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "number" && Math.abs(x) >= 1000 ? fmtInt(x) : typeof x === "number" ? String(x).replace(".", ",") : x]));

export function InsightsWidget({ d, t, loading, error, index, onSettings }: Base & { d: Insights | null }) {
  return (
    <WidgetCard id="insights" title={t("sd.w.insights")} icon="sparkle" accent={ACCENTS.idea} loading={loading} error={error} index={index} onSettings={onSettings}
      actions={<span className="rounded-md bg-pn-panel-2 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-pn-muted">{t("sd.ins.badge")}</span>}>
      {d && (
        <div className="grid grid-cols-1 gap-5 @min-[760px]/w:grid-cols-2">
          <div>
            <p className="pn-section-label mb-2 text-pn-muted">{t("sd.ins.facts")}</p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px]">
              {d.facts.map((f) => <li key={f.key}>{t(`sd.f.${f.key}` as "sd.f.sales", fmtVars(f.v))}</li>)}
            </ul>
          </div>
          <div>
            <p className="pn-section-label mb-2 text-pn-muted">{t("sd.ins.recs")}</p>
            {d.recs.length === 0 ? <p className="text-[13px] text-pn-muted">{t("sd.ins.noRecs")}</p> : (
              <ol className="flex flex-col gap-2 text-[13px]">
                {d.recs.map((r, i) => (
                  <li key={r.key} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold" style={{ background: "color-mix(in srgb, #EC4899 18%, transparent)", color: "#EC4899" }}>{i + 1}</span>
                    <span>{t(`sd.r.${r.key}` as "sd.r.fillPrice", fmtVars(r.v))}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

