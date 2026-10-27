"use client";

/* META ADS ULANISHI — target tahlil uchun (2026-10-27). Direktor Meta
 * Business'dan access token beradi → reklama hisoblari ro'yxati → bittasi
 * tanlanadi → saqlanadi (token serverda shifrlanadi, qayta ko'rsatilmaydi).
 * Xarajat, ko'rishlar, kliklar har soatda yangilanadi (backend lib/metaAds.ts). */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePT } from "../../i18n";
import { Button, Card, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { Field, Notice, SelectInput, TextInput } from "../../ui/form";
import { toast } from "../../ui/toast";
import { apiFetch } from "../../data/api";
import { useMe } from "../../data/me";
import { useMetaAccounts, useMetaSync, useSaveMeta, type MetaAccount } from "../../data/target";

interface Item { provider: string; enabled: boolean; account_id: string | null; account_name: string | null; currency: string | null; has_token: boolean; pull_at: string | null; pull_error: string | null }

export function MetaAdsCard() {
  const t = usePT();
  const { data: me } = useMe();
  const q = useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/company/integrations"],
    queryFn: ({ signal }) => apiFetch<{ ready: boolean; items: Item[] }>("/company/integrations", { signal }),
    enabled: !!me,
  });
  const item = q.data?.items.find((i) => i.provider === "meta") ?? null;
  const accounts = useMetaAccounts();
  const save = useSaveMeta();
  const sync = useMetaSync();
  const [token, setToken] = useState("");
  const [list, setList] = useState<MetaAccount[] | null>(null);
  const [account, setAccount] = useState("");
  const [help, setHelp] = useState(false);

  const loadAccounts = () => accounts.mutate(token.trim(), {
    onSuccess: (r) => {
      setList(r.accounts);
      setAccount(r.accounts.find((a) => a.active)?.id ?? r.accounts[0]?.id ?? "");
      if (!r.accounts.length) toast(t("meta.noAccounts"), "warn");
    },
    onError: (e) => toast(String((e as Error).message), "bad"),
  });
  const submit = () => save.mutate({ token: token.trim() || undefined, account_id: account || item?.account_id || "" }, {
    onSuccess: () => { toast(t("meta.saved"), "good"); setToken(""); setList(null); },
    onError: (e) => toast(String((e as Error).message), "bad"),
  });

  return (
    <Card pad="lg" data-testid="CRM-META">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pn-sky text-pn-pastel-ink"><Icon name="target" size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="pn-card-title">{t("meta.title")}</h2>
          <p className="pn-card-sub leading-relaxed">{t("meta.sub")}</p>
        </div>
        {item && (
          <StatusPill tone={item.pull_error ? "bad" : item.pull_at ? "good" : "warn"}>
            {item.pull_error ? t("meta.st.error") : item.pull_at ? t("meta.st.ok") : t("meta.st.first")}
          </StatusPill>
        )}
      </div>

      {item && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-pn-panel-2 px-4 py-3 text-[13px]">
          <span className="font-semibold">{item.account_name ?? item.account_id}</span>
          <span className="pn-mono text-pn-muted">{item.account_id} · {item.currency}</span>
          {item.pull_at && <span className="text-pn-subtle">{t("meta.updated", { t: new Date(item.pull_at).toLocaleString() })}</span>}
          <span className="ml-auto flex gap-2">
            <Button variant="outline" compact icon="refresh" loading={sync.isPending} onClick={() => sync.mutate(undefined, { onSuccess: () => toast(t("meta.syncing")) })} testId="CRM-META-sync">{t("cm.sync")}</Button>
          </span>
          {item.pull_error && <p className="w-full text-[12px] text-pn-bad-text">{item.pull_error}</p>}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label={t("meta.token")} hint={item?.has_token ? t("meta.tokenSaved") : t("meta.tokenHint")}>{(id) => (
          <TextInput id={id} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAG…" data-testid="CRM-META-token" />
        )}</Field>
        <Button variant="secondary" onClick={loadAccounts} disabled={token.trim().length < 20} loading={accounts.isPending} testId="CRM-META-accounts">{t("meta.loadAccounts")}</Button>
      </div>

      {list && list.length > 0 && (
        <div className="mt-4">
          <Field label={t("meta.account")}>{(id) => (
            <SelectInput id={id} value={account} onChange={(e) => setAccount(e.target.value)} data-testid="CRM-META-account">
              {list.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.id} · {a.currency}{a.active ? "" : ` · ${t("meta.inactive")}`}</option>)}
            </SelectInput>
          )}</Field>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setHelp((v) => !v)} className="flex items-center gap-2 text-[13px] text-pn-muted hover:text-pn-text">
          <Icon name="info" size={14} /> {t("meta.howTo")}
        </button>
        <Button variant="primary" onClick={submit} disabled={!(list ? account : item?.account_id && token.trim())} loading={save.isPending} testId="CRM-META-save">{t("sd.save")}</Button>
      </div>
      {help && (
        <Notice tone="neutral" className="mt-4">
          <ol className="flex list-decimal flex-col gap-1 pl-4">
            <li>{t("meta.h1")}</li>
            <li>{t("meta.h2")}</li>
            <li>{t("meta.h3")}</li>
            <li>{t("meta.h4")}</li>
          </ol>
        </Notice>
      )}
    </Card>
  );
}
