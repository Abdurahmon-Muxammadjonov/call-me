# Backend prompt — "Boshqaruv paneli" (Management Dashboard) uchun

> Bu faylni Claude'ga (backend) bering. Frontend (`app/components/ManagementView.tsx`
> + `app/lib/management.ts`) allaqachon JONLI ishlaydi — mavjud endpointlardan
> (`/managers`, `/managers/:id/stats`, `/api/calls`, `/api/analyze-call`) ma'lumot
> yig'ib, kunlik/haftalik dinamikani `created_at` vaqtidan hisoblaydi.
>
> Quyidagilar — frontend hozir **proksi yoki standart qiymat** bilan ishlayotgan,
> backend qo'shgach **to'liq aniq** bo'ladigan bo'shliqlar. Har biri mustaqil;
> xohlagan tartibda qo'shsa bo'ladi. Hech narsa buzilmaydi — frontend yangi
> maydonlar kelsa avtomatik ulardan foydalanadi, kelmasa eskicha ishlaydi.

Backend: Express + Supabase (procell-backend, :5001). Javoblar `{ success, data }`
konvertida (analyze-call POST'dan tashqari).

---

## 1. Ko'p platforma / tenant (eng muhim)

Frontendda platforma almashtirgich bor, lekin backendda hozir bitta workspace.
Kerak: izolyatsiya qilingan biznes liniyalari ("Tor biznes uchun alohida platforma").

### 1.1 `GET /api/management/platforms`
```json
{ "success": true, "data": [
  { "id": "core",   "name": "SalesPulse",   "tagline": "Asosiy call-center", "initials": "PC", "accent": "indigo" },
  { "id": "retail", "name": "Smart Retail",    "tagline": "Chakana savdo",     "initials": "SR", "accent": "cyan" }
] }
```
`accent` ∈ `"indigo" | "cyan" | "emerald" | "violet"` (UI rangi). `initials` — 2 harf.

### 1.2 `platform_id` filtri
Quyidagi endpointlar ixtiyoriy `?platform_id=` qabul qilsin va ma'lumotni shu
platforma bo'yicha filtrlasin: `/managers`, `/managers/:id/stats`, `/api/calls`,
`/api/analyze-call`. Berilmasa — barcha platformalar (hozirgi xulq).

DB: `managers` va `calls` jadvallariga `platform_id text` ustuni (FK → platforms).

> Frontendda `app/lib/management.ts` → `fetchPlatforms()` shu endpointni chaqiradi
> va `fetchManagementData(platformId)` `platform_id`'ni query'ga uzatadi. Hozir
> ular bitta "live" platformaga qaytadi — endpoint paydo bo'lishi bilan ko'p
> platforma avtomatik yoqiladi.

---

## 2. Kunlik reja (Kunlik Reja tracker)

ROP panelida har bir sotuvchining kunlik reja bajarilishi ko'rsatiladi. Hozir
frontend `planDone` = bugungi qo'ng'iroqlar sonini hisoblaydi, `planTarget` esa
**standart `20`** (DEFAULT_DAILY_PLAN). Kerak: haqiqiy maqsad.

- DB: `managers.daily_call_target int default 20`.
- `GET /managers/:id/stats` javobiga qo'shing:
```json
{ "daily_call_target": 70, "calls_today": 64 }
```
`calls_today` — bugun (server timezone, 00:00'dan) shu menejer qilgan qo'ng'iroqlar.

---

## 3. "Sabablarsiz munosabatlar" — haqiqiy sabablar

"Sabablarsiz munosabatlar dinamikasi" kartasi hozir proksi metrikalar bilan
ishlaydi (KPI < 50, jarima > 0, davomiylik < 60s). Aniq bo'lishi uchun har bir
qo'ng'iroqda ushbu maydonlar saqlangani va vaqt bo'yicha bo'linishi kerak.

`analyze-call` allaqachon `audit.metrics` da bularni qaytaradi —
`unanswered_count`, `bad_leads_count`, `incoming_count`, `outgoing_count`. Ularni
`calls` jadvaliga ham yozing (hozir yozilmaydi):
- `calls.unanswered int`, `calls.bad_lead boolean`, `calls.dropped_reason text|null`.

So'ng `GET /api/calls` qatorlariga shu maydonlar tushsin (frontend `created_at`
bo'yicha kunlik/haftalik o'zi bo'ladi). Ixtiyoriy: tayyor agregatsiya —
`GET /api/management/relationship-dynamics?platform_id=` →
```json
{ "success": true, "data": [
  { "key": "unanswered", "label": "Javobsiz qoldirilgan", "today": 9, "yesterday": 12,
    "week": 61, "lastWeek": 74, "spark": [12,10,11,9,10,8,9], "lowerIsBetter": true }
] }
```

---

## 4. Menejer roli va onlayn holati

Frontend `SellerKPI`da `role` (lavozim) va `status` (online/away/offline) kutadi.
Hozir `managers.status` (`active|inactive|on_leave|flagged`) lavozimga
moslashtiriladi (proksi). Kerak:
- `managers.role text` (masalan "Senior operator", "Key account").
- Onlayn holat: `users/presence` kabi mexanizm menejerlar uchun ham
  (`GET /managers/presence` → onlayn id'lar), yoki `managers.last_seen_at`.

`GET /managers` javobiga `role` qo'shilsa — frontend darhol foydalanadi.

---

## 5. Konversiya tarixi (Strategik o'sish + sparkline)

"Yirik ma'lumotlar" kartalari o'sish foizini (`growth`) va sparkline'ni so'nggi
7/14 kun qo'ng'iroqlaridan hisoblaydi — bu ishlaydi. Lekin **trafik/sotuv
konversiyasi** tarixi yo'q (hozir faqat joriy o'rtacha bor: `analyze-call` →
`averages.traffic_conversion`, `sales_conversion`).

Kerak: kunlik konversiya tarixi —
`GET /api/management/conversion-history?platform_id=&days=14` →
```json
{ "success": true, "data": [
  { "date": "2026-06-24", "traffic_conversion": 0.34, "sales_conversion": 0.19, "calls": 182 }
] }
```
Bu bilan funnel va strategik kartalar tarixiy trendni aniq ko'rsatadi.

---

## 6. (Ixtiyoriy) Bitta konsolidatsiyalangan endpoint

Yuqoridagilarni bittada bersangiz, frontend bitta so'rov bilan ishlaydi (hozir
4–10 so'rov yig'adi). Tavsiya etilgan shakl:

`GET /api/management/dashboard?platform_id=` →
```json
{ "success": true, "data": {
  "comparison":  [ /* §3 ko'rinishi */ ],
  "timeBuckets": [ { "range": "09:00–12:00", "calls": 412, "share": 34 } ],
  "general":     [ { "key": "calls", "label": "Bugungi qo'ng'iroqlar", "value": "1203",
                     "delta": "+8.2%", "trend": "up", "icon": "phone", "spark": [/*7*/] } ],
  "strategic":   [ { "label": "Haftalik qo'ng'iroqlar", "value": "1203", "sub": "so'nggi 7 kun",
                     "growth": 12.4, "spark": [/*7*/], "lowerIsBetter": false } ],
  "sellers":     [ { "id": "..", "name": "..", "role": "..", "status": "online",
                     "calls": 64, "avgDuration": "5:12", "score": 92,
                     "planTarget": 70, "planDone": 64, "bonus": 1250000, "penalty": 0 } ],
  "funnel":      [ { "label": "Kiruvchi lidlar", "value": 2840, "hint": "Barcha kanallar" } ]
} }
```
> Bu kelsa, `fetchManagementData()` ichidagi yig'ish mantig'ini bitta `fetch`'ga
> almashtiraman — TS tiplari (`PlatformData`) aynan shu shaklda.

---

## Qisqacha ustun o'zgarishlari
```
platforms (new): id, name, tagline, initials, accent
managers:  + platform_id, + role, + daily_call_target, + last_seen_at
calls:     + platform_id, + unanswered, + bad_lead, + dropped_reason
```
