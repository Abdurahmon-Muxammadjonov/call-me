"use client";

/* =====================================================================
 * Real-time state listeners — transport-agnostic.
 *
 * The product spec calls for Supabase Realtime subscriptions. The SalesPulse
 * frontend currently has NO direct Supabase connection (it talks only to the
 * Express API at API_BASE), so this module implements the SAME listener
 * contract via lightweight REST polling today, behind a single `subscribe()`
 * seam. The moment a Supabase anon key + Realtime is enabled, swap the body of
 * `subscribe()` for a `supabase.channel(...).on('postgres_changes', ...)` and
 * every hook below keeps working unchanged.
 *
 * Exposed hooks:
 *   useLiveProfile(employeeId, fallback)  → name auto-syncs when admin edits it
 *   useCredentialWatch(employeeId, email) → fires when email/password changes
 *   useNotifications(userId)              → manager_notifications + unread dot
 *   useShiftEvents(userId)                → start/end shift events for the banner
 * ===================================================================== */

import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./api";

/* ---------- Generic polling seam ----------
 * Calls `fetcher` immediately, then every `intervalMs`. Returns an unsubscribe.
 * This is the single place to replace with a true Supabase Realtime channel. */
function subscribe<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  onData: (value: T) => void,
  intervalMs: number
): () => void {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const tick = async () => {
    try {
      const value = await fetcher(ctrl.signal);
      if (!stopped) onData(value);
    } catch {
      /* network/abort — swallow; next tick retries */
    }
  };

  void tick();
  timer = setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    ctrl.abort();
  };
  /* --- Supabase Realtime equivalent (drop-in replacement) ---
   * const ch = supabase
   *   .channel(`row:${table}:${id}`)
   *   .on('postgres_changes',
   *       { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${id}` },
   *       (payload) => onData(payload.new as T))
   *   .subscribe();
   * return () => { supabase.removeChannel(ch); };
   */
}

async function getJson<T>(path: string, signal: AbortSignal): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" }, signal });
  if (res.status === 404) return null; // endpoint/row not present yet → graceful
  const json = (await res.json()) as { success?: boolean; data?: T };
  if (!res.ok || json?.success === false) return null;
  return (json.data ?? (json as unknown as T)) ?? null;
}

/* ===================================================================== */
/* Profile snapshot returned by GET /users/:id                           */
/* ===================================================================== */
export interface ProfileSnapshot {
  id: string;
  name: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  /* Bumped server-side whenever the admin changes the password/email. Lets us
   * detect a password change we can't otherwise see (no hash is exposed). */
  credentials_changed_at?: string | null;
}

function fullName(p: ProfileSnapshot): string {
  const composed = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return composed || p.name;
}

/* ---------- 1. Dynamic name sync ----------
 * Polls the profile and returns the freshest display name. When the admin edits
 * first_name / last_name / name, the value mutates instantly in place — no
 * reload — because the subscription pushes the new snapshot into state. */
export function useLiveProfile(employeeId: string | undefined, fallback: string): string {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    if (!employeeId) return;
    return subscribe<ProfileSnapshot | null>(
      (signal) => getJson<ProfileSnapshot>(`/users/${employeeId}`, signal),
      (p) => p && setName(fullName(p)),
      8_000
    );
  }, [employeeId]);

  // Keep showing the login-time name until the first snapshot lands.
  return name === fallback ? fallback : name;
}

/* ---------- 2. Instant kick-out interceptor ---------- */
export interface CredentialChange {
  emailChanged: boolean;
  passwordChanged: boolean;
}

/** Watches the active user's credentials. Resolves to a CredentialChange the
 * first time the email or the credentials-stamp differs from the login values,
 * so the caller can alert + boot to login. Returns null until that happens. */
export function useCredentialWatch(
  employeeId: string | undefined,
  loginEmail: string
): CredentialChange | null {
  const [change, setChange] = useState<CredentialChange | null>(null);
  // Baseline captured at login; compared against every snapshot.
  const baseEmail = useRef(loginEmail.trim().toLowerCase());
  const baseStamp = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!employeeId) return;
    // Reset the baseline refs for this subscription (refs, not state — safe in
    // an effect body). `change` only ever transitions null → set, in the async
    // callback below, so no synchronous state reset is needed here.
    baseEmail.current = loginEmail.trim().toLowerCase();
    baseStamp.current = undefined;

    return subscribe<ProfileSnapshot | null>(
      (signal) => getJson<ProfileSnapshot>(`/users/${employeeId}`, signal),
      (p) => {
        if (!p) return;
        // First snapshot establishes the credentials baseline.
        if (baseStamp.current === undefined) {
          baseStamp.current = p.credentials_changed_at ?? null;
          if (!baseEmail.current) baseEmail.current = p.email.trim().toLowerCase();
          return;
        }
        const emailChanged = p.email.trim().toLowerCase() !== baseEmail.current;
        const passwordChanged =
          (p.credentials_changed_at ?? null) !== baseStamp.current;
        if (emailChanged || passwordChanged) {
          setChange({ emailChanged, passwordChanged });
        }
      },
      6_000
    );
  }, [employeeId, loginEmail]);

  return change;
}

