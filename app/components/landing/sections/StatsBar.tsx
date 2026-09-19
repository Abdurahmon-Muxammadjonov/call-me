"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useT, useLocale, type DictKey } from "../../../lib/i18n";
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
    <p ref={ref} className="font-heading text-ink-brand text-4xl font-bold tracking-tight sm:text-5xl">
      {formatted}
      {suffix}
    </p>
  );
}

export function StatsBar() {
  const t = useT();
  return (
    <section className="relative px-6 py-14">
      <div className="glow-line mx-auto max-w-5xl" aria-hidden="true" />
      <Reveal>
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-slate-200/70 py-10 dark:divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center px-6 py-6 text-center sm:py-2">
              <AnimatedStat target={s.target} suffix={s.suffix} />
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{t(s.labelKey)}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <div className="glow-line mx-auto max-w-5xl" aria-hidden="true" />
    </section>
  );
}
