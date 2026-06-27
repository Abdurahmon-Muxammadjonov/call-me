-- =====================================================================
-- SalesPulse — Staff Manager / Realtime migration
-- Supabase SQL Editor'da ishga tushiring (yuqoridan pastga).
-- Idempotent: IF NOT EXISTS — bir necha marta xavfsiz ishlatsa bo'ladi.
--
-- ⚠️ TUR HAQIDA: bu yerda users.id = uuid deb taxmin qilingan (Supabase odati).
-- Agar users.id boshqa tur bo'lsa (text/bigint), pastdagi user_id ustunlar
-- turini va FK'larni mos ravishda o'zgartiring.
-- =====================================================================

-- ---------- 1. users jadvaliga ustunlar ----------
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name  text;
alter table public.users add column if not exists shift_start text;   -- "09:00"
alter table public.users add column if not exists shift_end   text;   -- "18:00"
alter table public.users add column if not exists credentials_changed_at timestamptz;

-- (ixtiyoriy, XAVFSIZ EMAS) parolni admin panelida ochiq ko'rsatish uchun.
-- Faqat kerak bo'lsa va xavfni tushungan holda oching:
-- alter table public.users add column if not exists password_plain text;


-- ---------- 2. scripts (operatorga biriktirilgan skriptlar) ----------
create table if not exists public.scripts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  title      text not null,
  enabled    boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists scripts_user_id_idx on public.scripts (user_id);


-- ---------- 3. manager_notifications (Bell + ko'k nuqta) ----------
create table if not exists public.manager_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists manager_notifications_user_id_idx
  on public.manager_notifications (user_id, read);


-- ---------- 4. shift_events (ShiftAlertBanner) ----------
create table if not exists public.shift_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null check (type in ('start','end')),
  at         timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists shift_events_user_id_idx on public.shift_events (user_id, at desc);


-- =====================================================================
-- 5. (IXTIYORIY) Supabase Realtime — sub-soniyali yangilanish uchun
-- =====================================================================
-- Realtime publication'ga jadvallarni qo'shish. "already member" xatosi
-- chiqsa — e'tibor bermang (allaqachon qo'shilgan).
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.users'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.manager_notifications'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.shift_events'; exception when others then null; end;
end $$;

-- ⚠️ RLS / XAVFSIZLIK ESLATMASI:
-- Frontend Supabase'ga ANON kalit bilan ulanadi. Agar RLS yoqilgan bo'lsa,
-- anon foydalanuvchi qatorlarni o'qiy olishi uchun siyosat (policy) kerak.
-- Loyiha o'z (custom) auth'idan foydalanadi — Supabase Auth EMAS — shuning uchun
-- auth.uid() ishlamaydi. Variantlar:
--   (a) Realtime'ni faqat REST polling bilan qoldirish (RLS'ga tegmaslik); yoki
--   (b) quyidagi kabi minimal o'qish siyosati (kamroq xavfsiz — faqat o'qish):
--
-- alter table public.users enable row level security;
-- create policy "users_read_anon" on public.users for select to anon using (true);
-- (manager_notifications / shift_events uchun ham xuddi shunday, kerak bo'lsa)
--
-- Eng to'g'risi: Supabase Auth (JWT) ga o'tib, "id = auth.uid()" siyosatini qo'yish.
