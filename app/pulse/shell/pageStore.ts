"use client";

/* Sahifa darajasidagi UI holati (zustand): parametr almashganda
 * qayta so'rov ketayotgan bo'lsa (keepPreviousData, eski ko'rinish 60%
 * xira) — sarlavha tepasidagi 2 px progress chizig'i (§6.1). Sahifa
 * o'z so'rovidan `setBusy` qiladi; qobiq faqat shu bayroqqa obuna. */

import { useEffect } from "react";
import { create } from "zustand";

interface PageStore {
  busy: boolean;
  setBusy: (b: boolean) => void;
}

export const usePageStore = create<PageStore>((set, get) => ({
  busy: false,
  setBusy: (busy) => {
    if (get().busy !== busy) set({ busy });
  },
}));

/* Sahifa ichida: usePageBusy(query.isFetching && query.isPlaceholderData). */
export function usePageBusy(busy: boolean): void {
  useEffect(() => {
    usePageStore.getState().setBusy(busy);
    return () => usePageStore.getState().setBusy(false);
  }, [busy]);
}
