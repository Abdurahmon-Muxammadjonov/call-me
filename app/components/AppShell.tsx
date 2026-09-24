"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle, LocaleToggle, ConfirmModal } from "./ui";
import { NAV_SECTIONS, type TabId } from "../lib/data";
import { useT, type DictKey } from "../lib/i18n";
import {
  LayoutGrid, TrendingUp, ChartColumn, Users, ChartLine, ScanSearch, AudioLines,
  Upload, Search, Layers, SquareCheck, Plug, Building2, Target, Lock, Menu, X,
  LogOut, AudioWaveform,
} from "lucide-react";

/* Yon menyu ikonkalari — spetsifikatsiyadagi lucide nomlari bo'yicha. */
const NAV_ICON: Record<string, typeof LayoutGrid> = {
  overview: LayoutGrid,
  management: TrendingUp,
  comparison: ChartColumn,
  staff: Users,
  "staff-stats": ChartLine,
  "analysis-status": ScanSearch,
  recordings: AudioLines,
  upload: Upload,
  "deep-audit": Search,
  operators: Users,
  categories: Layers,
  criteria: SquareCheck,
  amocrm: Plug,
};
import { useHasRole } from "../lib/useHasRole";
import {
  UploadView,
  DeepAuditView,
  CategoriesView,
  CriteriaView,
  AmoCrmView,
} from "./views";
import { AnalyticsView } from "./AnalyticsView";
import { ManagementView } from "./ManagementView";
import { ComparisonView } from "./ComparisonView";
import { StaffStatsView } from "./StaffStatsView";
import { AnalysisStatusView } from "./AnalysisStatusView";
import { RecordingsView } from "./RecordingsView";
import { StaffManager } from "./StaffManager";
import { ManagersDashboard } from "./ManagersDashboard";
import { ToastHost } from "./ToastHost";
import { CallNotificationBell } from "./CallNotificationBell";
import { CompanyBadge } from "./CompanyBadge";
import { LockedSectionModal } from "./LockedSectionModal";
import { useSections } from "../lib/sections";
import type { Session } from "../lib/auth";

/* URL segment (after /dashboard) for each tab — the single source of truth
 * for /dashboard routing. "" is the root (/dashboard itself → overview). */
export const TAB_PATH: Record<TabId, string> = {
  overview: "",
  management: "management",
  comparison: "comparison",
  staff: "staff",
  "staff-stats": "staff-stats",
  "analysis-status": "analysis-status",
  recordings: "recordings",
  upload: "upload",
  "deep-audit": "deep-audit",
  operators: "operators",
  categories: "categories",
  criteria: "criteria",
  amocrm: "amocrm",
};

const PATH_TO_TAB: Record<string, TabId> = Object.fromEntries(
  Object.entries(TAB_PATH).map(([tab, path]) => [path, tab as TabId])
);

/* Maps a /dashboard/[[...tab]] catch-all segment array back to a TabId.
 * Unknown/empty segments fall back to "overview" (the /dashboard root). */
export function tabFromSegments(segments: string[] | undefined): TabId {
  const path = segments?.[0] ?? "";
  return PATH_TO_TAB[path] ?? "overview";
}


const NAV_LABEL_KEYS: Record<TabId, { label: DictKey; hint: DictKey }> = {
  overview: { label: "nav.overview.label", hint: "nav.overview.hint" },
  management: { label: "nav.management.label", hint: "nav.management.hint" },
  comparison: { label: "nav.comparison.label", hint: "nav.comparison.hint" },
  staff: { label: "nav.staff.label", hint: "nav.staff.hint" },
  "staff-stats": { label: "nav.staff-stats.label", hint: "nav.staff-stats.hint" },
  "analysis-status": { label: "nav.analysis-status.label", hint: "nav.analysis-status.hint" },
  recordings: { label: "nav.recordings.label", hint: "nav.recordings.hint" },
  upload: { label: "nav.upload.label", hint: "nav.upload.hint" },
  "deep-audit": { label: "nav.deep-audit.label", hint: "nav.deep-audit.hint" },
  operators: { label: "nav.operators.label", hint: "nav.operators.hint" },
  categories: { label: "nav.categories.label", hint: "nav.categories.hint" },
  criteria: { label: "nav.criteria.label", hint: "nav.criteria.hint" },
  amocrm: { label: "nav.amocrm.label", hint: "nav.amocrm.hint" },
};

