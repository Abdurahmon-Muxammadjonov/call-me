"use client";

/* Xodimlar statistikasi ma'lumoti (Pulse Noir, 2026-10-14).
 *   GET /analytics/staff-stats?date=  — operatorning kunlik bali, ayblari,
 *       eng ko'p xatolari, skript bandlari, AI tavsiyasi (operator_insights)
 *   GET /analytics/operators?date=    — uzun qo'ng'iroq / norma, kiruvchi
 * Oldingi kun ham olinadi — kartochkada "kechaga" o'zgarish. */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";
import { tashkentToday } from "../lib/dates";
import type { StaffStatRow } from "../../lib/api";

export type StaffRow = StaffStatRow & {
  advice: string[] | null;
  advice_generated_at?: string | null;
  advice_based_on_calls?: number | null;
};

export function useStaffStats(date: string | null) {
  const { data: me } = useMe();
  const live = !!date && date >= tashkentToday();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/staff-stats", date ?? ""],
    queryFn: ({ signal }) => apiFetch<StaffRow[]>(`/analytics/staff-stats?date=${date}`, { signal }),
    enabled: !!me && !!date,
    staleTime: live ? 15_000 : 300_000,
    refetchInterval: live ? 60_000 : false,
    placeholderData: keepPreviousData,
  });
}
