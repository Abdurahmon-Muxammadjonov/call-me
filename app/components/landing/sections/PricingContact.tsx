"use client";

import { Icons } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const TELEGRAM_BOT_URL = "https://t.me/SalesPulsead_bot";

const POINTS: DictKey[] = ["landing.pricing.point1", "landing.pricing.point2", "landing.pricing.point3"];

/* Pricing is handled in the Telegram bot (per-seat, confirmed in chat), so
 * the site shows one confident card that explains the model and sends
 * people to the bot. Keeps the #pricing anchor the navbar links to. */
export function PricingContact() {
  const t = useT();
  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden px-6 py-24">
      <div className="aurora opacity-70" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <div className="landing-card overflow-hidden p-8 text-center sm:p-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue dark:text-brand-teal">
              {t("landing.pricing.badge")}
            </span>
            <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t("landing.pricing.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-slate-600 dark:text-slate-400">
              {t("landing.pricing.contactSubtitle")}
            </p>

            <ul className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              {POINTS.map((k) => (
                <li
                  key={k}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200/70 bg-white/60 px-3.5 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
                  {t(k)}
                </li>
              ))}
            </ul>

            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-9 inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-blue px-8 py-4 text-sm font-bold text-white shadow-[0_12px_40px_-12px_rgba(59,95,227,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-blue-light"
            >
              <Icons.telegram className="h-4 w-4" />
              {t("landing.pricing.telegramCta")}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