/* ===================================================================== */
/* 3. manager_notifications                                              */
/* ===================================================================== */
export interface NotificationItem {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export interface NotificationsState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  markAllRead: () => void;
}

export function useNotifications(userId: string | undefined): NotificationsState {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Locally-acknowledged ids — clears the dot instantly on open without waiting
  // for the server round-trip (which is fired in markAllRead).
  const [ackIds, setAckIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    return subscribe<NotificationItem[] | null>(
      (signal) => getJson<NotificationItem[]>(`/manager-notifications?user_id=${userId}`, signal),
      (list) => {
        setItems(list ?? []);
        setLoading(false);
      },
      15_000
    );
  }, [userId]);

  const unread = items.filter((n) => !n.read && !ackIds.has(n.id)).length;

  function markAllRead() {
    // Optimistic: clear the dot now…
    setAckIds(new Set(items.map((n) => n.id)));
    // …and persist server-side (best-effort; ignored if endpoint absent).
    if (!userId) return;
    void fetch(`${API_BASE}/manager-notifications/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {});
  }

  return { items, unread, loading, markAllRead };
}

/* ===================================================================== */
/* 3b. Assigned scripts → the employee's "Tavsiyalar"                    */
/* ===================================================================== */
export interface ScriptItem {
  id: string;
  title: string;
  enabled: boolean;
}

/* ---------- Shift times (admin-controlled) ---------- */
export interface ShiftTimes {
  start: string; // "09:00"
  end: string; // "18:00"
}

/** Live shift times the admin set in StaffManager. Same source the admin
 * writes (PUT /users/:id/shift), so an admin edit reflects on the employee's
 * "Ish vaqtim" within one tick. Empty strings until the first snapshot. */
export function useShift(userId: string | undefined): ShiftTimes {
  const [shift, setShift] = useState<ShiftTimes>({ start: "", end: "" });

  useEffect(() => {
    if (!userId) return;
    return subscribe<{ data?: ShiftTimes } | ShiftTimes | null>(
      (signal) => getJson<ShiftTimes>(`/users/${userId}/shift`, signal),
      (s) => {
        const v = (s as { data?: ShiftTimes })?.data ?? (s as ShiftTimes | null);
        if (v && (v.start || v.end)) setShift({ start: v.start ?? "", end: v.end ?? "" });
      },
      8_000
    );
  }, [userId]);

  return shift;
}

/** Live list of scripts the admin assigned to this user. Polls the same source
 * StaffManager writes to, so an admin edit shows up in the employee's
 * Tavsiyalar within one tick — single source of truth, both sides in sync. */
export function useScripts(userId: string | undefined): ScriptItem[] {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    return subscribe<ScriptItem[] | null>(
      (signal) => getJson<ScriptItem[]>(`/users/${userId}/scripts`, signal),
      (list) => setScripts(list ?? []),
      10_000
    );
  }, [userId]);

  return scripts;
}

/* ===================================================================== */
/* 4. Shift events (start / end) for the banner                          */
/* ===================================================================== */
export interface ShiftEvent {
  id: string;
  type: "start" | "end";
  at: string;
}

/** Returns the latest unseen shift event exactly once. Seen ids are persisted
 * to localStorage so a refresh doesn't replay the same banner. */
export function useShiftEvents(userId: string | undefined): {
  event: ShiftEvent | null;
  dismiss: () => void;
} {
  const [event, setEvent] = useState<ShiftEvent | null>(null);
  const seenKey = userId ? `procell-shift-seen-${userId}` : "";

  useEffect(() => {
    if (!userId) return;
    return subscribe<ShiftEvent | null>(
      (signal) => getJson<ShiftEvent>(`/shifts/events/latest?user_id=${userId}`, signal),
      (ev) => {
        if (!ev) return;
        let seen: string[] = [];
        try {
          seen = JSON.parse(localStorage.getItem(seenKey) || "[]");
        } catch {
          seen = [];
        }
        if (seen.includes(ev.id)) return;
        try {
          localStorage.setItem(seenKey, JSON.stringify([...seen, ev.id].slice(-20)));
        } catch {
          /* ignore */
        }
        setEvent(ev);
      },
      20_000
    );
  }, [userId, seenKey]);

  return { event, dismiss: () => setEvent(null) };
}
