"use client";

/* BAHOLASH MEZONLARI — Pulse Noir, 2026-10-14 (maket yo'q — Pulse uslubida).
 *
 * Eski CriteriaView mantiqi o'zgarmagan: /criteria ro'yxati, qo'shish,
 * tahrirlash, aktiv/nofaol, o'chirish (tasdiq bilan). Validatsiya: nom va
 * tavsif majburiy, jarima >= 0, og'irlik 0–100. Forma — yon panelda.
 * Qo'shimcha: "📅 Sana" — o'sha kuni AI shu mezonlar bilan qanday
 * baholagani (DayStrip). */

import { useMemo, useRef, useState, type SyntheticEvent } from "react";
import { usePT } from "../../i18n";
import { Button, Card, IconButton, Skeleton } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { TableHead, TableRow } from "../../ui/table";
import { Drawer, OverlayHeader } from "../../ui/overlays";
import { ConfirmDialog, Field, Notice, SelectInput, Switch, TextArea, TextInput } from "../../ui/form";
import { DateButton } from "../../ui/DateButton";
import { DayStrip } from "../../ui/DayStrip";
import { FilterBar } from "../../ui/FilterBar";
import { useUrlState } from "../../shell/useUrlState";
import { toast } from "../../ui/toast";
import { PageHeader } from "../../shell/PageHeader";
import { HeaderBell } from "../../shell/Notifications";
import { useSelectedDate } from "../../shell/useSelectedDate";
import { useCallDays } from "../../data/callDays";
import { useCriteria } from "../../data/criteria";
import {
  addCriterion, updateCriterion, deleteCriterion, categoryNames,
  type Criterion, type CriterionType, type NewCriterion,
} from "../../../lib/criteria";
import { fmtInt, DASH } from "../../lib/format";

const TYPES: CriterionType[] = ["Majburiy", "Jarima", "Bonus"];
const TEMPLATE = "minmax(220px,2.2fr) minmax(120px,1fr) 104px 110px 72px 92px 92px";

/* Tur yorlig'i: Majburiy — binafsha, Jarima — qizil, Bonus — yashil. */
export function TypeBadge({ type }: { type?: CriterionType | null }) {
  const t = usePT();
  if (!type) return <span className="text-[12px] text-pn-subtle">{DASH}</span>;
  const style =
    type === "Jarima"
      ? { background: "var(--pn-bad-tint)", color: "var(--pn-bad-text)" }
      : type === "Bonus"
        ? { background: "var(--pn-good-tint)", color: "var(--pn-good-text)" }
        : { background: "var(--pn-lilac)", color: "var(--pn-pastel-ink)" };
  const key = type === "Jarima" ? "cr.type.penalty" : type === "Bonus" ? "cr.type.bonus" : "cr.type.required";
  return (
    <span className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full px-[10px] text-[12px] font-semibold" style={style}>
      {t(key)}
    </span>
  );
}

