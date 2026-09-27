"use client";

/* Ko'chirilgan sahifalarning oldindan yuklash funksiyalari (§3.2).
 * Qobiq shu modulni import qiladi — menyu hover'ida va bo'sh vaqtda
 * sahifa ma'lumoti keshga tushadi. */

import type { QueryClient } from "@tanstack/react-query";
import { registerPagePrefetch } from "../shell/prefetch";
import { analyticsPrefetchFn } from "./analytics";
import { meKey, type Me } from "./me";
import { loadSession } from "../../lib/auth";
import type { Locale } from "../../lib/i18n";

function cachedMe(qc: QueryClient): Me | undefined {
  const s = loadSession();
  return qc.getQueryData<Me>(meKey(s?.employeeId ?? s?.email));
}

function currentLocale(): Locale {
  const l = document.documentElement.getAttribute("data-locale");
  return l === "ru" || l === "en" ? l : "uz";
}

registerPagePrefetch("analytics", async (qc) => {
  const me = cachedMe(qc);
  if (!me) return;
  await qc.prefetchQuery(analyticsPrefetchFn(me, currentLocale()));
});
