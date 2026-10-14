"use client";

/* Qo'ng'iroqlar ro'yxati va tafsiloti (Pulse Noir, 2026-10-14) — Audio
 * yozuvlar va Tahlil holati sahifalari uchun.
 *
 * Filtrlash, saralash va sahifalash SERVERDA (/api/calls ?date=&analyzed=
 * &reason=&operator=&sort=&offset=&limit=&total=1). Avval kunning barcha
 * qo'ng'iroqlari brauzerga tortilib (1300+ qator, 7+ so'rov) shu yerda
 * filtrlanardi. */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";
import { tashkentToday } from "../lib/dates";
import type { CallDetail, CallRow } from "../../lib/calls";

export type CallFilter = "all" | "scored" | "unscored" | "low" | "problem";
export type CallSort = "time" | "score.asc" | "score.desc" | "duration.desc";

export interface CallsQuery {
  date: string;
  filter: CallFilter;
  reason?: string | null;
  operator?: string | null;
  sort?: CallSort;
  page: number;
  pageSize: number;
}

export interface CallsPage {
  total: number;
  rows: CallRow[];
}

function qs(q: CallsQuery): string {
  const p = new URLSearchParams();
  p.set("date", q.date);
  p.set("limit", String(q.pageSize));
  p.set("offset", String(q.page * q.pageSize));
  p.set("total", "1");
  if (q.filter === "scored") p.set("analyzed", "true");
  if (q.filter === "unscored") p.set("analyzed", "false");
  if (q.filter === "low") p.set("analyzed", "low");
  if (q.filter === "problem") p.set("problem", "true");
  if (q.reason) p.set("reason", q.reason);
  if (q.operator) p.set("operator", q.operator);
  if (q.sort && q.sort !== "time") p.set("sort", q.sort);
  return p.toString();
}

export function useCallsPage(q: CallsQuery) {
  const { data: me } = useMe();
  const live = q.date >= tashkentToday();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/api/calls", q],
    queryFn: async ({ signal }) => {
      const r = await apiFetch<{ total?: number; data: CallRow[] }>(`/api/calls?${qs(q)}`, { signal, raw: true });
      return { total: Number(r.total) || 0, rows: Array.isArray(r.data) ? r.data : [] } as CallsPage;
    },
    enabled: !!me,
    staleTime: live ? 15_000 : 120_000,
    refetchInterval: live ? 30_000 : false,
    placeholderData: keepPreviousData,
  });
}

export function useCallDetail(id: string | null) {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/api/calls/:id", id],
    queryFn: ({ signal }) => apiFetch<CallDetail>(`/api/calls/${id}`, { signal }),
    enabled: !!me && !!id,
    staleTime: 30_000,
  });
}

/* Ro'yxat sarlavhasidagi raqamlar: tanlangan va oldingi kun (daily-summary). */
export interface DaySummaryRow {
  date: string;
  calls: number;
  scored: number;
  avg_score: number;
  low_score: number;
  analyzed: number;
}

export function useDaySummary(date: string) {
  const { data: me } = useMe();
  const today = tashkentToday();
  const back = Math.max(1, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000) + 2);
  const live = date >= today;
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/daily-summary", back],
    queryFn: ({ signal }) => apiFetch<DaySummaryRow[]>(`/analytics/daily-summary?days=${Math.min(120, back)}`, { signal }),
    enabled: !!me,
    staleTime: live ? 15_000 : 300_000,
    refetchInterval: live ? 30_000 : false,
  });
}
