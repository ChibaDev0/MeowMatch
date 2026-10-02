-- MeowMatch — Auth / profiles (งาน AUTH-01/AUTH-02)
-- ครอบคลุมเฉพาะส่วนที่จำเป็นต่อการสมัคร/เข้าสู่ระบบ/โปรไฟล์
-- ส่วน cats/listings/genetics อยู่ในงาน DB-01 (แยก migration)
-- อ้างอิง: MeowMatch/06-database, MeowMatch/08-api-security

create extension if not exists citext;

-- ===================== profiles =====================
-- โปรไฟล์ส่วนตัว ผูก 1:1 กับ auth.users; username เป็น case-insensitive unique
create table if not exists public.profiles (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  username          citext unique,
  display_name      text,
  avatar_path       text,
  bio               text,
  onboarding_status text not null default 'needs_username'
                    check (onboarding_status in ('needs_username', 'complete')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- ข้อเสนอรูปแบบ Username: a-z, 0-9, _ ความยาว 3–30 (06-database)
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,30}$'
  )
);

comment on table public.profiles is 'โปรไฟล์สมาชิก ผูกกับ auth.users; username ไม่ใช่ authorization key';

-- ===================== updated_at trigger =====================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ===================== handle_new_user =====================
-- สร้าง profile อัตโนมัติเมื่อมี auth user ใหม่ (ทั้ง password และ Google)
-- username อ่านจาก metadata ตอนสมัครด้วยรหัสผ่าน; ผู้ใช้ Google จะ null → ต้อง onboarding
-- ชน username → unique violation ทำให้การสร้าง user ล้ม (atomic) และ signUp ได้ error
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username citext := nullif(new.raw_user_meta_data ->> 'username', '');
begin
  insert into public.profiles (user_id, username, display_name, onboarding_status)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    case when v_username is null then 'needs_username' else 'complete' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===================== username_available =====================
-- ตรวจว่า username ว่างไหม (ใช้ตอนกรอกฟอร์ม) — เปิดให้ anon/authenticated เรียกได้
create or replace function public.username_available(p_username citext)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where username = p_username);
$$;

revoke all on function public.username_available(citext) from public;
grant execute on function public.username_available(citext) to anon, authenticated;

-- ===================== auth_email_for_username =====================
-- resolve Username → email สำหรับ login (server-only; เรียกด้วย service_role เท่านั้น)
-- ไม่เปิดให้ browser/anon/authenticated เพื่อกันการ enumerate อีเมล (08-api-security)
create or replace function public.auth_email_for_username(p_username citext)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where p.username = p_username
  limit 1;
$$;

revoke all on function public.auth_email_for_username(citext) from public, anon, authenticated;
grant execute on function public.auth_email_for_username(citext) to service_role;

-- ===================== RLS =====================
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- insert ทำผ่าน trigger (security definer) เท่านั้น — ไม่เปิด insert policy ให้ client
-- NOTE: การจำกัดคอลัมน์ที่แก้ได้ (เช่น ห้ามแก้ onboarding_status ตามใจ) ทำเพิ่มด้วย
-- column grants / RPC ในงาน SEC-01
