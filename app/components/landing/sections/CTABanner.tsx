"use client";

import Link from "next/link";
import { useSession } from "../../../lib/auth";
import { useT } from "../../../lib/i18n";
import { WaveformArt } from "../WaveformArt";
import { Reveal } from "../Reveal";
import { Icons } from "../../Icons";
import { openDemoModal } from "../demoModal";

export function CTABanner() {
  const session = useSession();
  const t = useT();
  const ctaHref = session ? (session.role === "director" ? "/dashboard" : "/cabinet") : "/login";
  const ctaLabel = session ? t("landing.goToCabinet") : t("landing.login");

  return (
    <section id="cta" className="scroll-mt-20 px-6 pb-24 pt-8">
      <Reveal>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-linear-to-br from-brand-blue via-[#4a6cf0] to-[#2bb8ad] px-8 py-16 text-center shadow-[0_40px_100px_-40px_rgba(59,95,227,0.8)] sm:py-20">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-teal/40 blur-3xl"
            aria-hidden="true"
          />
          <WaveformArt
            barCount={48}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full justify-between px-6 opacity-20"
            color="#ffffff"
          />
          <div className="relative">
            <h2 className="font-heading text-balance text-3xl font-bold text-white sm:text-4xl">{t("landing.ctaBanner.title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-white/85">{t("landing.ctaBanner.subtitle")}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={ctaHref}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-brand-blue shadow-lg transition-all hover:-translate-y-0.5"
              >
                {ctaLabel}
                <Icons.arrowUp className="h-4 w-4 rotate-90 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={openDemoModal}
                className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition-colors hover:border-white/70 hover:bg-white/15"
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
