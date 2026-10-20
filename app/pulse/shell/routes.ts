/* Mantiqiy marshrutlar → mavjud URL'lar (spetsifikatsiya §1.2: "route
 * names are logical ids — map them to the existing paths"). Menyu
 * bandlari tartibi va ikonkalari Nav.dc.html dagidek. `sectionKey` —
 * tarif bo'yicha yopish (SectionsProvider, eski qoidalar o'zgarmagan). */

import type { IconName } from "../ui/Icon";
import type { PKey } from "../i18n";

export type RouteId =
  | "analytics" | "sales" | "control" | "compare" | "staffManage" | "staffStats" | "status" | "audio" | "upload" | "deep"
  | "operators" | "categories" | "criteria" | "amocrm" | "brand";

export interface NavRoute {
  id: RouteId;
  href: string;
  icon: IconName;
  label: PKey;
  sectionKey?: string;
  /* Faqat direktor/admin (Brend, Xodimlarni boshqarish). */
  adminOnly?: boolean;
  /* Bir nechta bo'lim bitta menyu bandida (tablar) — 2026-10-16. */
  hub?: HubId;
}

/* BO'LIMLARNI BIRLASHTIRISH (2026-10-16, foydalanuvchi talabi):
 *   Dashboard     = Analitika | Boshqaruv | Solishtirish
 *   Qo'ng'iroqlar = Audio yozuvlar | Tahlil holati | Chuqur tahlil | Baholash mezonlari | Kategoriyalar
 * Menyuda har hub — BITTA band; sahifa tepasida tablar (shell/HubTabs.tsx).
 * URL'lar o'zgarmadi — eski havolalar ishlayveradi.
 * Operatorlar bo'limi olib tashlandi (ma'lumoti Xodimlar statistikasi,
 * Xodimlarni boshqarish va CRM sahifalarida); KPI normalari olib tashlandi. */
export type HubId = "dashboard" | "calls";

export interface Hub {
  id: HubId;
  label: PKey;
  icon: IconName;
  tabs: RouteId[];
}

export const HUBS: Record<HubId, Hub> = {
  dashboard: { id: "dashboard", label: "nav.hub.dashboard", icon: "grid", tabs: ["analytics", "sales", "control", "compare"] },
  calls: { id: "calls", label: "nav.hub.calls", icon: "wave", tabs: ["audio", "status", "deep", "criteria", "categories"] },
};

export const MAIN_ROUTES: NavRoute[] = [
  { id: "analytics", href: "/dashboard", icon: "grid", label: "nav.analytics", hub: "dashboard" },
  // Sotuv dashboardi (amoCRM) — 2026-10-20.
  { id: "sales", href: "/dashboard/sales", icon: "trendUp", label: "nav.sales", sectionKey: "reports", hub: "dashboard" },
  { id: "control", href: "/dashboard/management", icon: "gauge", label: "nav.control", sectionKey: "reports", hub: "dashboard" },
  { id: "compare", href: "/dashboard/comparison", icon: "compare", label: "nav.compare", sectionKey: "reports", hub: "dashboard" },
  { id: "audio", href: "/dashboard/recordings", icon: "wave", label: "nav.audio", sectionKey: "call_analytics", hub: "calls" },
  { id: "status", href: "/dashboard/analysis-status", icon: "scan", label: "nav.status", sectionKey: "call_analytics", hub: "calls" },
  { id: "deep", href: "/dashboard/deep-audit", icon: "search", label: "nav.deep", sectionKey: "call_analytics", hub: "calls" },
  { id: "criteria", href: "/dashboard/criteria", icon: "checkSquare", label: "nav.criteria", sectionKey: "criteria", hub: "calls" },
  { id: "categories", href: "/dashboard/categories", icon: "layers", label: "nav.categories", sectionKey: "criteria_categories", hub: "calls" },
  { id: "staffStats", href: "/dashboard/staff-stats", icon: "stats", label: "nav.staffStats", sectionKey: "managers" },
  { id: "upload", href: "/dashboard/upload", icon: "upload", label: "nav.upload", sectionKey: "call_analytics" },
];

export const SETTINGS_ROUTES: NavRoute[] = [
  { id: "amocrm", href: "/dashboard/amocrm", icon: "plug", label: "nav.amocrm" },
  { id: "brand", href: "/settings/branding", icon: "brand", label: "nav.brand", adminOnly: true },
  // Xodimlarni boshqarish — pastda va faqat direktor/admin (2026-10-16).
  { id: "staffManage", href: "/dashboard/staff", icon: "users", label: "nav.staffManage", sectionKey: "managers", adminOnly: true },
];

/* Menyuda ko'rinmaydi, lekin URL ishlaydi (eski havolalar uchun). */
export const HIDDEN_ROUTES: NavRoute[] = [
  { id: "operators", href: "/dashboard/operators", icon: "users", label: "nav.operators", sectionKey: "managers" },
];

export const ALL_ROUTES: NavRoute[] = [...MAIN_ROUTES, ...SETTINGS_ROUTES, ...HIDDEN_ROUTES];

export function routeById(id: RouteId): NavRoute | undefined {
  return ALL_ROUTES.find((r) => r.id === id);
}

export function hubOf(id: RouteId | null): Hub | null {
  const r = id ? routeById(id) : undefined;
  return r?.hub ? HUBS[r.hub] : null;
}

export function activeRouteId(pathname: string): RouteId | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/dashboard") return "analytics";
  let best: NavRoute | null = null;
  for (const r of ALL_ROUTES) {
    if (r.href === "/dashboard") continue;
    if (p === r.href || p.startsWith(`${r.href}/`)) {
      if (!best || r.href.length > best.href.length) best = r;
    }
  }
  return best?.id ?? null;
}
