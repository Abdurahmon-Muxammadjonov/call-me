"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthShell } from "../components/auth/AuthShell";
import { RegisterCompanyForm } from "../components/auth/RegisterCompanyForm";
import { BootSplash } from "../components/BootSplash";
import { ToastHost } from "../components/ToastHost";
import { saveSession, useSession, type Session } from "../lib/auth";
import { showToast } from "../lib/toast";

const BOOT_MS = 1200;

function homeFor(session: Session): string {
  return session.role === "director" ? "/dashboard" : "/cabinet";
}

export default function RegisterCompanyPage() {
  const router = useRouter();
  const session = useSession();
  const [booting, setBooting] = useState(false);

  // Unlike /login and /register, an already-signed-in visitor here isn't
  // necessarily lost — they might genuinely want to create a *second*
  // company. Still, defaulting to "take them to their existing dashboard"
  // is the safer, less surprising choice for a stray visit to this URL.
  useEffect(() => {
    if (session && !booting) router.replace(homeFor(session));
  }, [session, booting, router]);

  useEffect(() => {
    if (!booting || !session) return;
    const t = setTimeout(() => router.replace(homeFor(session)), BOOT_MS);
    return () => clearTimeout(t);
  }, [booting, session, router]);

  function handleSuccess(s: Session) {
    saveSession(s);
    showToast(`Xush kelibsiz, ${s.name}!`, "success");
    setBooting(true);
  }

  if (session && !booting) return null;

  return (
    <>
      {!booting && (
        <AuthShell variant="register-company">
          <RegisterCompanyForm onSuccess={handleSuccess} />
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
