"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "./Icons";
import { useNotifications } from "../lib/realtime";

/* =====================================================================
 * NotificationBell — Apple-style bell asset:
 *   • dark rounded-square container
 *   • thin bell silhouette (1.8 stroke)
 *   • vibrant neon-blue dot pinned top-right, ONLY when unread > 0
 *
 * Click → Framer-Motion popover.
 *   • no unread items → empty state "Hali hech nima qo'shilmagan"
 *   • has items       → clean list of messages
 * Opening marks everything read, so the blue dot clears instantly (state).
 *
 * Drop-in: pass the active user's id; it subscribes to manager_notifications.
 * ===================================================================== */

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

export function NotificationBell({ userId }: { userId: string | undefined }) {
  const { items, unread, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening acknowledges everything → clears the blue dot immediately.
    if (next && unread > 0) markAllRead();
  }

  const hasItems = items.length > 0;

  return (
    <div ref={ref} className="relative">
      {/* ---- Bell asset: dark rounded-square + thin bell + neon dot ---- */}
      <button
        onClick={toggle}
        aria-label="Bildirishnomalar"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-slate-100 shadow-sm ring-1 ring-white/10 transition-all duration-300 hover:bg-slate-800 active:scale-95 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <Icons.bell className="h-[18px] w-[18px]" strokeWidth={1.6} />

        {/* Neon-blue notification dot — only when there are unread items */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 600, damping: 24 }}
              className="absolute right-2 top-2 h-2.5 w-2.5"
            >
              <span className="absolute inset-0 rounded-full bg-[#0a84ff] shadow-[0_0_8px_2px_rgba(10,132,255,0.8)] ring-2 ring-slate-900 dark:ring-slate-800" />
              {/* gentle ping halo */}
              <span className="absolute inset-0 animate-ping rounded-full bg-[#0a84ff]/70" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ---- Popover ---- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/90"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                Bildirishnomalar
              </p>
              {hasItems && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {items.length}
                </span>
              )}
            </div>

            {hasItems ? (
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {items.map((n, i) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-500/5"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0a84ff]/10 text-[#0a84ff]">
                      <Icons.spark className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              // Empty state
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600">
                  <Icons.bell className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {"Hali hech nima qo'shilmagan"}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
