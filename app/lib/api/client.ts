/**
 * Simple, reusable API client wrapper.
 * Uses existing API_BASE from api.ts
 */

import { apiUrl } from '../api';

export interface ApiError {
  message: string;
  status?: number;
}

const REQUEST_TIMEOUT_MS = 300_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

type RetryableOptions = Omit<RequestInit, 'signal'> & {
  signal?: AbortSignal | null;
  timeoutMs?: number;
  maxRetries?: number;
};

function mergeAbortSignals(
  primary?: AbortSignal | null,
  secondary?: AbortSignal | null,
): AbortSignal | undefined {
  if (!primary) return secondary ?? undefined;
  if (!secondary) return primary ?? undefined;

  const controller = new AbortController();
  const onAbort = () => controller.abort();

  if (primary.aborted || secondary.aborted) {
    controller.abort();
    return controller.signal;
  }

  primary.addEventListener('abort', onAbort, { once: true });
  secondary.addEventListener('abort', onAbort, { once: true });
  return controller.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('econnreset')
    || msg.includes('etimedout')
    || msg.includes('timeout')
    || msg.includes('networkerror')
    || msg.includes('failed to fetch')
    || msg.includes('fetch failed')
    || msg.includes('socket hang up')
    || msg.includes('aborted')
  );
}

async function fetchWithTimeoutAndRetry(url: string, options: RetryableOptions): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    try {
      const signal = mergeAbortSignals(options.signal, timeoutController.signal);
      const res = await fetch(url, {
        cache: 'no-store',
        keepalive: true,
        ...options,
        signal,
      });
      clearTimeout(timer);
      return res;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const shouldRetry = attempt < maxRetries && isRetryableNetworkError(error);
      if (!shouldRetry) break;
      const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1] ?? 1000;
      await sleep(delay);
    }
  }

  throw lastError;
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json() as { error?: string; message?: string };
    return body.error || body.message || `API error: ${res.status}`;
  } catch {
    return `API error: ${res.status}`;
  }
}

// MULTI-TENANT AUTH (2026-09-20): backend'da /api/calls, /managers,
// /analytics/*, /api/management/*, /criteria, /crm/* endpoint'lariga
// requireAuth qo'shildi (kompaniyalararo ma'lumot oqishini yopish uchun).
// Shu sabab apiClient endi HAR so'rovga session JWT'ni Authorization
// sifatida qo'shishi SHART — aks holda 401 qaytadi va "Backend bilan
// aloqa yo'q" ko'rinadi. Token localStorage'dagi sessiyada (auth.ts's
// SESSION_KEY = "procell-session") saqlanadi; circular importni oldini
// olish uchun to'g'ridan-to'g'ri o'qiymiz. SSR'da window yo'q -> null.
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('procell-session');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { session?: { token?: string } };
    return parsed?.session?.token ?? null;
  } catch {
    return null;
  }
}

function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const apiClient = {
  async get<T>(endpoint: string, options?: RetryableOptions): Promise<T> {
    const res = await fetchWithTimeoutAndRetry(apiUrl(endpoint), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeader(),
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errorMessage = await parseErrorBody(res);
      throw {
        message: errorMessage,
        status: res.status,
      } as ApiError;
    }

    return res.json();
  },

  async post<T, B = unknown>(endpoint: string, body?: B, options?: RetryableOptions): Promise<T> {
    const res = await fetchWithTimeoutAndRetry(apiUrl(endpoint), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeader(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!res.ok) {
      const errorMessage = await parseErrorBody(res);
      throw {
        message: errorMessage,
        status: res.status,
      } as ApiError;
    }

    return res.json();
  },
};
