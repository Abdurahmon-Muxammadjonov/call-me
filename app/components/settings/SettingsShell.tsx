"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icons } from "../Icons";
import { Logo, ThemeToggle, LocaleToggle } from "../ui";
import { useTheme } from "../../lib/theme";

/* Shared chrome for /settings/* pages. Deliberately not the full AppShell
 * (sidebar + tab routing) — settings pages live outside the /dashboard
 * URL tree, so this is a lighter shell: a header with a way back to the
 * dashboard, matching the same card/spacing language as the rest of the
 * app instead of inventing a new one. */
export function SettingsShell({
  title,
  subtitle,
  backHref = "/dashboard",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
}) {
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Icons.arrowUp className="h-4 w-4 -rotate-90" />
              Dashboard&apos;ga qaytish
            </Link>
            <Logo compact />
          </div>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
