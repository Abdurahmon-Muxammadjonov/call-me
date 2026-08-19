"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "./Icons";
import { Logo, ThemeToggle, LocaleToggle, ConfirmModal } from "./ui";
import { NAV_SECTIONS, type TabId } from "../lib/data";
import { useT, type DictKey } from "../lib/i18n";
import { useHasRole } from "../lib/useHasRole";
import {
  OverviewView,
  RecordingsView,
  UploadView,
  DeepAuditView,
  CategoriesView,
  CriteriaView,
  AmoCrmView,
} from "./views";
import { ManagementView } from "./ManagementView";
import { ComparisonView } from "./ComparisonView";
import { StaffManager } from "./StaffManager";
import { ManagersDashboard } from "./ManagersDashboard";
import { ToastHost } from "./ToastHost";
import { CallNotificationBell } from "./CallNotificationBell";
import { CompanyBadge } from "./CompanyBadge";
import type { Session } from "../lib/auth";

/* URL segment (after /dashboard) for each tab — the single source of truth
 * for /dashboard routing. "" is the root (/dashboard itself → overview). */
export const TAB_PATH: Record<TabId, string> = {
  overview: "",
  management: "management",
  comparison: "comparison",
  staff: "staff",
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

const TAB_KEYS: Record<TabId, { title: DictKey; subtitle: DictKey }> = {
  overview: { title: "tab.overview.title", subtitle: "tab.overview.subtitle" },
  management: { title: "tab.management.title", subtitle: "tab.management.subtitle" },
  comparison: { title: "tab.comparison.title", subtitle: "tab.comparison.subtitle" },
  staff: { title: "tab.staff.title", subtitle: "tab.staff.subtitle" },
  recordings: { title: "tab.recordings.title", subtitle: "tab.recordings.subtitle" },
  upload: { title: "tab.upload.title", subtitle: "tab.upload.subtitle" },
  "deep-audit": { title: "tab.deep-audit.title", subtitle: "tab.deep-audit.subtitle" },
  operators: { title: "tab.operators.title", subtitle: "tab.operators.subtitle" },
  categories: { title: "tab.categories.title", subtitle: "tab.categories.subtitle" },
  criteria: { title: "tab.criteria.title", subtitle: "tab.criteria.subtitle" },
  amocrm: { title: "tab.amocrm.title", subtitle: "tab.amocrm.subtitle" },
};

const NAV_LABEL_KEYS: Record<TabId, { label: DictKey; hint: DictKey }> = {
  overview: { label: "nav.overview.label", hint: "nav.overview.hint" },
  management: { label: "nav.management.label", hint: "nav.management.hint" },
  comparison: { label: "nav.comparison.label", hint: "nav.comparison.hint" },
  staff: { label: "nav.staff.label", hint: "nav.staff.hint" },
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

function renderTab(tab: TabId) {
  switch (tab) {
    case "overview": return <OverviewView />;
    case "management": return <ManagementView />;
    case "comparison": return <ComparisonView />;
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
  const initials = session.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  const metaKeys = TAB_KEYS[activeTab];
  const meta = { title: t(metaKeys.title), subtitle: t(metaKeys.subtitle) };

  function selectTab(id: TabId) {
    onSelectTab(id);
    setMobileOpen(false);
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <div className="relative flex min-h-screen">
        {/* ===== Sidebar ===== */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <Logo />
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10 lg:hidden"
            >
              <Icons.close className="h-5 w-5" />
            </button>
          </div>

          <div className="border-y border-slate-100 px-6 py-3 dark:border-slate-800/60">
            <CompanyBadge />
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            {NAV_SECTIONS.map((section, sIdx) => (
              <div key={section.title}>
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {t(NAV_SECTION_KEYS[sIdx] ?? "nav.section.main")}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = Icons[item.icon as keyof typeof Icons];
                    const active = activeTab === item.id;
                    const navKeys = NAV_LABEL_KEYS[item.id];
                    return (
                      <li key={item.id} className="relative">
                        {active && (
                          <span className="absolute -left-4 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400" />
                        )}
                        <button
                          onClick={() => selectTab(item.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                            active
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">{t(navKeys.label)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {canEditBranding && (
            <div className="px-4">
              <Link
                href="/settings/branding"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Icons.building className="h-4 w-4 shrink-0" />
                Brend sozlamalari
              </Link>
            </div>
          )}

          {/* Profile */}
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{session.name}</p>
                <p className="truncate text-xs text-slate-400">{session.title}</p>
              </div>
              <button
                onClick={() => setConfirmOut(true)}
                title={t("common.logout")}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Icons.logout className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ===== Main ===== */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-500/10 lg:hidden"
            >
              <Icons.menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {meta.title}
              </h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">{meta.subtitle}</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <CallNotificationBell />
              <LocaleToggle />
              <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div key={activeTab} className="mx-auto max-w-7xl animate-slide-up">
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
    </div>
  );
}
