"use client";

/* CRM menejerlari (amoCRM) — 2026-10-16 da Operatorlar bo'limidan CRM
 * sahifasiga ko'chirildi (Operatorlar bo'limi olib tashlandi). Mantiq
 * o'zgarmagan: /crm/dashboard/managers + managers jadvali realtime. */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePT } from "../../i18n";
import { Button, Card, StatusPill } from "../../ui/primitives";
import { useMe } from "../../data/me";
import { apiFetch } from "../../data/api";
import { getSupabase } from "../../../lib/supabase";
import type { Tone } from "../../lib/tones";

interface CrmManager { id: string; name: string; status: string }
interface CrmDashboard { managers?: CrmManager[]; managers_count?: number; active_count?: number }

function statusOf(s: string): { tone: Tone; key: "online" | "away" | "offline" } {
  const v = s.toLowerCase();
  if (v === "active" || v === "online") return { tone: "good", key: "online" };
  if (v === "busy" || v === "away") return { tone: "warn", key: "away" };
  return { tone: "neutral", key: "offline" };
}

export function CrmManagersCard() {
  const t = usePT();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const crmKey = ["v1", me?.company.id ?? "_", "/crm/dashboard/managers"] as const;
  const crm = useQuery({
    queryKey: crmKey,
    // amoCRM sinxroni sekin bo'lishi mumkin.
    queryFn: ({ signal }) => apiFetch<CrmDashboard>("/crm/dashboard/managers", { signal, raw: true }),
    enabled: !!me,
    staleTime: 60_000,
  });

  // Realtime: managers jadvali o'zgarsa ro'yxat yangilanadi.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const ch = supabase
      .channel("pulse-crm-managers")
      .on("postgres_changes", { event: "*", schema: "public", table: "managers" }, () => void qc.invalidateQueries({ queryKey: crmKey }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, me?.company.id]);

  const managers = crm.data?.managers ?? [];
  const crmActive = typeof crm.data?.active_count === "number" ? crm.data.active_count : managers.filter((m) => statusOf(m.status).key === "online").length;

  return (
    <Card pad="none" className="@container/crmm overflow-hidden" data-testid="CRM-MANAGERS">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-[22px] pb-4">
        <div>
          <h2 className="pn-card-title">{t("op.crm.title")}</h2>
          <div className="mt-1 text-[13px] text-pn-muted">{t("op.crm.sub")}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone="good" plain>{t("op.crm.active", { n: crmActive })}</StatusPill>
          <StatusPill tone="neutral" plain>{t("op.crm.total", { n: crm.data?.managers_count ?? managers.length })}</StatusPill>
          <Button variant="outline" compact icon="refresh" loading={crm.isFetching} onClick={() => void crm.refetch()} testId="CRM-MANAGERS-refresh">
            {t("op.crm.refresh")}
          </Button>
        </div>
      </div>
      {crm.isError ? (
        <div className="px-6 pb-6 text-[13px] text-pn-bad-text">{(crm.error as Error)?.message || t("op.crm.error")}</div>
      ) : !crm.data ? (
        <div className="px-6 pb-6 text-[13px] text-pn-muted">{t("op.crm.loading")}</div>
      ) : managers.length === 0 ? (
        <div className="px-6 pb-6 text-[13px] text-pn-muted">{t("op.crm.empty")}</div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 px-6 pb-6 @min-[700px]/crmm:grid-cols-2 @min-[1100px]/crmm:grid-cols-3">
          {managers.map((m) => {
            const s = statusOf(m.status);
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-pn-panel-2 px-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pn-panel-3 text-[12px] font-bold">
                    {m.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                  </span>
                  <span className="truncate text-[14px]">{m.name}</span>
                </span>
                <StatusPill tone={s.tone}>{t(`op.status.${s.key}` as "op.status.online")}</StatusPill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
