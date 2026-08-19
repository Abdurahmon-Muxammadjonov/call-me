"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthShell } from "../components/auth/AuthShell";
import { RegisterForm } from "../components/auth/RegisterForm";
import { BootSplash } from "../components/BootSplash";
import { ToastHost } from "../components/ToastHost";
import { saveSession, useSession, type Session } from "../lib/auth";
import { showToast } from "../lib/toast";

const BOOT_MS = 1200;

function homeFor(session: Session): string {
  return session.role === "director" ? "/dashboard" : "/cabinet";
}

export default function RegisterPage() {
  const router = useRouter();
  const session = useSession();
  const [booting, setBooting] = useState(false);

  useEffect(() => {
    if (session && !booting) router.replace(homeFor(session));
  }, [session, booting, router]);

  useEffect(() => {
    if (!booting || !session) return;
    const t = setTimeout(() => router.replace(homeFor(session)), BOOT_MS);
    return () => clearTimeout(t);
  }, [booting, session, router]);

  function handleRegistered(s: Session) {
    saveSession(s);
    showToast(`Xush kelibsiz, ${s.name}!`, "success");
    setBooting(true);
  }

  if (session && !booting) return null;

  return (
    <>
      {!booting && (
        <AuthShell variant="register">
          <RegisterForm onRegistered={handleRegistered} />
        </AuthShell>
      )}
      <AnimatePresence>
        {booting && (
          <motion.div key="boot" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <BootSplash durationMs={BOOT_MS} />
          </motion.div>
        )}
      </AnimatePresence>
      <ToastHost />
    </>
  );
}
