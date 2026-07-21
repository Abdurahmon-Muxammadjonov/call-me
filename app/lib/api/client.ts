/**
 * Simple, reusable API client wrapper.
 * Uses existing API_BASE from api.ts
 */

import { API_BASE } from '../api';

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

export const apiClient = {
  async get<T>(endpoint: string, options?: RetryableOptions): Promise<T> {
    const res = await fetchWithTimeoutAndRetry(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Client-Connection': 'keep-alive',
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
    const res = await fetchWithTimeoutAndRetry(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Client-Connection': 'keep-alive',
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
