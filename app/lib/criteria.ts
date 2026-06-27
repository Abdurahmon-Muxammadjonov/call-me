"use client";

/* Baholash qoidalari (mezonlar) — real backend bilan jonli ishlaydi
 * (procell-backend, :5001):
 *   GET    /criteria            → ro'yxat (?active=true bilan faqat aktivlar)
 *   POST   /criteria            → yangi qoida  { title, description, penalty_amount, is_active }
 *   PUT    /criteria/:id        → yangilash (partial)
 *   DELETE /criteria/:id        → o'chirish
 *
 * Backend (analyze-call) har tahlildan oldin AKTIV qoidalarni o'qib, AI auditor
 * prompt'iga "dinamik qoidalar" sifatida qo'shadi. Shuning uchun bu yerda
 * qo'shilgan har bir yangi qoida keyingi qo'ng'iroq tahlilida darhol amal
 * qiladi. Javob { success, data } konvertida. */

import { API_BASE } from "./api";

/* Mezon turi — baholashga qanday ta'sir qiladi. */
export type CriterionType = "Majburiy" | "Jarima" | "Bonus";

export interface Criterion {
  id: string;
  title: string;
  description: string;
  penalty_amount: number;
  is_active: boolean;
  /* Quyidagilar backend `criteria` jadvaliga qo'shilgach jonli to'ladi.
   * Backend hali bermasa null/undefined keladi — UI buni nazokatli boshqaradi. */
  category?: string | null;
  weight?: number | null;
  type?: CriterionType | null;
  created_at?: string;
}

export type NewCriterion = {
  title: string;
  description: string;
  penalty_amount: number;
  is_active: boolean;
  category?: string | null;
  weight?: number | null;
  type?: CriterionType | null;
};

/* Mezon kategoriyasi — bu jadval emas, jonli mezonlardan hosil qilinadi
 * (category bo'yicha guruhlash). Shu sababli "dinamik": yangi mezon
 * qo'shilsa yoki kategoriyasi o'zgarsa, bu ro'yxat darhol yangilanadi. */
export interface CriteriaCategory {
  name: string;
  count: number; // shu kategoriyadagi mezonlar soni
  activeCount: number; // shulardan aktivlari
  totalWeight: number; // og'irliklar yig'indisi (xom)
  weight: number; // umumiy bahodagi ulush (%) — yaxlitlangan
}

const UNCATEGORIZED = "Boshqa mezonlar";

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

/* GET /criteria — barcha qoidalar, backenddan jonli. */
export async function listCriteria(signal?: AbortSignal): Promise<Criterion[]> {
  const res = await fetch(`${API_BASE}/criteria`, { headers: { Accept: "application/json" }, signal });
  return parse<Criterion[]>(res);
}

/* POST /criteria — yangi qoida qo'shadi. Backend uni AI auditor auditor
 * prompt'iga (aktiv bo'lsa) qo'shgani uchun, AI auditor shu qoidaga qarab ishlaydi. */
export async function addCriterion(input: NewCriterion): Promise<Criterion> {
  const res = await fetch(`${API_BASE}/criteria`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      title: input.title.trim(),
      description: input.description.trim(),
      penalty_amount: input.penalty_amount,
      is_active: input.is_active,
      // Backendning hozirgi POST /criteria handleri faqat title/description/
      // penalty_amount/is_active ni o'qiydi, qolgan maydonlarni e'tiborsiz
      // qoldiradi — shuning uchun bularni yuborish xavfsiz. Backend yangilangach
      // (prompt'ga qarang) bu uchta maydon ham saqlanib, jonli qaytadi.
      category: input.category?.trim() || null,
      weight: input.weight ?? null,
      type: input.type ?? null,
    }),
  });
  return parse<Criterion>(res);
}

/* PUT /criteria/:id — qoidani yangilaydi (masalan aktiv/nofaol qilish). */
export async function updateCriterion(
  id: string,
  patch: Partial<NewCriterion>
): Promise<Criterion> {
  const res = await fetch(`${API_BASE}/criteria/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  return parse<Criterion>(res);
}

/* DELETE /criteria/:id */
export async function deleteCriterion(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/criteria/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  await parse<unknown>(res);
}

/* ---------- Kategoriyalar (mezonlardan hosil qilinadi) ----------
 * Alohida backend jadvali yo'q: kategoriyalar jonli mezonlarni `category`
 * bo'yicha guruhlash orqali olinadi. Shu sababli to'liq dinamik. */

/* Mezonlar ro'yxatini kategoriyalarga bo'ladi. weight ulushi = kategoriya
 * og'irliklari yig'indisining umumiy og'irlikka nisbati (%). Og'irliklar
 * berilmagan bo'lsa, mezonlar soniga proporsional ulush ishlatiladi. */
export function deriveCategories(criteria: Criterion[]): CriteriaCategory[] {
  const groups = new Map<string, Criterion[]>();
  for (const c of criteria) {
    const key = (c.category && c.category.trim()) || UNCATEGORIZED;
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  const raw = Array.from(groups.entries()).map(([name, items]) => {
    const totalWeight = items.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    return {
      name,
      items,
      count: items.length,
      activeCount: items.filter((c) => c.is_active).length,
      totalWeight,
    };
  });

  // Umumiy og'irlik bo'lsa shunga nisbatan, bo'lmasa mezonlar soniga nisbatan.
  const grandWeight = raw.reduce((s, g) => s + g.totalWeight, 0);
  const grandCount = raw.reduce((s, g) => s + g.count, 0) || 1;

  return raw
    .map((g) => ({
      name: g.name,
      count: g.count,
      activeCount: g.activeCount,
      totalWeight: g.totalWeight,
      weight:
        grandWeight > 0
          ? Math.round((g.totalWeight / grandWeight) * 100)
          : Math.round((g.count / grandCount) * 100),
    }))
    .sort((a, b) => b.weight - a.weight || b.count - a.count);
}

/* GET /criteria → kategoriyalarga ajratilgan jonli ro'yxat. */
export async function listCategories(signal?: AbortSignal): Promise<CriteriaCategory[]> {
  return deriveCategories(await listCriteria(signal));
}

/* Mavjud kategoriya nomlari (datalist/select uchun). */
export function categoryNames(criteria: Criterion[]): string[] {
  const set = new Set<string>();
  for (const c of criteria) {
    const name = c.category && c.category.trim();
    if (name) set.add(name);
  }
  return Array.from(set).sort();
}
