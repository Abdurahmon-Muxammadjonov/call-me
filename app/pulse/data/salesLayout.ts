"use client";

/* Sotuv dashboardi joylashuvi (2026-10-20): vidjetlarni yashirish,
 * tartibini o'zgartirish va kengligini (1/3, 1/2, 2/3, to'liq) tanlash.
 * Har foydalanuvchining o'z ko'rinishi — shu brauzerda (localStorage);
 * o'qib bo'lmasa standart joylashuv. */

import { useCallback, useEffect, useState } from "react";

export const SALES_WIDGETS = [
  "kpis", "planFact", "debt", "funnel", "dynamics", "quick", "field", "comparison",
  "lost", "sources", "channels", "managers", "creatives", "ai", "launch", "insights",
] as const;
export type SalesWidget = (typeof SALES_WIDGETS)[number];
export type Span = 4 | 6 | 8 | 12;
export const SPANS: Span[] = [4, 6, 8, 12];

export const DEFAULT_SPAN: Record<SalesWidget, Span> = {
  kpis: 12, planFact: 12, debt: 6, funnel: 6, dynamics: 8, quick: 4, field: 6, comparison: 6,
  lost: 6, sources: 6, channels: 6, managers: 12, creatives: 6, ai: 6, launch: 12, insights: 12,
};

export interface SalesLayout { order: SalesWidget[]; hidden: SalesWidget[]; span: Partial<Record<SalesWidget, Span>> }
export const DEFAULT_SALES_LAYOUT: SalesLayout = { order: [...SALES_WIDGETS], hidden: [], span: {} };

export function normalizeSalesLayout(raw: unknown): SalesLayout {
  const known = new Set<string>(SALES_WIDGETS);
  const r = (raw ?? {}) as Partial<SalesLayout>;
  const order = [...new Set((Array.isArray(r.order) ? r.order : []).filter((x): x is SalesWidget => known.has(x as string)))];
  for (const s of SALES_WIDGETS) if (!order.includes(s)) order.push(s);
  const hidden = [...new Set((Array.isArray(r.hidden) ? r.hidden : []).filter((x): x is SalesWidget => known.has(x as string)))];
  const span: SalesLayout["span"] = {};
  for (const [k, v] of Object.entries(r.span ?? {})) if (known.has(k) && SPANS.includes(v as Span)) span[k as SalesWidget] = v as Span;
  return { order, hidden, span };
}

export const spanOf = (l: SalesLayout, id: SalesWidget): Span => l.span[id] ?? DEFAULT_SPAN[id];

export function moveWidget(l: SalesLayout, id: SalesWidget, dir: -1 | 1): SalesLayout {
  const i = l.order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= l.order.length) return l;
  const order = [...l.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...l, order };
}

export function toggleWidget(l: SalesLayout, id: SalesWidget): SalesLayout {
  return { ...l, hidden: l.hidden.includes(id) ? l.hidden.filter((x) => x !== id) : [...l.hidden, id] };
}

export function cycleSpan(l: SalesLayout, id: SalesWidget): SalesLayout {
  const cur = spanOf(l, id);
  const next = SPANS[(SPANS.indexOf(cur) + 1) % SPANS.length];
  return { ...l, span: { ...l.span, [id]: next } };
}

const keyOf = (scope: string) => `pn-sales-layout:${scope}`;

export function useSalesLayout(scope: string | undefined) {
  const [layout, setLayout] = useState<SalesLayout>(DEFAULT_SALES_LAYOUT);
  useEffect(() => {
    if (!scope) return;
    try {
      const raw = localStorage.getItem(keyOf(scope));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- brauzer xotirasidan bir marta o'qish
      setLayout(raw ? normalizeSalesLayout(JSON.parse(raw)) : DEFAULT_SALES_LAYOUT);
    } catch {
      setLayout(DEFAULT_SALES_LAYOUT);
    }
  }, [scope]);
  const update = useCallback(
    (next: SalesLayout) => {
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
  return { layout, update, reset: () => update(DEFAULT_SALES_LAYOUT) };
}
