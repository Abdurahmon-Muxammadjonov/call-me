"use client";

/* Qo'ng'iroqlar, menejerlar va AI tahlil — real backend bilan jonli ishlaydi
 * (procell-backend, :5001):
 *   GET  /managers                 → menejerlar ro'yxati
 *   GET  /managers/:id/stats       → menejer bo'yicha yig'ma ko'rsatkichlar
 *   GET  /api/calls?manager_id&limit→ qo'ng'iroqlar jurnali
 *   GET  /api/calls/:id            → bitta qo'ng'iroq + conversions + lost_reasons
 *   POST /api/analyze-call         → audio_url'ni AI auditor bilan tahlil qiladi
 *
 * Eslatma: ro'yxat/menejer endpointlari { success, data } konvertida; analyze
 * POST esa natijani yuqori darajada (call_id, manager, audit, kpi) qaytaradi. */

import { API_BASE } from "./api";

export interface Manager {
  id: string;
  name: string;
  status: "active" | "inactive" | "on_leave" | "flagged";
  created_at?: string;
  updated_at?: string;
}

export interface ManagerStats {
  manager: { id: string; name: string; status: string };
  total_calls: number;
  avg_kpi_score: number;
  avg_duration_sec: number;
  total_penalty: number;
  total_bonus: number;
}

/* GET /api/calls — jurnaldagi bitta qator. */
export interface CallRow {
  id: string;
  manager_id: string;
  audio_url: string;
  duration: number;
  kpi_score: number;
  penalty_amount: number;
  bonus_amount: number;
  rop_comment: string;
  created_at: string;
}

export interface Conversions {
  traffic_conversion: number;
  sales_conversion: number;
  stage_1_to_2: number;
  stage_2_to_3: number;
  stage_3_to_4: number;
}

export interface LostReason {
  reason_text: string;
  count: number;
}

/* Bitta mezon bo'yicha chuqur tahlil bahosi (0–100). Backend `criteria_scores`
 * (yoki shunga o'xshash) jadvalini qaytargach to'ladi. */
export interface CriterionScore {
  title: string;
  category?: string | null;
  score: number;
}

/* GET /api/calls/:id — to'liq qator + bog'liq jadvallar.
 * transcript / sentiment / risk / criteria_scores chuqur tahlil uchun —
 * backend ularni saqlay boshlagach jonli keladi, aks holda undefined. */
export interface CallDetail extends CallRow {
  conversions: Conversions | null;
  lost_reasons: LostReason[];
  transcript?: string | null;
  sentiment?: string | null;
  risk?: string | null;
  criteria_scores?: CriterionScore[];
  /* Boyitilgan AI tahlil bloklari — backend bulardan birortasini bersa,
   * chuqur tahlilda alohida kartalarda jonli ko'rinadi (bo'lmasa yashiriladi). */
  summary?: string | null; // Xulosa (rop_comment'dan boyroq, ko'p qatorli)
  client_info?: string | null; // Mijoz haqida ma'lumot
  final_agreement?: string | null; // Oxirgi kelishuv
  next_steps?: string[] | null; // Keyingi qadamlar (raqamlangan ro'yxat)
}

/* POST /api/analyze-call javobidagi audit bloki. */
export interface AuditResult {
  transcript: string;
  rop_comment: string;
  kpi_score: number;
  penalty_amount: number;
  bonus_amount: number;
  metrics: {
    total_calls: number;
    incoming_count: number;
    outgoing_count: number;
    duration: number;
    unanswered_count: number;
    bad_leads_count: number;
  };
  conversions: Conversions;
  lost_reasons: LostReason[];
}

export interface AnalyzeResult {
  call_id: string;
  manager: { id: string; name: string; status: string };
  audit: AuditResult;
  kpi: {
    qualified_calls_today: number;
    threshold: number;
    is_critical: boolean;
    alert: unknown | null;
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error || json.message || `HTTP ${res.status}`);
  }
  return json.data as T;
}

/* ---------- Managers ---------- */

export async function listManagers(signal?: AbortSignal): Promise<Manager[]> {
  const res = await fetch(`${API_BASE}/managers`, { headers: { Accept: "application/json" }, signal });
  return parse<Manager[]>(res);
}

export async function getManagerStats(id: string, signal?: AbortSignal): Promise<ManagerStats> {
  const res = await fetch(`${API_BASE}/managers/${id}/stats`, { headers: { Accept: "application/json" }, signal });
  return parse<ManagerStats>(res);
}

/* ---------- Calls ---------- */

export async function listCalls(
  opts: { managerId?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<CallRow[]> {
  const params = new URLSearchParams();
  if (opts.managerId) params.set("manager_id", opts.managerId);
  params.set("limit", String(opts.limit ?? 50));
  const res = await fetch(`${API_BASE}/api/calls/?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  return parse<CallRow[]>(res);
}

export async function getCall(id: string, signal?: AbortSignal): Promise<CallDetail> {
  const res = await fetch(`${API_BASE}/api/calls/${id}`, { headers: { Accept: "application/json" }, signal });
  return parse<CallDetail>(res);
}

/* POST /api/analyze-call — audio_url'ni tanlangan menejer nomidan tahlil
 * qiladi. Backend audioni yuklab olib, AI auditor'ga yuboradi va natijani bazaga
 * yozadi. Javob konvertsiz (yuqori darajada) keladi. */
export async function analyzeCall(
  input: { audio_url: string; manager_id?: string },
  signal?: AbortSignal
): Promise<AnalyzeResult> {
  const body: Record<string, string> = { audio_url: input.audio_url };
  if (input.manager_id) body.manager_id = input.manager_id; // ixtiyoriy — bo'lmasa yubormaymiz
  const res = await fetch(`${API_BASE}/api/analyze-call/`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json()) as Partial<AnalyzeResult> & { success: boolean; error?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json as unknown as AnalyzeResult;
}

/* POST /api/analyze-call (multipart/form-data) — audio FAYLNI to'g'ridan-to'g'ri
 * yuklab tahlil qiladi (havola emas). Backend `audio` maydonini (multipart)
 * qabul qilib, vaqtincha saqlab yoki to'g'ridan-to'g'ri AI auditor'ga uzatishi kerak;
 * qolgan oqim (skoring, bazaga yozish) URL variantidagi bilan bir xil. */
export async function analyzeCallFile(
  input: { file: File; manager_id?: string },
  signal?: AbortSignal
): Promise<AnalyzeResult> {
  const form = new FormData();
  form.append("audio", input.file);
  if (input.manager_id) form.append("manager_id", input.manager_id); // ixtiyoriy
  const res = await fetch(`${API_BASE}/api/analyze-call/`, {
    method: "POST",
    // Content-Type'ni qo'lda qo'ymaymiz — brauzer multipart boundary'ni o'zi qo'yadi.
    headers: { Accept: "application/json" },
    body: form,
    signal,
  });
  const json = (await res.json()) as Partial<AnalyzeResult> & { success: boolean; error?: string };
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json as unknown as AnalyzeResult;
}

/* ---------- Formatlash ---------- */

export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount || 0)) + " so'm";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total || 0));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}
