"use client";

import { useState } from "react";
import { Icons } from "../../Icons";
import { formatUZS } from "../../../lib/calls";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const DEFAULT_HEADCOUNT = 5;
const MIN_HEADCOUNT = 1;
const MAX_HEADCOUNT = 500;

const PLANS: {
  nameKey: DictKey;
  badgeKey?: DictKey;
  descKey: DictKey;
  featureKeys: DictKey[];
  /* Narx — bitta xodim uchun, oyiga (so'm). Xodimlar soni oshsa, jami narx
   * shunga qarab ko'payadi. */
  pricePerEmployee: number;
  highlighted?: boolean;
}[] = [
  {
    nameKey: "landing.pricing.plan1Name",
    descKey: "landing.pricing.plan1Desc",
    featureKeys: ["landing.pricing.plan1Feature1", "landing.pricing.plan1Feature2", "landing.pricing.plan1Feature3"],
    pricePerEmployee: 300_000,
  },
  {
    nameKey: "landing.pricing.plan2Name",
    badgeKey: "landing.pricing.plan2Badge",
    descKey: "landing.pricing.plan2Desc",
    featureKeys: ["landing.pricing.plan2Feature1", "landing.pricing.plan2Feature2", "landing.pricing.plan2Feature3"],
    pricePerEmployee: 550_000,
    highlighted: true,
  },
  {
    nameKey: "landing.pricing.plan3Name",
    descKey: "landing.pricing.plan3Desc",
    featureKeys: ["landing.pricing.plan3Feature1", "landing.pricing.plan3Feature2", "landing.pricing.plan3Feature3"],
    pricePerEmployee: 799_000,
  },
];

function PlanCard({ plan, index }: { plan: (typeof PLANS)[number]; index: number }) {
  const t = useT();
  const [count, setCount] = useState(DEFAULT_HEADCOUNT);

  function clamp(n: number): number {
    return Math.min(MAX_HEADCOUNT, Math.max(MIN_HEADCOUNT, n));
  }

  return (
    <Reveal delay={index * 0.08}>
      <div
        className={`relative flex h-full flex-col rounded-2xl p-7 ${
          plan.highlighted
            ? "border-2 border-brand-blue bg-white shadow-[0_12px_40px_-16px_rgba(59,95,227,0.4)] dark:bg-brand-navy-light"
            : "landing-glass"
        }`}
      >
        {plan.badgeKey && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">
            {t(plan.badgeKey)}
          </span>
        )}
        <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">{t(plan.nameKey)}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(plan.descKey)}</p>

        <p className="font-mono-stat mt-2 text-xs text-slate-400 dark:text-slate-500">
          {formatUZS(plan.pricePerEmployee)} / {t("landing.pricing.perEmployee")}
        </p>

        {/* Xodimlar soni — hisoblagich, "+" bosilganda narx darhol ko'payadi */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("landing.pricing.employeesLabel")}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c - 1))}
              disabled={count <= MIN_HEADCOUNT}
              aria-label="-"
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-300 text-base font-bold leading-none text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:text-slate-300"
            >
              −
            </button>
            <span className="font-mono-stat w-7 text-center text-sm font-medium text-slate-900 dark:text-white">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setCount((c) => clamp(c + 1))}
              disabled={count >= MAX_HEADCOUNT}
              aria-label="+"
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:text-slate-300"
            >
              <Icons.plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Jami narx — xodimlar soni x bitta xodim narxi, jonli hisoblanadi */}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("landing.pricing.total")}
          </p>
          <p className="font-mono-stat mt-1 text-3xl font-medium text-slate-900 dark:text-white">
            {formatUZS(plan.pricePerEmployee * count)}
            <span className="ml-1 text-sm font-normal text-slate-400 dark:text-slate-500">/ oy</span>
          </p>
        </div>

        <ul className="mt-6 flex-1 space-y-3">
          {plan.featureKeys.map((fk) => (
            <li key={fk} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
              <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
              {t(fk)}
            </li>
          ))}
        </ul>

        <a
          href="#cta"
          className={`mt-7 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            plan.highlighted
              ? "bg-brand-blue text-white hover:bg-brand-blue-light"
              : "border border-slate-300 text-slate-700 hover:border-brand-blue dark:border-white/20 dark:text-slate-200"
          }`}
        >
          {t("landing.pricing.cta")}
        </a>
      </div>
    </Reveal>
  );
}

export function Pricing() {
  const t = useT();
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-slate-200 bg-white px-6 py-20 dark:border-white/10 dark:bg-white/2">
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
            <PlanCard key={p.nameKey} plan={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
