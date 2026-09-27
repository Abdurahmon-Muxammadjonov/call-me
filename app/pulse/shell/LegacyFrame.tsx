"use client";

/* Hali Pulse'ga ko'chirilmagan bo'limlar uchun ramka.
 *
 * Eski AppShell'dagi yuqori panel (qo'ng'iroqcha, til, mavzu) o'rnini
 * bosadi: til va mavzu endi yon menyuda (NAV-04/05), qo'ng'iroqcha shu
 * yerda o'ng tomonda (HDR-BELL). Eski sahifa o'z ko'rinishida qoladi —
 * shrift ham eskisi (Geist), bosqichma-bosqich ko'chirilguncha dizayn
 * aralashib ketmasin. */

import type { ReactNode } from "react";
import { HeaderBell } from "./Notifications";

export function LegacyFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-4"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif", lineHeight: 1.5 }}
    >
      <div className="flex justify-end">
        <HeaderBell />
      </div>
      <div className="mx-auto w-full max-w-[1600px]">{children}</div>
    </div>
  );
}
