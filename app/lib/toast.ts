"use client";

/* Global status-toast store — same external-store pattern as theme.ts/
 * i18n.ts/demoModal.ts, so any CRUD action anywhere in the dashboard
 * (add/edit/delete an operator, a criterion, ...) can surface a
 * success/error status without prop drilling or a context provider.
 * Rendered by <ToastHost/>, mounted once in AppShell/EmployeeDashboard. */

import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

const listeners = new Set<() => void>();
let toasts: ToastItem[] = [];
let seq = 0;

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): ToastItem[] {
  return toasts;
}

function getServerSnapshot(): ToastItem[] {
  return [];
}

const AUTO_DISMISS_MS = 3500;

export function showToast(message: string, kind: ToastKind = "success"): void {
  const id = `t${++seq}`;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
