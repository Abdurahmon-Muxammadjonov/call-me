"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "./Icons";
import { dismissToast, useToasts, type ToastKind } from "../lib/toast";
import { Portal } from "./Portal";

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-400/40 bg-emerald-500/95 text-white",
  error: "border-rose-400/40 bg-rose-500/95 text-white",
  info: "border-blue-400/40 bg-blue-600/95 text-white",
};

const ICONS: Record<ToastKind, keyof typeof Icons> = {
  success: "check",
  error: "close",
  info: "bell",
};

/* Mount once per dashboard shell (AppShell, EmployeeDashboard). Portal'd
 * for the same reason every modal is — otherwise it'd be trapped inside
 * the transform-created stacking context of the animated content area and
 * could render under the header. */
export function ToastHost() {
  const toasts = useToasts();

  return (
    <Portal>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-200 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = Icons[ICONS[t.kind]];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${STYLES[t.kind]}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{t.message}</span>
                <button
                  onClick={() => dismissToast(t.id)}
                  className="shrink-0 opacity-80 transition-opacity hover:opacity-100"
                  aria-label="Yopish"
                >
                  <Icons.close className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Portal>
  );
}
