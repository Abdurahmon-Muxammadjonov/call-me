"use client";

import { Icons, type IconKey } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const FEATURES: { icon: IconKey; titleKey: DictKey; bodyKey: DictKey }[] = [
  { icon: "shield", titleKey: "landing.feature1Title", bodyKey: "landing.feature1Body" },
  { icon: "trendingUp", titleKey: "landing.feature2Title", bodyKey: "landing.feature2Body" },
  { icon: "users", titleKey: "landing.feature3Title", bodyKey: "landing.feature3Body" },
  { icon: "ruler", titleKey: "landing.feature4Title", bodyKey: "landing.feature4Body" },
  { icon: "trendingUp", titleKey: "landing.feature5Title", bodyKey: "landing.feature5Body" },
  { icon: "bell", titleKey: "landing.feature6Title", bodyKey: "landing.feature6Body" },
];

export function Features() {
  const t = useT();
  return (
    <section id="features" className="scroll-mt-20 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.features.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.features.title")}
          </h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("landing.features.subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = Icons[f.icon];
            return (
              <Reveal key={f.titleKey} delay={(i % 3) * 0.08}>
                <div className="landing-glass h-full rounded-2xl p-6 transition-colors hover:border-brand-blue/40">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue dark:text-brand-teal">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-heading mt-4 text-base font-bold text-slate-900 dark:text-white">
                    {t(f.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(f.bodyKey)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
