"use client";

import Link from "next/link";
import { useSession } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";
import { WaveformArt } from "../WaveformArt";
import { Reveal } from "../Reveal";
import { openDemoModal } from "../demoModal";

export function CTABanner() {
  const session = useSession();
  const t = useT();
  const ctaHref = session ? (session.role === "director" ? "/dashboard" : "/cabinet") : "/login";
  const ctaLabel = session ? t("landing.goToCabinet") : t("landing.login");

  return (
    <section id="cta" className="scroll-mt-20 px-6 py-20">
      <Reveal>
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-brand-blue px-8 py-14 text-center">
          <WaveformArt
            barCount={40}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full justify-between px-4 opacity-20"
            color="#ffffff"
          />
          <div className="relative">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("landing.ctaBanner.title")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">
              {t("landing.ctaBanner.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-brand-blue shadow-sm transition-transform hover:scale-[1.02]"
              >
                {ctaLabel}
              </Link>
              <button
                type="button"
                onClick={openDemoModal}
                className="inline-flex items-center justify-center rounded-xl border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:border-white/70"
              >
                {t("landing.requestDemo")}
              </button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
