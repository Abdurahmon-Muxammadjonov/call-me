"use client";

import { Icons, type IconKey } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const CASES: { icon: IconKey; titleKey: DictKey; bodyKey: DictKey }[] = [
  { icon: "waveform", titleKey: "landing.use.case1Title", bodyKey: "landing.use.case1Body" },
  { icon: "trendingUp", titleKey: "landing.use.case2Title", bodyKey: "landing.use.case2Body" },
  { icon: "shield", titleKey: "landing.use.case3Title", bodyKey: "landing.use.case3Body" },
];

export function UseCases() {
  const t = useT();
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.use.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.use.title")}
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {CASES.map((c, i) => {
            const Icon = Icons[c.icon];
            return (
              <Reveal key={c.titleKey} delay={i * 0.08}>
                <div className="landing-glass h-full rounded-2xl p-7 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-teal/10 text-brand-teal">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-heading mt-4 text-base font-bold text-slate-900 dark:text-white">{t(c.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(c.bodyKey)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
