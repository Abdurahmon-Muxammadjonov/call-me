"use client";

/* Mavzu va aksent afzalliklari — tashqi store (useSyncExternalStore).
 *
 * Haqiqat manbai <html data-theme> (bo'yashdan oldin bootstrap skripti
 * qo'yadi). Afzallik (dark | light | system) cookie `sp_theme` da; "system"
 * bo'lsa OS sozlamasi jonli kuzatiladi. Eski kod (`.dark` klassi,
 * `procell-theme`) shu yerdan sinxron yangilanadi — lib/theme.ts endi
 * shu modulga yo'naltirilgan. */

import { useSyncExternalStore } from "react";
import { ACCENT_COOKIE, THEME_COOKIE } from "./bootstrap";
import { accentVars, isAccentKey, type AccentKey } from "./accent";

export type ThemePref = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function writeCookie(name: string, value: string): void {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getThemePref(): ThemePref {
  const c = readCookie(THEME_COOKIE);
  if (c === "dark" || c === "light" || c === "system") return c;
  try {
    const s = localStorage.getItem("procell-theme");
    if (s === "dark" || s === "light") return s;
  } catch {
    /* localStorage yopiq — tizim sozlamasi */
  }
  return "system";
}

function resolve(pref: ThemePref): ResolvedTheme {
  return pref === "system" ? (systemDark() ? "dark" : "light") : pref;
}

function apply(resolved: ResolvedTheme): void {
  const d = document.documentElement;
  d.setAttribute("data-theme", resolved);
  d.classList.toggle("dark", resolved === "dark");
}

let mql: MediaQueryList | null = null;
function onSystemChange() {
  if (getThemePref() === "system") {
    apply(resolve("system"));
    emit();
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (!mql && typeof window !== "undefined") {
    mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", onSystemChange);
  }
  return () => {
    listeners.delete(cb);
  };
}

export function setThemePref(pref: ThemePref): void {
  writeCookie(THEME_COOKIE, pref);
  const resolved = resolve(pref);
  try {
    // Eski sahifalar (landing, login, kabinet) shu kalitni o'qiydi.
    if (pref === "system") localStorage.removeItem("procell-theme");
    else localStorage.setItem("procell-theme", resolved);
  } catch {
    /* e'tiborsiz */
  }
  apply(resolved);
  emit();
}

function getResolved(): ResolvedTheme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/* Server va gidratatsiya: qorong'i (dizaynning asosiy mavzusi). Haqiqiy
 * qiymat allaqachon DOM'da — ikonka CSS orqali tanlanadi, sakrash yo'q. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, getResolved, () => "dark");
}

let prefCache: ThemePref = "system";
function getPrefSnapshot(): ThemePref {
  const p = getThemePref();
  prefCache = p;
  return prefCache;
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getPrefSnapshot, () => "system");
}

/* ---------- Aksent ---------- */

export function applyAccent(key: AccentKey): void {
  if (!isAccentKey(key)) return;
  const d = document.documentElement;
  for (const [k, v] of Object.entries(accentVars(key))) d.style.setProperty(k, v);
  if (readCookie(ACCENT_COOKIE) !== key) writeCookie(ACCENT_COOKIE, key);
}
