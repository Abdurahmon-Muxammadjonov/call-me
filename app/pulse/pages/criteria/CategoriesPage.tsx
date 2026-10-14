"use client";

/* MEZON KATEGORIYALARI — Pulse Noir, 2026-10-14 (maket yo'q — Pulse uslubida).
 *
 * Eski CategoriesView mantiqi o'zgarmagan: kategoriyalar mezonlardan hosil
 * bo'ladi (deriveCategories) — soni, aktivlari, umumiy bahodagi ulushi;
 * karta bosilsa o'sha kategoriya mezonlari ochiladi. "Baholash mezonlari"
 * bilan BITTA kesh (useCriteria). Qo'shimcha: umumiy ulush chizig'i va
 * "📅 Sana" — o'sha kunning xulosasi (DayStrip). */

import { useMemo, useState } from "react";
import { usePT } from "../../i18n";
import { Button, Card, Skeleton, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { Modal, OverlayHeader } from "../../ui/overlays";
import { Notice } from "../../ui/form";
import { DateButton } from "../../ui/DateButton";
import { DayStrip } from "../../ui/DayStrip";
import { FilterBar } from "../../ui/FilterBar";
import { useUrlState } from "../../shell/useUrlState";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useCriteria } from "../../data/criteria";
import { deriveCategories } from "../../../lib/criteria";
import { fmtInt } from "../../lib/format";
import { TypeBadge } from "./CriteriaPage";

const UNCATEGORIZED = "Boshqa mezonlar"; // lib/criteria bilan bir xil
const PALETTE = ["var(--pn-lilac)", "var(--pn-sky)", "var(--pn-peach)", "var(--pn-pink)", "var(--pn-periwinkle)", "var(--pn-slate-2)"];

