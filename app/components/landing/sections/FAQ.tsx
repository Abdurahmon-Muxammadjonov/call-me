"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icons } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal, usePrefersReducedMotion } from "../Reveal";

const ITEMS: { qKey: DictKey; aKey: DictKey }[] = [
  { qKey: "landing.faq.q1", aKey: "landing.faq.a1" },
  { qKey: "landing.faq.q2", aKey: "landing.faq.a2" },
  { qKey: "landing.faq.q3", aKey: "landing.faq.a3" },
  { qKey: "landing.faq.q4", aKey: "landing.faq.a4" },
  { qKey: "landing.faq.q5", aKey: "landing.faq.a5" },
];

function FAQItem({ qKey, aKey, open, onToggle }: { qKey: DictKey; aKey: DictKey; open: boolean; onToggle: () => void }) {
  const t = useT();
  const reduced = usePrefersReducedMotion();
  return (
    <div
      className={`landing-card overflow-hidden transition-colors ${
        open ? "!border-brand-blue/40 dark:!border-brand-teal/40" : ""
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-heading text-[15px] font-bold text-slate-900 dark:text-white">{t(qKey)}</span>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
            open
              ? "rotate-45 border-brand-blue/40 bg-brand-blue/10 text-brand-blue dark:border-brand-teal/40 dark:bg-brand-teal/10 dark:text-brand-teal"
              : "border-slate-200 text-slate-400 dark:border-white/10"
          }`}
        >
          <Icons.plus className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="a"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t(aKey)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-blue dark:text-brand-teal">
            {t("landing.faq.badge")}
          </span>
          <h2 className="font-heading mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t("landing.faq.title")}
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {ITEMS.map((it, i) => (
            <Reveal key={it.qKey} delay={i * 0.05}>
              <FAQItem qKey={it.qKey} aKey={it.aKey} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
