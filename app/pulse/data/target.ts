"use client";

/* Target tahlil (2026-10-27) — GET /analytics/target?from&to (backend
 * lib/metaAds.ts): amoCRM lidlari kreativ (utm_content) va manba kesimida +
 * AI lid sifati. Meta Ads ulansa xarajat ham (hozir ishlatilmaydi). */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";

export interface TMetrics {
  spend: number; impressions: number; clicks: number; metaLeads: number; messages: number;
  leads: number; qualified: number; unqualified: number; sales: number; revenue: number; paid: number;
  ctr: number | null; cpc: number | null; cpl: number | null; cpql: number | null; cps: number | null;
  conv: number | null; qualifiedShare: number | null; avgCheck: number | null; roas: number | null; romi: number | null;
}
export type TargetData =
  | { ready: false }
  | {
      ready: true;
      connected: boolean;
      enabled: boolean;
      account: { id: string | null; name: string | null; currency: string } | null;
      rate: number;
      pull_at: string | null;
      pull_error: string | null;
      totals: TMetrics & { leadsNoCreative: number };
      daily: Array<TMetrics & { day: string }>;
      campaigns: Array<TMetrics & { id: string; name: string }>;
      creatives: Array<TMetrics & { id: string; name: string; campaign: string | null; status: string | null; thumb: string | null }>;
      unmatched: Array<TMetrics & { name: string }>;
      sources: Array<TMetrics & { name: string; share: number }>;
      recs: Array<{ key: string; v: Record<string, string | number> }>;
    };

export function useTarget(from: string, to: string) {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/target", from, to],
    queryFn: ({ signal }) => apiFetch<TargetData>(`/analytics/target?from=${from}&to=${to}`, { signal }),
    enabled: !!me,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
