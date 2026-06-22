# Procell backend — bajarilishi kerak bo'lgan ishlar (Claude uchun prompt)

> Bu faylni **`/Users/macbook/procell-backend`** loyihasida ochilgan Claude'ga
> to'liq nusxalab bering. Frontend (`/Users/macbook/prosell`) allaqachon shu
> kontraktga tayyor — backendni quyidagicha to'ldirsangiz, CRM ulanishi, chuqur
> tahlil va mezon kategoriyalari **100% ishlaydi**.

Backend: Express + Supabase, port **5001**. Asosiy fayllar:
`src/routes/criteria.ts`, `src/routes/calls.ts`, `src/routes/analyze-call.ts`,
`supabase/*.sql`.

Frontend mana shu uchta narsani backenddan **jonli** kutyapti, hozir yo'q:
1. `criteria` jadvali + unda `category`, `weight`, `type` ustunlari (kategoriyalar shu yerdan hosil bo'ladi).
2. Qo'ng'iroqning chuqur tahlili: `transcript`, `sentiment`, `risk` va mezon-mezon ballari (`criteria_scores`).
3. amoCRM/n8n integratsiyasi: tahlil tugagach natijani webhook'ga yuborish.

---

## ⛔ 0. ENG MUHIM — `criteria` jadvali umuman yo'q

Hozir `GET /criteria` quyidagi xatoni qaytaryapti:
`Could not find the table 'public.criteria' in the schema cache`.

Ya'ni `supabase/add_criteria.sql` hech qachon ishga tushirilmagan. Shu sababli
**Baholash mezonlari** ham, **Mezon kategoriyalari** ham ishlamayapti.

**Bajaring:** Supabase Dashboard → SQL Editor'da quyidagi (1-bo'limdagi) SQL'ni
ishga tushiring. (`supabase/add_criteria.sql`'ni shu yangilangan variant bilan
almashtiring.)

---

## 1. `criteria` jadvali + kategoriya/og'irlik/tur

Frontend `category`, `weight`, `type` maydonlarini **yuborgan ham, kutgan ham**
bo'ladi. `type` qiymatlari: `Majburiy` | `Jarima` | `Bonus`.

### 1a. SQL (idempotent)

```sql
create extension if not exists "pgcrypto";

create table if not exists public.criteria (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text not null,
  penalty_amount numeric(12,2) not null default 0,
  is_active      boolean not null default true,
  category       text,
  weight         integer not null default 0 check (weight between 0 and 100),
  type           text not null default 'Majburiy'
                 check (type in ('Majburiy', 'Jarima', 'Bonus')),
  created_at     timestamptz not null default timezone('utc'::text, now())
);

-- Eski jadval bo'lsa yetishmayotgan ustunlarni qo'shamiz (idempotent)
alter table public.criteria add column if not exists category text;
alter table public.criteria add column if not exists weight   integer not null default 0;
alter table public.criteria add column if not exists type     text not null default 'Majburiy';

alter table public.criteria disable row level security;
create index if not exists idx_criteria_active   on public.criteria(is_active);
create index if not exists idx_criteria_category on public.criteria(category);

notify pgrst, 'reload schema';
```

### 1b. `src/routes/criteria.ts` — `category/weight/type` ni o'qing va saqlang

`POST /` handlerida `req.body` dan `category, weight, type` ni ham oling va
insert'ga qo'shing:

```ts
const { title, description, penalty_amount, is_active, category, weight, type } = req.body ?? {};
// ...
.insert({
  title,
  description,
  penalty_amount: penalty_amount != null ? Number(penalty_amount) : 0,
  is_active: is_active === undefined ? true : !!is_active,
  category: category?.trim() || null,
  weight: weight != null ? Number(weight) : 0,
  type: ['Majburiy', 'Jarima', 'Bonus'].includes(type) ? type : 'Majburiy',
})
```

`PUT /:id` handlerida ham shu uchta maydonni partial update'ga qo'shing:

```ts
if (category !== undefined) update.category = category?.trim() || null;
if (weight   !== undefined) update.weight   = Number(weight);
if (type     !== undefined && ['Majburiy','Jarima','Bonus'].includes(type)) update.type = type;
```

`GET /` allaqachon `select('*')` — qo'shilgan ustunlar avtomatik qaytadi. ✅

> **Natija:** Frontend'dagi «Mezon kategoriyalari» bo'limi jonli mezonlarni
> `category` bo'yicha guruhlab, har kategoriya uchun mezonlar soni va og'irlik
> ulushini (%) avtomatik ko'rsatadi. Alohida `categories` jadvali **shart emas**.

---

## 2. Chuqur tahlil (Deep Audit) ma'lumotini saqlang

Frontend'dagi «Chuqur tahlil» bo'limi `GET /api/calls/:id` dan quyidagi
**ixtiyoriy** maydonlarni o'qiydi (bo'lmasa nazokatli yashiradi, bo'lsa
ko'rsatadi):

```jsonc
{
  "transcript": "to'liq matn...",         // calls.transcript
  "sentiment": "Neytral → Salbiy",         // calls.sentiment
  "risk": "O'rta",                          // calls.risk
  "criteria_scores": [                      // yangi jadval, pastga qarang
    { "title": "Ehtiyojni aniqlash", "category": "Ehtiyojni aniqlash", "score": 70 }
  ]
}
```

Hozir `analyze-call.ts` `transcript` ni Gemini'dan oladi-yu, lekin **bazaga
yozmaydi** (faqat POST javobida qaytaradi). Tuzating:

### 2a. SQL

