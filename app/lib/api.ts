"use client";

/* Real backend client — Express server (procell-backend) at :5001.
 * Routes: /users, /managers, /criteria, /api/analyze-call, /api/calls. */

/* Backend manzili. Lokal ishlashda http://localhost:5001 (default).
 * Vercel/production'da NEXT_PUBLIC_API_BASE env-o'zgaruvchisini backendning
 * ommaviy HTTPS manziliga qo'ying (masalan https://procell-backend.up.railway.app). */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001").replace(/\/+$/, "");

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
export async function fetchCallAnalytics(signal?: AbortSignal): Promise<CallAnalytics> {
  const res = await fetch(`${API_BASE}/api/analyze-call/`, {
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
