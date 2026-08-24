# Backend prompt — "Analitika" sahifasi uchun

> Bu faylni Claude'ga (backend, `procell-backend`) bering. Frontend
> (`app/components/AnalyticsView.tsx` + `app/lib/analytics.ts`) allaqachon
> JONLI ishlaydi — "Umumiy ko'rinish" o'rniga kelgan yangi "Analitika" sahifasi
> mavjud endpointlardan (`GET /api/calls`, `GET /managers`, `GET
> /analytics/overview`, `GET /analytics`) ma'lumot yig'ib, Kunlik/Haftalik/
> Oylik oynasini **client-side** hisoblaydi (backendda `period` query param
> shart emas — frontend buni allaqachon xom `created_at` bo'yicha o'zi
> kesadi, xuddi `app/lib/management.ts` qilganidek).
>
> Quyidagilar — frontend hozir **halol bo'sh holat** ko'rsatayotgan
> (fabrikatsiya qilingan raqam yo'q), backend qo'shgach **jonli** bo'ladigan
> bo'shliqlar. Har biri mustaqil; xohlagan tartibda qo'shsa bo'ladi. Hech
> narsa buzilmaydi — `CallRow`dagi barcha yangi maydonlar frontendda
> ixtiyoriy (`?`) deb e'lon qilingan; kelsa avtomatik ishlatiladi, kelmasa
> tegishli widget "ma'lumot kutilmoqda" holatini ko'rsatishda davom etadi.

Backend: Express + Supabase (procell-backend, :5001). `GET /api/calls` va `GET
/api/calls/:id` javoblari `{ success, data }` konvertida.

---

## 1. Qo'ng'iroq-darajasidagi sub-metrikalarni saqlash (eng muhim)

`POST /api/analyze-call` javobidagi `audit.metrics` bloki hozir **allaqachon**
quyidagilarni hisoblab beradi (Gemini/audit orqali), lekin `calls` qatoriga
YOZILMAYDI — javob qaytarilgach yo'qoladi:

```ts
metrics: {
  total_calls: number;
  incoming_count: number;
  outgoing_count: number;
  duration: number;
  unanswered_count: number;
  bad_leads_count: number;
}
```

**Bajaring:** `analyze-call.ts`dagi `calls` insert'iga shu 4 tasini ham
qo'shing:

```sql
alter table public.calls add column if not exists incoming_count   int;
alter table public.calls add column if not exists outgoing_count   int;
alter table public.calls add column if not exists unanswered_count int;
alter table public.calls add column if not exists bad_leads_count  int;
notify pgrst, 'reload schema';
```

```ts
// calls insert'ida:
incoming_count: audit.metrics.incoming_count,
outgoing_count: audit.metrics.outgoing_count,
unanswered_count: audit.metrics.unanswered_count,
bad_leads_count: audit.metrics.bad_leads_count,
```

`GET /api/calls` va `GET /api/calls/:id` `select('*')` bo'lsa avtomatik
qaytaradi — qo'shimcha o'zgarish shart emas.

> Frontendda: "Kiruvchi vs Chiquvchi" donut (`incoming_count`/`outgoing_count`
> yig'indisi) va "Lid ko'tarmadi"/"Sifatsiz lid" kichik kartalari
> (`unanswered_count`/`bad_leads_count` yig'indisi) shu maydonlarni
> ishlatadi. Hozir hech biri kelmagani uchun bo'sh holat ko'rsatiladi.

---

## 2. Yangi metrikalar — hali umuman hisoblanmaydi

Quyidagilar Gemini javobida ham yo'q — audit prompt/response-schema'ga
qo'shilishi kerak (`analyze-call.ts`dagi Gemini `RESPONSE_SCHEMA`ga, `2-bo'lim`
`PROMPT_TAHLIL.md`dagi `summary`/`client_info` qanday qo'shilgan bo'lsa,
xuddi shunday naqsh):

```ts
new_leads_count:    { type: SchemaType.NUMBER, description: "Ushbu sessiyada nechta YANGI lid bilan gaplashildi" },
sent_to_dealer_count:{ type: SchemaType.NUMBER, description: "Nechta lid avtosalonga/do'konga yuborildi" },
closed_deals_count: { type: SchemaType.NUMBER, description: "Nechta bitim ushbu sessiyada yopildi (sotuv)" },
```

DB + saqlash bir xil naqsh:

```sql
alter table public.calls add column if not exists new_leads_count     int;
alter table public.calls add column if not exists sent_to_dealer_count int;
alter table public.calls add column if not exists closed_deals_count  int;
notify pgrst, 'reload schema';
```

> Frontendda: "Yangi lidlar", "Avtosalonga yuborildi" (top kartalar), "Sotuv"
> (jamoa kartasidagi 4-metrikalardan biri) shu maydonlarga bog'langan.

---

## 3. Norma chegaralari — `company_settings` (konfiguratsiya qilinadigan)

"Analitika" sahifasidagi KPI ogohlantirish banneri va xodim kartalaridagi
"NORMA OSTIDA" belgisi hozir frontendda **standart** qiymatlar bilan ishlaydi
(`app/lib/analytics.ts` → `DEFAULT_NORMS`):

```ts
qualifiedCallSeconds: 60,           // "uzun" qo'ng'iroq — shundan uzun bo'lsa
minQualifiedCalls: { day: 40, week: 160, month: 640 },
minEfficiencyScore: 50,             // o'rtacha KPI balldan past bo'lsa ham
```

Kerak: har kompaniya o'zining normasini sozlay olishi. Tavsiya etilgan jadval:

```sql
create table if not exists public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  qualified_call_seconds int not null default 60,
  min_qualified_calls_day int not null default 40,
  min_qualified_calls_week int not null default 160,
  min_qualified_calls_month int not null default 640,
  min_efficiency_score int not null default 50,
  updated_at timestamptz not null default now()
);
```

### `GET /company/settings` (Bearer token, `/company/*` naqshi bo'yicha)
```json
{ "success": true, "data": {
  "qualified_call_seconds": 60,
  "min_qualified_calls_day": 40,
  "min_qualified_calls_week": 160,
  "min_qualified_calls_month": 640,
  "min_efficiency_score": 50
} }
```
Yozuv yo'q bo'lsa — standart qiymatlar bilan javob bering (insert shart emas).

### `PATCH /company/settings` — direktor/admin normani o'zgartirishi uchun
Body — yuqoridagi maydonlardan istalganchasi (partial update).

> Frontend ulanishi: `fetchAnalyticsData(period, signal, norms)` allaqachon
> `norms` argumentini qabul qiladi (standart — `DEFAULT_NORMS`) — bu endpoint
> qo'shilgach, `AnalyticsView` uni `GET /company/settings`dan olib shu yerga
> uzatadi, boshqa hech narsa o'zgarmaydi.

---

## ✅ Yakuniy tekshiruv

1. Bir nechta audio tahlil qilinsa, `calls` qatorida `incoming_count`,
   `outgoing_count`, `unanswered_count`, `bad_leads_count` to'ldirilgan
   bo'lsin (`GET /api/calls`da ko'rinsin).
2. Gemini javobida `new_leads_count`, `sent_to_dealer_count`,
   `closed_deals_count` chiqa boshlasin va `calls`ga saqlansin.
3. `GET /company/settings` standart normalarni qaytarsin;
   `PATCH /company/settings` bilan o'zgartirilgan qiymat keyingi
   `GET`da ko'rinsin.
4. Frontendda "Analitika" sahifasini ochib tekshiring: "Kiruvchi vs
   Chiquvchi" donut, "Lid ko'tarmadi"/"Sifatsiz lid"/"Avtosalonga
   yuborilganlar" kartalari va jamoa kartalaridagi 4 metrika endi bo'sh
   holat o'rniga real raqam ko'rsatishi kerak — frontend kodida hech qanday
   o'zgarish talab qilinmaydi.
