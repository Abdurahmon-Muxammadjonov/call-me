"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./Icons";
import { Portal } from "./Portal";
import { getSupabase } from "../lib/supabase";
import { listManagers, formatDateTime, type CallRow } from "../lib/calls";

interface NewCallItem {
  id: string;
  managerName: string;
  createdAt: string;
}

/* Director-dashboard header bell — was a static, non-functional decoration
 * before. Now: subscribes to Supabase Realtime for new rows landing in
 * `calls` while the dashboard is open, shows a blue dot only when there's
 * something unseen, and opens a small modal listing them (who the call
 * belongs to + when). Picking one jumps into Deep Audit already loaded on
 * that call, via /dashboard/deep-audit?call=<id>. */
export function CallNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NewCallItem[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  // Manager id → name, for labeling each new call. Best-effort; a missing
  // name just falls back to a short id fragment.
  useEffect(() => {
    const ctrl = new AbortController();
    listManagers(ctrl.signal)
      .then((mgrs) => setNames(Object.fromEntries(mgrs.map((m) => [m.id, m.name]))))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return; // Realtime sozlanmagan — bell jim turadi, xato chiqarmaydi.

    const channel = supabase
      .channel("call-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, (payload) => {
        const row = payload.new as CallRow;
        setItems((cur) =>
          [{ id: row.id, managerName: names[row.manager_id] ?? `${row.manager_id.slice(0, 8)}…`, createdAt: row.created_at }, ...cur].slice(0, 20)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `names` intentionally not a dep: we don't want to resubscribe on every manager-name refresh, only re-label future events with whatever names are current at insert time.
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openCall(id: string) {
    setOpen(false);
    setItems((cur) => cur.filter((c) => c.id !== id));
    router.push(`/dashboard/deep-audit?call=${id}`);
  }

  const hasNew = items.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative hidden rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:block"
        aria-label="Yangi qo'ng'iroqlar"
        title="Yangi qo'ng'iroqlar"
      >
        <Icons.bell className="h-4.5 w-4.5" />
        {hasNew && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-20 sm:justify-end sm:pr-8">
            <div onClick={() => setOpen(false)} className="absolute inset-0 animate-fade-in bg-slate-900/30" />
            <div className="glass relative w-full max-w-sm animate-slide-up rounded-2xl p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Yangi qo&apos;ng&apos;iroqlar</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-500/10"
                >
                  <Icons.close className="h-4 w-4" />
                </button>
              </div>

              {hasNew ? (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                  {items.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => openCall(it.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
                          <Icons.waveform className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{it.managerName}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(it.createdAt)}</p>
                        </div>
                        <Icons.arrowUp className="h-3.5 w-3.5 shrink-0 rotate-90 text-slate-300" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">Hozircha yangi qo&apos;ng&apos;iroq yo&apos;q.</p>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
