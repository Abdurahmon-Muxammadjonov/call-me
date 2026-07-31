"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useT, useLocale, type DictKey } from "../../../lib/i18n";
import { WaveformArt } from "../WaveformArt";
import { Reveal, usePrefersReducedMotion } from "../Reveal";

const INTL_LOCALE: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };

// TODO: haqiqiy statistika bilan almashtirilsin (hozircha placeholder son).
const STATS: { target: number; suffix: string; labelKey: DictKey }[] = [
  { target: 2_000, suffix: "+", labelKey: "landing.stats.callsLabel" },
  { target: 98, suffix: "%", labelKey: "landing.stats.accuracyLabel" },
  { target: 10, suffix: "+", labelKey: "landing.stats.teamsLabel" },
];

const COUNT_UP_MS = 1400;

/* Counts up from 0 → target once the number scrolls into view, so the
 * stats bar reads as "live" rather than a static line of text. Skips the
 * animation entirely under prefers-reduced-motion. */
function AnimatedStat({ target, suffix }: { target: number; suffix: string }) {
  const locale = useLocale();
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, target]);

  const formatted = new Intl.NumberFormat(INTL_LOCALE[locale] ?? "uz-UZ").format(value);

  return (
    <p ref={ref} className="font-mono-stat text-3xl font-medium text-slate-900 dark:text-white">
      {formatted}
      {suffix}
    </p>
  );
}

export function StatsBar() {
  const t = useT();
  return (
    <section className="border-y border-slate-200 bg-white px-6 py-10 dark:border-white/10 dark:bg-white/2">
      <Reveal>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <WaveformArt barCount={7} className="mb-3 h-4 text-brand-teal" />
              <AnimatedStat target={s.target} suffix={s.suffix} />
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(s.labelKey)}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
