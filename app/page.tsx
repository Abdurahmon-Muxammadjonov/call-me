"use client";

import { LoginScreen } from "./components/LoginScreen";
import { AppShell } from "./components/AppShell";
import { EmployeeDashboard } from "./components/EmployeeDashboard";
import { saveSession, clearSession, useSession, type Session } from "./lib/auth";
import { useTheme } from "./lib/theme";

export default function Home() {
  // Both come from external stores (localStorage / the <html> class) via
  // useSyncExternalStore, so they're hydration-safe with no mount gate or
  // setState-in-effect needed.
  const session = useSession();
  const { isDark, toggle: toggleTheme } = useTheme();

  function handleLogin(s: Session) {
    saveSession(s); // notifies the session store → this re-renders
  }

  function handleLogout() {
    clearSession();
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Directors see the full company dashboard; employees see only their own data.
  if (session.role === "director") {
    return (
      <AppShell
        session={session}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <EmployeeDashboard
      session={session}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    />
  );
}
