"use client";

/* Xodim (operator) kabineti ma'lumotlari — /api/me/* (2026-10-15).
 * Backend hamma narsani tokendagi foydalanuvchi va uning ichki raqami
 * (users.operator_ext) bo'yicha cheklaydi; o'z qo'ng'iroqlari esa oddiy
 * /api/calls orqali (xodim tokeni bilan avtomatik o'z raqamiga). */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { tashkentToday } from "../lib/dates";
import { useSession } from "../../lib/auth";

export interface MyOperator {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  operator_ext: string | null;
  shift_start: string | null;
  shift_end: string | null;
}

export interface MyStage { title: string; pct: number }
export interface MyStaff {
  calls: number;
  minutes: number;
  scored_calls: number;
  avg_score: number; // 0–100
  stages: MyStage[];
  faults: string[];
  top_mistakes: Array<{ label: string; count: number; points_lost: number }>;
  lost_reasons: Array<{ reason: string; count: number }>;
  reasons: Array<{ reason: string; count: number }>;
  leads: number;
  invited: number;
  closed: number;
  problems: number;
}
export interface MyDay {
  calls: number;
  longCalls: number;
  incoming: number;
  outgoing: number;
  score10: number | null;
  scored: number;
  talkSec: number;
}
export interface MySummary {
  date: string;
  linked: boolean;
  data: null | {
    ext: string;
    norm: number | null;
    long_sec: number;
    day: MyDay | null;
    staff: MyStaff | null;
    advice: { items: string[]; generated_at: string; based_on_calls: number } | null;
  };
}

export interface MyGuide {
  criteria: Array<{ id: string; title: string; description: string; category: string | null; type: string | null; weight: number | null; penalty_amount: number | null }>;
  scripts: Array<{ id: string; title: string; enabled: boolean }>;
}

function useUid() {
  const s = useSession();
  return s?.employeeId ?? s?.email ?? "_";
}

export function useMyOperator() {
  const uid = useUid();
  return useQuery({
    queryKey: ["v1", "me", uid, "operator"],
    queryFn: ({ signal }) => apiFetch<MyOperator>("/api/me/operator", { signal }),
    staleTime: 60_000,
  });
}

export function useMySummary(date: string) {
  const uid = useUid();
  const live = date >= tashkentToday();
  return useQuery({
    queryKey: ["v1", "me", uid, "summary", date],
    queryFn: ({ signal }) => apiFetch<MySummary>(`/api/me/summary?date=${date}`, { signal, raw: true }),
    staleTime: live ? 15_000 : 300_000,
    refetchInterval: live ? 60_000 : false,
  });
}

export function useMyGuide() {
  const uid = useUid();
  return useQuery({
    queryKey: ["v1", "me", uid, "guide"],
    queryFn: ({ signal }) => apiFetch<MyGuide>("/api/me/guide", { signal }),
    staleTime: 5 * 60_000,
  });
}
