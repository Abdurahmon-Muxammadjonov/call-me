"use client";

/* "URL — holat" (§3.1): sahifa filtrlari search params'da. Filtr
 * o'zgarishi router.replace(…, { scroll: false }) bilan (tarixni
 * to'ldirmaydi), panel ochish kabi amallar push bilan.
 *
 * Poyga: router.replace asinxron — useSearchParams() yangilanishidan oldin
 * ikkinchi o'zgarish kelsa (tez ikki bosish), u eski parametrlardan
 * hisoblanib, birinchisini bekor qilardi. Shu sabab hali qo'llanmagan
 * oxirgi URL eslab qolinadi va keyingi o'zgarish undan hisoblanadi;
 * searchParams yangilangach (yoki Orqaga/Oldinga bosilganda) unutiladi. */

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const queue: { pending: { path: string; qs: string } | null } = { pending: null };
function setPending(v: { path: string; qs: string } | null): void {
  queue.pending = v;
}

export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const current = sp.toString();

  useEffect(() => {
    // Router URL'ni qo'lladi (yoki tashqi navigatsiya) — kutilayotgani yo'q.
    setPending(null);
  }, [current, pathname]);

  const get = useCallback((key: string) => sp.get(key), [sp]);

  const set = useCallback(
    (patch: Record<string, string | null | undefined>, mode: "replace" | "push" = "replace") => {
      const p = queue.pending;
      const base = p && p.path === pathname ? p.qs : current;
      const next = new URLSearchParams(base);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      setPending({ path: pathname, qs });
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [current, pathname, router]
  );

  return { get, set, params: sp };
}

export function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
