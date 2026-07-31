"use client";

import Link from "next/link";
import { Logo, ThemeToggle, LocaleToggle } from "./components/ui";
import { useSession } from "./lib/auth";
import { useTheme } from "./lib/theme";
import { useT } from "./lib/i18n";

/* Public landing page — the previous behavior (bare login form at `/`) is
 * replaced by a short info page with an explicit "Kirish" CTA to /login,
 * per the requested procell.uz → info-first, login-second flow. */
export default function LandingPage() {
  const session = useSession();
  const { isDark, toggle: toggleTheme } = useTheme();
  const t = useT();

  const ctaHref = session ? (session.role === "director" ? "/dashboard" : "/cabinet") : "/login";
  const ctaLabel = session ? t("landing.goToCabinet") : t("landing.login");

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <Logo />
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {t("landing.badge")}
        </span>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          {t("landing.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-500 dark:text-slate-400">
          {t("landing.subtitle")}
        </p>

        <Link
          href={ctaHref}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
        >
          {ctaLabel}
        </Link>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("landing.feature1Title")}</p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("landing.feature1Body")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("landing.feature2Title")}</p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("landing.feature2Body")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("landing.feature3Title")}</p>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("landing.feature3Body")}</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        {t("login.footer")}
      </footer>
    </div>
  );
}
