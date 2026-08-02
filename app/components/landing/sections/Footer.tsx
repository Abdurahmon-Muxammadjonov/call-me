"use client";

import type { SVGProps } from "react";
import Link from "next/link";
import { Logo } from "../../ui";
import { Icons } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { CONTACT_PHONE_TEL, CONTACT_PHONE_DISPLAY } from "../../../lib/contact";

const NAV_LINKS: { key: DictKey; href: string }[] = [
  { key: "nav.home", href: "#top" },
  { key: "nav.about", href: "#about" },
  { key: "nav.featuresLink", href: "#features" },
  { key: "nav.pricingLink", href: "#pricing" },
];

// Minimal inline glyphs — no dedicated social-icon set exists in Icons.tsx
// yet, and pulling in a whole icon pack for two footer links isn't worth it.
function TelegramGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path d="M21.5 3.5 2.7 10.8c-1.1.4-1.1 1.6 0 2l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.3l2.6-2.7 4.9 3.6c.7.5 1.7.1 1.9-.8l3-16.6c.2-1-.7-1.7-1.6-1.2Zm-3.4 3.7-8.6 7.8-.3 3-1.3-4.2 9.6-7.5c.3-.2.6.2.3.4Z" />
    </svg>
  );
}
function InstagramGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  const t = useT();

  function go(href: string) {
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <footer className="border-t border-slate-200 bg-white px-6 pt-16 dark:border-white/10 dark:bg-brand-navy">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {t("landing.footer.description")}
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://t.me/SalesPulsead_bot"
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-white/15 dark:text-slate-400"
              >
                <TelegramGlyph />
              </a>
              <a
                href="https://www.instagram.com/salespulse.uz?igsh=dXIwNjV0cjF0YzRy"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-brand-blue hover:text-brand-blue dark:border-white/15 dark:text-slate-400"
              >
                <InstagramGlyph />
              </a>
            </div>
          </div>

          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t("landing.footer.navTitle")}
            </p>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => go(l.href)}
                    className="text-sm text-slate-600 transition-colors hover:text-brand-blue dark:text-slate-400 dark:hover:text-brand-teal"
                  >
                    {t(l.key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t("landing.footer.legalTitle")}
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                {/* TODO: haqiqiy Maxfiylik siyosati sahifasiga ulanishi kerak */}
                <Link href="#" className="text-sm text-slate-600 transition-colors hover:text-brand-blue dark:text-slate-400 dark:hover:text-brand-teal">
                  {t("landing.footer.legalPrivacy")}
                </Link>
              </li>
              <li>
                {/* TODO: haqiqiy Foydalanish shartlari sahifasiga ulanishi kerak */}
                <Link href="#" className="text-sm text-slate-600 transition-colors hover:text-brand-blue dark:text-slate-400 dark:hover:text-brand-teal">
                  {t("landing.footer.legalTerms")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t("landing.footer.contactTitle")}
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="mailto:hello@salespulse.uz" className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-brand-blue dark:text-slate-400 dark:hover:text-brand-teal">
                  <Icons.mail className="h-4 w-4" /> hello@salespulse.uz
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-brand-blue dark:text-slate-400 dark:hover:text-brand-teal">
                  <Icons.phone className="h-4 w-4" /> {CONTACT_PHONE_DISPLAY}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
          {t("landing.footer.copyright")}
        </div>
      </div>
    </footer>
  );
}
