# Frontend prompt — Kompaniya brendi (logo + nom) va dashboard statistikasi

> Bu faylni Claude'ga (frontend, shu `prosell` repo) bering.

**Kontekst:** Backendda (`procell-backend`) endi to'liq ishlaydigan
kompaniya-asosidagi tizim bor: ro'yxatdan o'tish (`/auth/register`,
`/auth/register-company` — allaqachon `app/lib/register.ts`da ishlatilmoqda),
va endi ustiga **`GET /company/me`**, **`GET /dashboard/stats`**,
**`POST /company/logo`**, **`DELETE /company/logo`** qo'shildi. Dashboard
hali eski KIA loyihasidan qolgan statik matn/rasmlarni ko'rsatmoqda — buni
tuzatib, har bir kompaniyaga o'ziga xos ko'rinish berish kerak.

---

## 0. MUHIM — Auth token

Login/register javoblarida endi **`data.token`** maydoni ham keladi (JWT,
30 kun amal qiladi):

```json
// POST /users/login, POST /auth/register, POST /auth/register-company javobi:
{ "success": true, "data": { "id": "..", "name": "..", "email": "..",
  "role": "director", "token": "eyJhbGciOi..." } }
```
(`register-company` uchun bundan tashqari `data.user` va `data.invite_code`
ham bor — `token` shu obyektning yonida, yangi qo'shilgan maydon, eski
maydonlar o'zgarmagan.)

Bu tokenni `app/lib/auth.ts`dagi `Session`/`saveSession`/`loadSession`ga
qo'shib, **localStorage**da saqlang (`procell-session` kaliti ostida,
mavjud struktura bilan bir qatorda — masalan `session.token`).

Keyinchalik **`/company/*`** va **`/dashboard/*`** so'rovlarining
HAMMASIDA shu tokenni yuboring:
```
Authorization: Bearer <session.token>
```
Token yo'q/eskirgan bo'lsa backend `401` qaytaradi — bu holatda foydalanuvchini
login sahifasiga qaytaring (xuddi hozirgi "sessiya tugagan" holatidagidek).

---

## 1. `CompanyProvider` — global context

Dashboard layout yuklanganda (login qilingan har safar):

```ts
GET /company/me
Headers: Authorization: Bearer <token>

← 200 { "success": true, "data": {
    "id": "9c2e...", "name": "Toshkent Motors MCHJ",
    "logo_url": null, "plan": "starter", "created_at": "..." } }

GET /dashboard/stats
Headers: Authorization: Bearer <token>

← 200 { "success": true, "data": {
    "total_calls": 0, "total_campaigns": 0, "avg_score": null,
    "calls_this_month": 0, "active_agents": 1 } }
```

Ikkalasini ham React context'ga saqlang (`CompanyProvider`, masalan
`app/lib/company.tsx`): `{ company, stats, loading, refetch }`. Sidebar,
header va barcha dashboard komponentlari shu context'dan o'qisin.

`avg_score: null` — bu **"0 ball"dan farqli**: front buni raqam sifatida
emas, `"—"` yoki `"Hali baho yo'q"` deb ko'rsating.

---

## 2. Hardcode'larni tozalash

Loyihada `"KIA"`, `"KIA Motors"` yoki shunga o'xshash statik matn/rasm
qayerda yozilganini toping (`grep -rn "KIA"` qiling) — bular
`CompanyProvider`dan kelgan `company.name`/`company.logo_url` bilan
almashtirilsin. Hech qanday hardcode qolmasin.

---

## 3. Sidebar / Header

- `company.logo_url` bo'lsa — shu rasm ko'rsatiladi.
- Bo'lmasa — fallback avatar: `company.name`ning birinchi 1-2 harfi +
  `company.id` asosida **deterministik** fon rang (masalan
  `hashCode(company.id) % ranglar_royxati.length`) — bir xil kompaniya
  har doim bir xil rangli avatar olishi kerak (sahifa yangilanganda
  o'zgarmasin).
- Kompaniya nomi ko'rsatiladi ("SalesPulse" umumiy brend nomi butunlay
  yo'qolmasin — masalan kichik "SalesPulse" logotipi yuqorida, uning
  ostida/yonida aynan shu kompaniyaning nomi/logosi bo'lishi mumkin,
  loyihaning umumiy dizayn tiliga qarab qaror qiling).

---

## 4. Statistika kartalari (dashboard bosh sahifa)

- Qiymat `0` bo'lsa — oddiy `"0"` ko'rsating, ostida yo'naltiruvchi matn,
  masalan: *"Hali qo'ng'iroqlar yo'q — birinchi qo'ng'irog'ingizni kuting"*.
