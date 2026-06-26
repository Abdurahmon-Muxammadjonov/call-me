# Backend prompt — Login / Auth (XAVFSIZLIK)

> Bu faylni Claude'ga (backend) bering.
>
> **Muammo:** Avval direktor login/parol frontend kodida (`app/lib/auth.ts`)
> ochiq (hardcode) turardi — bu xavfli edi (kod brauzerga yuklanadi + git'da
> ommaviy). Endi frontenddan **butunlay olib tashlandi**: barcha login (direktor
> ham) faqat backend orqali tekshiriladi. Shu ishlashi uchun backend tomonida
> quyidagilar kerak.

Backend: Express + Supabase (procell-backend, :5001).

---

## 1. `POST /users/login` — server tomonda tekshirish

Frontend (`app/lib/store.ts` → `authEmployee`) shuni chaqiradi:
```
POST /users/login   body { "email": "...", "password": "..." }
```
Talablar:
- Parolni **server tomonda** scrypt-hash bilan solishtiring (parol/hash hech
  qachon javobda qaytmasin).
- Muvaffaqiyatda foydalanuvchini qaytaring — **`role` MAJBURIY**:
```json
{ "success": true, "data": {
  "id": "..", "name": "..", "email": "..", "phone": "..",
  "role": "director"   // yoki "admin" | "user" | "operator" ...
} }
```
- Noto'g'ri email/parol → **401** (yoki 400). Frontend buni "login noto'g'ri" deb
  ko'rsatadi.

Frontend rolni shunday talqin qiladi:
- `role === "director"` yoki `role === "admin"` → **to'liq boshqaruv paneli** (AppShell)
- aks holda → **xodim paneli** (EmployeeDashboard)

---

## 2. Direktorlarni `users` jadvaliga qo'shish (rol bilan)

Direktorlar endi oddiy `users` yozuvi — faqat `role='director'`:
- `users.role` ustuni `'director'` qiymatini qabul qilsin.
- Direktor yozuvini **parol bilan** yarating — parol **scrypt-hash** qilib
  saqlansin (oddiy `POST /users` yoki seed-skript orqali, hash backendda).

⚠️ **PAROLLARNI ALMASHTIRING (rotate):** eski `123456` / `1234567` parollar
allaqachon ommaviy (kod + git tarixida). Direktorlarga **yangi, kuchli** parol
bering — eskilarini ishlatmang.

Misol (kontseptual — parol backendda hash qilinadi, SQL'da ochiq EMAS):
```
POST /users  body {
  "name": "Abdurahmon",
  "email": "abdurahmon@gmail.com",
  "password": "<YANGI_KUCHLI_PAROL>",
  "role": "director"
}
```

> SQL bilan to'g'ridan-to'g'ri `insert` qilmang — parol hash bo'lishi kerak.
> Backenddagi mavjud foydalanuvchi yaratish oqimidan (hash bilan) foydalaning.

---

## 3. Avtorizatsiya (tavsiya etiladi)

`role` faqat UI uchun emas — **himoya** uchun ham ishlatilsin:
- Admin/boshqaruv endpointlari (masalan `PUT /users/:id/credentials`,
  `/users/:id/shift`, `/users/:id/scripts`, statistikalar) faqat
  `role in ('director','admin')` bo'lgan foydalanuvchiga ruxsat bersin.
- Buning uchun login'da sessiya token (JWT yoki imzolangan cookie) bering va
  himoyalangan endpointlarda tekshiring. (Hozir frontend rolni faqat ko'rinish
  uchun ishlatadi; server tomonda ham tekshirilsa — to'liq xavfsiz bo'ladi.)

---

## 4. Qisqacha
```
1) POST /users/login — scrypt tekshiruv, javobda `role` qaytsin, parol/hash qaytmasin
2) users.role = 'director' bo'lgan direktor yozuvlari (YANGI parollar bilan)
3) admin endpointlarni role bo'yicha himoyalang (JWT/cookie)
```

Bularsiz: direktor ham, xodim ham login qila olmaydi (frontendda endi hech
qanday zaxira parol yo'q — bu ataylab, xavfsizlik uchun).
