"use client";

/* Sotuv dashboardi oynalari (2026-10-20): reja muharriri, Ctrl+K bitim
 * qidiruvi, AI yordamchi va vidjetlarni sozlash. */

import { useEffect, useRef, useState } from "react";
import { usePT } from "../../i18n";
import { Drawer, Modal, OverlayHeader } from "../../ui/overlays";
import { Button, Spinner, StatusPill } from "../../ui/primitives";
import { Field, SelectInput, Switch, TextArea, TextInput } from "../../ui/form";
import { Icon } from "../../ui/Icon";
import { toast } from "../../ui/toast";
import { fmtInt } from "../../lib/format";
import { useAskSales, useDeletePlan, useLeadSearch, useSavePlan, type Plan, type SalesQuery } from "../../data/sales";
import { SALES_WIDGETS, cycleSpan, moveWidget, spanOf, toggleWidget, type SalesLayout, type SalesWidget } from "../../data/salesLayout";
import { sumText } from "./kit";

/* ------------------------------------------------------- Reja muharriri */
export function PlanEditor({ open, onClose, kind, plan, pipelines, defaultPipeline, defaults }: {
  open: boolean; onClose: () => void; kind: "monthly" | "launch"; plan: Plan | null;
  pipelines: Array<{ id: number; name: string }>; defaultPipeline: string | null; defaults: { from: string; to: string };
}) {
  const t = usePT();
  const save = useSavePlan();
  const del = useDeletePlan();
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [amount, setAmount] = useState("");
  const [pipeline, setPipeline] = useState<string>("");
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- oyna ochilganda forma to'ldiriladi */
    setTitle(plan?.title ?? "");
    setFrom(plan?.period_from ?? defaults.from);
    setTo(plan?.period_to ?? defaults.to);
    setAmount(plan ? String(plan.amount) : "");
    setPipeline(plan ? (plan.pipeline_id != null ? String(plan.pipeline_id) : "") : defaultPipeline ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, plan, defaults.from, defaults.to, defaultPipeline]);
  const num = Number(amount.replace(/\s/g, ""));
  const valid = from && to && from <= to && Number.isFinite(num) && num > 0;
  const submit = () => {
    if (!valid) return;
    save.mutate(
      { id: plan?.id, kind, title: title.trim() || null, period_from: from, period_to: to, amount: num, pipeline_id: pipeline ? Number(pipeline) : null },
      { onSuccess: () => { toast(t("sd.plan.saved"), "good"); onClose(); }, onError: (e) => toast(String((e as Error).message), "bad") }
    );
  };
  return (
    <Modal open={open} onClose={onClose} label={t(kind === "launch" ? "sd.w.launch" : "sd.w.planFact")} testId="SD-plan-modal">
      <OverlayHeader title={t(kind === "launch" ? "sd.w.launch" : "sd.w.planFact")} onClose={onClose} />
      <div className="mt-5 flex flex-col gap-4">
        {kind === "launch" && <Field label={t("sd.plan.title")}>{(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("sd.plan.titlePh")} />}</Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("sd.plan.from")}>{(id) => <TextInput id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
          <Field label={t("sd.plan.to")}>{(id) => <TextInput id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
        </div>
        <Field label={t("sd.plan.amount")} hint={num > 0 ? sumText(t, num) : undefined}>{(id) => <TextInput id={id} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="5 000 000 000" />}</Field>
        <Field label={t("sd.f.pipeline")}>{(id) => (
          <SelectInput id={id} value={pipeline} onChange={(e) => setPipeline(e.target.value)}>
            <option value="">{t("sd.f.allBusiness")}</option>
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectInput>
        )}</Field>
        <div className="flex flex-wrap justify-between gap-3">
          {plan ? (
            <Button variant="link" icon="trash" onClick={() => del.mutate(plan.id, { onSuccess: () => { toast(t("sd.plan.deleted")); onClose(); } })} loading={del.isPending}>{t("sd.plan.delete")}</Button>
          ) : <span />}
          <Button variant="primary" onClick={submit} disabled={!valid} loading={save.isPending} testId="SD-plan-save">{t("sd.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- Ctrl+K qidiruv */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = usePT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [deb, setDeb] = useState("");
  useEffect(() => {
    const h = setTimeout(() => setDeb(text), 250);
    return () => clearTimeout(h);
  }, [text]);
  const q = useLeadSearch(open ? deb : "");
  return (
    <Modal open={open} onClose={onClose} label={t("sd.search.ph")} testId="SD-search" initialFocusRef={inputRef}>
      <div className="flex items-center gap-3">
        <Icon name="search" size={18} className="text-pn-muted" />
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("sd.search.ph")} className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-pn-subtle" />
        {q.isFetching && <Spinner />}
      </div>
      <div className="mt-3 max-h-[60vh] overflow-y-auto border-t border-pn-border-2 pt-2">
        {deb.trim().length < 2 ? <p className="py-6 text-center text-[13px] text-pn-subtle">{t("sd.search.hint")}</p>
          : q.data && q.data.length === 0 ? <p className="py-6 text-center text-[13px] text-pn-subtle">{t("sd.search.none")}</p>
          : (
            <ul className="flex flex-col">
              {(q.data ?? []).map((l) => {
                const body = (
                  <>
                    <span className="flex items-center gap-2 text-[14px]">
                      <span className="min-w-0 flex-1 truncate font-semibold">{l.name || `#${l.id}`}</span>
                      <span className="pn-mono text-[12px] text-pn-subtle">#{l.id}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-[12px] text-pn-muted">
                      <StatusPill tone={l.kind === "full" ? "good" : l.kind === "lost" ? "bad" : l.kind === "none" ? "neutral" : "warn"} plain>{l.stage}</StatusPill>
                      <span>{l.pipeline}</span><span>· {l.manager}</span>
                      {l.amount > 0 && <span className="pn-mono">· {fmtInt(l.amount)}</span>}
                      {l.debt > 0 && <span className="pn-mono text-pn-bad-text">· {t("sd.search.debt")} {fmtInt(l.debt)}</span>}
                    </span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {l.url
                      ? <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 rounded-xl px-3 py-2 hover:bg-pn-panel-2">{body}</a>
                      : <div className="flex flex-col gap-1 rounded-xl px-3 py-2">{body}</div>}
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- AI yordamchi */
export function AskDrawer({ open, onClose, query }: { open: boolean; onClose: () => void; query: SalesQuery }) {
  const t = usePT();
  const ask = useAskSales();
  const [text, setText] = useState("");
  const [log, setLog] = useState<Array<{ q: string; a: string | null; err?: boolean }>>([]);
  const send = (question: string) => {
    const q = question.trim();
    if (!q || ask.isPending) return;
    setText("");
    setLog((l) => [...l, { q, a: null }]);
    ask.mutate({ question: q, q: query }, {
      onSuccess: (r) => setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, a: r.answer } : x))),
      onError: (e) => setLog((l) => l.map((x, i) => (i === l.length - 1 ? { ...x, a: String((e as Error).message), err: true } : x))),
    });
  };
  const examples = [t("sd.ai.ex1"), t("sd.ai.ex2"), t("sd.ai.ex3")];
  return (
    <Drawer open={open} onClose={onClose} side="left" width={420} label={t("sd.assistant")} testId="SD-ask">
      <div className="border-b border-pn-border-2 px-5 py-4"><OverlayHeader title={t("sd.assistant")} onClose={onClose} /></div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {log.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-pn-muted">{t("sd.ai.intro")}</p>
            {examples.map((e) => <button key={e} type="button" onClick={() => send(e)} className="pn-press rounded-xl border border-pn-border-2 px-3 py-2 text-left text-[13px] hover:bg-pn-panel-2">{e}</button>)}
          </div>
        )}
        {log.map((m, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="self-end rounded-2xl rounded-br-md bg-pn-accent px-3 py-2 text-[13px] text-pn-accent-ink">{m.q}</p>
            {m.a == null ? <span className="flex items-center gap-2 text-[13px] text-pn-muted"><Spinner /> {t("sd.ai.thinking")}</span>
              : <p className={`whitespace-pre-wrap rounded-2xl rounded-bl-md bg-pn-panel-2 px-3 py-2 text-[13px] ${m.err ? "text-pn-bad-text" : ""}`}>{m.a}</p>}
          </div>
        ))}
      </div>
      <form className="flex items-end gap-2 border-t border-pn-border-2 px-5 py-4" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <TextArea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t("sd.ai.ph")} className="min-h-0 resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        <Button variant="primary" type="submit" disabled={!text.trim()} loading={ask.isPending} testId="SD-ask-send">{t("sd.ai.send")}</Button>
      </form>
    </Drawer>
  );
}

/* ------------------------------------------------------ Vidjetlar sozlamasi */
export function WidgetCatalog({ open, onClose, layout, onChange, onReset, focus }: {
  open: boolean; onClose: () => void; layout: SalesLayout; onChange: (l: SalesLayout) => void; onReset: () => void; focus: SalesWidget | null;
}) {
  const t = usePT();
  const spanLabel = (s: number) => (s === 12 ? t("sd.span.full") : s === 8 ? "2/3" : s === 6 ? "1/2" : "1/3");
  return (
    <Drawer open={open} onClose={onClose} width={420} label={t("sd.catalog")} testId="SD-catalog">
      <div className="border-b border-pn-border-2 px-5 py-4">
        <OverlayHeader title={t("sd.catalog")} onClose={onClose} />
        <p className="mt-1 text-[13px] text-pn-muted">{t("sd.catalogSub")}</p>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {layout.order.map((id, i) => {
          const visible = !layout.hidden.includes(id);
          return (
            <li key={id} className={`flex items-center gap-2 rounded-xl px-2 py-2 ${focus === id ? "bg-pn-panel-2" : ""}`}>
              <Switch checked={visible} onChange={() => onChange(toggleWidget(layout, id))} label={t(`sd.w.${id}` as "sd.w.kpis")} testId={`SD-T-${id}`} />
              <span className={`min-w-0 flex-1 truncate text-[14px] ${visible ? "" : "text-pn-subtle line-through"}`}>{t(`sd.w.${id}` as "sd.w.kpis")}</span>
              <button type="button" onClick={() => onChange(cycleSpan(layout, id))} className="pn-mono rounded-lg border border-pn-border-2 px-2 py-1 text-[11px] text-pn-muted hover:text-pn-text" title={t("sd.span")}>{spanLabel(spanOf(layout, id))}</button>
              <button type="button" disabled={i === 0} onClick={() => onChange(moveWidget(layout, id, -1))} className="grid h-7 w-7 place-items-center rounded-lg text-pn-muted hover:bg-pn-panel-3 disabled:opacity-30" aria-label={t("dash.up")}><Icon name="chevronUp" size={14} /></button>
              <button type="button" disabled={i === SALES_WIDGETS.length - 1} onClick={() => onChange(moveWidget(layout, id, 1))} className="grid h-7 w-7 place-items-center rounded-lg text-pn-muted hover:bg-pn-panel-3 disabled:opacity-30" aria-label={t("dash.down")}><Icon name="chevronDown" size={14} /></button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-pn-border-2 px-5 py-4"><Button variant="secondary" onClick={onReset} testId="SD-reset">{t("dash.reset")}</Button></div>
    </Drawer>
  );
}
