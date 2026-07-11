/**
 * Simple, reusable API client wrapper.
 * Uses existing API_BASE from api.ts
 */

import { API_BASE } from '../api';

export interface ApiError {
  message: string;
  status?: number;
}

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      throw {
        message: `API error: ${res.status}`,
        status: res.status,
      } as ApiError;
    }

    return res.json();
  },

  async post<T>(endpoint: string, body?: Record<string, unknown>, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!res.ok) {
      let errorMessage = `API error: ${res.status}`;
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.error || errorMessage;
      } catch {
        // Use default error message
      }
      throw {
        message: errorMessage,
        status: res.status,
      } as ApiError;
    }

    return res.json();
  },
};