export function CategoriesPage() {
  const t = usePT();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const crit = useCriteria();
  const criteria = useMemo(() => crit.data ?? [], [crit.data]);
  const cats = useMemo(() => deriveCategories(criteria), [criteria]);
  const [open, setOpen] = useState<string | null>(null);
  const url = useUrlState();
  const CAT_FILTERS = ["all", "active", "inactive"] as const;
  type CatFilter = (typeof CAT_FILTERS)[number];
  const f = (CAT_FILTERS as readonly string[]).includes(url.get("f") ?? "") ? (url.get("f") as CatFilter) : "all";
  const q = (url.get("q") ?? "").trim().toLowerCase();
  const catMatch = (c: (typeof cats)[number], x: CatFilter) => x === "all" || (x === "active" ? c.activeCount > 0 : c.activeCount === 0);
  const shownCats = cats.filter((c) => catMatch(c, f)).filter((c) => !q || c.name.toLowerCase().includes(q));
  const openIdx = cats.findIndex((c) => c.name === open);
  const openList = open ? criteria.filter((c) => ((c.category && c.category.trim()) || UNCATEGORIZED) === open) : [];

  return (
    <div className="@container/cat flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("cat.eyebrow")}</span>}
        title={t("cat.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="CAT-DATE" />
            <Button variant="secondary" icon="refresh" loading={crit.isFetching && !crit.isPending} onClick={() => void crit.refetch()} testId="CAT-REFRESH">{t("cr.refresh")}</Button>
            <Button variant="outline" icon="checkSquare" href="/dashboard/criteria">{t("cat.toCriteria")}</Button>
            <HeaderBell />
          </>
        }
      />

      <DayStrip date={sel.date} isToday={sel.isToday} testId="CAT-DAY" />

      {crit.isError && <Notice tone="bad">{t("cr.loadError")}</Notice>}

      {cats.length > 0 && (
        <Card data-testid="CAT-SHARE">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="pn-card-title">{t("cat.share")}</h2>
            <span className="text-[13px] text-pn-muted">{t("cat.summary", { c: fmtInt(cats.length), n: fmtInt(criteria.length) })}</span>
          </div>
          <div className="mt-4 flex h-3 w-full gap-[3px] overflow-hidden rounded-full">
            {cats.map((c, i) => (
              <span key={c.name} title={`${c.name} — ${c.weight}%`} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: Math.max(c.weight, 0.5), background: PALETTE[i % PALETTE.length] }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {cats.map((c, i) => (
              <span key={c.name} className="flex items-center gap-2 text-[12px] text-pn-text-2">
                <span className="h-[10px] w-[10px] rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                {c.name} <span className="pn-mono text-pn-muted">{c.weight}%</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {cats.length > 0 && (
        <FilterBar<CatFilter>
          ariaLabel={t("filter.label")}
          testId="CAT-F"
          value={f}
          onChange={(v) => url.set({ f: v === "all" ? null : v })}
          options={CAT_FILTERS.map((x) => ({
            value: x,
            label: x === "all" ? t("filter.all") : x === "active" ? t("cr.active") : t("cr.inactive"),
            count: cats.filter((c) => catMatch(c, x)).length,
          }))}
          search={{ value: url.get("q") ?? "", onChange: (v) => url.set({ q: v || null }), placeholder: t("cat.search") }}
        />
      )}

      {crit.isPending ? (
        <div className="grid grid-cols-1 gap-4 @min-[640px]/cat:grid-cols-2 @min-[1100px]/cat:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={190} r={26} />)}
        </div>
      ) : cats.length === 0 ? (
        !crit.isError && (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-pn-panel-2 text-pn-muted"><Icon name="layers" /></span>
            <p className="max-w-md text-[14px] text-pn-muted">{t("cat.empty")}</p>
            <Button variant="primary" icon="plus" href="/dashboard/criteria">{t("cr.new")}</Button>
          </Card>
        )
      ) : shownCats.length === 0 ? (
        <Card className="py-10 text-center text-[14px] text-pn-muted">{t("filter.none")}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 @min-[640px]/cat:grid-cols-2 @min-[1100px]/cat:grid-cols-3">
          {shownCats.map((cat) => {
            const i = cats.indexOf(cat);
            const color = PALETTE[i % PALETTE.length];
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setOpen(cat.name)}
                data-testid={`CAT-CARD-${i}`}
                className="pn-press group flex min-w-0 flex-col rounded-[26px] border border-pn-border bg-pn-panel px-6 py-[22px] text-left hover:border-pn-border-3"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-pn-pastel-ink" style={{ background: color }}>
                    <Icon name="layers" size={18} />
                  </span>
                  <span className="flex flex-col items-end gap-[6px]">
                    <StatusPill tone="neutral" plain>{t("cat.criteriaN", { n: fmtInt(cat.count) })}</StatusPill>
                    <StatusPill tone={cat.activeCount ? "good" : "neutral"} plain>{t("cat.activeN", { n: fmtInt(cat.activeCount) })}</StatusPill>
                  </span>
                </span>
                <span className="pn-display mt-4 block truncate text-[20px] tracking-[-0.02em] text-pn-text">{cat.name}</span>
                <span className="mt-4 flex items-center justify-between text-[13px]">
                  <span className="text-pn-muted">{t("cat.weight")}</span>
                  <span className="pn-mono font-semibold text-pn-text">{cat.weight}%</span>
                </span>
                <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-pn-panel-3">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, cat.weight)}%`, background: color }} />
                </span>
                <span className="mt-4 flex items-center gap-1 text-[12px] font-medium text-pn-muted group-hover:text-pn-text">
                  {t("cat.view")} <Icon name="chevronRight" size={13} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} label={open ?? ""} testId="CAT-MODAL">
        <OverlayHeader
          title={
            <span className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PALETTE[Math.max(0, openIdx) % PALETTE.length] }} />
              <span className="truncate">{open}</span>
            </span>
          }
          onClose={() => setOpen(null)}
        />
        <p className="mt-1 text-[13px] text-pn-muted">
          {t("cat.criteriaN", { n: fmtInt(openList.length) })} · {t("cat.activeN", { n: fmtInt(openList.filter((c) => c.is_active).length) })}
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {openList.length === 0 ? (
            <li className="text-[14px] text-pn-muted">{t("cat.none")}</li>
          ) : (
            openList.map((c) => (
              <li key={c.id} className="rounded-2xl border border-pn-border-2 bg-pn-panel-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[14px] font-semibold text-pn-text">{c.title}</p>
                  <span className="flex shrink-0 items-center gap-2">
                    <TypeBadge type={c.type} />
                    <StatusPill tone={c.is_active ? "good" : "neutral"} plain>{c.is_active ? t("cr.active") : t("cr.inactive")}</StatusPill>
                  </span>
                </div>
                {c.description && <p className="mt-[6px] text-[13px] leading-relaxed text-pn-muted">{c.description}</p>}
                <p className="mt-2 flex gap-4 text-[12px] text-pn-subtle">
                  <span>{t("cr.col.weight")}: <b className="pn-mono text-pn-text-2">{c.weight ?? 0}</b></span>
                  {(c.penalty_amount ?? 0) > 0 && <span>{t("cr.col.penalty")}: <b className="pn-mono text-pn-bad-text">{fmtInt(c.penalty_amount)}</b></span>}
                </p>
              </li>
            ))
          )}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button variant="outline" compact iconRight="chevronRight" href="/dashboard/criteria">{t("cat.toCriteria")}</Button>
        </div>
      </Modal>
    </div>
  );
}
