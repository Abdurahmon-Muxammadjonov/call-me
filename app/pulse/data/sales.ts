"use client";

/* Sotuv dashboardi (2026-10-20) — GET /analytics/sales (backend
 * lib/salesDashboard.ts). Har vidjet alohida keladi: biri `{ error }`
 * bo'lsa, faqat o'sha karta xato ko'rsatadi. */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";

export type PayKind = "partial" | "pending" | "full" | "none" | "lost";
export interface Growth { pct: number | null; abs: number }
export type W<T> = T | { error: string };
export const wOk = <T,>(w: W<T> | undefined | null): T | null =>
  w && typeof w === "object" && "error" in (w as object) ? null : ((w as T) ?? null);

export interface Kpis {
  month: { value: number; prev: number; growth: Growth; prevRange: { from: string; to: string } };
  today: { value: number; prev: number; growth: Growth; until: string };
  newClients: { value: number; prev: number };
  salesCount: { value: number; prev: number; growth: Growth };
  salesSum: { value: number; prev: number; growth: Growth };
  paid: { value: number; prev: number };
  leads: { value: number; prev: number };
  conversion: { value: number | null; prev: number | null };
  avgCheck: { value: number | null; prev: number | null; noPrice: number };
}
export interface Plan { id: string; kind: "monthly" | "launch"; pipeline_id: number | null; title: string | null; period_from: string; period_to: string; amount: number }
export type PlanFact = { plan: null } | { plan: Plan; fact: number; paid: number; expected: number; count: number; pct: number | null; timePct: number; daysLeft: number };
export interface Debt { total: number; count: number; managers: Array<{ name: string; sum: number; count: number }> }
export interface Funnel {
  mode: "pipelines" | "stages";
  total: number; sales: number; conv: number | null;
  rows: Array<{ id: number; name: string; leads: number; share: number; sales?: number; conv?: number | null; kind?: PayKind }>;
}
export interface DynPoint { key: string; sum: number; count: number; partial: boolean }
export interface Dynamics {
  gran: "day" | "week" | "month";
  current: { range: { from: string; to: string }; sum: number; count: number; points: DynPoint[] };
  previous: { range: { from: string; to: string }; sum: number; count: number; points: DynPoint[] };
  best: DynPoint | null; worst: DynPoint | null; avg: number | null;
}
export interface FieldDist {
  field: { id: number; name: string } | null;
  fields: Array<{ id: number; name: string }>;
  total: number; notFilled: number; shown?: number; answers?: number;
  rows: Array<{ answer: string; leads: number; sales: number; share: number }>;
}
export interface Comparison { rows: Array<{ month: string; partialDays: number | null; value: number; base: number; growth: Growth }>; current: Comparison["rows"][number] }
export interface SourceRow { name: string; leads: number; sales: number; sum: number; share: number; sumShare: number }
export interface Sources { total: number; salesSum: number; order: string[]; leads: SourceRow[]; channels: SourceRow[] }
export interface Quick { bestManager: { name: string; sum: number; sales: number } | null; topSource: SourceRow | null; avgCheck: number | null; conversion: number | null }
export interface Lost { total: number; byStage: boolean; withReason: number; rows: Array<{ reason: string; count: number; share: number }> }
export interface MgrRow {
  id: number | null; name: string; system: boolean; ext: string | null;
  leads: number; inWork: number; sales: number; sum: number; conv: number | null; avg: number | null;
  oldestDays: number | null; calls: number | null; talkSec: number | null; stages: Record<string, number>;
  leadsGrowth: Growth; salesGrowth: Growth; sumGrowth: Growth;
}
export interface MgrTotal { leads: number; inWork: number; sales: number; sum: number; conv: number | null; avg: number | null; calls: number; talkSec: number; count: number }
export interface Managers { rows: MgrRow[]; system: { rows: MgrRow[]; total: MgrTotal }; totals: { active: MgrTotal; all: MgrTotal }; stages: Array<{ id: number; name: string }> | null }
export interface Creatives { metaConnected: boolean; rows: Array<{ id: string; leads: number; sales: number; sum: number }>; total: number; withSales: number; noResult: number }
export interface AiCalls {
  total: number; analyzed: number; coverage: number | null; lastAt: string | null; avg: number | null;
  results: Array<{ key: string; count: number; share: number }>;
  topics: Array<{ key: string; count: number }>;
  operators: Array<{ ext: string; name: string; score: number; count: number }>;
}
export type Launch = { plan: null } | {
  plan: Plan; day: number; totalDays: number; daysLeft: number;
  fact: number; paid: number; expected: number; potential: number; potentialLeads: number; avgCheck: number;
  toPlan: number; perDay: number; factPct: number | null; totalPotential: number; totalPotentialPct: number | null; timePct: number;
  pipelines: Array<{ id: number; name: string; leads: number; sold: number; agreed: number; paid: number; expected: number; potential: number }>;
  managers: Array<{ name: string; sold: number; agreed: number; paid: number; expected: number }>;
  warnings: { unpaidFull: { count: number; sum: number }; lost: number };
};
export interface Insights { facts: Array<{ key: string; v: Record<string, string | number> }>; recs: Array<{ key: string; v: Record<string, string | number> }> }