- `avg_score: null` — `"—"` yoki `"Hali baho yo'q"`.
- Yuklanish paytida **skeleton** ko'rsating — `"0"` bir zumga chiqib,
  keyin haqiqiy songa "sakramasin" (ya'ni: `stats === null` paytida
  skeleton, `stats` kelgach haqiqiy qiymat — oraliqda soxta `0`
  ko'rsatib qo'ymang).

---

## 5. `/settings/branding` — yangi sahifa

- Joriy logo (`company.logo_url`) yoki fallback avatar ko'rsatiladi.
- "Logotip yuklash": fayl tanlagich (PNG/JPEG/WEBP, max 2MB — shu
  cheklovni frontendda ham oldindan tekshiring, xato xabarini serverga
  yubormasdan turib ko'rsating) + tanlangan fayl preview'i.
- Yuklash:
  ```
  POST /company/logo
  Headers: Authorization: Bearer <token>
  Body: multipart/form-data, field name "logo"

  ← 200 { "success": true, "data": { "logo_url": "https://.../logo.png?v=..." } }
  ← 400 { "success": false, "error": "Fayl hajmi 2MB dan oshmasligi kerak." }
  ← 403 (manager/agent/'user' role — bu sahifaga umuman kirmasligi kerak, pastga qarang)
  ```
  Muvaffaqiyatli bo'lsa `CompanyProvider`dagi `company.logo_url`ni
  **darhol** yangilang (sahifa reload SHART EMAS) — `refetch()` yoki
  to'g'ridan-to'g'ri context state'ni yangilash bilan.
- "O'chirish" tugmasi:
  ```
  DELETE /company/logo
  Headers: Authorization: Bearer <token>

  ← 200 { "success": true }
  ```
  Muvaffaqiyatli bo'lsa `company.logo_url = null` qilib, fallback avatar
  darhol ko'rsatilsin.
- **Faqat `role === 'director' || role === 'admin'`** ko'radi — boshqa
  rol (`'user'`) uchun bu sahifa **umuman ko'rinmasin** (menyuda link
  chiqmasin, to'g'ridan-to'g'ri URL orqali kirishga urinsa ham
  redirect/403 sahifa). Buning uchun `useHasRole(['director','admin'])`
  kabi hook yozing (mavjud `app/lib/auth.ts`dagi `Session.role`dan
  o'qiydi — eslatma: backend rol qiymatlari `'director'`/`'admin'`/`'user'`,
  loyihaning ba'zi joylarida ishlatilgan `'owner'/'manager'/'agent'` EMAS).

---

## 6. To'liq test tartibi (bajarilgach albatta tekshiring)

1. Yangi kompaniya ro'yxatdan o'ting (`/register-company`, masalan
   "Test MCHJ" nomi bilan).
2. Login qiling → dashboard'da **"Test MCHJ"** chiqishi kerak, "KIA" emas.
3. Barcha statistika **0** bo'lishi, `avg_score` uchun "Hali baho yo'q"
   kabi matn to'g'ri ko'rinishi kerak.
4. `/settings/branding`ga o'tib logo yuklang → sidebar/header **darhol**
   yangilanishi kerak (reload'siz).
5. Chiqib qaytadan kiring → logo saqlanib qolganini tasdiqlang.
6. Director bergan `invite_code` bilan yangi xodim ro'yxatdan o'tkazing
   (`/register`, `company_code` maydoniga shu kod) → xodim login
   qilganda **avtomatik shu kompaniyaning** dashboard'iga (logo,
   statistika) tushishi kerak.
7. Ikkinchi (butunlay boshqa) kompaniya bilan ro'yxatdan o'tib login
   qiling — birinchi kompaniyaning **hech qanday** ma'lumoti (nomi,
   logo, statistika) ko'rinmasligini tasdiqlang.
8. `'user'` rolidagi xodim bilan kirib, `/settings/branding`ga
   kirishga urining — sahifa ko'rinmasligini/403 bo'lishini tasdiqlang.

---

## Qisqacha
```
1) Login/register javobidagi data.token'ni saqlang, keyingi /company va
   /dashboard so'rovlarida Authorization: Bearer sifatida yuboring
2) CompanyProvider: GET /company/me + GET /dashboard/stats, natijani
   context'ga saqlang
3) Barcha "KIA" hardcode'larni company.name/logo_url bilan almashtiring
4) Sidebar/header: logo yoki deterministik-rangli fallback avatar
5) Stat kartalar: 0/null holatlari uchun to'g'ri matn, skeleton loading
6) /settings/branding: yuklash/o'chirish, faqat director/admin, darhol
   yangilanish (reload'siz)
7) Yuqoridagi 8 qadamlik testni to'liq bajarib tasdiqlang
```
