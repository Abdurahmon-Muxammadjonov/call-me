"use client";

/* Telegram kun hisoboti (2026-10-16, foydalanuvchi talabi: "Telegramdan
 * hisobot qo'shish, bot qilish"). Direktor chatni (shaxsiy yoki guruh)
 * SalesPulse botiga bog'laydi — har kuni ish yakunida (20:05) kun hisoboti
 * keladi; chatda /hisobot — darhol. Backend: /company/telegram. */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePT } from "../../i18n";
import { Button, Card, IconButton, StatusPill } from "../../ui/primitives";
import { Icon } from "../../ui/Icon";
import { Notice, Switch } from "../../ui/form";
import { toast } from "../../ui/toast";
import { useMe } from "../../data/me";
import { apiFetch } from "../../data/api";

interface TgChat { id: string; chat_id: number; title: string | null; enabled: boolean; last_sent_day: string | null }
interface TgState { bot: string | null; chats: TgChat[]; ready: boolean }

export function TelegramReportCard() {
  const t = usePT();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const key = ["v1", me?.company.id ?? "_", "/company/telegram"] as const;
  const q = useQuery({ queryKey: key, queryFn: ({ signal }) => apiFetch<TgState>("/company/telegram", { signal }), enabled: !!me });
  const [links, setLinks] = useState<{ link: string; group_link: string } | null>(null);
  const [busy, setBusy] = useState<"link" | "test" | null>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: key });

  async function makeLink() {
    setBusy("link");
    try {
      setLinks(await apiFetch<{ link: string; group_link: string }>("/company/telegram/link", { method: "POST", body: {} }));
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    } finally {
      setBusy(null);
    }
  }
  async function sendTest() {
    setBusy("test");
    try {
      const r = await apiFetch<{ sent: number }>("/company/telegram/test", { method: "POST", body: {} });
      toast(r.sent ? t("tg.sent", { n: r.sent }) : t("tg.noChats"), r.sent ? "good" : "warn");
      refresh();
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    } finally {
      setBusy(null);
    }
  }
  async function toggle(c: TgChat) {
    try {
      await apiFetch(`/company/telegram/${c.id}`, { method: "PATCH", body: { enabled: !c.enabled } });
      refresh();
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    }
  }
  async function remove(c: TgChat) {
    try {
      await apiFetch(`/company/telegram/${c.id}`, { method: "DELETE" });
      refresh();
    } catch (e) {
      toast((e as Error).message || t("tg.err"), "bad");
    }
  }

  const chats = q.data?.chats ?? [];
  return (
    <Card pad="lg" data-testid="TG-REPORT">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-pn-sky text-pn-pastel-ink"><Icon name="bell" size={20} /></span>
          <div>
            <h2 className="pn-card-title">{t("tg.title")}</h2>
            <p className="pn-card-sub leading-relaxed">{t("tg.sub")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon="sparkle" loading={busy === "test"} disabled={!!busy || !chats.length} onClick={() => void sendTest()} testId="TG-TEST">{t("tg.test")}</Button>
          <Button variant="primary" icon="plus" loading={busy === "link"} disabled={!!busy || q.data?.ready === false} onClick={() => void makeLink()} testId="TG-LINK">{t("tg.connect")}</Button>
        </div>
      </div>

      {q.data && !q.data.ready && <Notice tone="warn" className="mt-5">{t("tg.notReady")}</Notice>}

      {links && (
        <Notice tone="good" className="mt-5" testId="TG-LINKS">
          <p className="text-pn-text">{t("tg.linkHint")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon="link" href={links.link} testId="TG-OPEN-DM">{t("tg.dm")}</Button>
            <Button variant="outline" icon="users" href={links.group_link} testId="TG-OPEN-GROUP">{t("tg.group")}</Button>
          </div>
          <p className="mt-2 text-[12px] text-pn-muted">{t("tg.linkTtl")}</p>
        </Notice>
      )}

      <ul className="mt-5 flex flex-col gap-2">
        {chats.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-pn-border-3 px-4 py-4 text-center text-[13px] text-pn-muted">{t("tg.empty")}</li>
        ) : (
          chats.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-pn-panel-2 py-2 pl-4 pr-2">
              <Switch checked={c.enabled} onChange={() => void toggle(c)} label={t("tg.enabled")} testId={`TG-ON-${c.id}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{c.title || String(c.chat_id)}</span>
                <span className="block text-[12px] text-pn-subtle">{c.last_sent_day ? t("tg.last", { d: c.last_sent_day }) : t("tg.never")}</span>
              </span>
              <StatusPill tone={c.enabled ? "good" : "neutral"} plain>{c.enabled ? t("tg.on") : t("tg.off")}</StatusPill>
              <IconButton icon="trash" label={t("tg.remove")} size={38} tone="ghost" className="hover:text-pn-bad!" onClick={() => void remove(c)} testId={`TG-DEL-${c.id}`} />
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
