"use client";

/* SOTUV DASHBOARDI (2026-10-20, foydalanuvchi talabi — bitta ekranda butun
 * biznes: tushum, qarz, voronkalar, manbalar, menejerlar, reklama, AI
 * qo'ng'iroq tahlili, zapusk rejasi). Ma'lumot — amoCRM (backend har 10
 * daqiqada sinxronlaydi), UTel qo'ng'iroqlari va rejalar. Har vidjet o'z
 * holatini ko'rsatadi; joylashuv har foydalanuvchiga alohida (yashirish,
 * tartib, kenglik). */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "../../../lib/i18n";
import { usePT } from "../../i18n";
import { Button, Segmented, Skeleton } from "../../ui/primitives";
import { SelectInput, TextInput } from "../../ui/form";
import { Popover } from "../../ui/overlays";
import { Icon } from "../../ui/Icon";
import { toast } from "../../ui/toast";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { usePageBusy } from "../../shell/pageStore";
import { pick, useUrlState } from "../../shell/useUrlState";
import { useMe } from "../../data/me";
import { addDays, dayMonth, hmOf, monthStart, tashkentToday, weekStart, type Loc } from "../../lib/dates";
import { fmtInt } from "../../lib/format";
import { TONE_VARS } from "../../lib/tones";
import { useSales, useSendSalesTelegram, wOk, type Plan, type SalesQuery, type SalesWidgets } from "../../data/sales";
import { spanOf, useSalesLayout, type SalesWidget, type Span } from "../../data/salesLayout";
import { ComparisonWidget, DebtWidget, DynamicsWidget, FieldWidget, FunnelWidget, KpiWidget, PlanFactWidget, QuickWidget } from "./widgets1";
import { AiWidget, ChannelsWidget, CreativesWidget, InsightsWidget, LaunchWidget, LostWidget, ManagersWidget, SourcesWidget } from "./widgets2";
import { PlanEditor, SearchPalette, WidgetCatalog } from "./overlays";
import { exportSalesCsv } from "./exportCsv";

const PERIODS = ["today", "week", "month", "year", "range"] as const;
type Period = (typeof PERIODS)[number];
const GRANS = ["day", "week", "month"] as const;

/* Tailwind sinflari to'liq yozilgan bo'lishi kerak (dinamik emas). */
const SPAN_CLS: Record<Span, string> = {
  4: "@min-[760px]/sd:col-span-6 @min-[1200px]/sd:col-span-4",
  6: "@min-[760px]/sd:col-span-6",
  8: "@min-[760px]/sd:col-span-12 @min-[1200px]/sd:col-span-8",
  12: "@min-[760px]/sd:col-span-12",
};

function rangeOf(p: Period, today: string, from: string | null, to: string | null): { from: string; to: string } {
  if (p === "today") return { from: today, to: today };
  if (p === "week") return { from: weekStart(today), to: today };
  if (p === "year") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  if (p === "range" && from && to && from <= to) return { from, to };
  return { from: monthStart(today), to: today };
}

