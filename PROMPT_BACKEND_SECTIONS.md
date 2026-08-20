# Backend prompt — Bo'limlarni qulflash (locked sections / feature-gating)

> Bu faylni Claude'ga (backend) bering.
>
> **Kontekst:** Frontendda (director dashboard, `/dashboard`) endi har bir
> sidebar bo'limi qulflangan/qulflanmaganini backenddan so'raydi va
> qulflangan bo'limga bosilganda kod kiritish oynasini ko'rsatadi. Ikkala
> endpoint (`GET /company/sections`, `POST /company/sections/unlock`) allaqachon
> **javob beryapti** (401 "Authorization header talab qilinadi" qaytardi —
> demak marshrutlar backendda mavjud), lekin **haqiqiy javob shakli va
> `section` kalitlari nomi hali autentifikatsiya bilan tekshirilmadi** —
> frontend quyidagi kalit nomlarini **taxmin** qilib yozdi. Shu faylning
> maqsadi — shu taxminni tasdiqlash yoki to'g'rilash.

Backend: Express + Supabase (procell-backend).

---

## 1. `GET /company/sections` — kompaniyaning bo'lim holatlari

Frontend (`app/lib/sections.tsx` → `SectionsProvider`) dashboard yuklanganda
bir marta chaqiradi:
```
GET /company/sections
Headers: Authorization: Bearer <token>
```

Frontend kutayotgan javob shakli:
```json
{
  "success": true,
  "data": {
    "reports": { "is_locked": false },
    "staff": { "is_locked": true },
    "call_analytics": { "is_locked": true },
    "operators": { "is_locked": false },
    "categories": { "is_locked": true },
    "criteria": { "is_locked": true }
  }
}
```
- `data` — obyekt, kalit = bo'lim nomi (`section` kodi), qiymat =
  `{ "is_locked": boolean }`.
- **"Umumiy ko'rinish" (overview/dashboard) va "amoCRM ulanishi" (webhook
  integratsiya) bu ro'yxatda umuman bo'lmasin** — frontend ularni har doim
  ochiq deb hisoblaydi va `data`da ular bo'lsa ham e'tibor bermaydi.
- Frontendda ishlatilgan bo'lim kalitlari — sidebar menyusiga mos ravishda
  quyidagicha guruhlangan (bittasi bir nechta menyu bandini birga qamrab olishi
  mumkin):
  | Frontend kaliti (`sectionKey`) | Qaysi sidebar bandlari |
  |---|---|
  | `reports` | Boshqaruv paneli, Solishtirish paneli |
  | `staff` | Xodimlarni boshqarish |
  | `call_analytics` | Audio yozuvlar, Audio yuklash, Chuqur tahlil |
  | `operators` | Operatorlar |
  | `categories` | Mezon kategoriyalari |
  | `criteria` | Baholash mezonlari |

  **⚠️ Bu jadval frontend tomonidan taxmin qilingan nom.** Agar backendda
  bo'limlar boshqacha nomlangan bo'lsa (masalan `call_analytics` o'rniga
  `recordings`, yoki `reports` o'rniga `dashboard_reports`), **shu jadvaldagi
  nomlarni backend haqiqiy ishlatadigan nomlarga moslashtiring** — frontend
  kodini o'zgartirish oson (`app/lib/data.ts`dagi `sectionKey` maydonlari),
  faqat qaysi nomlar to'g'ri ekanini ayting.
- Frontendda topilmagan (backend javobida yo'q) kalit **qulflangan** deb
  talqin qilinadi (fail-safe — yangi bo'lim standart holatda yashirin
  qolishi kerak, tasodifan ochilib qolmasligi uchun).
- Auth yo'q/eskirgan bo'lsa → **401** `{ "success": false, "error": "..." }`
  (bu allaqachon shunday ishlayapti).

---

## 2. `POST /company/sections/unlock` — kod bilan bo'limni ochish

Frontend (`app/components/LockedSectionModal.tsx` → `unlockSection`) shuni
chaqiradi:
```
POST /company/sections/unlock
Headers: Authorization: Bearer <token>, Content-Type: application/json
body { "section": "staff", "code": "ABC123" }
```
Talablar:
- `section` — yuqoridagi jadvaldagi kalitlardan biri (yoki backendning
  haqiqiy nomlash sxemasi bo'yicha).
- `code` — administrator/backend tomonidan oldindan berilgan bir martalik
  yoki ko'p martalik ochish kodi (aniq generatsiya/saqlash mexanizmi
  backend ixtiyorida — frontend faqat kodni yuboradi va natijani kutadi).
- Muvaffaqiyatli bo'lsa shu kompaniya uchun o'sha `section`ni
  doimiy (`is_locked=false`) qilib belgilang — keyingi `GET
  /company/sections` chaqiruvlarida ham ochiq bo'lib qolishi kerak.
- Kod noto'g'ri/eskirgan/allaqachon ishlatilgan bo'lsa → **400/409**
  `{ "success": false, "error": "..." }`. Xato matnini xohlagancha yozishingiz
  mumkin — frontend uni to'g'ridan-to'g'ri modal oynada ko'rsatadi (agar
  bo'lmasa, standart "Kod noto'g'ri yoki allaqachon ishlatilgan." matni
  chiqadi).

Muvaffaqiyat javobi:
```json
{ "success": true }
```
(Frontend `data` qaytishini talab qilmaydi — faqat `success: true` yetarli,
chunki u UI holatini optimistik ravishda o'zi yangilaydi.)

---

## 3. Qamrov — faqat direktor dashboard (`/dashboard`)

Xodim kabineti (`/cabinet`, `EmployeeDashboard`) bu tizimga **kirmaydi** —
uning navigatsiyasida (umumiy ko'rinish/qo'ng'iroqlar/jadval/maslahatlar/
jarimalar) hech qanday `sectionKey` yo'q va u har doim to'liq ochiq qoladi.
Agar kelajakda xodim tarafida ham qulflash kerak bo'lsa, alohida so'rov
sifatida ayting — hozircha bu doiraga kirmaydi.

---

## 4. Qisqacha
```
1) GET /company/sections — { success, data: { <section_key>: { is_locked } } }, auth talab qiladi (allaqachon 401 qaytaryapti — endpoint bor)
2) POST /company/sections/unlock — body { section, code } → { success: true } yoki { success:false, error }
3) "reports"/"staff"/"call_analytics"/"operators"/"categories"/"criteria" — frontend TAXMIN qilgan nomlar, backend haqiqiy nomlari bilan solishtirib tasdiqlang/to'g'rilang
4) overview va amoCRM bo'limlari hech qachon ro'yxatda bo'lmasin — doim ochiq
5) /cabinet (xodim) bu tizimga kirmaydi, faqat /dashboard (direktor)
```

Bularsiz ham `/dashboard` xato bermaydi — `GET /company/sections` 401dan
tashqari har qanday xato/tarmoq muammosida frontend sukut bo'yicha
**hamma gated bo'limni qulflangan** ko'rsatadi (xavfsiz tomon), lekin bu
holatda haqiqiy ochish kodlari ishlamaydi toki nom sxemasi tasdiqlanmaguncha.
