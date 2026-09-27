/* Mantiqiy marshrutlar → mavjud URL'lar (spetsifikatsiya §1.2: "route
 * names are logical ids — map them to the existing paths"). Menyu
 * bandlari tartibi va ikonkalari Nav.dc.html dagidek. `sectionKey` —
 * tarif bo'yicha yopish (SectionsProvider, eski qoidalar o'zgarmagan). */

import type { IconName } from "../ui/Icon";
import type { PKey } from "../i18n";

export type RouteId =
  | "analytics" | "control" | "compare" | "staffManage" | "staffStats" | "status" | "audio" | "upload" | "deep"
  | "operators" | "categories" | "criteria" | "amocrm" | "brand" | "norms";

export interface NavRoute {
  id: RouteId;
  href: string;
  icon: IconName;
  label: PKey;
  sectionKey?: string;
  /* Faqat direktor/admin (eski qoida: Brend va KPI normalari). */
  adminOnly?: boolean;
  /* data-testid qo'shimchasi: NAV-03-<id>. */
}

export const MAIN_ROUTES: NavRoute[] = [
  { id: "analytics", href: "/dashboard", icon: "grid", label: "nav.analytics" },
  { id: "control", href: "/dashboard/management", icon: "gauge", label: "nav.control", sectionKey: "reports" },
  { id: "compare", href: "/dashboard/comparison", icon: "compare", label: "nav.compare", sectionKey: "reports" },
  { id: "staffManage", href: "/dashboard/staff", icon: "users", label: "nav.staffManage", sectionKey: "managers" },
  { id: "staffStats", href: "/dashboard/staff-stats", icon: "stats", label: "nav.staffStats", sectionKey: "managers" },
  { id: "status", href: "/dashboard/analysis-status", icon: "scan", label: "nav.status", sectionKey: "call_analytics" },
  { id: "audio", href: "/dashboard/recordings", icon: "wave", label: "nav.audio", sectionKey: "call_analytics" },
  { id: "upload", href: "/dashboard/upload", icon: "upload", label: "nav.upload", sectionKey: "call_analytics" },
  { id: "deep", href: "/dashboard/deep-audit", icon: "search", label: "nav.deep", sectionKey: "call_analytics" },
];

export const SETTINGS_ROUTES: NavRoute[] = [
  { id: "operators", href: "/dashboard/operators", icon: "users", label: "nav.operators", sectionKey: "managers" },
  { id: "categories", href: "/dashboard/categories", icon: "layers", label: "nav.categories", sectionKey: "criteria_categories" },
  { id: "criteria", href: "/dashboard/criteria", icon: "checkSquare", label: "nav.criteria", sectionKey: "criteria" },
  { id: "amocrm", href: "/dashboard/amocrm", icon: "plug", label: "nav.amocrm" },
  { id: "brand", href: "/settings/branding", icon: "brand", label: "nav.brand", adminOnly: true },
  { id: "norms", href: "/settings/norms", icon: "target", label: "nav.norms", adminOnly: true },
];

export const ALL_ROUTES: NavRoute[] = [...MAIN_ROUTES, ...SETTINGS_ROUTES];

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
