"use client";

/* Lid sifati (2026-10-16) — GET /analytics/lead-quality?from&to.
 * Sifatsiz lid — AI bad_leads_count > 0 deb belgilagan qo'ng'iroq; sababi
 * lost_reasons'dan, toifalarga yig'ilgan (backend lib/leadReasons.ts). */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";
import { tashkentToday } from "../lib/dates";

export interface LeadQuality {
  qualified: number;
  unqualified: number;
  reasons: Array<{ reason: string; count: number }>;
  operators: Array<{ ext: string | null; name: string; qualified: number; unqualified: number }>;
  recent_unqualified: Array<{ id: string; ext: string | null; name: string | null; created_at: string; reasons: string[]; summary: string | null }>;
}

export function useLeadQuality(from: string | null, to: string | null) {
  const { data: me } = useMe();
  const live = !!to && to >= tashkentToday();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/lead-quality", from, to],
    queryFn: ({ signal }) => apiFetch<LeadQuality>(`/analytics/lead-quality?from=${from}&to=${to}`, { signal }),
    enabled: !!me && !!from && !!to,
    staleTime: live ? 30_000 : 300_000,
    refetchInterval: live ? 60_000 : false,
  });
}
