# Backend prompt — Staff Manager, Real-time listeners, Shifts & Notifications

> Bu faylni Claude'ga (backend) bering. Frontend allaqachon tayyor va ishlaydi
> (`StaffManager`, `NotificationBell`, `ShiftAlertBanner`, `StaffRealtimeLayer`,
> `app/lib/realtime.ts`). Hozir real-time `app/lib/realtime.ts` ichidagi yagona
> `subscribe()` orqali REST'ni **polling** qiladi — quyidagi endpointlar paydo
> bo'lishi bilan jonli ishlaydi. Ixtiyoriy: Supabase Realtime yoqilsa, faqat
> shu bitta `subscribe()` funksiyasi almashtiriladi (§6).
>
> Backend: Express + Supabase (procell-backend, :5001). Javoblar `{ success, data }`.
> MUHIM: barcha yangi ustunlar `nullable`/`default` bilan qo'shilsin — mavjud
> `users` yozuvlari buzilmasin (migration).

---

## 0. `users` jadvaliga ustunlar

```
users: + first_name text, + last_name text,
       + phone text (agar yo'q bo'lsa),
       + shift_start text,  -- "09:00"
       + shift_end   text,  -- "18:00"
       + credentials_changed_at timestamptz  -- email/parol o'zgarsa yangilanadi
```

`first_name`/`last_name` bo'lsa — frontend ularni birlashtirib ko'rsatadi
(bo'lmasa `name`'ga qaytadi).

---

## 1. Dinamik ism sinxronizatsiyasi + Kick-out (eng muhim)

Frontend har bir xodim uchun `GET /users/:id` ni davriy o'qiydi va quyidagilarni
kuzatadi (`app/lib/realtime.ts`):

- **Ism**: `first_name`/`last_name` (yoki `name`) o'zgarsa — sidebardagi ism
  reload'siz yangilanadi.
- **Kick-out**: `email` yoki `credentials_changed_at` login paytidagidan farq
  qilsa — modal chiqadi va foydalanuvchi login sahifasiga chiqariladi.

Shuning uchun `GET /users/:id` javobida shular bo'lsin:
```json
{ "success": true, "data": {
  "id": "..", "name": "..", "first_name": "Dilnoza", "last_name": "Karimova",
  "email": "..", "credentials_changed_at": "2026-06-25T10:00:00Z"
} }
```

**Admin email/parolni o'zgartirganda** `credentials_changed_at = now()` qilib
qo'ying (parol o'zgarishini frontend boshqa yo'l bilan bilolmaydi — hash
ko'rsatilmaydi). Buni §3 dagi endpointlar bajaradi.

---

## 2. Staff Manager — parol / smena / skriptlar

`StaffManager` ism/telefon/email'ni mavjud `/users` CRUD orqali saqlaydi.
Qolgan uchta maydon uchun endpoint kerak (har biri mustaqil, best-effort):

### 2.1 Parol (ko'rinib turishi kerak)
```
GET /users/:id/credentials      → { "data": { "password": "joriy_parol" } }
PUT /users/:id/credentials  body { "password": "yangi" }
  → parol yangilanadi VA credentials_changed_at = now()
```
Frontend parol maydonini **ochiq matn** ko'rinishida (ko'z tugmasi bilan)
ko'rsatadi va `GET .../credentials` dagi `password` bilan oldindan to'ldiradi.

