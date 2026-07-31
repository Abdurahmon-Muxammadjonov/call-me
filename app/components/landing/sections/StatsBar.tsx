"use client";

import { useT, type DictKey } from "../../../lib/i18n";
import { WaveformArt } from "../WaveformArt";
import { Reveal } from "../Reveal";

// TODO: haqiqiy statistika bilan almashtirilsin (hozircha placeholder son).
const STATS: { valueKey: DictKey; labelKey: DictKey }[] = [
  { valueKey: "landing.stats.calls", labelKey: "landing.stats.callsLabel" },
  { valueKey: "landing.stats.accuracy", labelKey: "landing.stats.accuracyLabel" },
  { valueKey: "landing.stats.teams", labelKey: "landing.stats.teamsLabel" },
];

export function StatsBar() {
  const t = useT();
  return (
    <section className="border-y border-slate-200 bg-white px-6 py-10 dark:border-white/10 dark:bg-white/[0.02]">
      <Reveal>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          {STATS.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <WaveformArt barCount={7} className="mb-3 h-4 text-brand-teal" />
              <p className="font-mono-stat text-3xl font-medium text-slate-900 dark:text-white">{t(s.valueKey)}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(s.labelKey)}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
