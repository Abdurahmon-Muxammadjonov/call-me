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

/* localStorage sessiyasidan token'ni AVTOMATIK olib Authorization header
 * qaytaradi — argumentsiz. Backend'da /api/calls, /managers, /analytics/*,
 * /api/management/*, /criteria, /crm/* endpoint'lariga requireAuth qo'shilgach
 * (2026-09-20, kompaniyalararo ma'lumot oqishini yopish), to'g'ridan-to'g'ri
 * fetch(apiUrl(...)) qiladigan har bir joy shu header'ni yuborishi SHART,
 * aks holda 401 -> "Backend bilan aloqa yo'q". SSR'da window yo'q -> {}. */
export function authHeadersAuto(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("procell-session");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { session?: { token?: string } };
    const token = parsed?.session?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
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
        headers: { Accept: "application/json", ...authHeadersAuto() },
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
      headers: { Accept: "application/json", ...authHeadersAuto() },
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
      headers: { Accept: "application/json", ...authHeadersAuto() },
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

/* ---------- Kunlik yakun (serverda, BARCHA qo'ng'iroqlar bo'yicha) ---------- */
export interface DailySummaryDay {
  date: string;
  calls: number;
  minutes: number;
  analyzed: number;
  scored: number;
  avg_score: number; // 0-100
  incoming: number;
  outgoing: number;
  leads: number;
  invited: number;
  closed: number;
  bad_leads: number;
  unanswered: number;
}

/* GET /analytics/daily-summary — dashboardning asosiy raqamlari.
 * MUHIM: bu hisob SERVERDA, barcha qo'ng'iroqlar bo'yicha bajariladi.
 * Ilgari raqamlar /api/calls ro'yxatidan hisoblanardi, u esa ko'pi bilan
 * 200 qator qaytaradi — kuniga 1000+ qo'ng'iroq kelganda ko'rsatkichlar
 * yangi qo'ng'iroq kelgani sari KAMAYIB borardi. */
export async function fetchDailySummary(days = 35, signal?: AbortSignal): Promise<DailySummaryDay[]> {
  const res = await fetch(apiUrl(`/analytics/daily-summary?days=${days}`), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeadersAuto() },
    signal,
  });
  if (!res.ok) throw new Error(`daily-summary ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: DailySummaryDay[] };
  if (!json.success) throw new Error("daily-summary: success=false");
  return json.data;
}

/* ---------- Xodimlar statistikasi (kunlik) ---------- */
export interface StaffStage { title: string; pct: number }
export interface StaffStatRow {
  key: string;
  name: string;
  calls: number;
  minutes: number;
  scored_calls: number;
  avg_score: number; // 0-100
  stages: StaffStage[];
  faults: string[];
  advice: string[];
  reasons: { reason: string; count: number }[];
}

/* GET /analytics/staff-stats — har operatorning kunlik bali, kuchsiz
 * tomonlari (ayb) va ularni tuzatish uchun tavsiya. */
export async function fetchStaffStats(date?: string, signal?: AbortSignal): Promise<{ date: string; rows: StaffStatRow[] }> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(apiUrl(`/analytics/staff-stats${qs}`), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeadersAuto() },
    signal,
  });
  if (!res.ok) throw new Error(`staff-stats ${res.status}`);
  const json = (await res.json()) as { success: boolean; date: string; data: StaffStatRow[] };
  if (!json.success) throw new Error("staff-stats: success=false");
  return { date: json.date, rows: json.data };
}

/* ---------- Kunlik gaplashuv daqiqalari ---------- */
export interface DailyMinutesOperator {
  name: string;
  calls: number;
  minutes: number;
}
export interface DailyMinutesDay {
  date: string;
  calls: number;
  seconds: number;
  minutes: number;
  operators: DailyMinutesOperator[];
}
export interface DailyMinutesResult {
  days: DailyMinutesDay[];
  summary: { days: number; calls: number; minutes: number };
}

/* GET /analytics/daily-minutes — har kunda jami necha daqiqa gaplashilgani.
 * HAMMA audio hisobga olinadi (3 soniyalik ham, 40 daqiqalik ham), tahlil
 * qilinganidan qat'i nazar. Kun chegarasi Toshkent vaqti bo'yicha. */
export async function fetchDailyMinutes(days = 30, signal?: AbortSignal): Promise<DailyMinutesResult> {
  const res = await fetch(apiUrl(`/analytics/daily-minutes?days=${days}`), {
    method: "GET",
    headers: { Accept: "application/json", ...authHeadersAuto() },
    signal,
  });
  if (!res.ok) throw new Error(`daily-minutes ${res.status}`);
  const json = (await res.json()) as {
    success: boolean;
    data: DailyMinutesDay[];
    summary: DailyMinutesResult["summary"];
  };
  if (!json.success) throw new Error("daily-minutes: success=false");
  return { days: json.data, summary: json.summary };
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
    headers: { Accept: "application/json", ...authHeadersAuto() },
    signal,
  });
  if (!res.ok) throw new Error(`conversion-history ${res.status}`);
  const json = (await res.json()) as { success: boolean; data: ConversionDay[] };
  if (!json.success) throw new Error("conversion-history: success=false");
  return json.data;
}
