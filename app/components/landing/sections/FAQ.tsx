"use client";

import { useState } from "react";
import { Icons } from "../../Icons";
import { useT, type DictKey } from "../../../lib/i18n";
import { Reveal } from "../Reveal";

const ITEMS: { qKey: DictKey; aKey: DictKey }[] = [
  { qKey: "landing.faq.q1", aKey: "landing.faq.a1" },
  { qKey: "landing.faq.q2", aKey: "landing.faq.a2" },
  { qKey: "landing.faq.q3", aKey: "landing.faq.a3" },
  { qKey: "landing.faq.q4", aKey: "landing.faq.a4" },
  { qKey: "landing.faq.q5", aKey: "landing.faq.a5" },
];

function FAQItem({ qKey, aKey }: { qKey: DictKey; aKey: DictKey }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="landing-glass rounded-xl">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-heading text-sm font-semibold text-slate-900 dark:text-white">{t(qKey)}</span>
        <Icons.chevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(aKey)}</p>
      )}
    </div>
  );
}

export function FAQ() {
  const t = useT();
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-blue dark:text-brand-teal">
            {t("landing.faq.badge")}
          </span>
          <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {t("landing.faq.title")}
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {ITEMS.map((it, i) => (
            <Reveal key={it.qKey} delay={i * 0.05}>
              <FAQItem qKey={it.qKey} aKey={it.aKey} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
