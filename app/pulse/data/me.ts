"use client";

/* /me va /badges (spetsifikatsiya §3.2, §6.0).
 *
 * Tiplar spetsifikatsiya matnidan olingan (Appendix A.2 hali qo'limizda
 * yo'q) — v2 openapi.json chiqqach, generatsiya qilingan tiplar bilan
 * almashtiriladi. v2 yoqilmaguncha ma'lumot hozirgi endpointlardan
 * adapter orqali yig'iladi:
 *   /company/me          → kompaniya nomi, logotip, tarif
 *   /managers            → operatorlar soni
 *   /analytics/daily-summary?days=1 → bugungi past ballilar (Audio nishoni)
 * Hech qanday "zaxira" raqam yo'q: noma'lum qiymat null bo'lib qoladi va
 * UI uni yashiradi yoki "—" ko'rsatadi. */

import { useQuery } from "@tanstack/react-query";
import { apiFetch, API_V2 } from "./api";
import { loadSession, useSession } from "../../lib/auth";
import { isAccentKey, DEFAULT_ACCENT, type AccentKey } from "../lib/accent";
import type { ThemePref } from "../lib/prefs";
import type { Locale } from "../../lib/i18n";

export interface MeCompany {
  id: string;
  name: string;
  initials: string;
  logoUrl: string | null;
  planName: string | null;
  operatorCount: number | null;
  accent: AccentKey;
  firstDataDay: string | null;
}

export interface Me {
  user: { id: string; name: string; role: string; roleLabel: string };
  company: MeCompany;
  companies: Array<Pick<MeCompany, "id" | "name" | "initials" | "logoUrl">>;
  features: { reports: boolean; amocrm: boolean | null };
  norms: {
    targetScore10: number | null;
    lowScoreThreshold10: number | null;
    longCallSec: number | null;
    dailyLongCallsNorm: number | null;
  };
  preferences: { theme: ThemePref | null; locale: Locale | null };
  serverTime: string | null;
  /* Qaysi manbadan: v2 yoki eski endpointlar adapteri. */
  source: "v2" | "legacy";
}

export interface Badges {
  audioLowToday: number | null;
  notificationsUnread: number | null;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "—";
}

/* ---------------------------------------------------------- v1 adapter */

interface LegacyCompany {
  id: string;
  name: string;
  logo_url: string | null;
  plan?: string | null;
  tariff?: { key: string; name: string } | null;
}

interface LegacySettings {
  qualified_call_seconds?: number;
  min_qualified_calls_day?: number;
}

function planLabel(c: LegacyCompany): string | null {
  const name = c.tariff?.name?.trim();
  if (name) return name;
  const plan = c.plan?.trim();
  return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null;
}

/* v1 backend "past ball" ni `score < 5` (10 ballik) deb hisoblaydi —
 * /analytics/daily-summary → low_score maydoni hujjati. Bu UI standarti
 * emas, balki eski endpoint semantikasining tavsifi. */
const V1_LOW_SCORE_THRESHOLD10 = 5;

async function fetchMeLegacy(signal?: AbortSignal): Promise<Me> {
  const session = loadSession();
  const [company, managers, settings] = await Promise.all([
    apiFetch<LegacyCompany>("/company/me", { signal }),
    apiFetch<unknown[]>("/managers", { signal }).catch(() => null),
    apiFetch<LegacySettings>("/company/settings", { signal }).catch(() => null),
  ]);
  const role = session?.rawRole ?? session?.role ?? "";
  const cur = {
    id: company.id,
    name: company.name,
    initials: initialsOf(company.name),
    logoUrl: company.logo_url ?? null,
  };
  return {
    user: {
      id: session?.employeeId ?? session?.email ?? "",
      name: session?.name ?? "",
      role,
      roleLabel: session?.title ?? role,
    },
    company: {
      ...cur,
      planName: planLabel(company),
      operatorCount: Array.isArray(managers) ? managers.length : null,
      accent: DEFAULT_ACCENT,
      firstDataDay: null,
    },
    companies: [cur],
    // v1 da /dashboard faqat direktor/admin uchun — hisobotlar ochiq.
    features: { reports: true, amocrm: null },
    norms: {
      targetScore10: null,
      lowScoreThreshold10: V1_LOW_SCORE_THRESHOLD10,
      longCallSec: typeof settings?.qualified_call_seconds === "number" ? settings.qualified_call_seconds : null,
      dailyLongCallsNorm: typeof settings?.min_qualified_calls_day === "number" ? settings.min_qualified_calls_day : null,
    },
    preferences: { theme: null, locale: null },
    serverTime: null,
    source: "legacy",
  };
}

async function fetchBadgesLegacy(signal?: AbortSignal): Promise<Badges> {
  const days = await apiFetch<Array<{ date: string; low_score?: number }>>("/analytics/daily-summary?days=1", { signal });
  const today = Array.isArray(days) ? days[days.length - 1] : null;
  return {
    audioLowToday: typeof today?.low_score === "number" ? today.low_score : null,
    // v1 da bildirishnoma API yo'q — o'qilmaganlar soni jonli
    // qo'ng'iroqlar oqimidan (shell/notifications) hisoblanadi.
    notificationsUnread: null,
  };
}

/* --------------------------------------------------------------- v2 */

async function fetchMeV2(signal?: AbortSignal): Promise<Me> {
  const me = await apiFetch<Omit<Me, "source">>("/me", { signal, v2: true });
  return {
    ...me,
    company: { ...me.company, accent: isAccentKey(me.company.accent) ? me.company.accent : DEFAULT_ACCENT },
    source: "v2",
  };
}

/* ------------------------------------------------------------ hooks */

export function meKey(userId: string | undefined) {
  return ["v2", "me", userId ?? "anon"] as const;
}

export function badgesKey(companyId: string | undefined) {
  return ["v2", companyId ?? "_", "badges"] as const;
}

export function useMe() {
  const session = useSession();
  const userId = session?.employeeId ?? session?.email;
  return useQuery({
    queryKey: meKey(userId),
    queryFn: ({ signal }) => (API_V2 ? fetchMeV2(signal) : fetchMeLegacy(signal)),
    enabled: !!session,
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useBadges(companyId: string | undefined) {
  return useQuery({
    queryKey: badgesKey(companyId),
    queryFn: ({ signal }) =>
      API_V2 ? apiFetch<Badges>("/badges", { signal, v2: true }) : fetchBadgesLegacy(signal),
    enabled: !!companyId,
    staleTime: 15_000,
    // SSE hali yo'q (A.4) — nishon 30 s da bir yangilanadi (§3.2 zaxira rejimi).
    refetchInterval: 30_000,
  });
}
