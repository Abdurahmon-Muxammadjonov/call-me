"use client";

/* =====================================================================
 * useManagerRealtime — sub-second Supabase Realtime listener.
 *
 * Subscribes to UPDATE events on the `managers` row of the logged-in user and
 * mutates local state the instant the admin edits the row — no page reload:
 *   • first_name / last_name      → visible profile name updates in ~1s
 *   • shift_start_time / shift_end_time → in-memory shift updates live
 *
 * Returns the freshest values (null until the first event), so the consuming
 * component re-renders immediately. Optional callbacks let you push the change
 * into a global store/header if you prefer that over the returned values.
 *
 * Falls back to a no-op when Supabase isn't configured (env keys absent) — the
 * REST polling in app/lib/realtime.ts then covers the same updates at ~8s.
 * ===================================================================== */

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

/* Operators live in the `users` table (session.employeeId = users.id), and the
 * REST layer already reads/writes there — so Realtime listens to `users` too,
 * keeping a single source of truth. Change here if your schema differs. */
const TABLE = "users";
const PK = "id"; // filtered as `${PK}=eq.<managerId>`

export interface ManagerShift {
  start: string;
  end: string;
}

/** Shape of the columns we read off the realtime payload's `new` row. */
interface ManagerRow {
  first_name?: string | null;
  last_name?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
}

export interface ManagerRealtimeOptions {
  initialName?: string;
  initialShift?: ManagerShift | null;
  /** Fired with the composed full name when first/last name changes. */
  onNameChange?: (name: string) => void;
  /** Fired with the new shift when start/end time changes. */
  onShiftChange?: (shift: ManagerShift) => void;
}

export interface ManagerRealtime {
  /** Composed `first last`; null until an UPDATE arrives. */
  name: string | null;
  /** Latest shift; null until an UPDATE arrives. */
  shift: ManagerShift | null;
  /** Whether the realtime channel is actually live (Supabase configured). */
  live: boolean;
}

export function useManagerRealtime(
  managerId: string | undefined,
  options: ManagerRealtimeOptions = {}
): ManagerRealtime {
  const [name, setName] = useState<string | null>(options.initialName ?? null);
  const [shift, setShift] = useState<ManagerShift | null>(options.initialShift ?? null);
  const [live, setLive] = useState(false);

  // Hold callbacks in a ref so the subscription effect doesn't re-subscribe on
  // every render (callbacks are usually fresh closures). Synced in a commit
  // effect — not during render.
  const cbRef = useRef(options);
  useEffect(() => {
    cbRef.current = options;
  });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !managerId) return;

    const channel: RealtimeChannel = supabase
      .channel(`realtime:${TABLE}:${managerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: TABLE,
          filter: `${PK}=eq.${managerId}`,
        },
        (payload) => {
          // setState here runs in an async socket callback — not synchronously
          // in the effect body — so it's the React-blessed place to mutate.
          const row = payload.new as ManagerRow;

          // ----- Name -----
          const composed = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
          if (composed) {
            setName(composed);
            cbRef.current.onNameChange?.(composed);
          }

          // ----- Shift -----
          if (row.shift_start != null || row.shift_end != null) {
            const next: ManagerShift = {
              start: row.shift_start ?? "",
              end: row.shift_end ?? "",
            };
            setShift(next);
            cbRef.current.onShiftChange?.(next);
          }
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    // Clean-up: drop the channel on unmount / id change → no socket leak.
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [managerId]);

  return { name, shift, live };
}
