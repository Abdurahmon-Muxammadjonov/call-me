"use client";

/* Real backend client — all frontend requests must go through
 * NEXT_PUBLIC_API_URL (Railway production URL in hosting env). */
const RAW_API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();
export const API_BASE = RAW_API_URL.replace(/\/+$/, "");

export function getApiBaseOrThrow(): string {
  if (!API_BASE) {
    throw new Error("Backend URL sozlanmagan. NEXT_PUBLIC_API_URL ni sozlang.");
  }
  return API_BASE;
}

export function apiUrl(path: string): string {
  const base = getApiBaseOrThrow();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
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

/* GET /api/analyze-call/ — used to populate the director dashboard widgets
 * with live data. Throws on network/HTTP error so the caller can fall back. */
export async function fetchCallAnalytics(signal?: AbortSignal, platformId?: string | null): Promise<CallAnalytics> {
  const qs = platformId && platformId !== "live" ? `?platform_id=${encodeURIComponent(platformId)}` : "";
  const res = await fetch(apiUrl(`/api/analyze-call/${qs}`), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`analyze-call ${res.status}`);
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

/* GET /analytics/pop — backenddagi calls_pop_stats() funksiyasi qaytaradigan
 * dinamik PoP statistikasi. platformId berilsa (va 'live' bo'lmasa) filtrlaydi. */
export async function fetchPopStats(platformId?: string | null, signal?: AbortSignal): Promise<PopStats> {
  const qs = platformId && platformId !== "live" ? `?platform_id=${encodeURIComponent(platformId)}` : "";
  const res = await fetch(apiUrl(`/analytics/pop${qs}`), {
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
