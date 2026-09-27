"use client";

/* Toshkent soati (§6.1): sarlavhadagi "· 20:40" doim Toshkent vaqti,
 * server farqi (/me.serverTime) bilan to'g'rilanadi va har daqiqa
 * chegarasida yangilanadi (sekundlik taymer emas). */

import { useSyncExternalStore } from "react";

let skewMs = 0;

/* /me kelgach chaqiriladi: server vaqti − mahalliy vaqt. */
export function setServerTime(iso: string | null | undefined): void {
  if (!iso) return;
  const t = Date.parse(iso);
  if (Number.isFinite(t)) skewMs = t - Date.now();
}

export function serverNow(): Date {
  return new Date(Date.now() + skewMs);
}

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let minuteKey = 0;

function schedule() {
  const now = serverNow().getTime();
  const next = Math.ceil((now + 1) / 60_000) * 60_000;
  timer = setTimeout(() => {
    minuteKey = Math.floor(serverNow().getTime() / 60_000);
    for (const l of listeners) l();
    schedule();
  }, next - now + 20);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!timer) {
    minuteKey = Math.floor(serverNow().getTime() / 60_000);
    schedule();
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

function snapshot(): number {
  if (!timer) minuteKey = Math.floor(serverNow().getTime() / 60_000);
  return minuteKey;
}

/* Daqiqa kaliti — faqat daqiqa almashganda qayta chiziladi. Serverda 0. */
export function useMinuteTick(): number {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

/* "20:40" — Toshkent (UTC+5, yozgi vaqt yo'q). */
export function tashkentHm(d: Date = serverNow()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
