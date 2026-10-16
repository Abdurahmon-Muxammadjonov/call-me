"use client";

/* CRM avtomatik yozish (2026-10-16, foydalanuvchi talabi: "CRM'ni ulash va
 * obrabotkasini avtomatik qilish" — amoCRM va 5CRM). Har tahlil qilingan
 * qo'ng'iroq natijasi (ball, xulosa, lid sifati va sababi) o'zi CRM'ga ketadi:
 * amoCRM — mijoz raqami bo'yicha bitimga izoh; Webhook — 5CRM yoki istalgan
 * tizimga JSON (HMAC imzo). Backend: /company/integrations (lib/crmPush.ts). */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePT } from "../../i18n";
import { Button, Card, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { Field, Notice, Switch, TextInput } from "../../ui/form";
import { toast } from "../../ui/toast";
import { useMe } from "../../data/me";
import { apiFetch } from "../../data/api";

type Provider = "amocrm" | "webhook";
interface Item {
  provider: Provider;
  enabled: boolean;
  subdomain: string | null;
  url: string | null;
  has_token: boolean;
  has_secret: boolean;
  last_push_at: string | null;
  last_error: string | null;
  pushed_count: number;
}

export function CrmIntegrationsCard() {
  const t = usePT();
  const { data: me } = useMe();
  const key = ["v1", me?.company.id ?? "_", "/company/integrations"] as const;
  const q = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => apiFetch<{ ready: boolean; items: Item[] }>("/company/integrations", { signal }),
    enabled: !!me,
  });
  const item = (p: Provider) => q.data?.items.find((i) => i.provider === p) ?? null;
  return (
    <Card pad="lg" data-testid="CRM-INTEGRATIONS">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pn-lilac text-pn-pastel-ink"><Icon name="plug" size={20} /></span>
        <div>
          <h2 className="pn-card-title">{t("crmi.title")}</h2>
          <p className="pn-card-sub leading-relaxed">{t("crmi.sub")}</p>
        </div>
      </div>
      {q.data && !q.data.ready && <Notice tone="warn" className="mt-5">{t("crmi.notReady")}</Notice>}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProviderForm provider="amocrm" item={item("amocrm")} disabled={q.data?.ready === false} queryKey={key} />
        <ProviderForm provider="webhook" item={item("webhook")} disabled={q.data?.ready === false} queryKey={key} />
      </div>
    </Card>
  );
}

function ProviderForm({ provider, item, disabled, queryKey }: { provider: Provider; item: Item | null; disabled: boolean; queryKey: readonly unknown[] }) {
  const t = usePT();
  const qc = useQueryClient();
  const amo = provider === "amocrm";
  const [main, setMain] = useState(amo ? item?.subdomain ?? "" : item?.url ?? "");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey });

  async function save() {
    setBusy("save");
    try {
      await apiFetch(`/company/integrations/${provider}`, { method: "PUT", body: amo ? { subdomain: main, token: secret || undefined } : { url: main, secret: secret || undefined } });
      setSecret("");
      toast(t("crmi.saved"), "good");
      refresh();
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    } finally {
      setBusy(null);
    }
  }
  async function test() {
    setBusy("test");
    try {
      const r = await apiFetch<{ result: string }>(`/company/integrations/${provider}/test`, { method: "POST", body: {} });
      toast(t("crmi.testOk", { r: r.result }), "good");
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    } finally {
      setBusy(null);
      refresh();
    }
  }
  async function toggle(v: boolean) {
    try {
      await apiFetch(`/company/integrations/${provider}`, { method: "PATCH", body: { enabled: v } });
      refresh();
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-pn-border-2 bg-pn-panel-2 p-5" data-testid={`CRMI-${provider}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">{amo ? "amoCRM" : t("crmi.webhook")}</span>
        {item ? (
          <span className="flex items-center gap-2">
            <StatusPill tone={item.enabled ? (item.last_error ? "warn" : "good") : "neutral"} plain>
              {item.enabled ? (item.last_error ? t("crmi.error") : t("crmi.on")) : t("crmi.off")}
            </StatusPill>
            <Switch checked={item.enabled} onChange={(v) => void toggle(v)} label={t("crmi.enabled")} />
          </span>
        ) : (
          <StatusPill tone="neutral" plain>{t("crmi.notConnected")}</StatusPill>
        )}
      </div>
      <p className="text-[12px] leading-relaxed text-pn-muted">{amo ? t("crmi.amoHow") : t("crmi.webhookHow")}</p>
      <Field label={amo ? t("crmi.subdomain") : t("crmi.url")}>
        {(id) => <TextInput id={id} value={main} onChange={(e) => setMain(e.target.value)} placeholder={amo ? "kompaniya.amocrm.ru" : "https://api.5crm.uz/webhooks/…"} mono disabled={disabled} />}
      </Field>
      <Field label={amo ? t("crmi.token") : t("crmi.secret")} hint={(amo ? item?.has_token : item?.has_secret) ? t("crmi.keepSecret") : undefined}>
        {(id) => <TextInput id={id} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="••••••••" autoComplete="off" mono disabled={disabled} />}
      </Field>
      {item?.last_error && <Notice tone="bad">{item.last_error}</Notice>}
      {item && (
        <p className="text-[12px] text-pn-subtle">
          {t("crmi.stats", { n: item.pushed_count })}
          {item.last_push_at ? ` · ${t("crmi.lastPush", { d: item.last_push_at.slice(0, 16).replace("T", " ") })}` : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="check" loading={busy === "save"} disabled={disabled || !!busy || !main.trim()} onClick={() => void save()} testId={`CRMI-SAVE-${provider}`}>{t("crmi.save")}</Button>
        <Button variant="outline" icon="sparkle" loading={busy === "test"} disabled={disabled || !!busy || !item} onClick={() => void test()} testId={`CRMI-TEST-${provider}`}>{t("crmi.test")}</Button>
      </div>
    </div>
  );
}