export interface SalesWidgets {
  kpis: W<Kpis>; planFact: W<PlanFact>; debt: W<Debt>; funnel: W<Funnel>; dynamics: W<Dynamics>; field: W<FieldDist>;
  comparison: W<Comparison>; quick: W<Quick>; lost: W<Lost>; sources: W<Sources>; managers: W<Managers>;
  creatives: W<Creatives>; ai: W<AiCalls>; launch: W<Launch>; insights: W<Insights>;
}
export type SalesData =
  | { ready: false }
  | { ready: true; connected: false }
  | {
      ready: true;
      connected: true;
      meta: {
        pull_at: string | null; pull_error: string | null; leads_total: number; subdomain: string;
        pipelines: Array<{ id: number; name: string }>; groups: Array<{ id: number; name: string }>;
        range: { from: string; to: string }; prev: { from: string; to: string };
      };
      widgets: SalesWidgets;
    };

export interface SalesQuery { from: string; to: string; pipeline: string | null; group: string | null; gran: "day" | "week" | "month"; field: string | null }

const qs = (q: SalesQuery) => {
  const p = new URLSearchParams({ from: q.from, to: q.to, gran: q.gran });
  if (q.pipeline) p.set("pipeline", q.pipeline);
  if (q.group) p.set("group", q.group);
  if (q.field) p.set("field", q.field);
  return p.toString();
};

export function useSales(q: SalesQuery) {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/sales", q],
    queryFn: ({ signal }) => apiFetch<SalesData>(`/analytics/sales?${qs(q)}`, { signal }),
    enabled: !!me,
    // CRM o'zgarishi 1–2 daqiqada ko'rinsin (backend har 2 daqiqada + webhook).
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}

export interface LeadHit { id: number; name: string | null; pipeline: string; stage: string; kind: PayKind; amount: number; debt: number; manager: string; created: string; url: string | null }

export function useLeadSearch(text: string) {
  const { data: me } = useMe();
  const q = text.trim();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/sales/search", q],
    queryFn: ({ signal }) => apiFetch<LeadHit[]>(`/analytics/sales/search?q=${encodeURIComponent(q)}`, { signal }),
    enabled: !!me && q.length >= 2,
    staleTime: 30_000,
  });
}

function useInvalidateSales() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["v1", me?.company.id ?? "_", "/analytics/sales"] });
}

export function useSavePlan() {
  const inv = useInvalidateSales();
  return useMutation({
    mutationFn: (p: Omit<Plan, "id"> & { id?: string }) =>
      apiFetch(p.id ? `/analytics/sales/plans/${p.id}` : "/analytics/sales/plans", { method: p.id ? "PUT" : "POST", body: p }),
    onSuccess: inv,
  });
}

export function useDeletePlan() {
  const inv = useInvalidateSales();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/analytics/sales/plans/${id}`, { method: "DELETE" }),
    onSuccess: inv,
  });
}

export function useSendSalesTelegram() {
  return useMutation({
    mutationFn: (q: SalesQuery) => apiFetch<{ sent: number }>("/analytics/sales/telegram", { method: "POST", body: { ...q } }),
  });
}

export interface SalesSettings {
  ready: boolean;
  connected?: boolean;
  settings?: { deal_field_id?: number; debt_field_id?: number; potential_status_ids?: number[]; user_map?: Record<string, string> };
  fields?: Array<{ id: number; name: string; type: string }>;
  pipelines?: Array<{ id: number; name: string; statuses: Array<{ id: number; name: string; kind: PayKind }> }>;
  users?: Array<{ id: number; name: string }>;
  webhook_url?: string | null;
}

export function useSalesSettings() {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/sales/settings"],
    queryFn: ({ signal }) => apiFetch<SalesSettings>("/analytics/sales/settings", { signal }),
    enabled: !!me,
  });
}

export function useSaveSalesSettings() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: NonNullable<SalesSettings["settings"]>) => apiFetch<{ resync: boolean }>("/analytics/sales/settings", { method: "PUT", body: s }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["v1", me?.company.id ?? "_", "/analytics/sales"] });
    },
  });
}
