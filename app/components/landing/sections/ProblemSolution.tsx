"use client";

import { Icons } from "../../Icons";
import { useT } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

export function ProblemSolution() {
  const t = useT();
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="font-heading mb-10 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.ps.title")}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Reveal>
            <div className="landing-glass h-full rounded-2xl p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-500">
                <Icons.close className="h-3.5 w-3.5" />
                {t("landing.ps.problemLabel")}
              </span>
              <h3 className="font-heading mt-4 text-xl font-bold text-slate-900 dark:text-white">
                {t("landing.ps.problemTitle")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t("landing.ps.problemBody")}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="landing-glass h-full rounded-2xl border-brand-blue/30 p-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-teal">
                <Icons.spark className="h-3.5 w-3.5" />
                {t("landing.ps.solutionLabel")}
              </span>
              <h3 className="font-heading mt-4 text-xl font-bold text-slate-900 dark:text-white">
                {t("landing.ps.solutionTitle")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t("landing.ps.solutionBody")}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
