"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LoginScreen } from "./components/LoginScreen";
import { AppShell } from "./components/AppShell";
import { EmployeeDashboard } from "./components/EmployeeDashboard";
import { BootSplash } from "./components/BootSplash";
import { saveSession, clearSession, useSession, type Session } from "./lib/auth";
import { useTheme } from "./lib/theme";

const BOOT_MS = 1500;

export default function Home() {
  // Both come from external stores (localStorage / the <html> class) via
  // useSyncExternalStore, so they're hydration-safe with no mount gate or
  // setState-in-effect needed.
  const session = useSession();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Boot gate: after a session appears (login or reload) we hold a branded
  // splash for ~BOOT_MS, then animate the dashboard in. `bootedFor` records the
  // session we've already revealed so the splash shows once per login.
  const [bootedFor, setBootedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (bootedFor === session.email) return; // already revealed
    // setState lives in the timer callback (async) — not the effect body.
    const t = setTimeout(() => setBootedFor(session.email), BOOT_MS);
    return () => clearTimeout(t);
  }, [session, bootedFor]);

  function handleLogin(s: Session) {
    saveSession(s); // notifies the session store → this re-renders
  }

  function handleLogout() {
    clearSession();
    setBootedFor(null); // next login splashes again
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const booting = bootedFor !== session.email;

  // Directors see the full company dashboard; employees see only their own data.
  const dashboard =
    session.role === "director" ? (
      <AppShell session={session} isDark={isDark} onToggleTheme={toggleTheme} onLogout={handleLogout} />
    ) : (
      <EmployeeDashboard session={session} isDark={isDark} onToggleTheme={toggleTheme} onLogout={handleLogout} />
    );

  return (
    <>
      {/* Rendered once the splash is done; fades in (opacity only — no transform,
          so the dashboard's `fixed`/`sticky` children stay anchored). */}
      {!booting && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}>
          {dashboard}
        </motion.div>
      )}

      {/* Splash overlays on top, then fades out as the dashboard fades in. */}
      <AnimatePresence>
        {booting && (
          <motion.div key="boot" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <BootSplash durationMs={BOOT_MS} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
