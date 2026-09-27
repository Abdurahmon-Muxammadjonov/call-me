"use client";

/* Toast (§4.6): pastki-o'ng stek, --panel-3, --border-3, r16, 12/16,
 * 13 px, ton nuqtasi, ixtiyoriy amal havolasi, 5 s da o'zi yopiladi,
 * aria-live="polite". Eski `showToast()` (lib/toast.ts) chaqiruvlari ham
 * qobiq ichida shu yerga yo'naltiriladi — eski sahifalar ham ishlaydi. */

import { useEffect } from "react";
import { create } from "zustand";
import { OverlayPortal } from "./overlays";
import { Icon } from "./Icon";
import { TONE_VARS, type Tone } from "../lib/tones";
import { useToasts as useLegacyToasts, dismissToast as dismissLegacy } from "../../lib/toast";
import { usePT } from "../i18n";

export interface PToast {
  id: number;
  tone: Tone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  items: PToast[];
  push: (t: Omit<PToast, "id">) => number;
  dismiss: (id: number) => void;
}

let seq = 0;
const AUTO_MS = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (t) => {
    const id = ++seq;
    set({ items: [...get().items, { ...t, id }].slice(-4) });
    setTimeout(() => get().dismiss(id), AUTO_MS);
    return id;
  },
  dismiss: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
}));

export function toast(message: string, tone: Tone = "neutral", action?: PToast["action"]): number {
  return useToastStore.getState().push({ message, tone, action });
}

/* Eski store'dagi toastlarni Pulse ko'rinishida chiqaradi. */
function LegacyBridge() {
  const legacy = useLegacyToasts();
  useEffect(() => {
    for (const t of legacy) {
      toast(t.message, t.kind === "success" ? "good" : t.kind === "error" ? "bad" : "neutral");
      dismissLegacy(t.id);
    }
  }, [legacy]);
  return null;
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  const t = usePT();
  return (
    <>
      <LegacyBridge />
      <OverlayPortal>
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(380px,calc(100vw-32px))] flex-col items-end gap-2"
        >
          {items.map((it) => (
            <div
              key={it.id}
              role="status"
              className="pn-toast-in pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-pn-border-3 bg-pn-panel-3 px-4 py-3 text-[13px] text-pn-text"
            >
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: TONE_VARS[it.tone].fg }} />
              <span className="min-w-0 flex-1">{it.message}</span>
              {it.action && (
                <button
                  type="button"
                  onClick={() => {
                    it.action?.onClick();
                    dismiss(it.id);
                  }}
                  className="shrink-0 text-[13px] font-semibold text-pn-accent-strong underline-offset-2 hover:underline"
                >
                  {it.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(it.id)}
                aria-label={t("common.close")}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-pn-muted hover:text-pn-text"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      </OverlayPortal>
    </>
  );
}
