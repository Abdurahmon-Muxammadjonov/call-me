"use client";

/* Doimiy operatorlar ro'yxati (/managers) — sof birlashtirish funksiyalari
 * roster.model.ts da (u yerda nima uchun ekanini o'qing). */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { RosterManager } from "./roster.model";

export { withRosterOps, withRosterStaff, extFromName, extOfManager, type RosterManager } from "./roster.model";

export function useManagerList(companyId: string | undefined) {
  return useQuery({
    queryKey: ["v1", companyId ?? "_", "/managers", "list"],
    queryFn: ({ signal }) => apiFetch<RosterManager[]>("/managers", { signal }),
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}
