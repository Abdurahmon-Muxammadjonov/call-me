"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import { Logo, ThemeToggle, ConfirmModal } from "./ui";
import { NAV_SECTIONS, type TabId } from "../lib/data";
import {
  OverviewView,
  RecordingsView,
  UploadView,
  DeepAuditView,
  CategoriesView,
  CriteriaView,
  AmoCrmView,
} from "./views";
import { CompanyView } from "./CompanyView";
import type { Session } from "../lib/auth";

const TAB_META: Record<TabId, { title: string; subtitle: string }> = {
  overview: { title: "Umumiy ko'rinish", subtitle: "Call-center sifat auditi bo'yicha umumiy holat" },
  recordings: { title: "Audio yozuvlar", subtitle: "Transkripsiya qilingan qo'ng'iroqlar jurnali" },
  upload: { title: "Audio yuklash", subtitle: "Tahlil uchun yangi qo'ng'iroqlarni yuklang" },
  "deep-audit": { title: "Chuqur tahlil", subtitle: "Bitta qo'ng'iroqning batafsil AI auditi" },
  operators: { title: "Operatorlar", subtitle: "Jamoa boshqaruvi" },
  categories: { title: "Mezon kategoriyalari", subtitle: "Baholash toifalari" },
  criteria: { title: "Baholash mezonlari", subtitle: "Ballash qoidalari" },
  amocrm: { title: "amoCRM ulanishi", subtitle: "CRM integratsiyasi" },
};

function renderTab(tab: TabId) {
  switch (tab) {
    case "overview": return <OverviewView />;
    case "recordings": return <RecordingsView />;
    case "upload": return <UploadView />;
    case "deep-audit": return <DeepAuditView />;
    case "operators": return <CompanyView />;
    case "categories": return <CategoriesView />;
    case "criteria": return <CriteriaView />;
    case "amocrm": return <AmoCrmView />;
  }
}

export function AppShell({
  session,
  isDark,
  onToggleTheme,
  onLogout,
}: {
  session: Session;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const initials = session.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  const meta = TAB_META[activeTab];

  function selectTab(id: TabId) {
    setActiveTab(id);
    setMobileOpen(false);
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800 dark:bg-[#060814] dark:text-slate-200">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />
        <div className="absolute -right-32 bottom-0 h-120 w-120 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
      </div>

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
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/60 bg-white/70 backdrop-blur-xl transition-transform duration-300 dark:border-slate-800/60 dark:bg-slate-950/60 lg:static lg:translate-x-0 ${
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

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = Icons[item.icon as keyof typeof Icons];
                    const active = activeTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => selectTab(item.id)}
                          className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                            active
                              ? "bg-linear-to-r from-indigo-500/15 to-cyan-400/10 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20 dark:text-cyan-300 dark:ring-cyan-400/20"
                              : "text-slate-500 hover:bg-slate-500/5 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-linear-to-br transition-all duration-300 ${item.grad} ${
                              active
                                ? "text-white shadow-[0_0_16px_-4px_rgba(99,102,241,0.8)]"
                                : "text-white/90 opacity-70 group-hover:opacity-100"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Profile */}
          <div className="border-t border-slate-200/60 p-4 dark:border-slate-800/60">
            <div className="flex items-center gap-3 rounded-xl bg-slate-500/5 p-3 dark:bg-slate-800/40">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-linear-to-br from-indigo-500 via-violet-500 to-cyan-400 text-sm font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-100">{session.name}</p>
                <p className="truncate text-xs text-slate-400">{session.title}</p>
              </div>
              <button
                onClick={() => setConfirmOut(true)}
                title="Chiqish"
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
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/60 bg-white/70 px-4 py-3.5 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/50 sm:px-6">
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
              <button className="relative hidden rounded-xl border border-slate-200/70 bg-white/50 p-2.5 text-slate-500 transition hover:scale-[1.05] dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-300 sm:block">
                <Icons.bell className="h-4.5 w-4.5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-white dark:ring-slate-950" />
              </button>
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
        title="Akkaunddan chiqish"
        message="Tizimdan chiqmoqchimisiz?"
        confirmLabel="Ha, chiqish"
        cancelLabel="Yo'q"
        tone="danger"
        onConfirm={onLogout}
        onCancel={() => setConfirmOut(false)}
      />
    </div>
  );
}
