"use client";

import Link from "next/link";
import { useSession } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";
import { WaveformBackdrop } from "../WaveformArt";
import { Reveal } from "../Reveal";
import { openDemoModal } from "../demoModal";

/* The original hero content (badge, title, subtitle, CTA) is preserved
 * as-is — only the surrounding chrome (bg waveform, section wrapper,
 * reveal-in) is new. */
export function Hero() {
  const session = useSession();
  const t = useT();

  const ctaHref = session ? (session.role === "director" ? "/dashboard" : "/cabinet") : "/login";
  const ctaLabel = session ? t("landing.goToCabinet") : t("landing.login");

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
      <WaveformBackdrop />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <Reveal>
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/15 dark:text-slate-400">
            {t("landing.badge")}
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="font-heading max-w-2xl text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            {t("landing.title")}
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-5 max-w-xl text-base text-slate-500 dark:text-slate-400 sm:text-lg">
            {t("landing.subtitle")}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_-8px_rgba(59,95,227,0.5)] transition-colors hover:bg-brand-blue-light"
            >
              {ctaLabel}
            </Link>
            <button
              type="button"
              onClick={openDemoModal}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-7 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-400 dark:border-white/20 dark:text-slate-200 dark:hover:border-white/40"
            >
              {t("landing.requestDemo")}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
