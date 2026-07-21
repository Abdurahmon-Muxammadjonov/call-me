"use client";

/* Real backend client — all frontend requests must go through
 * NEXT_PUBLIC_API_URL (Railway production URL in hosting env). */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

export const API_BASE = BASE_URL;

if (!BASE_URL) {
  console.error("NEXT_PUBLIC_API_URL is not set!");
}

export function getApiBaseOrThrow(): string {
  if (!BASE_URL) {
    throw new Error("Backend URL sozlanmagan. NEXT_PUBLIC_API_URL ni sozlang.");
  }
  return BASE_URL;
}

export function apiUrl(path: string): string {
  const base = getApiBaseOrThrow();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "GET",
    headers: { Accept: "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchBackendHealth(signal?: AbortSignal): Promise<{ success?: boolean; status?: string }> {
  return apiGet<{ success?: boolean; status?: string }>("/health", { signal });
}

export async function fetchBackendRoot(signal?: AbortSignal): Promise<unknown> {
  return apiGet<unknown>("/", { signal });
}

export interface CallAnalytics {
  totalCalls: number;
  averageDurationSeconds: number;
  averages: {
    traffic_conversion: number;
    sales_conversion: number;
  };
  lostReasonsSummary: Record<string, number>;
  cachedAt: string;
}

interface AnalyzeCallResponse {
  success: boolean;
  data: CallAnalytics;
  cached: boolean;
}

/* GET /analytics — used to populate the director dashboard widgets
 * with live data. Throws on network/HTTP error so the caller can fall back. */
export async function fetchCallAnalytics(signal?: AbortSignal, platformId?: string | null): Promise<CallAnalytics> {
  const qs = platformId && platformId !== "live" ? `?platform_id=${encodeURIComponent(platformId)}` : "";
  const res = await fetch(apiUrl(`/analytics${qs}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`analytics ${res.status}`);
  const json = (await res.json()) as AnalyzeCallResponse;
  if (!json.success) throw new Error("analyze-call: success=false");
  return json.data;
}

/* Format seconds → m:ss for the duration widget. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/* ---------- Period-over-Period (kunlik/haftalik/oylik) ---------- */
export interface PopMetric {
  current: number;
  previous: number;
  change_pct: number;
}
export interface PopBlock {
  calls: PopMetric;
  duration_minutes: PopMetric;
  avg_kpi: PopMetric;
}
export interface PopStats {
  daily: PopBlock;
  weekly: PopBlock;
  monthly: PopBlock;
  generated_at: string;
}

/* GET /analytics/overview — backenddagi calls_pop_stats() funksiyasi qaytaradigan
 * dinamik PoP statistikasi. platformId berilsa (va 'live' bo'lmasa) filtrlaydi. */
export async function fetchPopStats(platformId?: string | null, signal?: AbortSignal): Promise<PopStats> {
  const qs = platformId && platformId !== "live" ? `?platform_id=${encodeURIComponent(platformId)}` : "";
  const res = await fetch(apiUrl(`/analytics/overview${qs}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`pop ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: PopStats };
  if (!json.success) throw new Error("pop: success=false");
  return json.data;
}

/* ---------- Kunlik tarix (hamma kunlar saqlanadi) ---------- */
export interface ConversionDay {
  date: string;
  traffic_conversion: number;
  sales_conversion: number;
  calls: number;
}

/* GET /api/management/conversion-history — so'nggi `days` kun bo'yicha kunlik
 * konversiya/qo'ng'iroqlar tarixi (har kun alohida saqlangan). */
export async function fetchConversionHistory(
  platformId?: string | null,
  days = 14,
  signal?: AbortSignal,
): Promise<ConversionDay[]> {
  const params = new URLSearchParams({ days: String(days) });
  if (platformId && platformId !== "live") params.set("platform_id", platformId);
  const res = await fetch(apiUrl(`/api/management/conversion-history?${params.toString()}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`conversion-history ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: ConversionDay[] };
  if (!json.success) throw new Error("conversion-history: success=false");
  return json.data;
}
