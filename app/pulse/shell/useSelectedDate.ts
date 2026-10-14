"use client";

/* Bo'limning tanlangan kuni — URL'da ?date=YYYY-MM-DD (2026-10-14).
 * Bugun tanlangan bo'lsa parametr yozilmaydi (havola toza qoladi).
 * Noto'g'ri, kelajakdagi yoki birinchi ma'lumot kunidan oldingi sana
 * bugunga (yoki birinchi kunga) tushiriladi. Har bo'lim o'z URL'ida —
 * shuning uchun sana havola bilan ulashiladi va orqaga tugmasi ishlaydi. */

import { useCallback } from "react";
import { useUrlState } from "./useUrlState";
import { tashkentToday } from "../lib/dates";
import { useMinuteTick, serverNow } from "./clock";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function useSelectedDate(firstDay?: string | null) {
  const url = useUrlState();
  useMinuteTick(); // yarim tunda "bugun" o'zi almashsin
  const today = tashkentToday(serverNow());
  const raw = url.get("date");
  let date = raw && DAY_RE.test(raw) && raw <= today ? raw : today;
  if (firstDay && date < firstDay) date = firstDay > today ? today : firstDay;
  const setDate = useCallback(
    (d: string) => url.set({ date: d === today ? null : d }),
    [url, today]
  );
  return { date, today, isToday: date === today, setDate };
}
