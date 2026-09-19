"use client";

import Link from "next/link";
import { useSession } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";
import { Icons } from "../../Icons";
import { Reveal } from "../Reveal";
import { ProductFrame } from "../ProductFrame";
import { openDemoModal } from "../demoModal";
import shotDark from "../../../../public/landing/dashboard-analitika.png";
import shotLight from "../../../../public/landing/dashboard-analitika-light.png";

/* Hero = one strong claim + the real product underneath it. The screenshot
 * is the actual "Analitika" dashboard (generated from the live components,
 * see public/landing/), framed as a browser window and leaning back in 3D
 * until hovered. Aurora + blueprint grid give the section depth without
 * competing with the product for attention. */
export function Hero() {
  const session = useSession();
  const t = useT();

  const ctaHref = session ? (session.role === "director" ? "/dashboard" : "/cabinet") : "/login";
  const ctaLabel = session ? t("landing.goToCabinet") : t("landing.login");

  return (
    <section className="relative overflow-hidden px-6 pb-8 pt-14 sm:pt-20">
      <div className="aurora" aria-hidden="true" />
      <div className="blueprint-grid" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-white/12 dark:bg-white/5 dark:text-slate-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-teal opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-teal" />
            </span>
            {t("landing.hero.kicker")}
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="font-heading mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            {t("landing.hero.title1")} <span className="text-ink-brand whitespace-nowrap">{t("landing.hero.titleAccent")}</span>{" "}
            {t("landing.hero.title2")}
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            {t("landing.hero.subtitle")}
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-7 py-3.5 text-sm font-bold text-white shadow-[0_12px_40px_-12px_rgba(59,95,227,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-blue-light hover:shadow-[0_16px_48px_-12px_rgba(59,95,227,0.8)]"
            >
              {ctaLabel}
              <Icons.arrowUp className="h-4 w-4 rotate-90 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={openDemoModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/60 px-7 py-3.5 text-sm font-bold text-slate-700 backdrop-blur transition-colors hover:border-slate-400 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/30 dark:hover:bg-white/10"
            >
              <Icons.play className="h-4 w-4" />
              {t("landing.requestDemo")}
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {(["landing.hero.trust1", "landing.hero.trust2", "landing.hero.trust3"] as const).map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <Icons.check className="h-3.5 w-3.5 text-brand-teal" />
                {t(k)}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* The product */}
      <Reveal delay={0.25} y={40} className="relative mx-auto mt-14 max-w-6xl">
        <div
          className="pointer-events-none absolute inset-x-10 -top-10 h-40 rounded-full bg-brand-blue/30 blur-3xl dark:bg-brand-blue/25"
          aria-hidden="true"
        />
        <ProductFrame
          src={shotDark}
          srcLight={shotLight}
          alt={t("landing.hero.caption")}
          sizes="(max-width: 1200px) 100vw, 1152px"
          tilt
          preload
        />
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">{t("landing.hero.caption")}</p>
      </Reveal>
    </section>
  );
}
