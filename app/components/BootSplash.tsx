"use client";

import { motion } from "framer-motion";
import { Logo, Skeleton } from "./ui";

/* =====================================================================
 * BootSplash — branded loading screen shown for ~1.5s after a successful
 * login (and on reload) before the dashboard animates in. Hides backend
 * latency behind a premium skeleton/loader instead of a hard cut.
 * ===================================================================== */

export function BootSplash({ durationMs = 1500 }: { durationMs?: number }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#060814]">
      {/* Ambient background — matches the login/app aesthetic */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-float rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-600/25" />
        <div className="absolute -bottom-40 -right-24 h-112 w-112 animate-float rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/20 [animation-delay:-3s]" />
      </div>

      <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-7 px-6">
        {/* Pulsing logo with a spinning accent ring */}
        <div className="relative grid place-items-center">
          <motion.span
            className="absolute h-20 w-20 rounded-2xl border-2 border-transparent border-t-indigo-500 border-r-cyan-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Logo compact />
          </motion.div>
        </div>

        {/* Shimmering skeleton lines */}
        <div className="w-full space-y-2.5">
          <Skeleton className="mx-auto h-3 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>

        {/* Determinate progress bar that fills over `durationMs` */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/60">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 via-violet-500 to-cyan-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: durationMs / 1000, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          Yuklanmoqda
        </p>
      </div>
    </div>
  );
}
