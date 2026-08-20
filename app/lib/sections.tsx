"use client";

/* Per-company feature-gating — sits alongside CompanyProvider (see
 * lib/company.tsx), same "fetch once on dashboard load, read from context
 * everywhere" shape. "Umumiy ko'rinish" (dashboard) and "amoCRM ulanishi"
 * (webhook integration) are never gated — every other nav item's padlock
 * is driven from here via NavItem.sectionKey (lib/data.ts). See
 * PROMPT_BACKEND_SECTIONS.md for the exact contract this expects and the
 * section-key mapping this frontend assumes. */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiUrl, authHeaders } from "./api";
import { useSession } from "./auth";

export interface SectionState {
  is_locked: boolean;
}

export type SectionsMap = Record<string, SectionState>;

interface SectionsContextValue {
  sections: SectionsMap;
  loading: boolean;
  refetch: () => void;
  /* True when a sectionKey isn't gated at all (no key, e.g. overview/amocrm)
   * or the backend has it unlocked. Unknown keys the backend hasn't sent
   * back yet default to LOCKED — matching "new companies are seeded with
   * everything but dashboard/webhook locked", the fail-safe direction for
   * a paywall (a mapping miss shows an extra padlock, not an accidental
   * unlock). */
  isUnlocked: (sectionKey: string | undefined) => boolean;
  /* Optimistic local unlock right after a successful code redemption —
   * the padlock disappears instantly, no refetch/page-reload needed. */
  markUnlocked: (sectionKey: string) => void;
}

const SectionsContext = createContext<SectionsContextValue | null>(null);

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
          const json = (await res.json()) as { success: boolean; data?: SectionsMap };
          if (json.success && json.data) setSections(json.data);
        }
        // 401 is handled by CompanyProvider's /company/me call already
        // firing on the same page; no need to duplicate the redirect here.
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") {
          // Network/not-deployed-yet — sections stays {}; isUnlocked()
          // below fails closed (locked) for every gated item, which is
          // the safe default while we don't actually know the state.
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

  const markUnlocked = useCallback((sectionKey: string) => {
    setSections((prev) => ({ ...prev, [sectionKey]: { is_locked: false } }));
  }, []);

  return (
    <SectionsContext.Provider value={{ sections, loading, refetch, isUnlocked, markUnlocked }}>
      {children}
    </SectionsContext.Provider>
  );
}

export function useSections(): SectionsContextValue {
  const ctx = useContext(SectionsContext);
  if (!ctx) throw new Error("useSections() must be used within a <SectionsProvider>.");
  return ctx;
}

/* POST /company/sections/unlock — redeems an admin-issued code for one
 * section. Throws a friendly Uzbek message on failure (invalid/already-used
 * code, or any other backend error) so the modal can show it inline. */
export async function unlockSection(token: string | undefined, sectionKey: string, code: string): Promise<void> {
  const res = await fetch(apiUrl("/company/sections/unlock"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders(token) },
    body: JSON.stringify({ section: sectionKey, code: code.trim() }),
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || "Kod noto'g'ri yoki allaqachon ishlatilgan.");
  }
}
