"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "./Icons";
import { Logo, ThemeToggle, LocaleToggle, ConfirmModal } from "./ui";
import { NAV_SECTIONS, type TabId } from "../lib/data";
import { useT, type DictKey } from "../lib/i18n";
import { useHasRole } from "../lib/useHasRole";
import {
  RecordingsView,
  UploadView,
  DeepAuditView,
  CategoriesView,
  CriteriaView,
  AmoCrmView,
} from "./views";
import { AnalyticsView } from "./AnalyticsView";
import { ManagementView } from "./ManagementView";
import { ComparisonView } from "./ComparisonView";
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

/* Flat id→NavItem lookup, built once — used to resolve the locked-section
 * modal's sectionKey/label without re-scanning NAV_SECTIONS on every click. */
const NAV_ITEM_BY_ID = new Map(NAV_SECTIONS.flatMap((s) => s.items).map((item) => [item.id, item]));

function renderTab(tab: TabId) {
  switch (tab) {
    case "overview": return <AnalyticsView />;
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
  const { isUnlocked, inPlan, justUnlockedKeys } = useSections();
  const initials = session.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [lockedTab, setLockedTab] = useState<TabId | null>(null);

  const metaKeys = TAB_KEYS[activeTab];
  const meta = { title: t(metaKeys.title), subtitle: t(metaKeys.subtitle) };

  function selectTab(id: TabId) {
    onSelectTab(id);
    setMobileOpen(false);
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 dark:bg-[#080b14] dark:text-slate-200">
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
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 dark:border-white/[0.06] dark:bg-[#0b0f1a] lg:static lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="relative flex items-center justify-between px-6 py-5">
            <div
              className="pointer-events-none absolute -left-10 -top-16 h-40 w-56 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15"
              aria-hidden="true"
            />
            <Logo />
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-500/10 lg:hidden"
            >
              <Icons.close className="h-5 w-5" />
            </button>
          </div>

          <div className="border-y border-slate-100 px-6 py-3 dark:border-white/[0.06]">
            <CompanyBadge />
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            {NAV_SECTIONS.map((section, sIdx) => (
              <div key={section.title}>
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400/90 dark:text-slate-500">
                  {t(NAV_SECTION_KEYS[sIdx] ?? "nav.section.main")}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = Icons[item.icon as keyof typeof Icons];
                    const active = activeTab === item.id;
                    const navKeys = NAV_LABEL_KEYS[item.id];
                    const locked = !isUnlocked(item.sectionKey);
                    // One-shot glow right after a code redemption opens this
                    // section — see SectionsProvider's justUnlockedKeys.
                    const justUnlocked = !!item.sectionKey && justUnlockedKeys.has(item.sectionKey);
                    return (
                      <li key={item.id} className="relative">
                        {active && (
                          <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-linear-to-b from-blue-500 to-teal-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                        )}
                        <button
                          onClick={() => (locked ? setLockedTab(item.id) : selectTab(item.id))}
                          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                            justUnlocked ? "animate-unlock" : ""
                          } ${
                            active
                              ? "bg-linear-to-r from-blue-600/12 to-teal-500/8 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)] dark:from-blue-500/18 dark:to-teal-400/10 dark:text-blue-200 dark:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.22)]"
                              : locked
                              ? "text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:text-slate-500 dark:hover:bg-white/5"
                              : "text-slate-500 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-blue-600 dark:text-teal-300" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"}`} />
                          <span className="flex-1 text-left">{t(navKeys.label)}</span>
                          {locked && <Icons.lock className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {canEditBranding && (
            <div className="space-y-1 px-4">
              <Link
                href="/settings/branding"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
              >
                <Icons.building className="h-4 w-4 shrink-0" />
                Brend sozlamalari
              </Link>
              <Link
                href="/settings/norms"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
              >
                <Icons.ruler className="h-4 w-4 shrink-0" />
                KPI normalari
              </Link>
            </div>
          )}

          {/* Profile */}
          <div className="border-t border-slate-200/80 p-4 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-linear-to-br from-blue-500 to-teal-400 text-sm font-bold text-white shadow-md">
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
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3.5 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#080b14]/80 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-500/10 lg:hidden"
            >
              <Icons.menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">
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
          <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(60%_100%_at_50%_0%,rgba(59,130,246,0.12),transparent)]"
              aria-hidden="true"
            />
            <div key={activeTab} className="relative mx-auto max-w-7xl animate-slide-up">
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
