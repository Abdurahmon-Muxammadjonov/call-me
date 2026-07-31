"use client";

/* Tiny open/closed store for the demo-request modal — same
 * external-store pattern as theme.ts/i18n.ts, so any button anywhere on
 * the landing page (Hero, CTA banner, ...) can open it without prop
 * drilling or a React context provider. */

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let open = false;

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
  return open;
}

function getServerSnapshot(): boolean {
  return false;
}

export function openDemoModal(): void {
  open = true;
  emit();
}

export function closeDemoModal(): void {
  open = false;
  emit();
}

export function useDemoModalOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
