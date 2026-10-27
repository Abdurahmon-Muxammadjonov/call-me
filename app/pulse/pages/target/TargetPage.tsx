"use client";

/* TARGET TAHLIL (2026-10-27, foydalanuvchi talabi: "target analiz qo'sh" —
 * "CRM'nikini qil, Meta kerak emas"). amoCRM lidlari kreativ (utm_content,
 * masalan "reels2") va manba kesimida: lid, sifatli/sifatsiz (AI qo'ng'iroq
 * tahlili), sotuv, konversiya, tushum, o'rtacha chek; kunlik grafik va
 * tavsiyalar. Meta Ads ulansa (backendda tayyor) xarajat ustunlari ham chiqadi. */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePT, type PT } from "../../i18n";
import { Segmented, Skeleton, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { pick, useUrlState } from "../../shell/useUrlState";
import { addDays, monthStart, tashkentToday } from "../../lib/dates";
import { fmtInt } from "../../lib/format";
import { TONE_VARS, type Tone } from "../../lib/tones";
import { useWidth } from "../../charts";
import { useTarget, type TMetrics, type TargetData } from "../../data/target";
import { CountUp, IconTile, Info, Muted, WidgetCard, pctText, shortSum, sumText } from "../sales/kit";

const PERIODS = ["7", "30", "90", "month"] as const;
type Period = (typeof PERIODS)[number];
type Live = Extract<TargetData, { ready: true }>;

const roasTone = (r: number | null): Tone => (r == null ? "neutral" : r >= 3 ? "good" : r >= 1 ? "warn" : "bad");
const money = (t: PT, v: number | null) => (v == null ? "—" : `${shortSum(t, v)} ${t("cm.som")}`);

function Kpis({ d, t }: { d: Live; t: PT }) {
  const T = d.totals;
  const top = d.unmatched.filter((c) => c.sales > 0).sort((a, b) => b.revenue - a.revenue)[0] ?? d.unmatched[0];
  const rated = T.qualified + T.unqualified;
  const tiles: Array<{ k: string; icon: Parameters<typeof IconTile>[0]["icon"]; color: string; label: string; value: number | null; fmt: (v: number) => string; sub: string; text?: string; tone?: Tone }> = [
    { k: "leads", icon: "users", color: "#60A5FA", label: t("trg.leads"), value: T.leads, fmt: (v) => fmtInt(v), sub: t("trg.leadsSubCrm", { n: fmtInt(T.leadsNoCreative) }) },
    { k: "qual", icon: "checkSquare", color: "#34D399", label: t("trg.qualified"), value: T.qualified, fmt: (v) => fmtInt(v), sub: rated ? t("trg.qualifiedSub", { p: pctText(T.qualifiedShare), u: fmtInt(T.unqualified) }) : t("trg.qualifiedNone") },
    { k: "sales", icon: "stats", color: "#A855F7", label: t("trg.sales"), value: T.sales, fmt: (v) => fmtInt(v), sub: t("trg.salesSub", { p: pctText(T.conv) }) },
    { k: "revenue", icon: "sparkle", color: "#22C55E", label: t("trg.revenue"), value: T.revenue, fmt: (v) => money(t, v), sub: t("trg.revenueSub", { v: shortSum(t, T.paid) }) },
    { k: "avg", icon: "target", color: "#EC4899", label: t("sd.k.avgCheck"), value: T.avgCheck, fmt: (v) => money(t, v), sub: t("trg.avgSub") },
    { k: "top", icon: "play", color: "#F59E0B", label: t("trg.topCreative"), value: null, fmt: () => "", text: top?.name ?? "—", sub: top ? t("trg.topCreativeSub", { l: fmtInt(top.leads), s: fmtInt(top.sales) }) : "" },
    ...(d.connected ? [
      { k: "spend", icon: "trendUp" as const, color: "#F05252", label: t("trg.spend"), value: T.spend, fmt: (v: number) => money(t, v), sub: t("trg.spendSub", { ctr: pctText(T.ctr), cpc: T.cpc != null ? fmtInt(T.cpc) : "—" }) },
      { k: "roas", icon: "gauge" as const, color: "#EC4899", label: "ROAS", value: T.roas, fmt: (v: number) => `${String(Math.round(v * 100) / 100).replace(".", ",")}×`, sub: T.cpl != null ? `CPL ${fmtInt(T.cpl)}` : t("trg.roasSub"), tone: roasTone(T.roas) },
    ] : []),
  ];
  return (
    <WidgetCard id="trg-kpis" title={t("trg.kpis")} icon="target" accent="#F05252" loading={false} error={false}>
      <div className="grid grid-cols-2 gap-2 @min-[420px]/w:gap-3 @min-[760px]/w:grid-cols-3 @min-[1100px]/w:grid-cols-6">
        {tiles.map((c) => (
          <div key={c.k} className="flex min-w-0 flex-col gap-1 rounded-xl bg-pn-panel-2 p-[10px] @min-[420px]/w:p-3" data-testid={`TRG-kpi-${c.k}`}>
            <span className="flex min-w-0 items-center gap-2"><IconTile icon={c.icon} color={c.color} /><span className="min-w-0 truncate text-[12px] text-pn-muted">{c.label}</span></span>
            <span className="pn-mono mt-1 truncate text-[16px] font-semibold leading-tight @min-[420px]/w:text-[20px]" style={c.tone ? { color: TONE_VARS[c.tone].text } : undefined}>
              {c.text != null ? c.text : <CountUp value={c.value} format={c.fmt} />}
            </span>
            <Muted>{c.sub}</Muted>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* Kunlik: lidlar — ustun, xarajat — chiziq (alohida shkala). */
function Daily({ d, t }: { d: Live; t: PT }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const H = 200;
  const pts = d.daily;
  const geo = useMemo(() => {
    if (w < 40 || !pts.length) return null;
    const n = pts.length;
    // Bir kunlik ommaviy import (masalan 1 908 lid) shkalani ezmasin: 90-foizli
    // qiymat × 1.5 dan balandi kesiladi va ustida aniq soni yoziladi.
    const sorted = pts.map((p) => p.leads).sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
    const realMax = sorted[sorted.length - 1] ?? 0;
    const maxL = Math.max(1, realMax > p90 * 3 && p90 > 0 ? Math.ceil(p90 * 1.5) : realMax);
    const maxS = Math.max(1, ...pts.map((p) => p.spend));
    const bw = (w - 8) / n;
    const x = (i: number) => 4 + i * bw + bw / 2;
    const yL = (v: number) => H - 20 - (Math.min(v, maxL) / maxL) * (H - 40);
    const yS = (v: number) => H - 20 - (v / maxS) * (H - 40);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yS(p.spend).toFixed(1)}`).join(" ");
    return { n, bw, x, yL, yS, line, maxL, maxS };
  }, [w, pts]);
  const hp = hover != null ? pts[hover] : null;
  return (
    <WidgetCard id="trg-daily" title={t("trg.daily")} icon="trendUp" accent="#3B82F6" loading={false} error={false}
      footnote={<span className="flex flex-wrap gap-4"><span className="flex items-center gap-2"><span className="h-2 w-3 rounded-sm bg-[#60A5FA]" />{t("trg.leads")}</span>{d.connected && <span className="flex items-center gap-2"><span className="h-[3px] w-4 rounded-full bg-[#F05252]" />{t("trg.spend")}</span>}</span>}>
      <div ref={ref} className="relative w-full" style={{ height: H }}
        onPointerMove={(e) => {
          if (!geo) return;
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(geo.n - 1, Math.floor((e.clientX - r.left - 4) / geo.bw))));
        }}
        onPointerLeave={() => setHover(null)}>
        {geo && (
          <svg width={w} height={H} role="img" aria-label={t("trg.daily")}>
            <text x={2} y={12} className="fill-pn-subtle text-[10px]">{fmtInt(geo.maxL)} {t("sd.lead")}</text>
            {d.connected && <text x={w - 2} y={12} textAnchor="end" className="fill-pn-subtle text-[10px]">{shortSum(t, geo.maxS)}</text>}
            {pts.map((p, i) => (
              // framer-motion SVG'da `y`/scale'ni transform deb oladi — o'lcham atributda, faqat paydo bo'lish animatsiyasi.
              <motion.rect key={p.day} x={geo.x(i) - Math.max(1, geo.bw * 0.32)} width={Math.max(2, geo.bw * 0.64)} rx={2}
                y={geo.yL(p.leads)} height={Math.max(0, H - 20 - geo.yL(p.leads))}
                fill="#60A5FA"
                initial={reduce ? false : { opacity: 0 }} animate={{ opacity: hover === i ? 1 : 0.8 }}
                transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : Math.min(i, 30) * 0.012 }} />
            ))}
            {pts.map((p, i) => p.leads > geo.maxL && (
              <text key={`o${p.day}`} x={geo.x(i)} y={geo.yL(p.leads) - 4} textAnchor="middle" className="fill-pn-text-2 pn-mono text-[10px]">↑{fmtInt(p.leads)}</text>
            ))}
            {d.connected && <motion.path d={geo.line} fill="none" stroke="#F05252" strokeWidth={2} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.8 }} />}
            {[0, pts.length - 1].map((i) => (
              <text key={i} x={geo.x(i)} y={H - 4} textAnchor={i === 0 ? "start" : "end"} className="fill-pn-subtle text-[10px]">{pts[i]?.day.slice(8, 10)}.{pts[i]?.day.slice(5, 7)}</text>
            ))}
          </svg>
        )}
        {hp && geo && (
          <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-pn-border-3 bg-pn-panel px-3 py-2 text-[12px] shadow-lg" style={{ left: Math.min(Math.max(0, geo.x(hover!) - 80), Math.max(0, w - 180)) }}>
            <p className="font-semibold">{hp.day}</p>
            <p className="pn-mono">{t("trg.leads")}: {fmtInt(hp.leads)} · {t("trg.sales")}: {fmtInt(hp.sales)}</p>
            {d.connected && <p className="pn-mono">{t("trg.spend")}: {sumText(t, hp.spend)} · CPL {hp.cpl != null ? fmtInt(hp.cpl) : "—"}</p>}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

function Table({ head, rows, t, empty }: { head: string[]; rows: Array<{ key: string; first: React.ReactNode; cells: React.ReactNode[] }>; t: PT; empty: string }) {
  if (!rows.length) return <p className="text-[13px] text-pn-muted">{empty}</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-pn-subtle">
            {head.map((h, i) => <th key={h} className={`py-2 font-medium ${i === 0 ? "sticky left-0 z-[1] bg-pn-panel pr-3" : "pl-3 text-right"}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-pn-border-2 hover:bg-pn-panel-2">
              <td className="sticky left-0 z-[1] max-w-[260px] bg-pn-panel py-2 pr-3">{r.first}</td>
              {r.cells.map((c, j) => <td key={j} className="pn-mono whitespace-nowrap py-2 pl-3 text-right">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">{t("trg.creatives")}</span>
    </div>
  );
}

const Roas = ({ v }: { v: number | null }) => <span style={{ color: TONE_VARS[roasTone(v)].text }}>{v == null ? "—" : `${String(v).replace(".", ",")}×`}</span>;
const qual = (m: TMetrics) => (m.qualified + m.unqualified ? `${pctText(m.qualifiedShare)} (${m.qualified}/${m.qualified + m.unqualified})` : "—");

function Creatives({ d, t }: { d: Live; t: PT }) {
  const rows = d.creatives.map((c) => ({
    key: c.id,
    first: (
      <span className="flex min-w-0 items-center gap-3">
        {c.thumb
          // eslint-disable-next-line @next/next/no-img-element -- Meta CDN rasmi, optimizatsiya shart emas
          ? <img src={c.thumb} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" />
          : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pn-panel-3 text-pn-subtle"><Icon name="play" size={14} /></span>}
        <span className="min-w-0">
          <span className="block truncate font-semibold">{c.name}</span>
          <span className="flex items-center gap-2 text-[11px] text-pn-subtle">
            {c.status && <StatusPill tone={c.status === "ACTIVE" ? "good" : "neutral"} plain className="h-5! px-2! text-[10px]!">{c.status === "ACTIVE" ? t("trg.active") : t("trg.stopped")}</StatusPill>}
            <span className="truncate">{c.campaign}</span>
          </span>
        </span>
      </span>
    ),
    cells: [fmtInt(c.spend), fmtInt(c.leads), c.cpl != null ? fmtInt(c.cpl) : "—", qual(c), fmtInt(c.sales), c.cps != null ? fmtInt(c.cps) : "—", fmtInt(c.revenue), <Roas key="r" v={c.roas} />],
  }));
  return (
    <WidgetCard id="trg-creatives" title={t("trg.creatives")} icon="play" accent="#F59E0B" loading={false} error={false} footnote={t("trg.creativesNote")}>
      <Table t={t} empty={t("trg.noCreatives")} head={[t("trg.creative"), t("trg.spend"), t("trg.leads"), "CPL", t("trg.quality"), t("trg.sales"), t("trg.cps"), t("trg.revenue"), "ROAS"]} rows={rows} />
    </WidgetCard>
  );
}

function Campaigns({ d, t }: { d: Live; t: PT }) {
  const rows = d.campaigns.map((c) => ({
    key: c.id,
    first: <span className="block truncate font-semibold">{c.name}</span>,
    cells: [fmtInt(c.spend), fmtInt(c.impressions), fmtInt(c.clicks), pctText(c.ctr), fmtInt(c.leads), c.cpl != null ? fmtInt(c.cpl) : "—", fmtInt(c.sales), fmtInt(c.revenue), <Roas key="r" v={c.roas} />],
  }));
  return (
    <WidgetCard id="trg-campaigns" title={t("trg.campaigns")} icon="layers" accent="#60A5FA" loading={false} error={false}>
      <Table t={t} empty={t("trg.noCampaigns")} head={[t("trg.campaign"), t("trg.spend"), t("trg.impr"), t("trg.clicks"), "CTR", t("trg.leads"), "CPL", t("trg.sales"), t("trg.revenue"), "ROAS"]} rows={rows} />
    </WidgetCard>
  );
}

/* Kreativlar (amoCRM, utm_content) — asosiy jadval; Meta ulangan bo'lsa —
 * Meta'da topilmaganlari. */
function CrmCreatives({ d, t }: { d: Live; t: PT }) {
  const max = Math.max(1, ...d.unmatched.map((u) => u.leads));
  const rows = d.unmatched.map((u) => ({
    key: u.name,
    first: (
      <span className="flex min-w-0 flex-col gap-1">
        <span className="block truncate font-semibold">{u.name}</span>
        <span className="block h-[5px] w-full max-w-[180px] overflow-hidden rounded-full bg-pn-panel-3"><span className="block h-full rounded-full bg-[#60A5FA]" style={{ width: `${(u.leads / max) * 100}%` }} /></span>
      </span>
    ),
    cells: [fmtInt(u.leads), qual(u), fmtInt(u.sales), pctText(u.conv), fmtInt(u.revenue), u.avgCheck != null ? fmtInt(u.avgCheck) : "—"],
  }));
  return (
    <WidgetCard id="trg-crm" title={d.connected ? t("trg.unmatched") : t("trg.creatives")} icon="play" accent="#F59E0B" loading={false} error={false}
      footnote={d.connected ? t("trg.unmatchedNote") : t("trg.crmNote")}>
      <Table t={t} empty={t("trg.noCrmCreatives")} head={["utm_content", t("trg.leads"), t("trg.quality"), t("trg.sales"), t("sd.k.conversion"), t("trg.revenue"), t("sd.k.avgCheck")]} rows={rows} />
    </WidgetCard>
  );
}

/* Manba kesimi (Instagram, Facebook, Telegram…). */
function Sources({ d, t }: { d: Live; t: PT }) {
  const rows = d.sources.map((x) => ({
    key: x.name,
    first: <span className="block truncate font-semibold">{x.name === "—" ? t("sd.src.unknown") : x.name}</span>,
    cells: [`${fmtInt(x.leads)} (${pctText(x.share)})`, qual(x), fmtInt(x.sales), pctText(x.conv), fmtInt(x.revenue)],
  }));
  return (
    <WidgetCard id="trg-sources" title={t("sd.w.sources")} icon="globe" accent="#34D399" loading={false} error={false}>
      <Table t={t} empty="—" head={[t("trg.source"), t("trg.leads"), t("trg.quality"), t("trg.sales"), t("sd.k.conversion"), t("trg.revenue")]} rows={rows} />
    </WidgetCard>
  );
}

const fmtV = (v: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "number" ? (Math.abs(x) >= 1000 ? fmtInt(x) : String(x).replace(".", ",")) : x]));

function Recs({ d, t }: { d: Live; t: PT }) {
  return (
    <WidgetCard id="trg-recs" title={t("trg.recs")} icon="sparkle" accent="#EC4899" loading={false} error={false}
      actions={<span className="rounded-md bg-pn-panel-2 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wide text-pn-muted">{t("sd.ins.badge")}</span>}>
      {d.recs.length === 0 ? <p className="text-[13px] text-pn-muted">{t("sd.ins.noRecs")}</p> : (
        <ol className="flex flex-col gap-2 text-[13px]">
          {d.recs.map((r, i) => (
            <li key={r.key} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold" style={{ background: "color-mix(in srgb, #EC4899 18%, transparent)", color: "#EC4899" }}>{i + 1}</span>
              <span>{t(`trg.r.${r.key}` as "trg.r.bestCpl", fmtV(r.v))}</span>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

export function TargetPage() {
  const t = usePT();
  const url = useUrlState();
  const today = tashkentToday();
  const period = pick(url.get("p"), PERIODS, "30");
  const from = period === "month" ? monthStart(today) : addDays(today, -(Number(period) - 1));
  const q = useTarget(from, today);
  usePageBusy(q.isFetching && q.isPlaceholderData);
  const d = q.data && q.data.ready ? q.data : null;

  return (
    <div className="flex flex-col gap-5 pb-24">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("trg.eyebrow")}</span>}
        title={t("trg.title")}
        actions={
          <div className="flex w-full flex-wrap items-center gap-[10px] md:w-auto">
            <span className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Segmented<Period> value={period} onChange={(p) => url.set({ p: p === "30" ? null : p })} ariaLabel={t("an.period.aria")} testId="TRG-period"
                options={[{ value: "7", label: t("trg.p7") }, { value: "30", label: t("trg.p30") }, { value: "90", label: t("trg.p90") }, { value: "month", label: t("sd.p.month") }]} />
            </span>
            <HeaderBell />
          </div>
        }
      />

      {q.isError && !q.data ? (
        <Info tone="bad">{t("sd.error")}</Info>
      ) : q.data && !q.data.ready ? (
        <Info tone="warn">{t("trg.notReady")}</Info>
      ) : d?.connected && d.pull_error ? (
        <Info tone="bad">{t("cm.pullError")}: {d.pull_error}</Info>
      ) : null}

      {!d ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={220} r={14} />)}</div>
      ) : (
        <div className="@container/tg flex flex-col gap-4" style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }}>
          <Kpis d={d} t={t} />
          <div className="grid grid-cols-1 gap-4 @min-[1100px]/tg:grid-cols-[1.6fr_1fr]">
            <Daily d={d} t={t} />
            <Recs d={d} t={t} />
          </div>
          {!d.connected && <CrmCreatives d={d} t={t} />}
          <Sources d={d} t={t} />
          {d.connected && <Creatives d={d} t={t} />}
          {d.connected && <Campaigns d={d} t={t} />}
          {d.connected && d.unmatched.length > 0 && <CrmCreatives d={d} t={t} />}
        </div>
      )}
    </div>
  );
}

export function TargetSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton h={60} r={18} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={220} r={14} />)}</div>
    </div>
  );
}
