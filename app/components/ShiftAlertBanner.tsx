"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "./Icons";
import type { ShiftEvent } from "../lib/realtime";

/* =====================================================================
 * ShiftAlertBanner — a glassmorphic, Framer-Motion micro-animation that
 * drops in from the top when a shift event arrives.
 *   • start → calm emerald "Sizning ish vaqtingiz boshlandi!"
 *   • end   → high-visibility amber "Sizning ish vaqtingiz tugadi!"
 * Auto-dismisses after `autoHideMs`, or on click of the close affordance.
 * Apple motion: soft spring in, gentle fade/scale out, no bounce overshoot.
 * ===================================================================== */

const COPY: Record<ShiftEvent["type"], { title: string; sub: string }> = {
  start: {
    title: "Sizning ish vaqtingiz boshlandi!",
    sub: "Samarali smena tilaymiz — qo'ng'iroqlar kutmoqda.",
  },
  end: {
    title: "Sizning ish vaqtingiz tugadi!",
    sub: "Smenani yakunlang va tizimdan chiqishni unutmang.",
  },
};

/* Per-type palette. `start` = success, `end` = warning (more saturated). */
const THEME: Record<
  ShiftEvent["type"],
  { ring: string; glow: string; iconWrap: string; icon: keyof typeof Icons; bar: string }
> = {
  start: {
    ring: "ring-emerald-400/30",
    glow: "shadow-[0_20px_60px_-20px_rgba(16,185,129,0.55)]",
    iconWrap: "bg-linear-to-br from-emerald-400 to-teal-500",
    icon: "play",
    bar: "bg-emerald-400",
  },
  end: {
    ring: "ring-amber-400/40",
    glow: "shadow-[0_20px_60px_-20px_rgba(245,158,11,0.6)]",
    iconWrap: "bg-linear-to-br from-amber-400 to-orange-500",
    icon: "clock",
    bar: "bg-amber-400",
  },
};

export function ShiftAlertBanner({
  event,
  onDismiss,
  autoHideMs = 6000,
}: {
  event: ShiftEvent | null;
  onDismiss: () => void;
  autoHideMs?: number;
}) {
  // Auto-hide timer, reset whenever a new event id arrives.
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [event, autoHideMs, onDismiss]);

  const theme = event ? THEME[event.type] : null;
  const copy = event ? COPY[event.type] : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-120 flex justify-center px-4">
      <AnimatePresence>
        {event && theme && copy && (
          <motion.div
            key={event.id}
            // Soft spring drop-in; gentle scale/opacity exit.
            initial={{ y: -64, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.8 }}
            className={`pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-white/40 bg-white/70 px-4 py-3.5 ring-1 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60 ${theme.ring} ${theme.glow}`}
          >
            <div className="flex items-center gap-3.5">
              {/* Icon medallion with a subtle breathing pulse */}
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ${theme.iconWrap}`}
              >
                {(() => {
                  const Icon = Icons[theme.icon];
                  return <Icon className="h-5 w-5" />;
                })()}
              </motion.span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-800 dark:text-white">
                  {copy.title}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{copy.sub}</p>
              </div>

              <button
                onClick={onDismiss}
                aria-label="Yopish"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icons.close className="h-4 w-4" />
              </button>
            </div>

            {/* Auto-hide progress bar that shrinks to zero over autoHideMs */}
            <motion.span
              key={`${event.id}-bar`}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoHideMs / 1000, ease: "linear" }}
              style={{ transformOrigin: "left" }}
              className={`absolute inset-x-0 bottom-0 h-0.5 ${theme.bar}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
