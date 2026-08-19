"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmployeeDashboard, EMP_TAB_PATH, empTabFromSegments, type EmpTab } from "../../components/EmployeeDashboard";
import { clearSession, useSession } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { CompanyProvider } from "../../lib/company";

/* /cabinet/[[...tab]] — the employee-role equivalent of /dashboard, kept
 * under its own URL namespace so a director and an employee never share a
 * route (each role has its own "bo'lim"/section). */
export default function CabinetPage() {
  const router = useRouter();
  const params = useParams<{ tab?: string[] }>();
  const session = useSession();
  const { isDark, toggle: toggleTheme } = useTheme();

  const activeTab = empTabFromSegments(params.tab);

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
      return;
    }
    if (session && session.role === "director") {
      router.replace("/dashboard");
    }
  }, [session, router]);

  function selectTab(id: EmpTab) {
    const segment = EMP_TAB_PATH[id];
    router.push(segment ? `/cabinet/${segment}` : "/cabinet");
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!session || session.role === "director") return null;

  return (
    <CompanyProvider>
      <EmployeeDashboard
        session={session}
        tab={activeTab}
        onSelectTab={selectTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
    </CompanyProvider>
  );
}
