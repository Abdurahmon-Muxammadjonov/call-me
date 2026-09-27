"use client";

/* Qobiq darajasidagi jonli holat (zustand, tor selektorlar bilan —
 * nishon yangilanishi sahifani qayta chizmaydi, §3.2):
 *   - ulanish holati (LiveDot: JONLI / ULANMOQDA / OFLAYN, §6.1)
 *   - yangi qo'ng'iroqlar oqimi va o'qilmaganlar soni (qo'ng'iroqcha)
 *
 * v2 SSE (Appendix A.4) hali yo'q — hozircha manba Supabase Realtime
 * (eski CallNotificationBell dagi obuna shu yerga, qobiqqa ko'chirildi:
 * bitta ulanish, sahifa almashganda uzilmaydi). */

import { create } from "zustand";

export type LiveState = "connected" | "reconnecting" | "offline" | "unknown";

export interface NewCall {
  id: string;
  managerId: string | null;
  createdAt: string;
}

interface LiveStore {
  live: LiveState;
  calls: NewCall[];
  unread: number;
  setLive: (s: LiveState) => void;
  pushCall: (c: NewCall) => void;
  markAllRead: () => void;
  removeCall: (id: string) => void;
  reset: () => void;
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  live: "unknown",
  calls: [],
  unread: 0,
  setLive: (live) => {
    if (get().live !== live) set({ live });
  },
  pushCall: (c) => {
    if (get().calls.some((x) => x.id === c.id)) return;
    set({ calls: [c, ...get().calls].slice(0, 50), unread: get().unread + 1 });
  },
  markAllRead: () => {
    if (get().unread) set({ unread: 0 });
  },
  removeCall: (id) => set({ calls: get().calls.filter((c) => c.id !== id) }),
  reset: () => set({ calls: [], unread: 0, live: "unknown" }),
}));
