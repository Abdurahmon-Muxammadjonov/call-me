"use client";

/* Boshqaruv paneli ma'lumoti (Pulse Noir, 2026-10-14).
 *
 * Manbalar (hammasi serverda hisoblangan, brauzerda qatorlar sanalmaydi):
 *   GET /api/management/daily-panel?days=14&date=  — 14 kun, soatlar, oy boshi
 *   GET /analytics/operators?date=                 — operator kesimi
 *   GET /analytics/daily-summary?days=2&until=HH:MM — faqat bugun: "kechaning
 *       shu vaqtida" solishtirish (ertalab kechaning to'liq kuni bilan
 *       solishtirilsa har doim "-90%" chiqardi).
 * Tanlangan kun bugun bo'lsa 30 s da yangilanadi, o'tgan kun — o'zgarmaydi. */

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";
import { hmOf, tashkentToday } from "../lib/dates";

export interface PanelDay {
  date: string;
  calls: number;
  operator_calls: number;
  kpi_sum: number;
  seconds: number;
  low: number;
  low_scored: number;
  penalized: number;
  short: number;
  bonus_sum: number;
  penalty_sum: number;
  long_calls: number;
  scored: number;
  score_sum: number;
  unanswered: number;
  bad_leads: number;
  leads: number;
  invited: number;
  closed: number;
  incoming: number;
  outgoing: number;
}

export interface ControlPanel {
  window_days: number;
  long_call_seconds: number;
  date: string;
  /* days[0] = tanlangan kun, days[1] = oldingi kun ... */
  days: PanelDay[];
  hours: Array<{ hour: number; calls: number }>;
  month: { from: string; to: string; calls: number; long_calls: number; leads: number; invited: number; closed: number };
  today_by_manager: Record<string, number>;
  /* Faqat bugun: kechaning shu vaqtigacha bo'lgan qo'ng'iroqlar soni. */
  prevSameTime: { calls: number; hm: string } | null;
}

export interface OperatorDayRow {
  key: string;
  ext: string | null;
  name: string | null;
  calls: number;
  longCalls: number;
  incoming: number;
  outgoing: number;
  leads: number;
  score10: number | null;
  scored: number;
  talkSec: number;
}

async function fetchPanel(date: string, live: boolean, signal?: AbortSignal): Promise<ControlPanel> {
  const hm = hmOf(new Date());
  const [panel, until] = await Promise.all([
    apiFetch<Omit<ControlPanel, "prevSameTime">>(`/api/management/daily-panel?days=14&date=${date}`, { signal }),
    live
      ? apiFetch<Array<{ date: string; calls: number }>>(`/analytics/daily-summary?days=2&until=${encodeURIComponent(hm)}`, { signal }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const prevDay = panel.days[1]?.date;
  const row = Array.isArray(until) ? until.find((r) => r.date === prevDay) : undefined;
  return { ...panel, prevSameTime: live && until ? { calls: Number(row?.calls) || 0, hm } : null };
}

export function useControlPanel(date: string) {
  const { data: me } = useMe();
  const live = date >= tashkentToday();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/management/daily-panel", date],
    queryFn: ({ signal }) => fetchPanel(date, live, signal),
    enabled: !!me,
    staleTime: live ? 15_000 : 300_000,
    refetchOnWindowFocus: true,
    refetchInterval: live ? 30_000 : false,
    placeholderData: keepPreviousData,
  });
}

export function useOperatorsDay(date: string) {
  const { data: me } = useMe();
  const live = date >= tashkentToday();
  return useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/operators", date],
    queryFn: ({ signal }) => apiFetch<OperatorDayRow[]>(`/analytics/operators?date=${date}`, { signal }),
    enabled: !!me,
    staleTime: live ? 15_000 : 300_000,
    refetchInterval: live ? 60_000 : false,
    placeholderData: keepPreviousData,
  });
}
