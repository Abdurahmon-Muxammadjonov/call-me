"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Logo, ThemeToggle, LocaleToggle } from "../ui";
import { useTheme } from "../../lib/theme";
import { WaveformArt } from "../landing/WaveformArt";

const PANEL_COPY: Record<string, { title: string; body: string }> = {
  login: {
    title: "Har bir qo'ng'iroq, bir nazarda.",
    body: "AI auditor jamoangizning har bir suhbatini baholaydi — siz faqat natijaga qarab qaror qabul qilasiz.",
  },
  register: {
    title: "Jamoangizga qo'shiling.",
    body: "Administratoringiz bergan kompaniya kodi bilan bir necha soniyada kabinetingizga kiring.",
  },
  "register-company": {
    title: "Jamoangizni bugun boshlang.",
    body: "Kompaniyangizni ro'yxatdan o'tkazing, xodimlaringizni taklif qiling — audit avtomatik boshlanadi.",
  },
};

/* Shared split-panel shell for every auth screen (login, register,
 * register-company): a branded panel on the left (hidden on mobile — the
 * form itself is the priority there), the actual form on the right. Keeps
 * the three auth pages visually consistent instead of three unrelated
 * one-off layouts. */
export function AuthShell({
  variant,
  children,
}: {
  variant: "login" | "register" | "register-company";
  children: ReactNode;
}) {
  const { isDark, toggle: toggleTheme } = useTheme();
  const copy = PANEL_COPY[variant];

  return (
    <div className="flex min-h-screen bg-white dark:bg-brand-navy">
      {/* Brand panel */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08]">
          <WaveformArt barCount={48} className="h-64 w-[140%] max-w-none justify-center gap-1.5" color="#3B5FE3" />
        </div>
        <Link href="/" className="relative">
          <Logo />
        </Link>
        <div className="relative max-w-sm">
          <h2 className="font-heading text-2xl font-bold leading-tight text-white">{copy?.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{copy?.body}</p>
        </div>
        <p className="relative text-xs text-slate-500">SalesPulse © 2026 — Himoyalangan audit muhiti</p>
      </div>

      {/* Form panel */}
      <div className="font-landing-body flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
