# Backend prompt — Bo'limlarni qulflash (locked sections / feature-gating)

> Bu hujjat endi **ma'lumot uchun** — backend allaqachon quyidagi shaklda
> javob beryapti va frontend shu bo'yicha yozilgan (2026-08-20 holatiga
> ko'ra). Agar shakl o'zgarsa, shu faylni yangilab, frontendga xabar bering.

Backend: Express + Supabase (procell-backend).

---

## 1. `GET /company/sections` — kompaniyaning bo'lim holatlari

```
GET /company/sections
Headers: Authorization: Bearer <token>
```

Javob — **massiv** (array, obyekt emas), har bir element `section_key`,
`is_locked`, `in_plan`ga ega:
```json
{ "success": true, "data": [
  { "section_key": "dashboard", "is_locked": false, "in_plan": true },
  { "section_key": "call_analytics", "is_locked": true, "in_plan": true },
  { "section_key": "reports", "is_locked": true, "in_plan": false },
  { "section_key": "campaigns", "is_locked": true, "in_plan": false }
]}
```
- `in_plan: true` + `is_locked: true` → sotib olingan, lekin hali kod bilan
  ochilmagan → frontend "Kod kiritish" oqimini ko'rsatadi.
- `in_plan: false` → joriy tarifga kirmaydi → frontend "Tarifni oshirish"
  oqimini ko'rsatadi.
- `ALWAYS_UNLOCKED_SECTIONS` (`dashboard`, `webhook_integration`) — backend
  bu ikkitasini hech qachon qulflamaydi; frontend ham ular uchun modal
  ko'rsatmaydi (sidebar'da bu ikkitasiga `sectionKey` umuman berilmagan).
- Frontendda ishlatilgan `sectionKey`larning sidebar bandlariga moslash
  jadvali (`app/lib/data.ts`):
  | `section_key` | Sidebar bandlari |
  |---|---|
  | `reports` | Boshqaruv paneli, Solishtirish paneli |
  | `staff` | Xodimlarni boshqarish |
  | `call_analytics` | Audio yozuvlar, Audio yuklash, Chuqur tahlil |
  | `operators` | Operatorlar |
  | `categories` | Mezon kategoriyalari |
  | `criteria` | Baholash mezonlari |

  ⚠️ Bu jadval hali **haqiqiy autentifikatsiya qilingan javob bilan
  to'liq tasdiqlanmagan** (faqat 401 orqali marshrut borligi tekshirildi).
  Agar backend haqiqiy `section_key` nomlari boshqacha bo'lsa (masalan
  `campaigns` kabi frontendda mavjud bo'lmagan kalitlar ham bor ekan),
  `app/lib/data.ts`dagi `sectionKey` maydonlarini moslashtirish kerak.
- Frontend `data`ni massivdan `Record<section_key, {is_locked, in_plan}>`
  xaritasiga o'zi aylantiradi (`app/lib/sections.tsx`). Ro'yxatda yo'q kalit
  — qulflangan **va** tarifga kirmaydi (fail-safe default) deb talqin
  qilinadi.

---

## 2. `POST /company/sections/unlock` — kod bilan bo'limni ochish

```
POST /company/sections/unlock
Headers: Authorization: Bearer <token>, Content-Type: application/json
body { "section_key": "call_analytics", "code": "ABC123" }
```
Javoblar:
- Muvaffaqiyat: `{ "success": true }`
- **400** — kod noto'g'ri/eskirgan → frontend "Kod noto'g'ri yoki eskirgan."
  ko'rsatadi (backend o'z `error` matnini yuborsa, o'shani ko'rsatadi).
- **429** — juda ko'p urinish → frontend "Juda ko'p urinish. Birozdan keyin
  qayta urinib ko'ring." ko'rsatadi.

Muvaffaqiyatdan keyin frontend darhol (optimistik) o'sha bo'limni ochiq deb
belgilaydi **va** fonda `GET /company/sections`ni qayta so'raydi — sahifa
qayta yuklanmaydi.

---

## 3. `POST /internal/telegram/deeplink` — botga o'tish havolasi

```
POST /internal/telegram/deeplink
Headers: Authorization: Bearer <token>, Content-Type: application/json
body { "purpose": "get_code" }   // yoki "upgrade"
```
Javob:
```json
{ "success": true, "data": { "url": "https://t.me/SalesPulsead_bot?start=..." } }
```
- `purpose: "get_code"` — "Kod olish" tugmasi (bo'lim tarifga kiradi, kod
  kerak).
- `purpose: "upgrade"` — "Tarifni oshirish" tugmasi (bo'lim tarifga
  kirmaydi).
- Frontend faqat `data.url`ni yangi tabda ochadi (`window.open`) — qolgan
  hammasi (telefon so'rash, tarif tanlash, to'lov, admin tasdig'i, kod
  generatsiyasi) botning o'zida bo'ladi.
- Havola **30 daqiqa** amal qiladi, **bir martalik** — muddati o'tgan/
  ishlatilgan link ochilsa, bot o'zi foydalanuvchiga xabar beradi; frontend
  bu holatni alohida ushlamaydi.

---

## 4. `GET /company/me` — `tariff` maydoni

```json
{ "success": true, "data": {
  "id": "...", "name": "...", "tariff_id": "uuid|null",
  "tariff": { "key": "start", "name": "START", "included_sections": ["call_analytics"] }
}}
```
- `tariff: null` — hali hech narsa sotib olinmagan → barcha lockable
  bo'limlar `in_plan: false` bo'ladi (hammasi "upgrade" oqimiga tushadi).
- `tariff.name` — ixtiyoriy ravishda sidebar/settings'da "Joriy tarif:
  START" sifatida ko'rsatilishi mumkin (hali frontendda qo'shilmagan).

---

## 5. Qamrov — faqat direktor dashboard (`/dashboard`)

Xodim kabineti (`/cabinet`) bu tizimga kirmaydi — uning navigatsiyasida
hech qanday `sectionKey` yo'q, har doim to'liq ochiq.

---

## 6. Qisqacha
```
1) GET /company/sections → { success, data: [{section_key, is_locked, in_plan}, ...] } (massiv!)
2) POST /company/sections/unlock → body {section_key, code}; 400=noto'g'ri kod, 429=juda ko'p urinish
3) POST /internal/telegram/deeplink → body {purpose:"get_code"|"upgrade"} → {data:{url}}, 30 daqiqa/bir martalik
4) GET /company/me endi tariff{key,name,included_sections} qaytaradi (null = hali tanlanmagan)
5) dashboard va webhook_integration hech qachon qulflanmaydi
6) /cabinet (xodim) bu tizimga kirmaydi
```
