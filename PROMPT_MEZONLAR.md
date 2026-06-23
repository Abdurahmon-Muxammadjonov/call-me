# Prompt — "Qiyin holatlar" mezonlarini qo'shish + xodimga ko'rsatish

> Bu — bitta to'liq topshiriq prompti. Ikki qismdan iborat:
> **A. Frontend** (`/Users/macbook/prosell`) va **B. Backend** (`/Users/macbook/procell-backend`).
> Har bir qismni o'sha loyihada ochilgan Claude'ga to'liq nusxalab bering.

**Maqsad:** Sotuv skriptidagi **"Qiyin holatlar"** bo'limidan 2 ta yangi baholash
mezoni tizimga kirsin va xodim o'z logini bilan kirganda ham ko'rinsin:

1. **Faqat narx so'ralganda: narxni aytib, keyin qiymat berish** — `type: Majburiy`
2. **Mos kelmaydigan boshqa kurs/mahsulotni taklif qilmaslik** — `type: Jarima`

Ikkala mezon `category: "E'tiroz & Qiyin holatlar"`, `weight: 10`.

Barqaror `id` lar (frontend `criteria-data.json` bilan bir xil — idempotentlik uchun):
- `eac930ce-268d-4a53-ac86-b04704074849` (narx + qiymat)
- `3c51dfc4-75af-46c2-b804-eb55185e2e62` (mos kelmaydigan kursni taklif qilmaslik)

---

# A QISM — Frontend (`/Users/macbook/prosell`)

> Xodim o'z logini bilan kirganda baholash mezonlarini ko'rishi kerak. Hozir
> `EmployeeDashboard.tsx` da faqat "Tavsiyalar" (umumiy maslahatlar) bor —
> mezonlar yo'q. Yangi **"Baholash mezonlari"** tabi qo'shing.

**Muhim:** Yangi backend endpoint qo'shmang. Mavjud `GET /criteria`
(`listCriteria` — `app/lib/criteria.ts`) dan jonli o'qing, shunda admin
qo'shadigan har qanday mezon (jumladan yuqoridagi 2 tasi) avtomatik ko'rinadi.

`app/components/EmployeeDashboard.tsx` ga quyidagilarni qiling:

1. Import qo'shing:
   ```ts
   import { listCriteria, type Criterion, type CriterionType } from "../lib/criteria";
   ```

2. `EmpTab` turiga `"criteria"` qo'shing:
   ```ts
   type EmpTab = "overview" | "calls" | "schedule" | "tips" | "criteria" | "penalties";
   ```

3. `NAV` massiviga (tips bilan penalties orasiga) yangi tab:
   ```ts
   { id: "criteria", label: "Baholash mezonlari", icon: "ruler", grad: "from-amber-500 to-orange-500" },
   ```

4. Tab render qatoriga (`{tab === "tips" && ...}` dan keyin) qo'shing:
   ```tsx
   {tab === "criteria" && <CriteriaTab />}
   ```

