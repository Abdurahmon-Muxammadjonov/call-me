"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearSession, useHydrated, useSession } from "../../lib/auth";
import { CabinetPage, CABINET_TABS, type CabinetTab } from "../../pulse/pages/cabinet/CabinetPage";

/* /cabinet/[[...tab]] — xodim (operator) kabineti, Pulse Noir (2026-10-15).
 * Avval eski EmployeeDashboard edi (qo'ng'iroq ma'lumotlari ulanmagan).
 * Direktor bu yerga kirsa — /dashboard ga; sessiya yo'q — /login ga. */
export default function Page() {
  const router = useRouter();
  const params = useParams<{ tab?: string[] }>();
  const session = useSession();
  const hydrated = useHydrated();
  const seg = params.tab?.[0] ?? "";
  const tab: CabinetTab = CABINET_TABS.find((x) => x.path === seg)?.id ?? "overview";

  useEffect(() => {
    if (!hydrated) return;
    if (session === null) router.replace("/login");
    else if (session.role === "director") router.replace("/dashboard");
  }, [session, hydrated, router]);

  if (!session || session.role === "director") return null;

  return (
    <CabinetPage
      tab={tab}
      onTab={(id) => {
        const path = CABINET_TABS.find((x) => x.id === id)?.path ?? "";
        router.push(path ? `/cabinet/${path}` : "/cabinet");
      }}
      onLogout={() => {
        clearSession();
        router.replace("/login");
      }}
    />
  );
}
