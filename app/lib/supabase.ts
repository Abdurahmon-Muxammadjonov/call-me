"use client";

/* =====================================================================
 * Supabase browser client — lazy singleton.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. If either is
 * missing the client is `null` (logged once) so the app keeps running on the
 * REST-polling fallback in app/lib/realtime.ts — nothing crashes.
 * ===================================================================== */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// `undefined` = not yet resolved, `null` = resolved-but-unconfigured.
let cached: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    cached = null;
    if (typeof window !== "undefined") {
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY topilmadi — Realtime o'chirilgan, polling ishlamoqda."
      );
    }
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false },
    // Keep the socket light — these are low-frequency row updates.
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return cached;
}
