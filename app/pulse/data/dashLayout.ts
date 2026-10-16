"use client";

/* Dashboardni qo'lda sozlash (2026-10-16, foydalanuvchi talabi: "dashboardni
 * hamma qo'lda o'zgartirsa bo'ladigan qilish"). Har foydalanuvchi Analitika
 * bloklarini yashiradi/ko'rsatadi va tartibini o'zgartiradi. Sozlama shu
 * brauzerda (localStorage) — har kimning o'z ko'rinishi; o'qib/yozib
 * bo'lmasa standart tartib ishlaydi. */

import { useCallback, useEffect, useState } from "react";

export const DASH_SECTIONS = ["tiles", "dynamics", "leadQuality", "team"] as const;
export type DashSection = (typeof DASH_SECTIONS)[number];

export interface DashLayout {
  order: DashSection[];
  hidden: DashSection[];
}

export const DEFAULT_LAYOUT: DashLayout = { order: [...DASH_SECTIONS], hidden: [] };

/* Saqlangan qiymatni tekshiradi: noma'lum bo'limlar tashlanadi, yangi
 * qo'shilganlari oxiriga qo'shiladi (sof funksiya — test qilinadi). */
export function normalizeLayout(raw: unknown): DashLayout {
  const known = new Set<string>(DASH_SECTIONS);
  const r = (raw ?? {}) as Partial<DashLayout>;
  const order = (Array.isArray(r.order) ? r.order : []).filter((x): x is DashSection => known.has(x as string));
  const uniq = [...new Set(order)];
  for (const s of DASH_SECTIONS) if (!uniq.includes(s)) uniq.push(s);
  const hidden = [...new Set((Array.isArray(r.hidden) ? r.hidden : []).filter((x): x is DashSection => known.has(x as string)))];
  return { order: uniq, hidden };
}

export function moveSection(l: DashLayout, id: DashSection, dir: -1 | 1): DashLayout {
  const i = l.order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= l.order.length) return l;
  const order = [...l.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...l, order };
}

export function toggleSection(l: DashLayout, id: DashSection): DashLayout {
  return { ...l, hidden: l.hidden.includes(id) ? l.hidden.filter((x) => x !== id) : [...l.hidden, id] };
}

const keyOf = (scope: string) => `pn-dash-layout:${scope}`;

export function useDashLayout(scope: string | undefined) {
  const [layout, setLayout] = useState<DashLayout>(DEFAULT_LAYOUT);
  useEffect(() => {
    if (!scope) return;
    try {
      const raw = localStorage.getItem(keyOf(scope));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- brauzer xotirasidan bir marta o'qish
      setLayout(raw ? normalizeLayout(JSON.parse(raw)) : DEFAULT_LAYOUT);
    } catch {
      setLayout(DEFAULT_LAYOUT);
    }
  }, [scope]);
  const update = useCallback(
    (next: DashLayout) => {
      setLayout(next);
      if (!scope) return;
      try {
        localStorage.setItem(keyOf(scope), JSON.stringify(next));
      } catch {
        /* saqlab bo'lmasa — joriy sessiyada ishlayveradi */
      }
    },
    [scope]
  );
  return { layout, update, reset: () => update(DEFAULT_LAYOUT) };
}
