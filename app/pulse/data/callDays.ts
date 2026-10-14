"use client";

/* "📅 Sana" kalendari uchun kunlar (GET /analytics/days, 2026-10-14):
 * kompaniyaning BIRINCHI qo'ng'iroq kunidan bugungacha qo'ng'iroq bo'lgan
 * har bir Toshkent kuni va soni. Kalendar birinchi kundan oldingi va
 * kelajakdagi kunlarni o'chiradi, qo'ng'iroq bo'lgan kunlarni belgilaydi. */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useMe } from "./me";

interface CallDaysResponse {
  first_day: string | null;
  today: string;
  days: Array<{ date: string; calls: number }>;
}

export interface CallDays {
  firstDay: string | null;
  /* kun -> qo'ng'iroqlar soni (faqat qo'ng'iroq bo'lgan kunlar) */
  counts: Map<string, number>;
}

export function useCallDays(): { data: CallDays | null; isLoading: boolean } {
  const { data: me } = useMe();
  const q = useQuery({
    queryKey: ["v1", me?.company.id ?? "_", "/analytics/days"],
    queryFn: ({ signal }) => apiFetch<CallDaysResponse>("/analytics/days", { signal }),
    enabled: !!me,
    // Bugungi son yangi qo'ng'iroq bilan o'zgaradi — 60 s yetarli.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const data = useMemo<CallDays | null>(() => {
    if (!q.data) return null;
    return {
      firstDay: q.data.first_day,
      counts: new Map(q.data.days.map((d) => [d.date, Number(d.calls) || 0])),
    };
  }, [q.data]);
  return { data, isLoading: q.isLoading };
}
