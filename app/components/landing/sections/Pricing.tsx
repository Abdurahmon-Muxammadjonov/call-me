"use client";

import { Icons } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

// TODO: haqiqiy tarif rejalari va narxlar tasdiqlangach shu bilan almashtirilsin.
const PLANS: {
  nameKey: DictKey;
  badgeKey?: DictKey;
  descKey: DictKey;
  featureKeys: DictKey[];
  highlighted?: boolean;
}[] = [
  {
    nameKey: "landing.pricing.plan1Name",
    descKey: "landing.pricing.plan1Desc",
    featureKeys: ["landing.pricing.plan1Feature1", "landing.pricing.plan1Feature2", "landing.pricing.plan1Feature3"],
  },
  {
    nameKey: "landing.pricing.plan2Name",
    badgeKey: "landing.pricing.plan2Badge",
    descKey: "landing.pricing.plan2Desc",
    featureKeys: ["landing.pricing.plan2Feature1", "landing.pricing.plan2Feature2", "landing.pricing.plan2Feature3"],
    highlighted: true,
  },
  {
    nameKey: "landing.pricing.plan3Name",
    descKey: "landing.pricing.plan3Desc",
    featureKeys: ["landing.pricing.plan3Feature1", "landing.pricing.plan3Feature2", "landing.pricing.plan3Feature3"],
  },
];

export function Pricing() {
  const t = useT();
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-slate-200 bg-white px-6 py-20 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.pricing.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.pricing.title")}
          </h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("landing.pricing.subtitle")}</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.nameKey} delay={i * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-2xl p-7 ${
                  p.highlighted
                    ? "border-2 border-brand-blue bg-white shadow-[0_12px_40px_-16px_rgba(59,95,227,0.4)] dark:bg-brand-navy-light"
                    : "landing-glass"
                }`}
              >
                {p.badgeKey && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">
                    {t(p.badgeKey)}
                  </span>
                )}
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">{t(p.nameKey)}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(p.descKey)}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {p.featureKeys.map((fk) => (
                    <li key={fk} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
                      {t(fk)}
                    </li>
                  ))}
                </ul>

                <a
                  href="#cta"
                  className={`mt-7 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                    p.highlighted
                      ? "bg-brand-blue text-white hover:bg-brand-blue-light"
                      : "border border-slate-300 text-slate-700 hover:border-brand-blue dark:border-white/20 dark:text-slate-200"
                  }`}
                >
                  {t("landing.pricing.cta")}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
