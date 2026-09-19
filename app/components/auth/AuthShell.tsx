"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo, ThemeToggle, LocaleToggle } from "../ui";
import { Icons } from "../Icons";
import { useTheme } from "../../lib/theme";
import shot from "../../../public/landing/dashboard-analitika.png";

const PANEL_COPY: Record<string, { title: string; accent: string; body: string; points: string[] }> = {
  login: {
    title: "Har bir qo'ng'iroq —",
    accent: "bir nazarda.",
    body: "AI auditor jamoangizning har bir suhbatini baholaydi — siz faqat natijaga qarab qaror qabul qilasiz.",
    points: ["100% qo'ng'iroq avtomatik tekshiriladi", "Jonli KPI va konversiya voronkasi", "Norma ostidagilar darhol ko'rinadi"],
  },
  register: {
    title: "Jamoangizga",
    accent: "qo'shiling.",
    body: "Administratoringiz bergan kompaniya kodi bilan bir necha soniyada kabinetingizga kiring.",
    points: ["Shaxsiy kabinet va kunlik natijalar", "Qo'ng'iroqlaringiz bo'yicha AI tavsiyalar", "Smena va skriptlar bir joyda"],
  },
  "register-company": {
    title: "Jamoangizni",
    accent: "bugun boshlang.",
    body: "Kompaniyangizni ro'yxatdan o'tkazing, xodimlaringizni taklif qiling — audit avtomatik boshlanadi.",
    points: ["5 daqiqada ulanish", "amoCRM · PBX · Telegram", "Narx — har bir xodim uchun"],
  },
};

/* Shared split-panel shell for every auth screen (login, register,
 * register-company): a branded panel on the left (hidden on mobile — the
 * form itself is the priority there), the actual form on the right. The
 * left panel shows the real product (a cropped dashboard screenshot) under
 * an aurora so the page feels like the same world as the landing. */
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-brand-navy">
      {/* Brand panel */}
      {/* `dark` on the panel itself: Tailwind's dark variant is `.dark *`, so
          every dark: utility inside (Logo text etc.) applies here regardless
          of the page theme — this panel is always navy. */}
      <div className="dark relative hidden w-[46%] flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white lg:flex">
        <div className="aurora" aria-hidden="true" />
        <div className="blueprint-grid blueprint-grid-on-dark" aria-hidden="true" />

        <Link href="/" className="relative w-fit">
          <Logo />
        </Link>

        <div className="relative">
          <h2 className="font-heading max-w-md text-balance text-3xl font-bold leading-[1.15] tracking-tight text-white xl:text-4xl">
            {copy?.title} <span className="text-ink-brand">{copy?.accent}</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">{copy?.body}</p>
          <ul className="mt-6 space-y-2.5">
            {copy?.points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-slate-300">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-teal/15 text-brand-teal">
                  <Icons.check className="h-3 w-3" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          {/* Product peek — straight-on, cropped to a fixed height and fading
              out at the bottom so it reads as a glimpse, not a second hero. */}
          <div className="relative mt-10 h-52 overflow-hidden rounded-2xl [mask-image:linear-gradient(to_bottom,#000_60%,transparent)] xl:h-64">
            <div
              className="pointer-events-none absolute -inset-6 rounded-3xl bg-brand-blue/25 blur-3xl"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 top-0 overflow-hidden rounded-2xl border border-white/12 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
                <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                <span className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  SalesPulse · Dashboard
                </span>
              </div>
              <Image
                src={shot}
                alt="SalesPulse dashboard"
                sizes="640px"
                placeholder="blur"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        <p className="relative text-xs text-slate-500">SalesPulse © 2026 — Himoyalangan audit muhiti</p>
      </div>

      {/* Form panel */}
      <div className="font-landing-body relative flex flex-1 flex-col">
        <div className="blueprint-grid" aria-hidden="true" />
        <header className="relative flex items-center justify-between px-6 py-5 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </header>
        <main className="relative flex flex-1 items-center justify-center px-6 pb-16">
          <div className="landing-card w-full max-w-md p-7 sm:p-9 hover:!transform-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
