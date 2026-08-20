"use client";

/* Per-company feature-gating — sits alongside CompanyProvider (see
 * lib/company.tsx), same "fetch once on dashboard load, read from context
 * everywhere" shape. "Umumiy ko'rinish" (dashboard) and "amoCRM ulanishi"
 * (webhook_integration) are the backend's own ALWAYS_UNLOCKED_SECTIONS and
 * never gated — every other nav item's padlock is driven from here via
 * NavItem.sectionKey (lib/data.ts). See PROMPT_BACKEND_SECTIONS.md for the
 * contract and the section-key mapping this frontend assumes. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiUrl, authHeaders } from "./api";
import { useSession } from "./auth";

export interface SectionState {
  is_locked: boolean;
  /* Whether this section is included in the company's current tariff at
   * all. true+locked  → the "enter unlock code" flow (already paid for,
   * just not redeemed yet). false+locked → the "upgrade tariff" flow
   * (not part of the current plan). */
  in_plan: boolean;
}

export type SectionsMap = Record<string, SectionState>;

interface SectionsContextValue {
  sections: SectionsMap;
  loading: boolean;
  refetch: () => void;
  /* True when a sectionKey isn't gated at all (no key, e.g. overview/amocrm)
   * or the backend has it unlocked. A key the backend hasn't sent back yet
   * defaults to LOCKED — the fail-safe direction for a paywall. */
  isUnlocked: (sectionKey: string | undefined) => boolean;
  /* Whether a (locked) section is part of the current tariff. Missing/
   * unknown keys default to false — same fail-safe direction, and it's
   * also correct behavior for tariff:null companies (nothing purchased
   * yet → everything routes to the upgrade flow, per spec). */
  inPlan: (sectionKey: string | undefined) => boolean;
  /* Optimistic local unlock right after a successful code redemption —
   * the padlock disappears instantly, no refetch/page-reload needed. A
   * background refetch() still runs to reconcile with the backend. */
  markUnlocked: (sectionKey: string) => void;
}

const SectionsContext = createContext<SectionsContextValue | null>(null);

interface SectionsApiRow {
  section_key: string;
  is_locked: boolean;
  in_plan: boolean;
}

export function SectionsProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [sections, setSections] = useState<SectionsMap>({});
  const [loading, setLoading] = useState(() => Boolean(session));
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!session) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(apiUrl("/company/sections"), {
          headers: { Accept: "application/json", ...authHeaders(session.token) },
          signal: ctrl.signal,
        });
        if (res.ok) {
          const json = (await res.json()) as { success: boolean; data?: SectionsApiRow[] };
          if (json.success && Array.isArray(json.data)) {
            const map: SectionsMap = {};
            for (const row of json.data) {
              map[row.section_key] = { is_locked: row.is_locked, in_plan: row.in_plan };
            }
            setSections(map);
          }
        }
        // 401 is handled by CompanyProvider's /company/me call already
        // firing on the same page; no need to duplicate the redirect here.
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          // Network/not-deployed-yet — sections stays {}; isUnlocked()/
          // inPlan() below fail closed for every gated item, which is the
          // safe default while we don't actually know the state.
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [session, tick]);

  const isUnlocked = useCallback(
    (sectionKey: string | undefined) => {
      if (!sectionKey) return true;
      return sections[sectionKey]?.is_locked === false;
    },
    [sections]
  );

  const inPlan = useCallback(
    (sectionKey: string | undefined) => {
      if (!sectionKey) return true;
      return sections[sectionKey]?.in_plan === true;
    },
    [sections]
  );

  const markUnlocked = useCallback((sectionKey: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: { in_plan: prev[sectionKey]?.in_plan ?? true, is_locked: false },
    }));
  }, []);

  return (
    <SectionsContext.Provider value={{ sections, loading, refetch, isUnlocked, inPlan, markUnlocked }}>
      {children}
    </SectionsContext.Provider>
  );
}

export function useSections(): SectionsContextValue {
  const ctx = useContext(SectionsContext);
  if (!ctx) throw new Error("useSections() must be used within a <SectionsProvider>.");
  return ctx;
}

/* POST /company/sections/unlock — redeems an admin/bot-issued code for one
 * already-in-plan section. Throws a friendly Uzbek message on failure so
 * the modal can show it inline. */
export async function unlockSection(token: string | undefined, sectionKey: string, code: string): Promise<void> {
  const res = await fetch(apiUrl("/company/sections/unlock"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders(token) },
    body: JSON.stringify({ section_key: sectionKey, code: code.trim() }),
  });
  if (res.status === 429) {
    throw new Error("Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.");
  }
  const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!res.ok || !json?.success) {
    if (res.status === 400) throw new Error(json?.error || "Kod noto'g'ri yoki eskirgan.");
    throw new Error(json?.error || "Kod noto'g'ri yoki eskirgan.");
  }
}