export function CriteriaPage() {
  const t = usePT();
  const days = useCallDays();
  const sel = useSelectedDate(days.data?.firstDay);
  const crit = useCriteria();
  const criteria = useMemo(() => crit.data ?? [], [crit.data]);
  const [form, setForm] = useState<Criterion | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Criterion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = criteria.filter((c) => c.is_active).length;
  const url = useUrlState();
  const CR_FILTERS = ["all", "on", "off", "Majburiy", "Jarima", "Bonus"] as const;
  type CrFilter = (typeof CR_FILTERS)[number];
  const f = (CR_FILTERS as readonly string[]).includes(url.get("f") ?? "") ? (url.get("f") as CrFilter) : "all";
  const q = (url.get("q") ?? "").trim().toLowerCase();
  const match = (c: Criterion, x: CrFilter) => x === "all" || (x === "on" ? c.is_active : x === "off" ? !c.is_active : c.type === x);
  const shown = criteria
    .filter((c) => match(c, f))
    .filter((c) => !q || `${c.title} ${c.description} ${c.category ?? ""}`.toLowerCase().includes(q));

  async function submit(input: NewCriterion) {
    setBusy(true);
    setError(null);
    const editing = form !== "new" && form ? form : null;
    try {
      if (editing) await updateCriterion(editing.id, input);
      else await addCriterion(input);
      setForm(null);
      await crit.invalidate();
      toast(editing ? t("cr.toast.updated") : t("cr.toast.added"), "good");
    } catch (e) {
      const msg = (e as Error).message || (editing ? t("cr.toast.saveError") : t("cr.toast.addError"));
      setError(msg);
      toast(msg, "bad");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(cr: Criterion) {
    setError(null);
    try {
      await updateCriterion(cr.id, { is_active: !cr.is_active });
      await crit.invalidate();
      toast(cr.is_active ? t("cr.toast.off") : t("cr.toast.on"), "good");
    } catch (e) {
      const msg = (e as Error).message || t("cr.toast.toggleError");
      setError(msg);
      toast(msg, "bad");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCriterion(toDelete.id);
      await crit.invalidate();
      toast(t("cr.toast.deleted"), "good");
    } catch (e) {
      const msg = (e as Error).message || t("cr.toast.deleteError");
      setError(msg);
      toast(msg, "bad");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div className="@container/cr flex flex-col gap-5">
      <PageHeader
        eyebrow={<span className="pn-eyebrow">{t("cr.eyebrow")}</span>}
        title={t("cr.title")}
        actions={
          <>
            <DateButton date={sel.date} today={sel.today} onChange={sel.setDate} testId="CR-DATE" />
            <Button variant="secondary" icon="refresh" loading={crit.isFetching && !crit.isPending} onClick={() => void crit.refetch()} testId="CR-REFRESH">{t("cr.refresh")}</Button>
            <Button variant="primary" icon="plus" onClick={() => setForm("new")} testId="CR-NEW">{t("cr.new")}</Button>
            <HeaderBell />
          </>
        }
      />

      <DayStrip date={sel.date} isToday={sel.isToday} testId="CR-DAY" />

      {(error || crit.isError) && <Notice tone="bad">{error ?? t("cr.loadError")}</Notice>}

      <Card pad="none" className="overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-5">
          <div>
            <h2 className="pn-card-title">{t("cr.list")}</h2>
            <p className="pn-card-sub">{t("cr.listSub")}</p>
          </div>
          {crit.data && (
            <span className="text-[13px] text-pn-muted">
              {t("cr.count", { n: fmtInt(criteria.length) })} · <span className="text-pn-good-text">{t("cr.activeN", { n: fmtInt(active) })}</span>
            </span>
          )}
        </div>
        <FilterBar<CrFilter>
          className="px-6 pb-4"
          ariaLabel={t("filter.label")}
          testId="CR-F"
          value={f}
          onChange={(v) => url.set({ f: v === "all" ? null : v })}
          options={CR_FILTERS.map((x) => ({
            value: x,
            label: x === "all" ? t("filter.all") : x === "on" ? t("cr.active") : x === "off" ? t("cr.inactive") : t(x === "Jarima" ? "cr.type.penalty" : x === "Bonus" ? "cr.type.bonus" : "cr.type.required"),
            count: criteria.filter((c) => match(c, x)).length,
          }))}
          search={{ value: url.get("q") ?? "", onChange: (v) => url.set({ q: v || null }), placeholder: t("cr.f.search") }}
        />
        <div className="overflow-x-auto">
          <div role="table" aria-label={t("cr.list")} className="min-w-[900px]">
            <TableHead
              template={TEMPLATE}
              columns={[
                { key: "title", label: t("cr.col.title") },
                { key: "cat", label: t("cr.col.category") },
                { key: "type", label: t("cr.col.type") },
                { key: "pen", label: t("cr.col.penalty"), align: "right" },
                { key: "w", label: t("cr.col.weight"), align: "right" },
                { key: "st", label: t("cr.col.status") },
                { key: "act", label: "", align: "right" },
              ]}
            />
            {crit.isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-b border-pn-divider px-6 py-4"><Skeleton h={22} /></div>
              ))
            ) : criteria.length > 0 && shown.length === 0 ? (
              <div className="px-6 py-12 text-center text-[14px] text-pn-muted">{t("filter.none")}</div>
            ) : criteria.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <p className="text-[14px] text-pn-muted">{t("cr.empty")}</p>
                <Button variant="primary" icon="plus" onClick={() => setForm("new")}>{t("cr.new")}</Button>
              </div>
            ) : (
              shown.map((cr) => (
                <TableRow key={cr.id} template={TEMPLATE} onActivate={() => setForm(cr)} label={cr.title} testId={`CR-ROW-${cr.id}`} className="py-3">
                  <span className="flex min-w-0 flex-col gap-[2px]">
                    <span className="truncate text-[14px] font-semibold text-pn-text" title={cr.title}>{cr.title}</span>
                    <span className="line-clamp-2 text-[12px] leading-snug text-pn-muted" title={cr.description}>{cr.description}</span>
                  </span>
                  <span className="min-w-0">
                    {cr.category ? (
                      <span className="inline-flex max-w-full truncate rounded-full bg-pn-panel-3 px-[10px] py-1 text-[12px] text-pn-text-2" title={cr.category}>{cr.category}</span>
                    ) : (
                      <span className="text-[12px] text-pn-subtle">{DASH}</span>
                    )}
                  </span>
                  <span><TypeBadge type={cr.type} /></span>
                  <span className="pn-mono text-right text-[13px]" style={{ color: cr.penalty_amount > 0 ? "var(--pn-bad-text)" : "var(--pn-subtle)" }}>
                    {cr.penalty_amount > 0 ? fmtInt(cr.penalty_amount) : DASH}
                  </span>
                  <span className="pn-mono text-right text-[13px] text-pn-text-2">{cr.weight != null ? `${cr.weight}%` : DASH}</span>
                  <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch checked={cr.is_active} onChange={() => void toggle(cr)} label={cr.is_active ? t("cr.deactivate") : t("cr.activate")} testId={`CR-TOGGLE-${cr.id}`} />
                  </span>
                  <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <IconButton icon="pencil" label={t("cr.edit")} size={38} tone="ghost" onClick={() => setForm(cr)} />
                    <IconButton icon="trash" label={t("cr.delete")} size={38} tone="ghost" className="hover:text-pn-bad!" onClick={() => setToDelete(cr)} testId={`CR-DEL-${cr.id}`} />
                  </span>
                </TableRow>
              ))
            )}
          </div>
        </div>
      </Card>

      {form && (
        <CriterionForm
          key={form === "new" ? "new" : form.id}
          initial={form === "new" ? null : form}
          categories={categoryNames(criteria)}
          busy={busy}
          onSubmit={(input) => void submit(input)}
          onClose={() => setForm(null)}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={t("cr.deleteTitle")}
        message={t("cr.deleteConfirm", { title: toDelete?.title ?? "" })}
        confirmLabel={t("sm.deleteYes")}
        cancelLabel={t("sm.no")}
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
        testId="CR-CONFIRM"
      />
    </div>
  );
}

/* ---------- Qo'shish / tahrirlash (yon panel) ---------- */
function CriterionForm({
  initial,
  categories,
  busy,
  onSubmit,
  onClose,
}: {
  initial: Criterion | null;
  categories: string[];
  busy: boolean;
  onSubmit: (input: NewCriterion) => void;
  onClose: () => void;
}) {
  const t = usePT();
  const isEdit = !!initial;
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [type, setType] = useState<CriterionType>(initial?.type ?? "Majburiy");
  const [weight, setWeight] = useState(String(initial?.weight ?? 10));
  const [penalty, setPenalty] = useState(String(initial?.penalty_amount ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [err, setErr] = useState<{ field: "title" | "description" | "penalty" | "weight"; msg: string } | null>(null);

  function submit(e: SyntheticEvent) {
    e.preventDefault();
    const p = Number(penalty);
    const w = Number(weight);
    if (!title.trim()) return setErr({ field: "title", msg: t("cr.err.title") });
    if (!description.trim()) return setErr({ field: "description", msg: t("cr.err.description") });
    if (!Number.isFinite(p) || p < 0) return setErr({ field: "penalty", msg: t("cr.err.penalty") });
    if (!Number.isFinite(w) || w < 0 || w > 100) return setErr({ field: "weight", msg: t("cr.err.weight") });
    setErr(null);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      penalty_amount: p,
      is_active: isActive,
      category: category.trim() || null,
      weight: w,
      type,
    });
  }
  const errOf = (f: NonNullable<typeof err>["field"]) => (err?.field === f ? err.msg : undefined);

  return (
    <Drawer open onClose={onClose} width={560} label={isEdit ? t("cr.editTitle") : t("cr.newTitle")} testId="CR-FORM" initialFocusRef={titleRef}>
      <div className="border-b border-pn-border px-6 py-5">
        <OverlayHeader title={isEdit ? t("cr.editTitle") : t("cr.newTitle")} onClose={onClose} />
        <p className="mt-1 text-[13px] leading-relaxed text-pn-muted">{t("cr.formSub")}</p>
      </div>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
          <Field label={t("cr.f.title")} error={errOf("title")}>
            {(id) => (
              <TextInput id={id} ref={titleRef} value={title} error={!!errOf("title")} onChange={(e) => setTitle(e.target.value)} placeholder={t("cr.f.titlePh")} data-testid="CR-F-title" />
            )}
          </Field>
          <Field label={t("cr.f.description")} hint={t("cr.f.descriptionHint")} error={errOf("description")}>
            {(id) => (
              <TextArea id={id} rows={4} value={description} error={!!errOf("description")} onChange={(e) => setDescription(e.target.value)} placeholder={t("cr.f.descriptionPh")} data-testid="CR-F-desc" />
            )}
          </Field>
          <Field label={t("cr.f.category")} icon="layers">
            {(id) => (
              <>
                <TextInput id={id} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("cr.f.categoryPh")} list="pn-criterion-categories" />
                <datalist id="pn-criterion-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </>
            )}
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field label={t("cr.f.type")}>
              {(id) => (
                <SelectInput id={id} value={type} onChange={(e) => setType(e.target.value as CriterionType)}>
                  {TYPES.map((x) => (
                    <option key={x} value={x}>{t(x === "Jarima" ? "cr.type.penalty" : x === "Bonus" ? "cr.type.bonus" : "cr.type.required")}</option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label={t("cr.f.weight")} error={errOf("weight")}>
              {(id) => <TextInput id={id} type="number" min={0} max={100} value={weight} error={!!errOf("weight")} onChange={(e) => setWeight(e.target.value)} mono />}
            </Field>
            <Field label={t("cr.f.penalty")} error={errOf("penalty")}>
              {(id) => <TextInput id={id} type="number" min={0} value={penalty} error={!!errOf("penalty")} onChange={(e) => setPenalty(e.target.value)} mono />}
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-pn-border-2 bg-pn-field px-4 py-3">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-pn-good-tint text-pn-good-text"><Icon name="sparkle" size={16} /></span>
              <span>
                <span className="block text-[14px] font-semibold text-pn-text">{t("cr.f.active")}</span>
                <span className="block text-[12px] text-pn-muted">{t("cr.f.activeHint")}</span>
              </span>
            </span>
            <Switch checked={isActive} onChange={setIsActive} label={t("cr.f.active")} />
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-pn-border px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" type="submit" className="flex-1" loading={busy} disabled={busy} icon={busy ? undefined : "check"} testId="CR-SAVE">
            {isEdit ? t("sm.save") : t("cr.add")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
