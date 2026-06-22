"use client";

/* Employee store — now backed by the real backend (Express + Supabase).
 *
 * The backend mounts a full users CRUD at  http://localhost:5001/users :
 *   GET    /users        → list
 *   POST   /users        → create  { name, email, age?, phone?, role? }
 *   GET    /users/:id     → read
 *   PUT    /users/:id     → update  (partial; found by id)
 *   DELETE /users/:id     → delete
 *
 * The `users` table columns are: id, name, email, age, phone, role, created_at.
 * There is NO password column, so per-employee performance data
 * (score / penalties / call transcripts) is not available from the backend
 * yet — those fields are returned as empty placeholders until the backend
 * exposes them. Identity (name/email/role/phone) is 100% dynamic from here. */

import { API_BASE } from "./api";

export interface Penalty {
  reason: string;
  points: number;
  date: string;
}

/* One of the employee's own calls — what they did and what the AI said. */
export interface EmpCall {
  id: string;
  topic: string;
  date: string;
  duration: string;
  score: number;
  said: string;
  feedback: string;
  saidWell: string[];
  missed: string[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  age: number | null;
  status: "online" | "away" | "offline";
  calls: number;
  score: number;
  penalties: Penalty[];
  recentCalls: EmpCall[];
  tips: string[];
}

export type NewEmployee = {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  password?: string;
};

/* Default speaking guidance shown to every employee. */
export const DEFAULT_TIPS = [
  "Mijozni ism bilan kutib oling: «Assalomu alaykum, [ism], men [ism]man».",
  "Ochiq savollar bering: «Sizga aniq nima kerak edi?»",
  "Mijoz gapini bo'lmang — oxirigacha eshiting.",
  "Narx va shartlarni aniq ayting, mavhum qoldirmang.",
  "Suhbat oxirida keyingi qadamni belgilang va CRM'ga kiriting.",
];

/* Shape returned by the backend `users` table. */
interface BackendUser {
  id: string;
  name: string;
  email: string;
  age: number | null;
  phone: string | null;
  role: string;
  created_at?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/* Map a raw backend user into the richer Employee shape the UI expects.
 * Performance fields are placeholders (no backend source yet). */
function toEmployee(u: BackendUser): Employee {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    role: u.role || "user",
    age: u.age ?? null,
    status: "offline",
    calls: 0,
    score: 0,
    penalties: [],
    recentCalls: [],
    tips: [...DEFAULT_TIPS],
  };
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    throw new Error(json.error || json.message || `HTTP ${res.status}`);
  }
  return json.data as T;
}

const JSON_HEADERS = { "Content-Type": "application/json", Accept: "application/json" };

/* GET /users — full employees list, live from the backend. */
export async function listEmployees(signal?: AbortSignal): Promise<Employee[]> {
  const res = await fetch(`${API_BASE}/users`, { headers: { Accept: "application/json" }, signal });
  const users = await parse<BackendUser[]>(res);
  return users.map(toEmployee);
}

/* GET /users/:id */
export async function getEmployee(id: string, signal?: AbortSignal): Promise<Employee | null> {
  const res = await fetch(`${API_BASE}/users/${id}`, { headers: { Accept: "application/json" }, signal });
  if (res.status === 404) return null;
  const user = await parse<BackendUser>(res);
  return toEmployee(user);
}

/* POST /users — create a new employee in the backend. */
export async function addEmployee(input: NewEmployee): Promise<Employee> {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      role: input.role || "user",
      password: input.password || undefined,
    }),
  });
  const user = await parse<BackendUser>(res);
  return toEmployee(user);
}

/* PUT /users/:id — update by id. */
export async function updateEmployee(
  id: string,
  patch: Partial<Pick<Employee, "name" | "email" | "phone" | "role">>
): Promise<Employee> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  const user = await parse<BackendUser>(res);
  return toEmployee(user);
}

/* DELETE /users/:id */
export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  await parse<unknown>(res);
}

/* ---------- Presence (kim onlayn) ---------- */

/* GET /users/presence → onlayn foydalanuvchi id'lari. */
export async function fetchOnlineIds(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${API_BASE}/users/presence`, {
    headers: { Accept: "application/json" },
    signal,
  });
  return parse<string[]>(res);
}

/* Heartbeat — xodim sahifasi davriy chaqiradi (onlayn ekanini bildiradi). */
export async function pingPresence(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/users/${id}/ping`, { method: "POST", headers: { Accept: "application/json" } });
  } catch {
    /* ignore — presence is best-effort */
  }
}

/* Chiqishda darhol offline qilish. */
export async function goOffline(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/users/${id}/offline`, { method: "POST", headers: { Accept: "application/json" } });
  } catch {
    /* ignore */
  }
}

/* Employee login — POST /users/login verifies the password (scrypt hash)
 * server-side and returns the user without the hash. */
export async function authEmployee(email: string, password: string): Promise<Employee | null> {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  if (res.status === 401 || res.status === 400) return null;
  const user = await parse<BackendUser>(res);
  return toEmployee(user);
}
