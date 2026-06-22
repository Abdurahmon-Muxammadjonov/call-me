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

/* The two hardcoded directors who get the full company dashboard. */
const DIRECTORS = [
  { email: "abdurahmon@gmail.com", password: "123456", name: "Abdurahmon" },
  { email: "asror@gmail.com", password: "1234567", name: "Asror" },
];

/* Returns a Session on success, or null on bad credentials.
 *
 * Directors are checked first against the hardcoded list. Everyone else is
 * verified against the backend POST /users/login endpoint, which checks the
 * scrypt-hashed password server-side. */
export async function authenticate(email: string, password: string): Promise<Session | null> {
  const e = email.trim().toLowerCase();

  const director = DIRECTORS.find((d) => d.email === e && d.password === password);
  if (director) {
    return { role: "director", email: director.email, name: director.name, title: "Senior Manager" };
  }

  try {
    const emp = await authEmployee(email, password);
    if (emp) {
      return {
        role: "employee",
        email: emp.email,
        name: emp.name,
        title: emp.role,
        employeeId: emp.id,
      };
    }
  } catch {
    // backend unreachable — fall through to failure
  }

  return null;
}