/* NAV_SECTIONS titles are "ASOSIY" (main) / "SOZLAMALAR" (settings) in that
 * fixed order — mapped positionally since the section title itself isn't a
 * stable key. */
const NAV_SECTION_KEYS: DictKey[] = ["nav.section.main", "nav.section.settings"];

/* Flat id→NavItem lookup, built once — used to resolve the locked-section
 * modal's sectionKey/label without re-scanning NAV_SECTIONS on every click. */
const NAV_ITEM_BY_ID = new Map(NAV_SECTIONS.flatMap((s) => s.items).map((item) => [item.id, item]));

function renderTab(tab: TabId) {
  switch (tab) {
    case "overview": return <AnalyticsView />;
    case "management": return <ManagementView />;
    case "comparison": return <ComparisonView />;
    case "staff-stats": return <StaffStatsView />;
    case "analysis-status": return <AnalysisStatusView />;
    case "staff": return <StaffManager />;
    case "recordings": return <RecordingsView />;
    case "upload": return <UploadView />;
    case "deep-audit": return <DeepAuditView />;
    case "operators": return <ManagersDashboard />;
    case "categories": return <CategoriesView />;
    case "criteria": return <CriteriaView />;
    case "amocrm": return <AmoCrmView />;
  }
}

export function AppShell({
  session,
  activeTab,
  onSelectTab,
  isDark,
  onToggleTheme,
  onLogout,
}: {
  session: Session;
  activeTab: TabId;
  onSelectTab: (id: TabId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const t = useT();
  const canEditBranding = useHasRole(["director", "admin"]);
  const { isUnlocked, inPlan, justUnlockedKeys } = useSections();
  const initials = session.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [lockedTab, setLockedTab] = useState<TabId | null>(null);


  function selectTab(id: TabId) {
    onSelectTab(id);
    setMobileOpen(false);
  }

  return (
    <div className="relative min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <div className="relative flex min-h-screen">
        {/* ===== Sidebar ===== */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 pb-4 pt-[22px]">
            <span
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px]"
              style={{ background: "var(--accent)" }}
            >
              <AudioWaveform className="h-5 w-5" color="#FFFFFF" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold leading-tight tracking-[-0.01em]" style={{ color: "var(--text)" }}>
                SalesPulse
              </span>
              <span className="block text-[10px] tracking-[0.18em]" style={{ color: "#8C95A6" }}>
                AI AUDIT CORE
              </span>
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label={t("common.cancel")}
              className="grid h-9 w-9 place-items-center rounded-lg lg:hidden"
              style={{ color: "var(--subtle)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-2 pb-[18px]">
            <CompanyBadge />
          </div>

          <nav className="flex-1 overflow-y-auto px-2 pb-2">
            {NAV_SECTIONS.map((section, sIdx) => (
              <div key={section.title} className={sIdx > 0 ? "mt-4" : ""}>
                <p
                  className="px-3 pb-1.5 text-[11px] uppercase tracking-[0.14em]"
                  style={{ color: "var(--subtle)" }}
                >
                  {t(NAV_SECTION_KEYS[sIdx] ?? "nav.section.main")}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = NAV_ICON[item.id] ?? LayoutGrid;
                    const active = activeTab === item.id;
                    const navKeys = NAV_LABEL_KEYS[item.id];
                    const locked = !isUnlocked(item.sectionKey);
                    // One-shot glow right after a code redemption opens this
                    // section — see SectionsProvider's justUnlockedKeys.
                    const justUnlocked = !!item.sectionKey && justUnlockedKeys.has(item.sectionKey);
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => (locked ? setLockedTab(item.id) : selectTab(item.id))}
                          aria-current={active ? "page" : undefined}
                          className={`flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            justUnlocked ? "animate-unlock" : ""
                          } ${active ? "font-medium" : ""} ${!active ? "hover:bg-[var(--surface-4)]" : ""}`}
                          style={{
                            background: active ? "var(--nav-active)" : "transparent",
                            color: active ? "#FFFFFF" : "var(--text-3)",
                            outlineColor: "var(--accent-text)",
                          }}
                        >
                          <Icon
                            className="h-[18px] w-[18px] shrink-0"
                            strokeWidth={1.8}
                            color={active ? "var(--accent-icon)" : "var(--subtle)"}
                          />
                          <span className="flex-1 text-left">{t(navKeys.label)}</span>
                          {locked && <Lock className="h-3.5 w-3.5 shrink-0" color="var(--subtle)" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Brend va KPI normalari — SOZLAMALAR bo'limining davomi, menyu
              bandlari bilan bir xil uslubda (spetsifikatsiya 2.1). */}
          {canEditBranding && (
            <ul className="space-y-0.5 px-2 pb-2">
              {[
                { href: "/settings/branding", icon: Building2, label: "Brend sozlamalari" },
                { href: "/settings/norms", icon: Target, label: "KPI normalari" },
              ].map(({ href, icon: LinkIcon, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors hover:bg-[var(--surface-4)]"
                    style={{ color: "var(--text-3)" }}
                  >
                    <LinkIcon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} color="var(--subtle)" />
                    <span className="flex-1">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Profile */}
          <div className="p-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
            <div
              className="flex items-center gap-3 rounded-xl p-2.5"
              style={{ background: "var(--surface-4)" }}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold" style={{ color: "var(--text)" }}>{session.name}</p>
                <p className="truncate text-xs" style={{ color: "var(--subtle)" }}>{session.title}</p>
              </div>
              <button
                onClick={() => setConfirmOut(true)}
                aria-label={t("common.logout")}
                className="grid h-9 w-9 place-items-center rounded-lg transition-colors hover:opacity-80"
                style={{ color: "var(--subtle)" }}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ===== Main ===== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          {/* Yuqori bar: sahifa nomi bu yerda TAKRORLANMAYDI — u har bir
              sahifaning o'z PageHeader'ida (spetsifikatsiya 2.2). */}
          <header
            className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-9"
            style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Menyu"
              className="grid h-11 w-11 place-items-center rounded-xl lg:hidden"
              style={{ background: "var(--control)", border: "1px solid var(--border-control)", color: "var(--text-3)" }}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1" />

            <div className="flex items-center gap-2 sm:gap-3">
              <CallNotificationBell />
              <LocaleToggle />
              <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:px-9 sm:py-7">
            <div key={activeTab} className="mx-auto max-w-[1600px] animate-slide-up">
              {renderTab(activeTab)}
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={confirmOut}
        title={t("confirm.logout.title")}
        message={t("confirm.logout.message")}
        confirmLabel={t("confirm.logout.confirm")}
        cancelLabel={t("common.no")}
        tone="danger"
        onConfirm={onLogout}
        onCancel={() => setConfirmOut(false)}
      />

      <ToastHost />

      {lockedTab && NAV_ITEM_BY_ID.get(lockedTab)?.sectionKey && (
        <LockedSectionModal
          open
          sectionKey={NAV_ITEM_BY_ID.get(lockedTab)!.sectionKey!}
          sectionLabel={t(NAV_LABEL_KEYS[lockedTab].label)}
          inPlan={inPlan(NAV_ITEM_BY_ID.get(lockedTab)!.sectionKey)}
          onClose={() => setLockedTab(null)}
        />
      )}
    </div>
  );
}
