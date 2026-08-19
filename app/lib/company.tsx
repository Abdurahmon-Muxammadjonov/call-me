"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiUrl, authHeaders } from "./api";
import { clearSession, useSession } from "./auth";

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  plan: string;
  created_at: string;
}

/* avg_score is `null` (not 0) when the company has no scored calls yet —
 * that distinction matters, so it stays nullable all the way to the UI
 * instead of being coerced to 0 anywhere in this pipeline. */
export interface DashboardStats {
  total_calls: number;
  total_campaigns: number;
  avg_score: number | null;
  calls_this_month: number;
  active_agents: number;
}

interface CompanyContextValue {
  company: Company | null;
  stats: DashboardStats | null;
  /* True only while the very first load is in flight — refetch() doesn't
   * re-set this, so updating the logo doesn't flash the whole shell back
   * into a loading state. */
  loading: boolean;
  refetch: () => void;
  /* Lets a settings page (e.g. /settings/branding) apply an optimistic
   * update — new logo_url right after upload — without waiting on a
   * round trip through refetch(). */
  setCompany: (company: Company | null) => void;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

/* Fetches GET /company/me + GET /dashboard/stats once per session (both
 * need the Bearer token — see Session.token), and re-fetches whenever
 * refetch() is called. Wrap the dashboard/cabinet route trees with this so
 * every screen underneath reads company identity + stats from one place
 * instead of each re-fetching independently. A 401 from either endpoint
 * means the token is missing/expired: clear the session and bounce to
 * /login, same as any other "session died" path in this app. */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  // Callers only ever mount CompanyProvider once a session is confirmed to
  // exist (both /dashboard and /cabinet gate on it first), so this is true
  // at mount in practice; the `!session` guard below is a defensive
  // fallback that intentionally never touches `loading` itself, so there's
  // no setState directly in the effect body for that branch.
  const [loading, setLoading] = useState(() => Boolean(session));
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!session) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const headers = { Accept: "application/json", ...authHeaders(session.token) };
        const [companyRes, statsRes] = await Promise.all([
          fetch(apiUrl("/company/me"), { headers, signal: ctrl.signal }),
          fetch(apiUrl("/dashboard/stats"), { headers, signal: ctrl.signal }),
        ]);

        if (companyRes.status === 401 || statsRes.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (companyRes.ok) {
          const json = (await companyRes.json()) as { success: boolean; data?: Company };
          if (json.success && json.data) setCompany(json.data);
        }
        if (statsRes.ok) {
          const json = (await statsRes.json()) as { success: boolean; data?: DashboardStats };
          if (json.success && json.data) setStats(json.data);
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          // Network/backend-not-deployed-yet — leave company/stats null;
          // consumers already handle that as an empty/skeleton state.
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [session, router, tick]);

  return (
    <CompanyContext.Provider value={{ company, stats, loading, refetch, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany() must be used within a <CompanyProvider>.");
  return ctx;
}
