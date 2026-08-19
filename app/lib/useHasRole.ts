"use client";

import { useSession } from "./auth";

/* Reusable role guard for UI elements — checks the *raw* backend role
 * string (session.rawRole: "director" | "admin" | "user" | ...), not the
 * two-value UI role (Session.role, which only distinguishes
 * "director"/"employee" for dashboard-vs-cabinet routing). Use this
 * wherever a finer-grained permission check is needed, e.g.:
 *
 *   const canEditBranding = useHasRole(["director", "admin"]);
 *   if (!canEditBranding) return null; // hide the settings link entirely
 *
 * This is a UI convenience only — every endpoint it gates MUST also be
 * enforced server-side (a hidden button is not access control). */
export function useHasRole(roles: string[]): boolean {
  const session = useSession();
  if (!session?.rawRole) return false;
  const allowed = roles.map((r) => r.toLowerCase());
  return allowed.includes(session.rawRole.toLowerCase());
}
