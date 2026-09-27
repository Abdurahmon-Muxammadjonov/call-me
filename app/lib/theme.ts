"use client";

/* Eski API (landing, login, kabinet, sozlamalar) — endi yagona mavzu
 * store'iga (pulse/lib/prefs.ts) yo'naltirilgan, shunda yon menyudagi
 * yangi tugma bilan eski ThemeToggle doim bir xil holatda turadi.
 * <html> dagi `data-theme` + `.dark` klassini bo'yashdan oldingi skript
 * qo'yadi (layout.tsx), shu sabab sakrash yo'q. */

import { setThemePref, useResolvedTheme } from "../pulse/lib/prefs";

export function setTheme(dark: boolean): void {
  setThemePref(dark ? "dark" : "light");
}

export function useTheme(): { isDark: boolean; toggle: () => void } {
  const isDark = useResolvedTheme() === "dark";
  return { isDark, toggle: () => setTheme(!isDark) };
}
