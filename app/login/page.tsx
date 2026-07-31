"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LoginScreen } from "../components/LoginScreen";
import { BootSplash } from "../components/BootSplash";
import { saveSession, useSession, type Session } from "../lib/auth";

const BOOT_MS = 1500;

function homeFor(session: Session): string {
  return session.role === "director" ? "/dashboard" : "/cabinet";
}

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [booting, setBooting] = useState(false);

  // Already signed in (fresh visit, reload, or back-navigation) → skip the
  // form and go straight to the right area instead of showing login again.
  useEffect(() => {
    if (session && !booting) router.replace(homeFor(session));
  }, [session, booting, router]);

  // Post-login splash: hold it for BOOT_MS, then hand off to the role's area.
  useEffect(() => {
    if (!booting || !session) return;
    const t = setTimeout(() => router.replace(homeFor(session)), BOOT_MS);
    return () => clearTimeout(t);
  }, [booting, session, router]);

  function handleLogin(s: Session) {
    saveSession(s); // notifies the session store → `session` updates above
    setBooting(true);
  }

  if (session && !booting) return null;

  return (
    <>
      {!booting && <LoginScreen onLogin={handleLogin} />}
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
