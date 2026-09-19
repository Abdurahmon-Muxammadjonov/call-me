"use client";

import { Icons } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

/* Before / after. The "problem" card is deliberately quiet and slightly
 * washed out; the "solution" card carries the brand glow — the eye should
 * land on the right-hand side. */
export function ProblemSolution() {
  const t = useT();
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-heading mb-12 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("landing.ps.title")}
          </h2>
        </Reveal>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Connector arrow between the two cards on desktop */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-brand-blue shadow-lg dark:border-white/10 dark:bg-brand-navy-light dark:text-brand-teal md:grid"
            aria-hidden="true"
          >
            <Icons.arrowUp className="h-5 w-5 rotate-90" />
          </div>

          <Reveal>
            <div className="landing-card h-full p-8 opacity-90">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-500">
                <Icons.close className="h-3.5 w-3.5" />
                {t("landing.ps.problemLabel")}
              </span>
              <h3 className="font-heading mt-5 text-xl font-bold text-slate-900 dark:text-white">
                {t("landing.ps.problemTitle")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t("landing.ps.problemBody")}
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-500 dark:text-slate-500">
                {(["landing.ps.problem1", "landing.ps.problem2", "landing.ps.problem3"] as DictKey[]).map((k) => (
                  <li key={k} className="flex items-center gap-2 line-through decoration-rose-400/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="landing-card relative h-full overflow-hidden p-8 !border-brand-blue/40 dark:!border-brand-teal/40">
              <div
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-teal/20 blur-3xl"
                aria-hidden="true"
              />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-teal">
                <Icons.spark className="h-3.5 w-3.5" />
                {t("landing.ps.solutionLabel")}
              </span>
              <h3 className="font-heading mt-5 text-xl font-bold text-slate-900 dark:text-white">
                {t("landing.ps.solutionTitle")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t("landing.ps.solutionBody")}
              </p>
              <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {(["landing.ps.solution1", "landing.ps.solution2", "landing.ps.solution3"] as DictKey[]).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-brand-teal" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
