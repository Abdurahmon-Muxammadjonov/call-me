"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { StaticImageData } from "next/image";
import { Icons, type IconKey } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal, usePrefersReducedMotion } from "../Reveal";
import { ProductFrame } from "../ProductFrame";
import shotAnalitika from "../../../../public/landing/dashboard-analitika.png";
import shotDeepAudit from "../../../../public/landing/dashboard-deep-audit.png";
import shotManagement from "../../../../public/landing/dashboard-management.png";
import shotRecordings from "../../../../public/landing/dashboard-recordings.png";
import shotStaff from "../../../../public/landing/dashboard-staff.png";

/* Tabbed walkthrough of the real dashboard. Each tab is one section of the
 * app, shot from the live components (public/landing/). The text column
 * explains what a manager gets from that screen; the frame swaps with a
 * crossfade. Deliberately dark screenshots in both themes — the app's dark
 * mode is the reference look, and a dark screenshot reads fine on a light
 * page inside its own frame. */
const TABS: { id: string; icon: IconKey; titleKey: DictKey; bodyKey: DictKey; shot: StaticImageData }[] = [
  { id: "analitika", icon: "grid", titleKey: "landing.tour.analitika.title", bodyKey: "landing.tour.analitika.body", shot: shotAnalitika },
  { id: "deep-audit", icon: "scan", titleKey: "landing.tour.deepAudit.title", bodyKey: "landing.tour.deepAudit.body", shot: shotDeepAudit },
  { id: "management", icon: "trendingUp", titleKey: "landing.tour.management.title", bodyKey: "landing.tour.management.body", shot: shotManagement },
  { id: "recordings", icon: "waveform", titleKey: "landing.tour.recordings.title", bodyKey: "landing.tour.recordings.body", shot: shotRecordings },
  { id: "staff", icon: "users", titleKey: "landing.tour.staff.title", bodyKey: "landing.tour.staff.body", shot: shotStaff },
];

export function ProductTour() {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((x) => x.id === active) ?? TABS[0];

  return (
    <section id="product" className="relative scroll-mt-20 overflow-hidden px-6 py-24">
      <div className="aurora opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue dark:text-brand-teal">
            {t("landing.tour.badge")}
          </span>
          <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("landing.tour.title")}
          </h2>
          <p className="mt-4 text-pretty text-base text-slate-600 dark:text-slate-400">{t("landing.tour.subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr] lg:gap-10">
          {/* Tabs */}
          <Reveal>
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" role="tablist">
              {TABS.map((x) => {
                const Icon = Icons[x.icon];
                const isActive = x.id === active;
                return (
                  <li key={x.id} className="shrink-0 lg:shrink">
                    <button
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActive(x.id)}
                      className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                        isActive
                          ? "border-brand-blue/40 bg-brand-blue/8 shadow-[0_12px_40px_-20px_rgba(59,95,227,0.6)] dark:border-brand-teal/40 dark:bg-brand-teal/8"
                          : "border-transparent hover:border-slate-200 hover:bg-white/60 dark:hover:border-white/10 dark:hover:bg-white/5"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
                          isActive
                            ? "bg-brand-blue text-white dark:bg-brand-teal dark:text-brand-navy"
                            : "bg-slate-100 text-slate-500 group-hover:text-slate-700 dark:bg-white/5 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="font-heading block text-sm font-bold text-slate-900 dark:text-white">{t(x.titleKey)}</span>
                        {/* Outer span owns display (hidden/block); the inner one owns the
                            clamp — line-clamp sets display:-webkit-box, so they can't share. */}
                        <span className="mt-1 hidden text-xs leading-relaxed text-slate-500 dark:text-slate-400 lg:block">
                          <span className={isActive ? "" : "line-clamp-2"}>{t(x.bodyKey)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 lg:hidden">{t(tab.bodyKey)}</p>
            <Link
              href="/login"
              className="mt-5 hidden items-center gap-2 text-sm font-bold text-brand-blue transition-colors hover:text-brand-blue-light dark:text-brand-teal lg:inline-flex"
            >
              {t("landing.tour.cta")}
              <Icons.arrowUp className="h-4 w-4 rotate-90" />
            </Link>
          </Reveal>

          {/* Frame */}
          <Reveal delay={0.08} className="relative">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-linear-to-br from-brand-blue/15 via-transparent to-brand-teal/15 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab.id}
                  initial={reduced ? false : { opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductFrame src={tab.shot} alt={t(tab.titleKey)} sizes="(max-width: 1024px) 100vw, 800px" />
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
