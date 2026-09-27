"use client";

/* Qobiq egalik qiladigan YAGONA jonli ulanish (§3.2). v2 SSE tayyor
 * bo'lguncha — Supabase Realtime (`calls` INSERT). Holat LiveDot'ga
 * uzatiladi: SUBSCRIBED → JONLI, xato/uzilish → ULANMOQDA, brauzer 60 s
 * dan ortiq oflayn → OFLAYN. Supabase sozlanmagan bo'lsa holat
 * "unknown" qoladi va sahifalar jonli so'zlarni ko'rsatmaydi. */

import { useEffect } from "react";
import { getSupabase } from "../../lib/supabase";
import { useLiveStore } from "./liveStore";

/* Kompaniya operatorlari (/managers — kompaniya doirasida). Ma'lum
 * bo'lgach, notanish operatorning qo'ng'iroqlari qabul qilinmaydi —
 * boshqa kompaniya ma'lumoti qo'ng'iroqchada ko'rinmasin. */
let knownIds: ReadonlySet<string> | null = null;

export function useShellRealtime(enabled: boolean, knownManagerIds: ReadonlySet<string> | null) {
  useEffect(() => {
    knownIds = knownManagerIds;
  }, [knownManagerIds]);

  useEffect(() => {
    if (!enabled) return;
    const store = useLiveStore.getState();
    let offlineTimer: ReturnType<typeof setTimeout> | null = null;

    const onOffline = () => {
      useLiveStore.getState().setLive("reconnecting");
      offlineTimer = setTimeout(() => useLiveStore.getState().setLive("offline"), 60_000);
    };
    const onOnline = () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      offlineTimer = null;
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const sb = getSupabase();
    if (!sb) {
      store.setLive("unknown");
      return () => {
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
      };
    }
    store.setLive("reconnecting");
    const channel = sb
      .channel("pn-shell-calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, (payload) => {
        const row = payload.new as { id?: string; manager_id?: string | null; created_at?: string };
        if (!row?.id || !row.created_at) return;
        if (knownIds && row.manager_id && !knownIds.has(row.manager_id)) return;
        useLiveStore.getState().pushCall({ id: row.id, managerId: row.manager_id ?? null, createdAt: row.created_at });
      })
      .subscribe((status) => {
        const s = useLiveStore.getState();
        if (status === "SUBSCRIBED") {
          if (offlineTimer) clearTimeout(offlineTimer);
          s.setLive("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (s.live !== "offline") s.setLive("reconnecting");
        }
      });

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      void sb.removeChannel(channel);
    };
  }, [enabled]);
}
