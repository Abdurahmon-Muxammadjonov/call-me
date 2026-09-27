"use client";

/* Umumiy sahifa sarlavhasi (§6.1): eyebrow (ixtiyoriy LiveDot bilan),
 * H1, o'ng tomonda amallar. Joylashuv manbadagidek: flex, align-end,
 * space-between, gap 24, padding-top 10. */

import type { ReactNode } from "react";
import { LiveDot } from "../ui/primitives";
import { usePT } from "../i18n";
import { useLiveStore } from "./liveStore";

/* Jonli so'z faqat LiveDot'i bor sahifalarda va holat ma'lum bo'lganda. */
export function LiveEyebrow({ children }: { children?: ReactNode }) {
  const t = usePT();
  const live = useLiveStore((s) => s.live);
  if (live === "unknown") {
    return <span className="pn-eyebrow">{children}</span>;
  }
  const word = live === "connected" ? t("live.on") : live === "reconnecting" ? t("live.reconnecting") : t("live.offline");
  return (
    <>
      <LiveDot state={live} />
      <span className="pn-eyebrow" data-testid="HDR-LIVE" data-state={live}>
        {word}
        {children != null && <> · {children}</>}
      </span>
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  actions,
  sub,
}: {
  /* Eyebrow qatori (LiveEyebrow yoki oddiy matn). */
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-[10px]">
      <div className="min-w-0">
        {eyebrow != null && <div className="flex min-h-4 items-center gap-[10px]">{eyebrow}</div>}
        <h1 className="pn-h1 text-pn-text">{title}</h1>
        {sub != null && <p className="pn-page-sub">{sub}</p>}
      </div>
      {actions != null && <div className="flex flex-wrap items-center gap-[10px]">{actions}</div>}
    </header>
  );
}
