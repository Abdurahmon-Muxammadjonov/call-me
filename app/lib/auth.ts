"use client";

import { useSyncExternalStore } from "react";
import { authEmployee } from "./store";

export type Role = "director" | "employee";

export interface Session {
  role: Role;
  email: string;
  name: string;
  title: string;
  employeeId?: string;
}

/* ---------- Session persistence ----------
 * Remember the login so the user isn't re-prompted on every reload.
 * Employees are re-asked every 7 days; directors every 30 days. */
const SESSION_KEY = "procell-session";

const TTL_MS: Record<Role, number> = {
  employee: 7 * 24 * 60 * 60 * 1000, // 7 kun
  director: 30 * 24 * 60 * 60 * 1000, // ~1 oy
};

interface StoredSession {
  session: Session;
  expiresAt: number;
}

export function saveSession(session: Session): void {
  try {
    const payload: StoredSession = { session, expiresAt: Date.now() + TTL_MS[session.role] };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — ignore */
  }
  emitSession();
}

/* Returns the saved session if it exists and hasn't expired, else null
 * (and clears it if expired). */
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  emitSession();
}

/* ---------- Session as an external store ----------
 * Lets components read the persisted session via useSyncExternalStore — which
 * is hydration-safe (server snapshot is null) and avoids a setState-in-effect.
 * The snapshot is cached by the raw stored string so the returned reference is
 * stable between renders (otherwise useSyncExternalStore would loop). */
const sessionListeners = new Set<() => void>();
let sessionCache: { raw: string | null; value: Session | null } = { raw: null, value: null };

function emitSession(): void {
  for (const l of sessionListeners) l();
}

function subscribeSession(cb: () => void): () => void {
  sessionListeners.add(cb);
  // Reflect logins/logouts that happen in other tabs.
  window.addEventListener("storage", cb);
  return () => {
    sessionListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSessionSnapshot(): Session | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SESSION_KEY);
  } catch {
    raw = null;
  }
  if (raw !== sessionCache.raw) {
    sessionCache = { raw, value: loadSession() };
  }
  return sessionCache.value;
}

function getServerSessionSnapshot(): Session | null {
  return null;
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);
}

/* Returns a Session on success, or null on bad credentials.
 *
 * ALL logins (directors included) are verified server-side via
 * POST /users/login — the backend checks the scrypt-hashed password and returns
 * the user's `role`. There are NO credentials in the frontend: a `role` of
 * "director"/"admin" unlocks the full company dashboard, everyone else gets the
 * employee view. (Hardcoded directors were removed — see PROMPT_BACKEND_AUTH.md.) */
export async function authenticate(email: string, password: string): Promise<Session | null> {
  try {
    const emp = await authEmployee(email, password);
    if (!emp) return null;

    const isDirector = emp.role === "director" || emp.role === "admin";
    return {
      role: isDirector ? "director" : "employee",
      email: emp.email,
      name: emp.name,
      title: isDirector ? "Rahbar" : emp.role || "Operator",
      employeeId: emp.id,
    };
  } catch {
    // backend unreachable — treat as a failed login
    return null;
  }
}
