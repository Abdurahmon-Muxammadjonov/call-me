"use client";

import { useEffect } from "react";

/**
 * Bo'limlarni AVTOMATIK yangilab turadi — foydalanuvchi Cmd+R bosmasin.
 *
 * NEGA (2026-09-23): bo'limlar faqat Supabase realtime hodisalariga
 * (postgres_changes) tayanardi. Realtime ulanmasa yoki hodisa kelmasa
 * (tarmoq, sessiya, jadval realtime'ga qo'shilmagan bo'lsa) panel ESKI
 * ma'lumot bilan qotib qolardi — foydalanuvchi shuni aytdi: "hali ham
 * eski ma'lumot". Endi realtime USTIGA oddiy davriy yangilanish qo'shildi:
 * realtime ishlasa — bir zumda, ishlamasa — ko'pi bilan intervalMs ichida
 * yangilanadi.
 *
 * Qo'shimcha: brauzer tabiga qaytilganda (focus / visibilitychange) darhol
 * yangilanadi — boshqa ish bilan band bo'lib qaytgan odam eski raqamlarni
 * ko'rmaydi.
 *
 * Fon tabda (hidden) so'rov YUBORILMAYDI — bekorga trafik/token sarf
 * bo'lmasin va backend bo'sh yuklanmasin.
 */
export function useLiveRefresh(bump: () => void, intervalMs = 20_000): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") bump();
    };

    const timer = setInterval(refreshIfVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [bump, intervalMs]);
}
