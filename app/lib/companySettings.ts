"use client";

/* Kompaniya bo'yicha sozlanuvchi KPI normalari — "Analitika" sahifasidagi
 * KPI ogohlantirish banneri va "NORMA OSTIDA" belgisi shu qiymatlarga
 * asoslanadi (qarang app/lib/analytics.ts → DEFAULT_NORMS, shu faylning
 * `toAnalyticsNorms()`si o'sha shaklga o'giradi). Backend hali bermasa —
 * standart qiymatlar bilan ishlayveradi (fail-safe, `DEFAULT_NORMS` bilan
 * bir xil sonlar). Qarang: "Backend yangilanishlari" prompt §2. */

import { apiUrl, authHeaders } from "./api";
import { DEFAULT_NORMS, type AnalyticsNorms } from "./analytics";

export interface CompanySettings {
  qualified_call_seconds: number;
  min_qualified_calls_day: number;
  min_qualified_calls_week: number;
  min_qualified_calls_month: number;
  min_efficiency_score: number;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  qualified_call_seconds: DEFAULT_NORMS.qualifiedCallSeconds,
  min_qualified_calls_day: DEFAULT_NORMS.minQualifiedCalls.day,
  min_qualified_calls_week: DEFAULT_NORMS.minQualifiedCalls.week,
  min_qualified_calls_month: DEFAULT_NORMS.minQualifiedCalls.month,
  min_efficiency_score: DEFAULT_NORMS.minEfficiencyScore,
};

export function toAnalyticsNorms(s: CompanySettings): AnalyticsNorms {
  return {
    qualifiedCallSeconds: s.qualified_call_seconds,
    minQualifiedCalls: {
      day: s.min_qualified_calls_day,
      week: s.min_qualified_calls_week,
      month: s.min_qualified_calls_month,
    },
    minEfficiencyScore: s.min_efficiency_score,
  };
}

/* GET /company/settings — backend hali qo'shmagan/javob bermagan bo'lsa,
 * standart qiymatlarga qaytadi (throw qilmaydi) — chaqiruvchi tomonda
 * qo'shimcha try/catch shart emas. */
export async function fetchCompanySettings(
  token: string | undefined,
  signal?: AbortSignal
): Promise<CompanySettings> {
  try {
    const res = await fetch(apiUrl("/company/settings"), {
      headers: { Accept: "application/json", ...authHeaders(token) },
      signal,
    });
    if (!res.ok) return DEFAULT_COMPANY_SETTINGS;
    const json = (await res.json()) as { success?: boolean; data?: Partial<CompanySettings> };
    if (!json.success || !json.data) return DEFAULT_COMPANY_SETTINGS;
    return { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    return DEFAULT_COMPANY_SETTINGS;
  }
}

/* PATCH /company/settings — faqat direktor/admin. Qisman yangilash: faqat
 * o'zgargan maydonlarni yuboring. */
export async function updateCompanySettings(
  token: string | undefined,
  patch: Partial<CompanySettings>
): Promise<CompanySettings> {
  const res = await fetch(apiUrl("/company/settings"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders(token) },
    body: JSON.stringify(patch),
  });
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: Partial<CompanySettings>; error?: string }
    | null;
  if (!res.ok || !json?.success || !json.data) {
    throw new Error(json?.error || "Normalarni saqlab bo'lmadi.");
  }
  return { ...DEFAULT_COMPANY_SETTINGS, ...json.data };
}
