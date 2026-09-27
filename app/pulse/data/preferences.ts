"use client";

/* PATCH /me/preferences (NAV-04, NAV-05) va POST /company/switch (NAV-02).
 * Ular v2 endpointlari — v2 yoqilmaguncha afzalliklar faqat cookie'da
 * saqlanadi (brauzer darajasida), kompaniya almashtirish esa v1'da
 * mavjud emas (foydalanuvchida bitta kompaniya). */

import { apiFetch, API_V2 } from "./api";
import type { ThemePref } from "../lib/prefs";
import type { Locale } from "../../lib/i18n";

export async function savePreferences(patch: { theme?: ThemePref; locale?: Locale }): Promise<void> {
  if (!API_V2) return;
  try {
    await apiFetch("/me/preferences", { method: "PATCH", body: patch, v2: true });
  } catch {
    // Afzallik cookie'da allaqachon saqlangan; server xatosi UI'ni buzmaydi.
  }
}

export async function switchCompany(companyId: string): Promise<void> {
  await apiFetch("/company/switch", { method: "POST", body: { companyId }, v2: true });
}
