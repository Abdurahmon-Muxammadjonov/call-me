"use client";

import { Icons, type IconKey } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const STEPS: { icon: IconKey; titleKey: DictKey; bodyKey: DictKey }[] = [
  { icon: "phone", titleKey: "landing.how.step1Title", bodyKey: "landing.how.step1Body" },
  { icon: "spark", titleKey: "landing.how.step2Title", bodyKey: "landing.how.step2Body" },
  { icon: "ruler", titleKey: "landing.how.step3Title", bodyKey: "landing.how.step3Body" },
  { icon: "grid", titleKey: "landing.how.step4Title", bodyKey: "landing.how.step4Body" },
];

/* A stepper: numbered nodes on a gradient rail. On desktop the rail runs
 * horizontally through the node centers; on mobile it becomes a vertical
 * timeline down the left edge. */
export function HowItWorks() {
  const t = useT();
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <div className="blueprint-grid" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue dark:text-brand-teal">
            {t("landing.how.badge")}
          </span>
          <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("landing.how.title")}
          </h2>
        </Reveal>

        <ol className="relative mt-16 grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-6">
          {/* Rail */}
          <div
            className="pointer-events-none absolute left-6 top-0 h-full w-px bg-linear-to-b from-brand-blue via-brand-teal to-transparent lg:left-0 lg:top-6 lg:h-px lg:w-full lg:bg-linear-to-r lg:from-transparent lg:via-brand-blue lg:to-transparent"
            aria-hidden="true"
          />
          {STEPS.map((s, i) => {
            const Icon = Icons[s.icon];
            return (
              <Reveal key={s.titleKey} delay={i * 0.1}>
                <li className="relative flex gap-5 lg:block">
                  <span className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brand-blue/30 bg-white text-brand-blue shadow-[0_10px_30px_-12px_rgba(59,95,227,0.6)] dark:border-brand-teal/30 dark:bg-brand-navy-light dark:text-brand-teal">
                    <Icon className="h-5 w-5" />
                    <span className="font-mono-stat absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-brand-blue text-[10px] font-medium text-white dark:bg-brand-teal dark:text-brand-navy">
                      {i + 1}
                    </span>
                  </span>
                  <div className="lg:mt-5">
                    <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">{t(s.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(s.bodyKey)}</p>
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
