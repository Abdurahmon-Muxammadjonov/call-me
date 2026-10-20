"use client";

/* SOTUV DASHBOARDI SOZLAMASI (2026-10-20): pul maydonlari (shartnoma
 * summasi, qarz), zapusk "potensial" bosqichlari va amoCRM menejeri ↔ UTel
 * operatori (qo'ng'iroq vaqti uchun). Bo'sh qoldirilsa standart:
 * «Kelishuv Summasi», «Qarzdorlik», kech bosqichlar nomi bo'yicha, menejer
 * operatorga ismi bo'yicha. Faqat direktor/admin saqlaydi. */

import { useEffect, useState } from "react";
import { usePT } from "../../i18n";
import { Button, Card } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { CheckBox, Field, Notice, SelectInput, TextInput } from "../../ui/form";
import { toast } from "../../ui/toast";
import { useSaveSalesSettings, useSalesSettings } from "../../data/sales";

export function SalesSettingsCard() {
  const t = usePT();
  const q = useSalesSettings();
  const save = useSaveSalesSettings();
  const [deal, setDeal] = useState("");
  const [debt, setDebt] = useState("");
  const [potential, setPotential] = useState<number[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [pipe, setPipe] = useState<string>("");
  const d = q.data;
  useEffect(() => {
    const s = d?.settings;
    if (!s) return;
    /* eslint-disable react-hooks/set-state-in-effect -- serverdan kelgan sozlama formaga */
    setDeal(s.deal_field_id ? String(s.deal_field_id) : "");
    setDebt(s.debt_field_id ? String(s.debt_field_id) : "");
    setPotential(s.potential_status_ids ?? []);
    setMap(s.user_map ?? {});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [d?.settings]);
  if (!d || !d.ready || !d.connected) return null;
  const pipelines = d.pipelines ?? [];
  const cur = pipelines.find((p) => String(p.id) === pipe) ?? pipelines[0];
  const submit = () => save.mutate(
    {
      deal_field_id: deal ? Number(deal) : undefined,
      debt_field_id: debt ? Number(debt) : undefined,
      potential_status_ids: potential,
      user_map: Object.fromEntries(Object.entries(map).filter(([, v]) => v.trim())),
    },
    { onSuccess: (r) => toast(r.resync ? t("ss.savedResync") : t("ss.saved"), "good"), onError: (e) => toast(String((e as Error).message), "bad") }
  );
  return (
    <Card pad="lg" data-testid="CRM-SALES-SETTINGS">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pn-lilac text-pn-pastel-ink"><Icon name="trendUp" size={20} /></span>
        <div className="min-w-0">
          <h2 className="pn-card-title">{t("ss.title")}</h2>
          <p className="pn-card-sub leading-relaxed">{t("ss.sub")}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t("ss.deal")} hint={t("ss.dealHint")}>{(id) => (
          <SelectInput id={id} value={deal} onChange={(e) => setDeal(e.target.value)}>
            <option value="">{t("ss.default")} — Kelishuv Summasi</option>
            {(d.fields ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectInput>
        )}</Field>
        <Field label={t("ss.debt")} hint={t("ss.debtHint")}>{(id) => (
          <SelectInput id={id} value={debt} onChange={(e) => setDebt(e.target.value)}>
            <option value="">{t("ss.default")} — Qarzdorlik</option>
            {(d.fields ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectInput>
        )}</Field>
      </div>
      <Notice tone="neutral" className="mt-4">{t("ss.paidNote")}</Notice>

      {d.webhook_url && (
        <div className="mt-6">
          <p className="pn-section-label mb-2 text-pn-muted">{t("ss.webhook")}</p>
          <p className="mb-3 text-[13px] text-pn-muted">{t("ss.webhookHint")}</p>
          <div className="flex items-center gap-2">
            <TextInput readOnly value={d.webhook_url} className="pn-mono text-[12px]!" onFocus={(e) => e.currentTarget.select()} aria-label={t("ss.webhook")} />
            <Button variant="secondary" icon="link" onClick={() => { void navigator.clipboard?.writeText(d.webhook_url!).then(() => toast(t("ss.copied"), "good")); }} testId="CRM-WEBHOOK-copy">{t("ss.copy")}</Button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="pn-section-label mb-2 text-pn-muted">{t("ss.potential")}</p>
        <p className="mb-3 text-[13px] text-pn-muted">{t("ss.potentialHint")}</p>
        <SelectInput value={cur ? String(cur.id) : ""} onChange={(e) => setPipe(e.target.value)} className="mb-3 max-w-[360px]">
          {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectInput>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(cur?.statuses ?? []).filter((s) => s.kind === "none").map((s) => (
            <CheckBox key={s.id} label={s.name} checked={potential.includes(s.id)}
              onChange={(v) => setPotential((p) => (v ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="pn-section-label mb-2 text-pn-muted">{t("ss.map")}</p>
        <p className="mb-3 text-[13px] text-pn-muted">{t("ss.mapHint")}</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {(d.users ?? []).map((u) => (
            <label key={u.id} className="flex items-center gap-3 rounded-xl bg-pn-panel-2 px-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              <TextInput value={map[String(u.id)] ?? ""} onChange={(e) => setMap((m) => ({ ...m, [String(u.id)]: e.target.value.replace(/[^\w-]/g, "").slice(0, 20) }))}
                placeholder={t("ss.ext")} className="h-9! w-24 text-[13px]!" aria-label={`${u.name} — ${t("ss.ext")}`} />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={submit} loading={save.isPending} testId="CRM-SALES-SAVE">{t("sd.save")}</Button>
      </div>
    </Card>
  );
}
