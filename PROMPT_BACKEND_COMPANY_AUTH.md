# Backend prompt — Kompaniya asosidagi ro'yxatdan o'tish

> Bu faylni Claude'ga (backend) bering.
>
> **Kontekst:** Frontendda (`app/register`, `app/register-company`) yangi
> ro'yxatdan o'tish oqimi tayyor, lekin quyidagi ikki endpoint backendda
> hali mavjud emas. Hozircha bu sahifalar chaqirganda 404/xato qaytadi —
> shu ikkitasi qo'shilgach ishga tushadi.

Backend: Express + Supabase (procell-backend).

---

## 1. `POST /auth/register-company` — yangi kompaniya + owner

Frontend (`app/lib/register.ts` → `registerCompany`) shuni chaqiradi:
```
POST /auth/register-company
body {
  "company_name": "...",
  "owner_name": "...",
  "email": "...",
  "password": "..."
}
```
Talablar:
- Yangi kompaniya yozuvi yaratiladi (masalan `companies` jadvali: `id`, `name`, `invite_code`, `created_at`).
- `invite_code` — **9 ta belgidan iborat**, katta harf+raqamlardan (A-Z, 0-9),
  tasodifiy generatsiya qilinadi, `companies.invite_code`da **unique** bo'lishi kerak.
- Owner uchun `users` yozuvi yaratiladi: `role='director'` (yoki `'owner'` —
  frontend `director`/`admin`/`owner`dan istalganini "to'liq boshqaruv paneli"
  deb talqin qiladi, lekin ishonch uchun `'director'` tavsiya etiladi),
  `company_id` shu yangi kompaniyaga bog'langan holda.
- Parol **scrypt-hash** qilib saqlansin (hech qachon javobda qaytmasin).
- Email allaqachon mavjud bo'lsa → xato qaytaring, xabarida `"email"` so'zi
  bo'lsin (frontend shuni tekshirib do'stona xabar ko'rsatadi).

Muvaffaqiyat javobi:
```json
{
  "success": true,
  "data": {
    "user": { "id": "..", "name": "..", "email": "..", "role": "director" },
    "invite_code": "AB3XK9QZ1"
  }
}
```
Xato javobi: `{ "success": false, "error": "..." }` + mos HTTP status (400/409/500).

---

## 2. `POST /auth/register` — xodim mavjud kompaniyaga qo'shiladi

Frontend (`app/lib/register.ts` → `registerEmployee`) shuni chaqiradi:
```
POST /auth/register
body {
  "name": "...",
  "email": "...",
  "password": "...",
  "company_code": "AB3XK9QZ1"
}
```
Talablar:
- `company_code`ni `companies.invite_code` bo'yicha qidiring.
- **Topilmasa** → **404** (yoki 400) qaytaring, xato xabarida `"code"` yoki
  `"kod"` so'zi bo'lsin — frontend buni avtomatik quyidagi matnga aylantiradi:
  *"Bu kod topilmadi, kompaniyangiz administratoridan tekshirib ko'ring."*
  (Xabar matnini o'zingiz ham xohlagancha yozishingiz mumkin — frontend faqat
  `"code"`/`"kod"` so'zini qidiradi, ammo qaysi matn kelsa ham fallback
  sifatida backend matnini ham ko'rsatadi.)
- Topilsa → yangi `users` yozuvi shu `company_id` bilan yaratiladi,
  `role='user'` (yoki `'operator'` — director/admin **emas**, oddiy xodim).
- Parol scrypt-hash qilinadi.
- Email allaqachon mavjud bo'lsa → xatoda `"email"` so'zi bilan xato qaytaring.

Muvaffaqiyat javobi:
```json
{ "success": true, "data": { "id": "..", "name": "..", "email": "..", "role": "user" } }
```

---

## 3. Eslatma — mavjud `POST /users/login` bilan mos kelishi

Yangi yaratilgan foydalanuvchilar (ikkala oqimdan ham) keyinchalik xuddi shu
`POST /users/login` orqali kiradi (`PROMPT_BACKEND_AUTH.md`da tavsiflangan) —
shuning uchun parolni bir xil scrypt sxemasi bilan hash qiling, aks holda
ro'yxatdan o'tgandan keyin login qila olishmaydi.

---

## 4. Qisqacha
```
1) POST /auth/register-company — yangi company + owner (role=director), 9 belgili invite_code generatsiya va qaytarish
2) POST /auth/register — company_code bo'yicha company topiladi, xodim (role=user) shunga bog'lab yaratiladi
3) Ikkalasida ham parol xuddi /users/login kutayotgan sxema bilan hash qilinsin
```

Bularsiz: `/register` va `/register-company` sahifalari frontendda tayyor
turadi, lekin submit qilinganda backend javob bermagani uchun xato
ko'rsatadi.
