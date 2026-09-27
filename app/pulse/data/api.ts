"use client";

/* Yupqa fetch o'rami (spetsifikatsiya §3.2): Accept-Language = joriy til,
 * sessiya tokeni, AbortSignal, FAQAT tarmoq xatosida bitta qayta urinish.
 *
 * API v2 (Appendix A) backendda hali e'lon qilinmagan (/api/v2/* → 404).
 * `API_V2` bayrog'i yoqilmaguncha sahifalar hozirgi (v1) endpointlardan
 * adapterlar orqali o'qiydi — ilova ishlashda davom etadi, v2 chiqqach
 * bayroqni yoqish kifoya. */

import { API_BASE, authHeadersAuto } from "../../lib/api";

export const API_V2 = process.env.NEXT_PUBLIC_API_V2 === "1";

export class ApiError extends Error {
  status: number;
  path: string;
  constructor(status: number, path: string, message?: string) {
    super(message || `HTTP ${status} — ${path}`);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

export function isAbort(e: unknown): boolean {
  return (e as Error)?.name === "AbortError";
}

function currentLocale(): string {
  if (typeof document === "undefined") return "uz";
  return document.documentElement.getAttribute("data-locale") || "uz";
}

async function once(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal; v2?: boolean } = {}
): Promise<T> {
  if (!API_BASE) throw new ApiError(0, path, "NEXT_PUBLIC_API_URL sozlanmagan");
  const url = `${API_BASE}${opts.v2 ? "/api/v2" : ""}${path.startsWith("/") ? path : `/${path}`}`;
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Accept-Language": currentLocale(),
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...authHeadersAuto(),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  };
  let res: Response;
  try {
    res = await once(url, init);
  } catch (e) {
    if (isAbort(e)) throw e;
    // Faqat tarmoq xatosida bitta qayta urinish (HTTP xatolarida emas).
    res = await once(url, init);
  }
  if (!res.ok) {
    let msg: string | undefined;
    try {
      const j = (await res.json()) as { error?: string; message?: string };
      msg = j?.error || j?.message;
    } catch {
      /* tana JSON emas */
    }
    throw new ApiError(res.status, path, msg);
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as unknown;
  // v1 javoblari { success, data } konvertida keladi.
  if (!opts.v2 && json && typeof json === "object" && "success" in (json as Record<string, unknown>)) {
    const env = json as { success?: boolean; data?: unknown; error?: string };
    if (env.success === false) throw new ApiError(res.status, path, env.error);
    return env.data as T;
  }
  return json as T;
}