⚠️ **Xavfsizlik:** parolni ochiq ko'rsatish uchun uni qaytarib berish kerak.
Buning ikki yo'li:
  (a) parolni **plaintext** (yoki qaytariladigan shifrlangan) holda alohida
      saqlash — eng oddiy, lekin xavfsizroq EMAS; yoki
  (b) parolni umuman qaytarmaslik — u holda maydon bo'sh keladi, admin yangi
      parol yozadi (eski ko'rinmaydi).
Tavsiya: faqat **direktor/admin** roli uchun (a) ni yoqing; oddiy holatda (b).
Agar `GET .../credentials` bo'lmasa yoki `password` qaytarmasa — frontend
maydonni bo'sh qoldiradi va faqat yangi kiritilgan parolni saqlaydi.

### 2.2 Smena vaqti
```
GET /users/:id/shift            → { "data": { "start": "09:00", "end": "18:00" } }
PUT /users/:id/shift   body { "start": "09:00", "end": "18:00" }
```

### 2.3 Skriptlar (operatorga biriktirilgan)
```
GET /users/:id/scripts          → { "data": [ { "id": "..", "title": "Salomlashish", "enabled": true } ] }
PUT /users/:id/scripts body { "scripts": [ { "id"?, "title", "enabled" } ] }  -- to'liq almashtirish (replace)
```
DB tavsiya: `scripts(id, user_id, title, enabled, created_at)`. PUT kelganda shu
foydalanuvchi skriptlarini berilgan ro'yxat bilan to'liq almashtiring (yangi
`title`larga id bering). `id` "tmp-…" bilan kelsa — yangi yozuv.

---

## 3. manager_notifications (Bell + ko'k nuqta)

`NotificationBell` quyidagini kutadi:
```
GET  /manager-notifications?user_id=:id
  → { "data": [ { "id": "..", "message": "Yangi skript qo'shildi", "created_at": "..", "read": false } ] }
POST /manager-notifications/read   body { "user_id": ":id" }   -- hammasini o'qilgan deb belgilash
```
- Ko'k nuqta `read=false` element bo'lsagina chiqadi.
- Bell ochilganda frontend `/read` ni chaqiradi (optimistik tarzda nuqta darhol
  o'chadi).

DB: `manager_notifications(id, user_id, message, read boolean default false, created_at)`.
Admin skript/sozlama qo'shganda shu jadvalga yozuv qo'shing.

---

## 4. Shift events (ShiftAlertBanner)

`ShiftAlertBanner` smena boshlanishi/tugashini ko'rsatadi:
```
GET /shifts/events/latest?user_id=:id
  → { "data": { "id": "evt_123", "type": "start", "at": "2026-06-25T09:00:00Z" } }
  (yoki type: "end"; hodisa bo'lmasa data: null / 404)
```
- Har bir `id` faqat bir marta ko'rsatiladi (frontend localStorage'da belgilaydi).
- `shift_start`/`shift_end` vaqtiga yetganda backend (cron yoki on-read) shu
  hodisani yarating. Eng sodda: on-read — joriy vaqt smena chegarasidan o'tgan
  va shu kun uchun hodisa hali yaratilmagan bo'lsa, yangi `{type, at, id}` qaytaring.

DB tavsiya: `shift_events(id, user_id, type, at)`.

---

## 5. Qisqacha ustun/jadval o'zgarishlari
```
users:                + first_name, + last_name, + phone, + shift_start, + shift_end, + credentials_changed_at
scripts (new):        id, user_id, title, enabled, created_at
manager_notifications (new): id, user_id, message, read, created_at
shift_events (new):   id, user_id, type ('start'|'end'), at
```

---

## 6. Haqiqiy Supabase Realtime (ALLAQACHON IMPLEMENT QILINDI ✅)

Frontendda Supabase Realtime listener **yozib bo'lindi**:
- `app/lib/supabase.ts` — brauzer klienti (env'dan; kalit bo'lmasa polling'ga qaytadi).
- `app/lib/useManagerRealtime.ts` — `managers` jadvalining UPDATE hodisasiga
  obuna bo'lib, ism va smenani **~1 soniyada** (reload'siz) yangilaydi.
  `EmployeeDashboard`'ga ulangan (instant ustun, polling fallback sifatida qoladi).

Buni yoqish uchun **backend/infra tomonidan** quyidagilar kerak:

**6.1 — Jadval:** Realtime listener `users` jadvaliga obuna bo'ladi
(`app/lib/useManagerRealtime.ts` → `TABLE = "users"`), ya'ni §0 dagi ustunlardan
(`first_name`, `last_name`, `shift_start`, `shift_end`) foydalanadi. REST ham,
Realtime ham bitta `users` jadvalida — qo'shimcha ustun shart emas.

**6.2 — Realtime publication:** `users`, `manager_notifications`, `shift_events`
jadvallariga Supabase Realtime'ni yoqing. Buni `supabase_migration.sql` §5 bajaradi.

**6.3 — Frontend env:** `.env.local` ga qo'shing —
```
NEXT_PUBLIC_SUPABASE_URL=https://<proyekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```
**RLS majburiy:** anon kalit ochiq bo'ladi — har bir foydalanuvchi faqat o'z
qatorini (`id = auth.uid()` yoki shunga mos siyosat) o'qiy olsin.

**6.4 — Qolgan oqimlar:** `manager_notifications` va `shift_events` uchun ham
xohlasangiz `useManagerRealtime` uslubida channel qo'shsa bo'ladi; hozir ular
polling bilan ishlaydi (`app/lib/realtime.ts` — bitta `subscribe()` seam).
```
