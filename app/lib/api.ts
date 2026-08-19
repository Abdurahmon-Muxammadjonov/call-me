"use client";

/* Real backend client — all frontend requests must go through
 * NEXT_PUBLIC_API_URL (Railway production URL in hosting env). */
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

export const API_BASE = BASE_URL;

const DEBUG = process.env.NODE_ENV === "development";

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

/* `Authorization: Bearer <token>` for the newer /company/* and
 * /dashboard/* endpoints, which require a session JWT (see
 * app/lib/auth.ts's Session.token). Older endpoints (users/login,
 * calls, criteria, ...) don't take this yet — pass it only where the
 * backend contract calls for it. Returns {} when there's no token, so it's
 * always safe to spread into a headers object unconditionally. */
export function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ApiErrorDetails {
  status: number;
  statusText: string;
  path: string;
  isNotFound: boolean;
  isServerError: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public details: ApiErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fallback strategiya:
 * 1. Avval /api/* prefiksiga qo'shimcha qilib urish
 * 2. 404 bo'lsa (endpoint yo'q), prefikssiz variantga tush
 * 3. Boshqa xatolar ham tut va debugda log qil
 */
async function fetchWithFallback<T>(
  primaryPath: string,
  options: RequestInit,
): Promise<{ data: T; usedPath: string }> {
  const base = getApiBaseOrThrow();

  // Avval /api/* variantini urish (agar yo'q bo'lsa)
  let primaryUrl = primaryPath;
  if (!primaryPath.startsWith("/api/")) {
    primaryUrl = `/api${primaryPath}`;
  }

  const primaryFullUrl = `${base}${primaryUrl}`;
  if (DEBUG) console.log(`[API] Trying primary path: ${primaryFullUrl}`);

  try {
    const res = await fetch(primaryFullUrl, options);
    if (res.ok) {
      if (DEBUG) console.log(`[API] Success (200-299) from: ${primaryUrl}`);
      const data = (await res.json()) as T;
      return { data, usedPath: primaryUrl };
    }

    // Agar 404 bo'lsa, prefikssiz variantga tush
    if (res.status === 404) {
      if (DEBUG) console.log(`[API] Got 404 from ${primaryUrl}, trying fallback without /api prefix`);

      const fallbackPath = primaryPath.startsWith("/api/") ? primaryPath.slice(4) : primaryPath;
      const fallbackFullUrl = `${base}${fallbackPath}`;
      if (DEBUG) console.log(`[API] Trying fallback path: ${fallbackFullUrl}`);

      const fallbackRes = await fetch(fallbackFullUrl, options);
      if (fallbackRes.ok) {
        if (DEBUG) console.log(`[API] Success (200-299) from fallback: ${fallbackPath}`);
        const data = (await fallbackRes.json()) as T;
        return { data, usedPath: fallbackPath };
      }

      // Fallback ham fail bo'lsa, fallback responseni qaytarish
      const errorDetails: ApiErrorDetails = {
        status: fallbackRes.status,
        statusText: fallbackRes.statusText,
        path: fallbackPath,
        isNotFound: fallbackRes.status === 404,
        isServerError: fallbackRes.status >= 500,
      };
      const error = new ApiError(
        `API error ${fallbackRes.status}: ${fallbackPath} (both /api and non-/api variants failed)`,
        errorDetails,
      );
      if (DEBUG) console.error(`[API] Error:`, error);
      throw error;
    }

    // Boshqa HTTP errorlar (4xx yoki 5xx)
    const errorDetails: ApiErrorDetails = {
      status: res.status,
      statusText: res.statusText,
      path: primaryPath,
      isNotFound: res.status === 404,
      isServerError: res.status >= 500,
    };
    const error = new ApiError(`API error ${res.status}: ${primaryPath}`, errorDetails);
    if (DEBUG) console.error(`[API] Error:`, error);
    throw error;
  } catch (e) {
    // Network yoki boshqa errorlar
    if (e instanceof ApiError) throw e;

    const networkError = new ApiError(`Network error: ${primaryPath} - ${String(e)}`, {
      status: 0,
      statusText: "Network Error",
      path: primaryPath,
      isNotFound: false,
      isServerError: false,
    });
    if (DEBUG) console.error(`[API] Network error:`, networkError);
    throw networkError;
  }
}

export async function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await fetchWithFallback<T>(path, {
    method: "GET",
    headers: { Accept: "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  return data;
}

export async function apiPost<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
  const { data } = await fetchWithFallback<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
    ...options,
  });
  return data;
}

export async function fetchBackendHealth(signal?: AbortSignal): Promise<{ success?: boolean; status?: string }> {
  try {
    return await apiGet<{ success?: boolean; status?: string }>("/health", { signal });
  } catch (e) {
    if (DEBUG) console.warn("[API] /health failed, will try other endpoints");
    throw e;
  }
}

export async function fetchBackendHealthWithFallback(signal?: AbortSignal): Promise<{
  success: boolean;
  endpoint: string;
  error?: string;
}> {
  const endpoints = ["/api/health", "/health"];

  for (const endpoint of endpoints) {
    try {
      if (DEBUG) console.log(`[HealthCheck] Trying ${endpoint}...`);
      const fullUrl = `${getApiBaseOrThrow()}${endpoint}`;
      const res = await fetch(fullUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });

      if (res.ok) {
        if (DEBUG) console.log(`[HealthCheck] ✓ Success from ${endpoint}`);
        return { success: true, endpoint };
      }

      if (DEBUG) console.log(`[HealthCheck] Got ${res.status} from ${endpoint}`);
    } catch (err) {
      if (DEBUG) console.log(`[HealthCheck] Failed ${endpoint}: ${String(err)}`);
    }
  }

  if (DEBUG) console.error("[HealthCheck] ✗ All health endpoints failed");
  return {
    success: false,
    endpoint: "none",
    error: "Backend bilan aloqa yo'q",
  };
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
  const path = `/analytics${qs}`;

  try {
    const res = await fetch(apiUrl(path), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      const errorDetails: ApiErrorDetails = {
        status: res.status,
        statusText: res.statusText,
        path,
        isNotFound: res.status === 404,
        isServerError: res.status >= 500,
      };
      throw new ApiError(`Analytics error ${res.status}`, errorDetails);
    }

    const json = (await res.json()) as AnalyzeCallResponse;
    if (!json.success) throw new Error("analytics: success=false");

    if (DEBUG) console.log(`[Analytics] Fetched successfully from ${path}`);
    return json.data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (DEBUG) console.error(`[Analytics] Error:`, e);
    throw e;
  }
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
  const path = `/analytics/overview${qs}`;

  try {
    const res = await fetch(apiUrl(path), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!res.ok) {
      const errorDetails: ApiErrorDetails = {
        status: res.status,
        statusText: res.statusText,
        path,
        isNotFound: res.status === 404,
        isServerError: res.status >= 500,
      };
      throw new ApiError(`PoP Stats error ${res.status}`, errorDetails);
    }

    const json = (await res.json()) as { success: boolean; data: PopStats };
    if (!json.success) throw new Error("pop: success=false");

    if (DEBUG) console.log(`[PopStats] Fetched successfully from ${path}`);
    return json.data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (DEBUG) console.error(`[PopStats] Error:`, e);
    throw e;
  }
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
