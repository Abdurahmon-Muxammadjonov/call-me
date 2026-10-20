"use client";

/* CRM'dagi pul (2026-10-20) — GET /analytics/crm-money?from&to.
 * Manba — amoCRM bitimlari (backend lib/crmDeals.ts): «Бюджет» = to'langan,
 * «Kelishuv Summasi» = shartnoma, «Qarzdorlik» = qarz. To'liq to'lov — chek
 * tekshirilgandan keyin; "To'liq to'lov qildi" — chek kutilmoqda. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";
import { tashkentToday } from "../lib/dates";

export type PayKind = "partial" | "pending" | "full";
interface Bucket { count: number; sum: number }
export interface CrmLead {
  lead_id: number;
  name: string | null;
  pipeline: string | null;
  stage: string | null;
  kind: PayKind;
  paid: number;
  deal_sum: number;
  debt: number;
  payment_type: string | null;
  at: string | null;
  ext: string | null;
  operator: string | null;
  manager: string | null;
  url: string | null;
}
interface Row { name: string; count: number; full: number; paid: number; debt: number }

export type CrmMoney =
  | { ready: false }
  | { ready: true; connected: false }
  | {
      ready: true;
      connected: true;
      enabled: boolean;
      pull_at: string | null;
      pull_error: string | null;
      totals: { deals: number; paid: number; deal_sum: number; debt: number } & Record<PayKind, Bucket>;
      debt_all: { count: number; sum: number; top: CrmLead[] };
      operators: Array<Row & { ext: string | null }>;
      managers: Row[];
      payment_types: Array<Bucket & { type: string }>;
      recent: CrmLead[];
    };

export function useCrmMoney(from: string | null, to: string | null) {
  const { data: me } = useMe();
  const live = !!to && to >= tashkentToday();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/crm-money", from, to],
    queryFn: ({ signal }) => apiFetch<CrmMoney>(`/analytics/crm-money?from=${from}&to=${to}`, { signal }),
    enabled: !!me && !!from && !!to,
    staleTime: live ? 60_000 : 300_000,
    refetchInterval: live ? 120_000 : false,
  });
}

/** amoCRM'dan hozir yangilash (fonda) — bir necha soniyadan keyin qayta o'qiladi. */
export function useCrmSync() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/company/integrations/amocrm/sync", { method: "POST", body: {} }),
    onSuccess: () => {
      const key = ["v1", me?.company.id ?? "_", "/analytics/crm-money"];
      for (const ms of [8_000, 30_000]) setTimeout(() => void qc.invalidateQueries({ queryKey: key }), ms);
    },
  });
}
