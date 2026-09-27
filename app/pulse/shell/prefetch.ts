"use client";

/* Niyat bo'yicha oldindan yuklash (§3.2):
 *  - menyu bandiga hover/fokus 60 ms ushlab turilsa → o'sha sahifaning
 *    standart parametrli so'rovi `prefetchQuery` bilan olinadi;
 *  - birinchi sahifa tinchlangach (requestIdleCallback) → Analitika,
 *    Audio yozuvlar va Boshqaruv ma'lumotlari.
 * Marshrut JS'ini <Link prefetch> o'zi oladi. Sahifalar Pulse'ga
 * ko'chirilgach, o'z so'rovini shu reyestrga yozadi (registerPagePrefetch).
 * Hali ko'chirilmagan sahifada reyestr bo'sh — hech narsa qilinmaydi. */

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { RouteId } from "./routes";

type PrefetchFn = (qc: QueryClient) => Promise<unknown>;

const registry = new Map<RouteId, PrefetchFn>();

export function registerPagePrefetch(id: RouteId, fn: PrefetchFn): void {
  registry.set(id, fn);
}

export function prefetchRoute(qc: QueryClient, id: RouteId): void {
  const fn = registry.get(id);
  if (fn) void fn(qc).catch(() => {});
}

export function useIntentPrefetch(id: RouteId) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnter = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => prefetchRoute(qc, id), 60);
  }, [qc, id]);
  const onLeave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => onLeave, [onLeave]);
  return { onEnter, onLeave };
}

const IDLE_ROUTES: RouteId[] = ["analytics", "audio", "control"];

export function useIdlePrefetch(ready: boolean): void {
  const qc = useQueryClient();
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const run = () => IDLE_ROUTES.forEach((id) => prefetchRoute(qc, id));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }, [ready, qc]);
}
