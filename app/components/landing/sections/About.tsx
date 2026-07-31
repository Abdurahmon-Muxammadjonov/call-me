"use client";

import { useT } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

export function About() {
  const t = useT();
  return (
    <section id="about" className="scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.about.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.about.title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-400">
            {t("landing.about.body")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
