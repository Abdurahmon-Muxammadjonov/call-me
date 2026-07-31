"use client";

import { useState } from "react";
import { Icons } from "../../Icons";
import { formatUZS } from "../../../lib/calls";
import { useT } from "../../../lib/i18n";
import {
  BILLING_PERIODS,
  PLANS,
  PRICING_CATEGORIES,
  discountedMonthly,
  type BillingPeriod,
  type PricingPlan,
} from "../../../lib/pricing";
import { Reveal } from "../Reveal";

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="-"
        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-300 text-base font-bold leading-none text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="font-mono-stat w-10 text-center text-sm font-medium text-slate-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="+"
        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icons.plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ManagersRow({ plan }: { plan: PricingPlan }) {
  const [count, setCount] = useState(plan.managers.min ?? plan.managers.fixed ?? 1);
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
      <span className="text-slate-500">Menejerlar soni</span>
      {plan.managers.kind === "unlimited" ? (
        <span className="font-mono-stat font-medium text-slate-900">∞</span>
      ) : plan.managers.kind === "fixed" ? (
        <span className="font-mono-stat font-medium text-slate-900">{plan.managers.fixed}</span>
      ) : (
        <Stepper value={count} min={plan.managers.min ?? 1} max={plan.managers.max ?? 1} onChange={setCount} />
      )}
    </div>
  );
}

function HoursRow({ plan }: { plan: PricingPlan }) {
  const cfg = plan.hoursPerMonth;
  const [hours, setHours] = useState(cfg?.default ?? 0);
  if (!cfg) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
      <span className="text-slate-500">Tahlil hajmi (soat/oy)</span>
      <Stepper value={hours} min={cfg.min} max={cfg.max} step={cfg.step} onChange={setHours} />
    </div>
  );
}

function PlanCard({ plan, period, index }: { plan: PricingPlan; period: BillingPeriod; index: number }) {
  const t = useT();
  const monthly = discountedMonthly(plan.monthlyPrice, period.discountPct);
  const periodTotal = monthly * period.months;

  return (
    <Reveal delay={index * 0.06} className="h-full">
      <div
        className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 text-slate-800 ${
          plan.popular ? "border-2 border-brand-blue shadow-[0_16px_44px_-18px_rgba(59,95,227,0.45)]" : "border-slate-200"
        }`}
      >
        {plan.popular && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-blue px-3 py-1 text-xs font-bold text-white">
            MASHHUR
          </span>
        )}

        <p className="font-heading text-base font-bold tracking-wide text-slate-900">{plan.name}</p>
        <p className="mt-1 text-xs text-slate-400">Imkoniyat darajasi: {plan.capacityLabel}</p>

        <div className="mt-5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-stat text-3xl font-medium text-slate-900">{formatUZS(monthly)}</span>
            <span className="text-sm text-slate-400">/ oy</span>
          </div>
          {period.discountPct > 0 && (
            <p className="mt-1 text-xs text-slate-400 line-through">{formatUZS(plan.monthlyPrice)} / oy</p>
          )}
          <p className="mt-1.5 text-xs font-medium text-slate-500">
            {period.months} oy uchun jami: <span className="font-mono-stat text-slate-700">{formatUZS(periodTotal)}</span>
          </p>
        </div>

        {/* Narx tagidagi qisqa xulosa — bu pulga nima kirishini bir qarashda ko'rsatadi */}
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
          {plan.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-xs font-medium text-slate-600">
              <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Icons.check className="h-2.5 w-2.5" />
              </span>
              {h}
            </li>
          ))}
        </ul>

        <a
          href="#cta"
          className={`mt-5 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
            plan.popular
              ? "bg-brand-blue text-white hover:bg-brand-blue-light"
              : "border border-slate-300 text-slate-700 hover:border-brand-blue"
          }`}
        >
          {t("landing.pricing.cta")}
        </a>

        <div className="mt-5 space-y-3">
          <ManagersRow plan={plan} />
          <HoursRow plan={plan} />
          <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">{plan.analysisNote}</p>
        </div>

        <div className="mt-6 space-y-5">
          {PRICING_CATEGORIES.map((cat) => (
            <div key={cat.title}>
              <p className="mb-2.5 border-t border-slate-100 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {cat.title}
              </p>
              <ul className="space-y-2">
                {cat.features.map((f) => {
                  const on = f.included[plan.id];
                  return (
                    <li key={f.label} className={`flex items-start gap-2 text-xs leading-relaxed ${on ? "text-slate-700" : "text-slate-400"}`}>
                      {on ? (
                        <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                          <Icons.check className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
                          <Icons.lock className="h-2.5 w-2.5" />
                        </span>
                      )}
                      {f.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function PeriodSelector({ period, onChange }: { period: BillingPeriod; onChange: (p: BillingPeriod) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {BILLING_PERIODS.map((p) => {
        const active = p.months === period.months;
        return (
          <button
            key={p.months}
            type="button"
            onClick={() => onChange(p)}
            className={`relative rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "border-brand-blue bg-brand-blue/5 text-brand-blue dark:bg-brand-blue/10 dark:text-brand-teal"
                : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/15 dark:text-slate-400"
            }`}
          >
            {p.label}
            {p.discountPct > 0 && (
              <span className="absolute -top-2.5 -right-2.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{p.discountPct}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pricing() {
  const t = useT();
  const [period, setPeriod] = useState<BillingPeriod>(BILLING_PERIODS[0] as BillingPeriod);

  return (
    <section id="pricing" className="scroll-mt-20 border-y border-slate-200 bg-white px-6 py-20 dark:border-white/10 dark:bg-white/2">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.pricing.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.pricing.title")}
          </h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("landing.pricing.subtitle")}</p>
        </Reveal>

        <Reveal delay={0.05} className="mt-8">
          <PeriodSelector period={period} onChange={setPeriod} />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <PlanCard key={p.id} plan={p} period={period} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
