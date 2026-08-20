"use client";

/* Deep-links into the SalesPulse Telegram bot for the two things the
 * dashboard can't do itself: getting a one-time unlock code for an
 * already-purchased-but-locked section ("get_code"), or starting the
 * tariff-upgrade conversation ("upgrade"). All the actual payment/tariff
 * logic lives in the bot — the frontend only opens the link it's given. */

import { apiUrl, authHeaders } from "./api";

export type TelegramDeeplinkPurpose = "get_code" | "upgrade";

export async function getTelegramDeeplink(
  token: string | undefined,
  purpose: TelegramDeeplinkPurpose
): Promise<string> {
  const res = await fetch(apiUrl("/internal/telegram/deeplink"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders(token) },
    body: JSON.stringify({ purpose }),
  });
  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { url?: string }; error?: string }
    | null;
  if (!res.ok || !json?.success || !json.data?.url) {
    throw new Error(json?.error || "Havola olinmadi. Birozdan keyin qayta urinib ko'ring.");
  }
  return json.data.url;
}
