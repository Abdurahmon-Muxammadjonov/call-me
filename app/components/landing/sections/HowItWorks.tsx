"use client";

import { useT, type DictKey } from "../../../lib/i18n";
import { WaveformArt } from "../WaveformArt";
import { Reveal } from "../Reveal";

const STEPS: { titleKey: DictKey; bodyKey: DictKey }[] = [
  { titleKey: "landing.how.step1Title", bodyKey: "landing.how.step1Body" },
  { titleKey: "landing.how.step2Title", bodyKey: "landing.how.step2Body" },
  { titleKey: "landing.how.step3Title", bodyKey: "landing.how.step3Body" },
  { titleKey: "landing.how.step4Title", bodyKey: "landing.how.step4Body" },
];

export function HowItWorks() {
  const t = useT();
  return (
    <section className="border-y border-slate-200 bg-white px-6 py-20 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.how.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.how.title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.titleKey} delay={i * 0.08}>
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="font-mono-stat grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-blue text-sm font-medium text-white">
                    {i + 1}
                  </span>
                  {i < STEPS.length - 1 && (
                    <WaveformArt barCount={10} className="hidden h-4 flex-1 text-slate-300 dark:text-white/15 lg:flex" />
                  )}
                </div>
                <h3 className="font-heading mt-4 text-base font-bold text-slate-900 dark:text-white">{t(s.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(s.bodyKey)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
