"use client";

/* Registration API calls — new backend surface, not built yet (see
 * PROMPT_BACKEND_COMPANY_AUTH.md for the exact contract this expects).
 * Same fetch/parse convention as the rest of app/lib (apiUrl + the
 * {success,data,error} envelope), so once the backend exists this needs
 * no changes on the frontend side. */

import { apiUrl } from "./api";

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

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/* Backend errors that specifically mean "the company code is wrong" get
 * turned into this one friendly, actionable message instead of whatever
 * raw string the server sends back. Everything else falls back to the
 * server's own message (still shown, just not a generic "error"). */
function friendlyRegisterError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw);
  const lower = msg.toLowerCase();
  if (lower.includes("code") || lower.includes("kod")) {
    return "Bu kod topilmadi, kompaniyangiz administratoridan tekshirib ko'ring.";
  }
  if (lower.includes("email") && (lower.includes("exist") || lower.includes("taken") || lower.includes("already"))) {
    return "Bu email bilan hisob allaqachon mavjud.";
  }
  return msg || "Ro'yxatdan o'tib bo'lmadi. Qayta urinib ko'ring.";
}

export interface RegisterEmployeeInput {
  name: string;
  email: string;
  password: string;
  companyCode: string;
}

/* POST /auth/register — xodim mavjud kompaniyaga 9 xonali kod bilan qo'shiladi. */
export async function registerEmployee(input: RegisterEmployeeInput): Promise<RegisteredUser> {
  try {
    const res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
        company_code: input.companyCode.trim().toUpperCase(),
      }),
    });
    return await parse<RegisteredUser>(res);
  } catch (e) {
    throw new Error(friendlyRegisterError(e));
  }
}

export interface RegisterCompanyInput {
  companyName: string;
  ownerName: string;
  email: string;
  password: string;
}

export interface RegisterCompanyResult {
  user: RegisteredUser;
  inviteCode: string;
}

/* POST /auth/register-company — yangi kompaniya + owner yaratiladi;
 * backend generatsiya qilgan 9 xonali invite_code javobda qaytishi kutiladi. */
export async function registerCompany(input: RegisterCompanyInput): Promise<RegisterCompanyResult> {
  try {
    const res = await fetch(apiUrl("/auth/register-company"), {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        company_name: input.companyName.trim(),
        owner_name: input.ownerName.trim(),
        email: input.email.trim().toLowerCase(),
        password: input.password,
      }),
    });
    const data = await parse<{ user: RegisteredUser; invite_code: string }>(res);
    return { user: data.user, inviteCode: data.invite_code };
  } catch (e) {
    throw new Error(friendlyRegisterError(e));
  }
}
