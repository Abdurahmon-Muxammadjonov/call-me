"use client";

/* Theme as an external store.
 *
 * The <html> `dark` class is the source of truth — it's set before paint by
 * the inline script in layout.tsx (no flash). We subscribe to it via
 * useSyncExternalStore so reading it is hydration-safe and doesn't need a
 * setState-in-effect (which React 19 flags as a cascading render). */

import { useSyncExternalStore } from "react";

const THEME_KEY = "procell-theme";
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

// Server (and first hydration paint) always reports light; the inline script
// has already applied the real class to <html>, so there's no visual flash.
function getServerSnapshot(): boolean {
  return false;
}

export function setTheme(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    /* localStorage unavailable — ignore */
  }
  emit();
}

export function useTheme(): { isDark: boolean; toggle: () => void } {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isDark, toggle: () => setTheme(!isDark) };
}