export function SalesPage() {
  const t = usePT();
  const loc = useLocale() as Loc;
  const url = useUrlState();
  const { data: me } = useMe();
  const today = tashkentToday();
  const period = pick(url.get("p"), PERIODS, "month");
  const range = rangeOf(period, today, url.get("from"), url.get("to"));
  const query: SalesQuery = {
    ...range,
    pipeline: url.get("pipeline"),
    group: url.get("group"),
    gran: pick(url.get("gran"), GRANS, period === "year" ? "month" : "day"),
    field: url.get("field"),
  };
  const q = useSales(query);
  usePageBusy(q.isFetching && q.isPlaceholderData);
  const canAdmin = me?.user.role === "director" || me?.user.role === "admin" || me?.user.role === "owner";
  const dash = useSalesLayout(me ? `${me.company.id}:${me.user.id}` : undefined);
  const [catalog, setCatalog] = useState<{ open: boolean; focus: SalesWidget | null }>({ open: false, focus: null });
  const [search, setSearch] = useState(false);
  const [planEdit, setPlanEdit] = useState<{ kind: "monthly" | "launch"; plan: Plan | null } | null>(null);
  const tg = useSendSalesTelegram();
  const rangeBtn = useRef<HTMLButtonElement>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rFrom, setRFrom] = useState(range.from);
  const [rTo, setRTo] = useState(range.to);

  // Ctrl+K / ⌘K — bitim qidiruvi.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const setPeriod = useCallback((p: Period) => {
    if (p === "range") { setRFrom(range.from); setRTo(range.to); setRangeOpen(true); return; }
    url.set({ p: p === "month" ? null : p, from: null, to: null, gran: null });
  }, [url, range.from, range.to]);

  const data = q.data;
  const live = data && data.ready && data.connected ? data : null;
  const w = live?.widgets;
  const pipelines = live?.meta.pipelines ?? [];
  const groups = live?.meta.groups ?? [];
  const pipeName = pipelines.find((p) => String(p.id) === query.pipeline)?.name ?? t("sd.f.allPipelines");
  const loading = !w;
  const st = <K extends keyof SalesWidgets>(k: K) => ({ d: wOk(w?.[k]) as never, loading, error: !!w && !wOk(w[k]) });

  const planFact = wOk(w?.planFact);
  const launch = wOk(w?.launch);
  const ownerName = me?.user.name || me?.company.name || "";

  const widgets: Record<SalesWidget, (i: number) => React.ReactNode> = {
    kpis: (i) => <KpiWidget t={t} index={i} {...st("kpis")} onSettings={() => setCatalog({ open: true, focus: "kpis" })} />,
    planFact: (i) => <PlanFactWidget t={t} index={i} {...st("planFact")} canEdit={!!canAdmin} onEdit={() => setPlanEdit({ kind: "monthly", plan: planFact && planFact.plan ? planFact.plan : null })} />,
    debt: (i) => <DebtWidget t={t} index={i} {...st("debt")} onSettings={() => setCatalog({ open: true, focus: "debt" })} />,
    funnel: (i) => <FunnelWidget t={t} index={i} {...st("funnel")} onSettings={() => setCatalog({ open: true, focus: "funnel" })} onPickPipeline={(id) => url.set({ pipeline: String(id) })} />,
    dynamics: (i) => <DynamicsWidget t={t} index={i} {...st("dynamics")} gran={query.gran} onGran={(g) => url.set({ gran: g })} onSettings={() => setCatalog({ open: true, focus: "dynamics" })} />,
    quick: (i) => <QuickWidget t={t} index={i} {...st("quick")} onSettings={() => setCatalog({ open: true, focus: "quick" })} />,
    field: (i) => <FieldWidget t={t} index={i} {...st("field")} onField={(id) => url.set({ field: id })} onSettings={() => setCatalog({ open: true, focus: "field" })} />,
    comparison: (i) => <ComparisonWidget t={t} index={i} {...st("comparison")} onSettings={() => setCatalog({ open: true, focus: "comparison" })} />,
    lost: (i) => <LostWidget t={t} index={i} {...st("lost")} onSettings={() => setCatalog({ open: true, focus: "lost" })} />,
    sources: (i) => <SourcesWidget t={t} index={i} {...st("sources")} onSettings={() => setCatalog({ open: true, focus: "sources" })} />,
    channels: (i) => <ChannelsWidget t={t} index={i} {...st("sources")} onSettings={() => setCatalog({ open: true, focus: "channels" })} />,
    managers: (i) => <ManagersWidget t={t} index={i} {...st("managers")} onSettings={() => setCatalog({ open: true, focus: "managers" })} />,
    creatives: (i) => <CreativesWidget t={t} index={i} {...st("creatives")} onSettings={() => setCatalog({ open: true, focus: "creatives" })} />,
    ai: (i) => <AiWidget t={t} index={i} {...st("ai")} onSettings={() => setCatalog({ open: true, focus: "ai" })} />,
    launch: (i) => <LaunchWidget t={t} index={i} {...st("launch")} canEdit={!!canAdmin} onEdit={() => setPlanEdit({ kind: "launch", plan: launch && launch.plan ? launch.plan : null })} />,
    insights: (i) => <InsightsWidget t={t} index={i} {...st("insights")} onSettings={() => setCatalog({ open: true, focus: "insights" })} />,
  };

  const sendTelegram = () => tg.mutate(query, {
    onSuccess: (r) => toast(t("sd.tg.sent", { n: r.sent }), "good"),
    onError: (e) => toast(String((e as Error).message), "bad"),
  });

  return (
    <div className="flex flex-col gap-5 pb-20">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("sd.eyebrow")}{live?.meta.pull_at ? ` · ${t("cm.updated", { t: hmOf(new Date(live.meta.pull_at)) })}` : ""}</span>}
        title={t("sd.title")}
        actions={
          <>
            <button type="button" onClick={() => setSearch(true)} className="pn-press flex h-[46px] min-w-0 items-center gap-2 rounded-full border border-pn-border bg-pn-panel px-4 text-[13px] text-pn-subtle hover:bg-pn-panel-2 max-md:w-full" data-testid="SD-search-btn">
              <Icon name="search" size={16} /><span className="truncate">{t("sd.search.ph")}</span>
              <span className="pn-mono ml-auto rounded-md border border-pn-border-2 px-[6px] text-[11px] max-md:hidden">Ctrl+K</span>
            </button>
            <HeaderBell />
          </>
        }
      />

      {/* Egasi va davr */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pn-accent text-[20px] font-semibold text-pn-accent-ink">{(ownerName.trim()[0] ?? "S").toUpperCase()}</span>
        <p className="text-[16px] font-semibold">{ownerName}</p>
        <p className="text-[13px] text-pn-muted">{t("sd.sub", { from: range.from, to: range.to, p: pipeName })}</p>
      </div>

      {/* Filtrlar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="pn-section-label text-pn-muted">{t("sd.f.pipeline")}</span>
            <SelectInput value={query.pipeline ?? ""} onChange={(e) => url.set({ pipeline: e.target.value || null })} className="h-10! min-w-[200px] text-[13px]!" data-testid="SD-pipeline">
              <option value="">{t("sd.f.allPipelines")}</option>
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectInput>
          </label>
          {groups.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="pn-section-label text-pn-muted">{t("sd.f.branch")}</span>
              <SelectInput value={query.group ?? ""} onChange={(e) => url.set({ group: e.target.value || null })} className="h-10! min-w-[180px] text-[13px]!" data-testid="SD-group">
                <option value="">{t("sd.f.allBranches")}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectInput>
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span ref={rangeBtn as never}>
            <Segmented<Period>
              value={period}
              onChange={setPeriod}
              ariaLabel={t("an.period.aria")}
              testId="SD-period"
              options={PERIODS.map((p) => ({ value: p, label: p === "range" && period === "range" ? `${dayMonth(loc, range.from)} – ${dayMonth(loc, range.to)}` : t(`sd.p.${p}` as "sd.p.today"), testId: `SD-p-${p}` }))}
            />
          </span>
          <Popover open={rangeOpen} onClose={() => setRangeOpen(false)} anchorRef={rangeBtn} placement="bottom-end" width={300} label={t("sd.p.range")} className="p-4">
            <div className="flex flex-col gap-3">
              <TextInput type="date" value={rFrom} max={today} onChange={(e) => setRFrom(e.target.value)} aria-label={t("sd.plan.from")} />
              <TextInput type="date" value={rTo} max={today} onChange={(e) => setRTo(e.target.value)} aria-label={t("sd.plan.to")} />
              <Button variant="primary" disabled={!rFrom || !rTo || rFrom > rTo} onClick={() => { url.set({ p: "range", from: rFrom, to: rTo, gran: null }); setRangeOpen(false); }}>{t("common.apply")}</Button>
            </div>
          </Popover>
          <Button variant="secondary" icon="plus" onClick={() => setCatalog({ open: true, focus: null })} testId="SD-add">{t("sd.addWidget")}</Button>
          {canAdmin && <Button variant="secondary" icon="link" onClick={sendTelegram} loading={tg.isPending} disabled={!live} testId="SD-tg">Telegram</Button>}
          <Button variant="secondary" icon="download" onClick={() => live && exportSalesCsv(live, t)} disabled={!live} testId="SD-export">{t("sd.export")}</Button>
        </div>
      </div>

      {/* Holatlar */}
      {q.isError && !data ? (
        <Banner tone="bad">{t("sd.error")} <Button variant="link" onClick={() => void q.refetch()}>{t("common.retry")}</Button></Banner>
      ) : data && !data.ready ? (
        <Banner tone="warn">{t("sd.notReady")}</Banner>
      ) : data && data.ready && !data.connected ? (
        <Banner tone="neutral">{t("cm.notConnected")} {canAdmin && <Link href="/dashboard/amocrm" className="font-semibold underline">{t("cm.connect")}</Link>}</Banner>
      ) : live && !live.meta.pull_at ? (
        <Banner tone="neutral">{t("cm.firstSync")}</Banner>
      ) : live?.meta.pull_error ? (
        <Banner tone="bad">{t("cm.pullError")}: {live.meta.pull_error}</Banner>
      ) : null}

      {!data && q.isPending ? (
        <div className="grid grid-cols-1 gap-4 @min-[760px]:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={220} r={14} />)}</div>
      ) : (
        <div className="@container/sd">
          <div className="grid grid-cols-1 gap-4 transition-opacity @min-[760px]/sd:grid-cols-12" style={{ opacity: q.isPlaceholderData ? 0.6 : 1 }} aria-busy={q.isFetching || undefined}>
            {dash.layout.order.filter((id) => !dash.layout.hidden.includes(id)).map((id, i) => (
              <div key={id} className={`min-w-0 ${SPAN_CLS[spanOf(dash.layout, id)]}`}>{widgets[id](i)}</div>
            ))}
          </div>
          {live && <p className="mt-3 text-[11px] text-pn-subtle">{t("sd.footer", { n: fmtInt(live.meta.leads_total) })}</p>}
        </div>
      )}

      <WidgetCatalog open={catalog.open} focus={catalog.focus} onClose={() => setCatalog({ open: false, focus: null })} layout={dash.layout} onChange={dash.update} onReset={dash.reset} />
      <SearchPalette open={search} onClose={() => setSearch(false)} />
      {planEdit && (
        <PlanEditor
          open
          onClose={() => setPlanEdit(null)}
          kind={planEdit.kind}
          plan={planEdit.plan}
          pipelines={pipelines}
          defaultPipeline={planEdit.kind === "monthly" ? query.pipeline : null}
          defaults={planEdit.kind === "monthly" ? { from: monthStart(today), to: addDays(monthStart(addDays(monthStart(today), 32)), -1) } : { from: today, to: addDays(today, 60) }}
        />
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: "bad" | "warn" | "neutral"; children: React.ReactNode }) {
  const v = TONE_VARS[tone];
  return <div role="status" className="flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-[13px]" style={{ background: v.tint, color: v.text }}>{children}</div>;
}

export function SalesSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton h={60} r={18} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={220} r={14} />)}</div>
    </div>
  );
}
