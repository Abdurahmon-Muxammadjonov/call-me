"use client";

/* Tahlil holati ma'lumoti (Pulse Noir, 2026-10-14): GET /analytics/analysis-status?date=
 * (supabase/perf_06) — tanlangan kun + sabablar dinamikasi uchun oldingi 6 kun. */

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";
import { addDays, tashkentToday } from "../lib/dates";

export interface AnalysisStatus {
  total: number;
  operator_calls: number;
  analyzed: number;
  analyzed_minutes: number;
  not_analyzed: number;
  not_analyzed_minutes: number;
  reasons: Array<{ reason: string; count: number; minutes: number }>;
  operators: Array<{ operator: string; analyzed: number; skipped: number; analyzed_minutes: number; limit_reached: boolean }>;
}

function opts(companyId: string | undefined, date: string) {
  const live = date >= tashkentToday();
  return {
    queryKey: ["v1", companyId ?? "_", "/analytics/analysis-status", date] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) => apiFetch<AnalysisStatus>(`/analytics/analysis-status?date=${date}`, { signal }),
    staleTime: live ? 15_000 : 300_000,
  };
}

export function useAnalysisStatus(date: string) {
  const { data: me } = useMe();
  const live = date >= tashkentToday();
  return useQuery({
    ...opts(me?.company.id, date),
    enabled: !!me,
    refetchInterval: live ? 30_000 : false,
    placeholderData: keepPreviousData,
  });
}

/* Oldingi 6 kun (eskidan yangiga) — sabab kartochkalaridagi 7 kunlik ustunlar. */
export function useStatusHistory(date: string) {
  const { data: me } = useMe();
  const days = Array.from({ length: 6 }, (_, i) => addDays(date, i - 6));
  const qs = useQueries({ queries: days.map((d) => ({ ...opts(me?.company.id, d), enabled: !!me })) });
  return days.map((d, i) => ({ date: d, data: qs[i].data ?? null }));
}
