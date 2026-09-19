"use client";

import { Icons, type IconKey } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";
import { Sparkline } from "../../ui";

/* Bento layout: the first feature (AI auditor) is the hero tile and gets a
 * live-looking mini visual; the rest are compact tiles. Each icon tile has
 * its own accent so the grid doesn't read as six identical boxes. */
const FEATURES: { icon: IconKey; titleKey: DictKey; bodyKey: DictKey; tint: string; ink: string }[] = [
  { icon: "shield", titleKey: "landing.feature1Title", bodyKey: "landing.feature1Body", tint: "from-blue-500 to-indigo-500", ink: "text-blue-500" },
  { icon: "trendingUp", titleKey: "landing.feature2Title", bodyKey: "landing.feature2Body", tint: "from-teal-400 to-emerald-500", ink: "text-teal-500" },
  { icon: "users", titleKey: "landing.feature3Title", bodyKey: "landing.feature3Body", tint: "from-violet-500 to-fuchsia-500", ink: "text-violet-500" },
  { icon: "ruler", titleKey: "landing.feature4Title", bodyKey: "landing.feature4Body", tint: "from-amber-400 to-orange-500", ink: "text-amber-500" },
  { icon: "trendingUp", titleKey: "landing.feature5Title", bodyKey: "landing.feature5Body", tint: "from-sky-400 to-cyan-500", ink: "text-sky-500" },
  { icon: "bell", titleKey: "landing.feature6Title", bodyKey: "landing.feature6Body", tint: "from-rose-500 to-pink-500", ink: "text-rose-500" },
];

const SCORE_ROWS = [
  { label: "Salomlashish", score: 92 },
  { label: "Ehtiyojni aniqlash", score: 78 },
  { label: "Taklif", score: 64 },
  { label: "Yakun", score: 85 },
];

function ScoreVisual() {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-brand-navy/60">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI auditor · KPI</span>
        <span className="font-mono-stat rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">84 / 100</span>
      </div>
      <ul className="space-y-2.5">
        {SCORE_ROWS.map((r) => (
          <li key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-300">{r.label}</span>
              <span className="font-mono-stat text-slate-500 dark:text-slate-400">{r.score}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-blue to-brand-teal"
                style={{ width: `${r.score}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Features() {
  const t = useT();
  const [hero, ...rest] = FEATURES;
  const HeroIcon = Icons[hero.icon];

  return (
    <section id="features" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue dark:text-brand-teal">
            {t("landing.features.badge")}
          </span>
          <h2 className="font-heading mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("landing.features.title")}
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">{t("landing.features.subtitle")}</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Hero tile */}
          <Reveal className="md:col-span-2 md:row-span-2">
            <div className="landing-card flex h-full flex-col p-7 sm:p-8">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br ${hero.tint} text-white shadow-lg`}>
                <HeroIcon className="h-5 w-5" />
              </span>
              <h3 className="font-heading mt-5 text-2xl font-bold text-slate-900 dark:text-white">{t(hero.titleKey)}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(hero.bodyKey)}</p>
              <ScoreVisual />
            </div>
          </Reveal>

          {rest.map((f, i) => {
            const Icon = Icons[f.icon];
            const showSpark = f.titleKey === "landing.feature2Title" || f.titleKey === "landing.feature5Title";
            return (
              <Reveal key={f.titleKey} delay={0.05 + i * 0.05}>
                <div className="landing-card flex h-full flex-col p-6">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br ${f.tint} text-white shadow-md`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-heading mt-4 text-base font-bold text-slate-900 dark:text-white">{t(f.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(f.bodyKey)}</p>
                  {showSpark && (
                    <div className="mt-auto pt-5">
                      <Sparkline data={[18, 24, 20, 30, 28, 42, 38, 52, 48, 61]} color={f.titleKey === "landing.feature2Title" ? "#2dd4bf" : "#0ea5e9"} />
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
