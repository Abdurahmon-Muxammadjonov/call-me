"use client";

import { Icons, type IconKey } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const CASES: { icon: IconKey; titleKey: DictKey; bodyKey: DictKey; tint: string }[] = [
  { icon: "waveform", titleKey: "landing.use.case1Title", bodyKey: "landing.use.case1Body", tint: "from-brand-blue to-brand-blue-light" },
  { icon: "trendingUp", titleKey: "landing.use.case2Title", bodyKey: "landing.use.case2Body", tint: "from-brand-teal to-emerald-500" },
  { icon: "shield", titleKey: "landing.use.case3Title", bodyKey: "landing.use.case3Body", tint: "from-violet-500 to-fuchsia-500" },
];

export function UseCases() {
  const t = useT();
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue dark:text-brand-teal">
            {t("landing.use.badge")}
          </span>
          <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("landing.use.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {CASES.map((c, i) => {
            const Icon = Icons[c.icon];
            return (
              <Reveal key={c.titleKey} delay={i * 0.08}>
                <div className="landing-card relative h-full overflow-hidden p-7">
                  <span className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${c.tint}`} aria-hidden="true" />
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br ${c.tint} text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-heading mt-5 text-lg font-bold text-slate-900 dark:text-white">{t(c.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(c.bodyKey)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
