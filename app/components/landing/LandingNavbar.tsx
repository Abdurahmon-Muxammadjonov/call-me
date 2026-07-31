"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo, ThemeToggle, LocaleToggle } from "../ui";
import { Icons } from "../Icons";
import { useSession } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { useT, type DictKey } from "../../lib/i18n";

const LINKS: { key: DictKey; href: string }[] = [
  { key: "nav.home", href: "#top" },
  { key: "nav.about", href: "#about" },
  { key: "nav.featuresLink", href: "#features" },
  { key: "nav.pricingLink", href: "#pricing" },
];

export function LandingNavbar() {
  const t = useT();
  const session = useSession();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function go(href: string) {
    setMobileOpen(false);
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const dashboardHref = session ? (session.role === "director" ? "/dashboard" : "/cabinet") : null;

  return (
    <header
      id="top"
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-brand-navy/85"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <button onClick={() => go("#top")} className="shrink-0">
          <Logo />
        </button>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="font-heading text-sm font-semibold text-slate-600 transition-colors hover:text-brand-blue dark:text-slate-300 dark:hover:text-brand-teal"
            >
              {t(l.key)}
            </button>
          ))}
          {dashboardHref && (
            <Link
              href={dashboardHref}
              className="font-heading text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blue-light dark:text-brand-teal"
            >
              {t("nav.dashboardLink")}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleToggle />
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          <Link
            href="/login"
            className="ml-1 inline-flex items-center justify-center rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light"
          >
            {t("landing.login")}
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-600 dark:text-slate-300 lg:hidden"
          aria-label="Menu"
        >
          {mobileOpen ? <Icons.close className="h-6 w-6" /> : <Icons.menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-brand-navy lg:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className="text-left font-heading text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                {t(l.key)}
              </button>
            ))}
            {dashboardHref && (
              <Link href={dashboardHref} className="font-heading text-sm font-semibold text-brand-blue dark:text-brand-teal">
                {t("nav.dashboardLink")}
              </Link>
            )}
            <div className="flex items-center gap-2 pt-2">
              <LocaleToggle />
              <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              {t("landing.login")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