```sql
alter table public.calls add column if not exists transcript text;
alter table public.calls add column if not exists sentiment  text;
alter table public.calls add column if not exists risk       text;

create table if not exists public.call_criteria_scores (
  id         uuid primary key default gen_random_uuid(),
  call_id    uuid not null references public.calls(id) on delete cascade,
  title      text not null,
  category   text,
  score      integer not null default 0 check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists idx_ccs_call_id on public.call_criteria_scores(call_id);
alter table public.call_criteria_scores disable row level security;

notify pgrst, 'reload schema';
```

### 2b. `analyze-call.ts` — Gemini schema'sini kengaytiring

`RESPONSE_SCHEMA.properties` ga qo'shing (va `required` ro'yxatiga ham):

```ts
sentiment: { type: SchemaType.STRING, description: "Mijoz hissiyoti, masalan: 'Neytral → Salbiy'" },
risk:      { type: SchemaType.STRING, description: "Bitim yo'qolishi xavfi: 'Past' | 'O'rta' | 'Yuqori'" },
criteria_scores: {
  type: SchemaType.ARRAY,
  description: "Har bir AKTIV dinamik qoida bo'yicha 0–100 ball",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title:    { type: SchemaType.STRING },
      category: { type: SchemaType.STRING },
      score:    { type: SchemaType.INTEGER },
    },
    required: ['title', 'score'],
  },
},
```

`GeminiAuditResult` interfeysiga `sentiment: string; risk: string;
criteria_scores: {title:string; category?:string; score:number}[]` qo'shing va
`normalizeAuditResult` da ularni xavfsiz to'ldiring (massiv bo'lmasa `[]`).

`buildDynamicRules` aktiv qoidalarni allaqachon o'qiydi — system prompt'ga
"har bir dinamik qoidani `criteria_scores` da 0–100 ball bilan bahola" deb
qo'shing (qoidaning `category` sini ham bering).

### 2c. `analyze-call.ts` — saqlash

`calls` insert'iga qo'shing:

```ts
transcript: audit.transcript,
sentiment:  audit.sentiment,
risk:       audit.risk,
```

`writes` massiviga `call_criteria_scores` insertini qo'shing:

```ts
if (audit.criteria_scores?.length) {
  writes.push(
    supabase.from('call_criteria_scores').insert(
      audit.criteria_scores.map((c) => ({
        call_id: callId, title: c.title, category: c.category ?? null, score: c.score,
      }))
    )
  );
}
```

### 2d. `calls.ts` — `GET /:id` da qaytaring

`call` allaqachon `select('*')` (transcript/sentiment/risk avtomatik keladi).
Faqat `criteria_scores` ni qo'shib oling:

```ts
const [{ data: conversions }, { data: lostReasons }, { data: criteriaScores }] = await Promise.all([
  supabase.from('conversions').select('*').eq('call_id', id).maybeSingle(),
  supabase.from('lost_reasons').select('*').eq('call_id', id),
  supabase.from('call_criteria_scores').select('title, category, score').eq('call_id', id),
]);

return res.status(200).json({
  success: true,
  data: { ...call, conversions, lost_reasons: lostReasons || [], criteria_scores: criteriaScores || [] },
});
```

> **Natija:** «Chuqur tahlil» bo'limida transkripsiya, hissiyot/risk va
> mezon-mezon progress-barlar jonli chiqadi.

---

## 3. amoCRM / n8n integratsiyasi (CRM ulanishi)

Frontend hozir konfiguratsiyani localStorage'da saqlaydi va «Test ulanish»
tugmasi webhook'ni to'g'ridan-to'g'ri tekshiradi. Ishlab chiqarish uchun
**har bir tahildan keyin** natija avtomatik amoCRM'ga (n8n orqali) ketishi kerak.

### 3a. ENV

`.env.local` ga qo'shing:

```
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/abc123
```

### 3b. `analyze-call.ts` — tahlil tugagach webhook'ga yuboring

Javobni qaytarishdan oldin (`return res.status(200)...` dan oldin) qo'shing:

```ts
// CRM (amoCRM) ga n8n webhook orqali yuborish — best-effort, javobni bloklamaydi.
if (process.env.N8N_WEBHOOK_URL) {
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'call.analyzed',
      source: 'procell-ai-audit',
      call: {
        call_id: callId,
        manager_name: manager.name,
        manager_id,
        kpi_score: audit.kpi_score,
        penalty_amount: audit.penalty_amount,
        bonus_amount: audit.bonus_amount,
        rop_comment: audit.rop_comment,
        lost_reasons: audit.lost_reasons,
        audio_url,
      },
    }),
  }).catch((e) => console.error('n8n webhook failed:', e));
}
```

### 3c. (Ixtiyoriy) Konfiguratsiyani serverda saqlash

Agar sozlamalar localStorage'da emas, bazada tursin desangiz, kichik
`integrations` jadvali + `GET/PUT /integrations/amocrm` route qo'shing
(`{ enabled, subdomain, webhook_url, n8n_url }`). Frontend buni keyin shu
endpoint'ga ulashi mumkin — hozir shart emas, webhook yuborilishi 3a–3b bilan
ishlaydi.

---

## ✅ Frontend kutayotgan aniq JSON kontraktlar (qisqacha)

- `GET /criteria` → `{ success, data: [{ id, title, description, penalty_amount, is_active, category, weight, type }] }`
- `POST /criteria` body → `{ title, description, penalty_amount, is_active, category, weight, type }`
- `GET /api/calls/:id` → `data` ichida (ixtiyoriy) `transcript, sentiment, risk, criteria_scores: [{title, category, score}]`
- Tahlildan keyin `N8N_WEBHOOK_URL` ga `call.analyzed` payload (3b).

Yakunida: `npm run build` va `npm run dev` bilan tekshiring; Supabase'da yuqoridagi
barcha SQL bloklarini ishga tushiring (`notify pgrst, 'reload schema'` bilan).