5. `TipsTab` dan oldin `CriteriaTab` komponentini yarating. U:
   - `useEffect` ichida `listCriteria(signal)` ni chaqiradi, `is_active === true`
     larni saqlaydi (`AbortController` bilan tozalanadi).
   - Yuklanayotganda `Skeleton`, xato bo'lsa nazokatli ogohlantirish ko'rsatadi.
   - Mezonlarni `category` bo'yicha guruhlab (kategoriyasizlar "Boshqa mezonlar"),
     har birini sarlavha + (bo'lsa) description bilan chiqaradi.
   - O'ng tomonda tur belgisi (`CritTypeBadge`): `Majburiy` indigo, `Jarima`
     rose, `Bonus` emerald — `app/components/views.tsx` dagi `CriterionTypeBadge`
     uslubiga mos rangda.
   - Mavjud `Card`, `SectionTitle`, `Skeleton`, `Icons` (masalan `Icons.ruler`,
     `Icons.shield`) komponentlaridan foydalanadi.

**Sarlavha:** "Baholash mezonlari", **subtitle:** "Qo'ng'iroqlaringiz aynan shu
mezonlar bo'yicha baholanadi".

Yakunida `npx tsc --noEmit` xatosiz o'tsin.

---

# B QISM — Backend (`/Users/macbook/procell-backend`)

> Mezonlar bazada bo'lishi kerak — shunda Gemini ularga qarab baholaydi va ham
> admin, ham xodim paneli `GET /criteria` orqali ularni ko'radi.
> Backend: Express + Supabase, port **5001**.

## B0. Old shart: `criteria` jadvali

Agar `criteria` jadvali (`category`, `weight`, `type` ustunlari bilan) hali
yaratilmagan bo'lsa, avval mavjud `BACKEND_PROMPT.md` ning **1-bo'limidagi**
SQL'ni ishga tushiring. Bor bo'lsa — pastdagi seed'ga o'ting.

## B1. Seed (idempotent UPSERT) — Supabase SQL Editor'da

```sql
insert into public.criteria
  (id, title, description, penalty_amount, is_active, category, weight, type)
values
  ('8e8be225-6849-4f5d-8b36-ec0b5ab42a9c',
   'Mijoz bilan ism orqali salomlashish',
   'Menejer mijozni ismi bilan kutib oladi va o''zini tanishtiradi.',
   0, true, 'Salomlashish & Etiket', 10, 'Majburiy'),

  ('dde89335-e626-42a4-b87d-339c6488b04e',
   'Ovoz ohangi va xushmuomalalik',
   'Ijobiy energiya, samimiy ohang, xushmuomala muloqot saqlanadi.',
   0, true, 'Salomlashish & Etiket', 10, 'Majburiy'),

  ('44526feb-1968-4f0a-a5e8-f47f72fdf766',
   'Ochiq savollar berish',
   'Mijoz ehtiyojini aniqlash uchun ochiq (ha/yo''q emas) savollar beriladi.',
   0, true, 'Ehtiyojni aniqlash', 15, 'Majburiy'),

  ('837c8db3-7d94-4b4e-839f-d31c2e771d81',
   'Mijoz so''zini bo''lmaslik',
   'Menejer mijoz gapini bo''lmaydi, oxirigacha eshitadi. Buzilsa — jarima.',
   0, true, 'Ehtiyojni aniqlash', 15, 'Jarima'),

  ('e086ef17-8a89-4627-bd08-f4f1226b3cdf',
   'Aniq narx va shartlarni aytish',
   'Narx va shartlar aniq, mavhumliksiz aytiladi.',
   0, true, 'Mahsulot bilimi', 15, 'Majburiy'),

  ('8debddee-af55-4775-9a0c-98cf842b7949',
   'Qo''shimcha mahsulot taklif qilish (up-sell)',
   'Mos bo''lganda yuqori tarif yoki qo''shimcha xizmat taklif qilinadi — bonus.',
   0, true, 'Mahsulot bilimi', 10, 'Bonus'),

  ('0f67aef9-1ee2-4af6-94b2-9d56948492da',
   'Kelishuvni CRM''ga kiritish',
   'Suhbat natijasi va kelishuv CRM''ga kiritiladi.',
   0, true, 'Yakuniy bosqich & CRM', 15, 'Majburiy'),

  ('ce584d40-a78b-42f4-95c8-91b7ec475367',
   'Keyingi qadamni aniq belgilash',
   'Suhbat oxirida keyingi aniq qadam (bron, sana, link) belgilanadi.',
   0, true, 'Yakuniy bosqich & CRM', 10, 'Majburiy'),

  -- 🔻 SOTUV SKRIPTIDAGI "QIYIN HOLATLAR" — 2 ta yangi mezon 🔻

  ('eac930ce-268d-4a53-ac86-b04704074849',
   'Faqat narx so''ralganda: narxni aytib, keyin qiymat berish',
   'Mijoz faqat narxni so''rasa, menejer avval narxni aniq aytadi, so''ng mahsulot/kurs qiymatini (foyda, natija) tushuntiradi — narxni qiymatdan ajratib tashlamaydi.',
   0, true, 'E''tiroz & Qiyin holatlar', 10, 'Majburiy'),

  ('3c51dfc4-75af-46c2-b804-eb55185e2e62',
   'Mos kelmaydigan boshqa kurs/mahsulotni taklif qilmaslik',
   'Menejer mijoz ehtiyojiga yoki bizning yo''nalishimizga mos kelmaydigan begona kurs/mahsulotni taklif qilmaydi. Mos kelmasa — suhbatni nazokat bilan yakunlaydi. Buzilsa — jarima.',
   0, true, 'E''tiroz & Qiyin holatlar', 10, 'Jarima')

on conflict (id) do update set
  title          = excluded.title,
  description    = excluded.description,
  penalty_amount = excluded.penalty_amount,
  is_active      = excluded.is_active,
  category       = excluded.category,
  weight         = excluded.weight,
  type           = excluded.type;

notify pgrst, 'reload schema';
```

> Faqat 2 ta yangi mezonni qo'shmoqchi bo'lsangiz, oxirgi 2 qatorni qoldirib
> qolganini olib tashlang — `ON CONFLICT` baribir xavfsiz.

## B2. Gemini avtomatik baholaydimi?

`src/routes/analyze-call.ts` dagi `buildDynamicRules` **aktiv** mezonlarni o'qib
system prompt'ga qo'shadi. Yangi 2 mezon `is_active = true` — qo'shimcha kod
**kerak emas**, keyingi tahlilda `criteria_scores` ichida 0–100 ball bilan
keladi. Agar `buildDynamicRules`/`criteria_scores` schema'si hali yo'q bo'lsa,
`BACKEND_PROMPT.md` ning **2b** bo'limini bajaring.

**Jarima turi haqida:** system prompt'da Gemini'ga ayting — `Jarima` turidagi
mezon buzilsa (menejer mos kelmaydigan narsa taklif qilsa) past ball va
`penalty_amount`; buzilmasa yuqori ball. `Majburiy` "narx + qiymat" mezoni
bajarilmasa past ball oladi.

## B3. Yangi endpoint KERAK EMAS

Frontend xodim tabi mavjud `GET /criteria` ni ishlatadi — admin va xodim bir xil
manbani ko'radi. Hech qanday yangi route/auth/maydon qo'shilmaydi.

---

# Yakuniy tekshiruv

1. `select count(*) from public.criteria;` → kamida **10**.
2. `GET /criteria` → 2 tasida `category = "E'tiroz & Qiyin holatlar"`.
3. Admin panel → **Mezon kategoriyalari** da yangi kategoriya ko'rinadi.
4. Xodim login → **Baholash mezonlari** tabida 10 mezon kategoriyalar bo'yicha,
   tur belgilari bilan ko'rinadi.
5. Yangi qo'ng'iroq tahlilida `criteria_scores` ichida yangi 2 mezon ham keladi.
