"use client";

import { Icons } from "../../Icons";
import { useT } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const TELEGRAM_BOT_URL = "https://t.me/SalesPulsead_bot";

/* Replaces the old self-serve pricing calculator: pricing is now handled
 * directly through the Telegram bot rather than shown on the site. Keeps
 * the same #pricing anchor so the navbar/footer "Narxlar" links still
 * scroll to something. */
export function PricingContact() {
  const t = useT();
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-slate-200 bg-white px-6 py-20 dark:border-white/10 dark:bg-white/2">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
          {t("landing.pricing.badge")}
        </span>
        <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {t("landing.pricing.title")}
        </h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("landing.pricing.contactSubtitle")}</p>

        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-blue px-7 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-blue-light"
        >
          <Icons.waveform className="h-4 w-4" />
          {t("landing.pricing.telegramCta")}
        </a>
      </Reveal>
    </section>
  );
}
