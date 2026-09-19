"use client";

import Image, { type StaticImageData } from "next/image";

/* Browser-window chrome around a real dashboard screenshot. The whole
 * landing page's "art" is the product itself, so this frame carries the
 * weight of a hero illustration: hairline chrome, soft brand glow, and an
 * optional 3D lean (hero only) that flattens on hover.
 *
 * `src`/`srcLight` are static imports → next/image knows the intrinsic size
 * (no layout shift) and serves WebP/AVIF at the right width for the slot. */
export function ProductFrame({
  src,
  srcLight,
  alt,
  sizes,
  tilt = false,
  preload = false,
  className = "",
}: {
  src: StaticImageData;
  srcLight?: StaticImageData;
  alt: string;
  sizes: string;
  tilt?: boolean;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div className={`product-frame ${tilt ? "product-frame-tilt" : ""} ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-2.5 dark:border-white/10">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        {/* Brand, not a domain — the domain is about to change and the brand
            is what the screenshot is selling anyway. */}
        <span className="mx-auto hidden items-center gap-1.5 rounded-md bg-slate-100 px-3 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          SalesPulse · Dashboard
        </span>
      </div>
      {/* Screenshot — theme-matched when a light variant is supplied */}
      <div className="relative">
        <Image
          src={src}
          alt={alt}
          sizes={sizes}
          preload={preload}
          placeholder="blur"
          className={`h-auto w-full ${srcLight ? "hidden dark:block" : ""}`}
        />
        {srcLight && (
          <Image
            src={srcLight}
            alt={alt}
            sizes={sizes}
            placeholder="blur"
            className="h-auto w-full dark:hidden"
          />
        )}
      </div>
    </div>
  );
}
