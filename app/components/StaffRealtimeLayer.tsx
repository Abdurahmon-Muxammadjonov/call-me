"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "./Icons";
import { ShiftAlertBanner } from "./ShiftAlertBanner";
import { useCredentialWatch, useShiftEvents, type CredentialChange } from "../lib/realtime";
import { clearSession, type Session } from "../lib/auth";

/* =====================================================================
 * StaffRealtimeLayer — invisible orchestrator mounted on the staff dashboard.
 * Hosts the real-time side-effects so the dashboard body stays clean:
 *   • credential watch  → KickOutModal + forced logout
 *   • shift events      → ShiftAlertBanner
 * Render it once near the root of the employee view.
 * ===================================================================== */

export function StaffRealtimeLayer({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  // `change` latches once fired (the watcher never resets it to null), so it
  // can drive the modal directly — no extra state/effect needed.
  const change = useCredentialWatch(session.employeeId, session.email);
  const { event, dismiss } = useShiftEvents(session.employeeId);

  function bootToLogin() {
    clearSession(); // wipe local auth state…
    onLogout(); // …and let the app fall back to the login screen
  }

  return (
    <>
      <ShiftAlertBanner event={event} onDismiss={dismiss} />
      <KickOutModal change={change} onConfirm={bootToLogin} />
    </>
  );
}

/* ---------- Kick-out alert ---------- */
function KickOutModal({
  change,
  onConfirm,
}: {
  change: CredentialChange | null;
  onConfirm: () => void;
}) {
  // Build the exact message describing what the admin changed.
  const what = change
    ? change.emailChanged && change.passwordChanged
      ? "emailingiz va parolingiz"
      : change.emailChanged
      ? "emailingiz"
      : "parolingiz"
    : "";

  return (
    <AnimatePresence>
      {change && (
        <motion.div
          className="fixed inset-0 z-200 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop — not dismissible: the user MUST re-authenticate. */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/40 bg-white/90 p-7 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 500, damping: 22 }}
              className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-rose-500 to-pink-500 text-white shadow-lg"
            >
              <Icons.lock className="h-7 w-7" />
            </motion.span>

            <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-800 dark:text-white">
              {`Sizning ${what} o'zgartirildi!`}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Administrator hisob ma&apos;lumotlaringizni yangiladi. Xavfsizlik uchun qaytadan
              tizimga kirishingiz kerak.
            </p>

            <button
              onClick={onConfirm}
              className="mt-6 w-full rounded-xl bg-linear-to-r from-rose-500 to-pink-500 px-4 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
            >
              Login sahifasiga o&apos;tish
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
