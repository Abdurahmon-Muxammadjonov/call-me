 # Backend prompt — Demo'ni tozalash + CRM ulanishiga tayyorlash

> Bu faylni Claude'ga (backend) bering. Frontend (SalesPulse) tayyor va hamma
> joyda **jonli** ishlaydi — qo'ng'iroqlar, operatorlar, statistikalar backenddan
> keladi. Frontendda statik demo qolmadi. Endi backend tomonida ikki ish kerak:
> (1) eski demo/test ma'lumotni tozalash, (2) CRM (amoCRM) sinxronini ulash.
>
> Backend: Express + Supabase. Javob formati: `{ success, data?, error? }`.

---

## 1. Demo / test ma'lumotni o'chirish (DB tozalash)

Hozir bazada qo'lda kiritilgan demo/test yozuvlar bor — ular frontendda
ko'rinmoqda. O'chiring (yoki CRM sinxroni ularni almashtirsin):

- **Qo'ng'iroqlar / audiolar:** test uchun yuklangan eski `calls` yozuvlari.
  → `calls` jadvalidagi test/demo qatorlarni o'chiring (yoki `source='demo'`
    bo'lganlarini). Frontend `GET /api/calls` dan oladi — bo'sh bo'lsa "bo'sh
    holat" ko'rsatadi.
- **Takroriy "Abdurahmon" menejerlar:** `managers` (yoki `users` role-based)
  jadvalida 2 ta "Abdurahmon" bor — bittasini qoldiring, qolganini o'chiring.
- **"Tayinlanmagan" menejer:** `managers` dagi `name='Tayinlanmagan'` (status
  `flagged`) — demo placeholder. O'chiring yoki CRM sinxronida yaratilmasin.

> Diqqat: `calls.manager_id` FK bo'lsa, menejerni o'chirishdan oldin unга
> bog'langan qo'ng'iroqlarni ham hal qiling (o'chirish yoki qayta bog'lash).

---

## 2. CRM (amoCRM) integratsiyasi

Maqsad: operatorlar va qo'ng'iroqlar **CRM'dan avtomatik** kelsin — qo'lda
kiritilmasin. Frontend hech narsa o'zgartirmasdan jonli to'ladi.

### 2.1 Operatorlar/menejerlar sinxroni
- amoCRM foydalanuvchilari (sotuvchilar) → `managers` (yoki `users`) ga sinxron.
- Har bir CRM useriga `crm_id` (tashqi id) bog'lang — takror yaratilmasin
  (upsert: `crm_id` bo'yicha).
- Sinxron: webhook (CRM o'zgarganda) yoki davriy (cron) — ikkalasi ham bo'ladi.

### 2.2 Qo'ng'iroqlar sinxroni
- amoCRM qo'ng'iroq/audio yozuvlari → `calls` ga. Har biriga `crm_id` + audio
  havola (`audio_url`) + `manager_id` (CRM useriga mos).
- Yangi qo'ng'iroq kelganda backend uni AI auditor bilan tahlil qilib
  (`/api/analyze-call` oqimi) `kpi_score`, `penalty/bonus`, `conversions`,
  `lost_reasons` ni to'ldirsin.

### 2.3 Frontend nimani kutadi (o'zgarmaydi)
Quyidagilar allaqachon jonli ulangan — CRM ma'lumot tushishi bilan avtomatik
to'ladi:
- **Audio yozuvlar** (`RecordingsView`) ← `GET /api/calls`
- **Audio yuklash** menejer ro'yxati ← `GET /managers`
- **Boshqaruv paneli** (`ManagementView`) ← `/managers`, `/managers/:id/stats`,
  `/api/calls`, `/api/analyze-call`
- **Solishtirish paneli** (`ComparisonView`) ← `/analytics/pop`,
  `/api/management/conversion-history`
- **Umumiy KPI kartalar** ← `/api/analyze-call/` (totalCalls, avg, lost reasons)

> Ya'ni "boshqaruv paneli" va "solishtirish paneli" **tayyor** — CRM backendni
> to'ldirsa, qo'shimcha kodsiz avtomatik chiqadi.

---

## 3. CRM ulanish sozlamasi (admin panel uchun, ixtiyoriy)
Frontendda "amoCRM ulanishi" bo'limi bor. To'liq ishlashi uchun:
```
GET  /crm/status            → { connected: bool, subdomain?, last_sync? }
POST /crm/connect  body { subdomain, client_id, client_secret, redirect_uri }
POST /crm/sync              → qo'lda sinxronni ishga tushiradi
```
(ixtiyoriy — bo'lmasa frontend "ulanmagan" holatini ko'rsatadi.)

---

## 4. Qisqacha
```
1) calls/managers dan demo (Abdurahmon x2, Tayinlanmagan, test audiolar) o'chirilsin
2) amoCRM → managers + calls upsert (crm_id bo'yicha), webhook/cron bilan
3) yangi calls AI auditor bilan tahlil qilinsin (kpi, conversions, lost_reasons)
4) frontend o'zgarmaydi — hammasi jonli endpointlardan to'ladi
```
