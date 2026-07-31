"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell, TAB_PATH, tabFromSegments } from "../../components/AppShell";
import { clearSession, useSession } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import type { TabId } from "../../lib/data";

/* /dashboard/[[...tab]] — every director section gets its own URL (e.g.
 * /dashboard/comparison, /dashboard/criteria) instead of living in
 * in-memory tab state. That also means a reload keeps you on the same
 * section, and the browser back/forward buttons work as expected. */
export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ tab?: string[] }>();
  const session = useSession();
  const { isDark, toggle: toggleTheme } = useTheme();

  const activeTab = tabFromSegments(params.tab);

  useEffect(() => {
    if (session === null) {
      router.replace("/login");
      return;
    }
    if (session && session.role !== "director") {
      router.replace("/cabinet");
    }
  }, [session, router]);

  function selectTab(id: TabId) {
    const segment = TAB_PATH[id];
    router.push(segment ? `/dashboard/${segment}` : "/dashboard");
  }

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!session || session.role !== "director") return null;

  return (
    <AppShell
      session={session}
      activeTab={activeTab}
      onSelectTab={selectTab}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    />
  );
}
