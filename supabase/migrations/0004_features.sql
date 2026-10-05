-- MeowMatch — Breeding analyses + Desired goals + security hardening
-- (งาน PAIR-01 / GOAL-01, เวอร์ชัน MVP ต่อยอดจาก 0003_cats)
-- คงสไตล์ denormalized (text ตรง ๆ) ให้เข้ากับฟอร์ม/คอมโพเนนต์ปัจจุบัน
-- โครง normalized เต็ม (breeds / trait_options / cat_traits) ยังเลื่อนไว้ตาม 06-database
-- อ้างอิง: MeowMatch/00-prd, MeowMatch/06-database, MeowMatch/08-api-security

-- ===================== security hardening =====================
-- 1) set_updated_at: ตั้ง search_path ให้ immutable (advisor 0011) — ฟังก์ชันใช้แค่ NEW ไม่แตะตาราง
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2) handle_new_user เป็น trigger เท่านั้น ไม่ควรเรียกผ่าน REST RPC (advisor 0028/0029)
--    การทำงานเป็น trigger ไม่ต้องใช้ execute grant จึง revoke ออกให้หมด
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ===================== breeding_analyses =====================
-- เก็บผลการเลือกคู่ผสม (แมวตัวที่ 1 = ของฉัน, ตัวที่ 2 = ของฉันหรือที่กดใจ)
-- result = ผลวิเคราะห์ลูกแมว (เปิดคำนวณจริงใน MVP-B) — ตอนนี้ null ได้
create table if not exists public.breeding_analyses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  parent_a_id uuid not null references public.cats (id) on delete cascade,
  parent_b_id uuid not null references public.cats (id) on delete cascade,
  result      jsonb,
  note        text check (note is null or char_length(note) <= 1000),
  created_at  timestamptz not null default now(),
  -- ห้ามเลือกแมวตัวเดียวกันเป็นทั้งพ่อและแม่
  constraint breeding_distinct_parents check (parent_a_id <> parent_b_id)
);

comment on table public.breeding_analyses is 'ผลวิเคราะห์คู่ผสม (PAIR-01); result เปิดคำนวณจริงใน MVP-B';

create index if not exists breeding_analyses_owner_id_idx on public.breeding_analyses (owner_id, created_at desc);

alter table public.breeding_analyses enable row level security;

drop policy if exists breeding_select_own on public.breeding_analyses;
create policy breeding_select_own on public.breeding_analyses
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists breeding_insert_own on public.breeding_analyses;
create policy breeding_insert_own on public.breeding_analyses
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists breeding_delete_own on public.breeding_analyses;
create policy breeding_delete_own on public.breeding_analyses
  for delete to authenticated using (auth.uid() = owner_id);

-- ===================== desired_goals =====================
-- เป้าหมายลูกแมวในหน้า "แมวในฝัน" — เก็บค่าที่ผู้ใช้เลือกในฟอร์ม (text ตรงกับ UI ปัจจุบัน)
-- source_cat_id = แมวของฉันที่ใช้เป็นต้นทาง (ลบแมวแล้วเก็บเป้าหมายไว้ → set null)
create table if not exists public.desired_goals (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users (id) on delete cascade,
  source_cat_id  uuid references public.cats (id) on delete set null,
  target_breed   text,
  target_eye_color text,
  target_coat    text,          -- ขนสั้น / ขนยาว / ไม่มีขน
  target_color   text,
  target_ear_type text,
  note           text check (note is null or char_length(note) <= 1000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.desired_goals is 'เป้าหมายลูกแมวที่ผู้ใช้ตั้งไว้ (หน้า desired-cats)';

create index if not exists desired_goals_owner_id_idx on public.desired_goals (owner_id, created_at desc);

drop trigger if exists trg_desired_goals_updated_at on public.desired_goals;
create trigger trg_desired_goals_updated_at
  before update on public.desired_goals
  for each row execute function public.set_updated_at();

alter table public.desired_goals enable row level security;

drop policy if exists desired_select_own on public.desired_goals;
create policy desired_select_own on public.desired_goals
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists desired_insert_own on public.desired_goals;
create policy desired_insert_own on public.desired_goals
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists desired_update_own on public.desired_goals;
create policy desired_update_own on public.desired_goals
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists desired_delete_own on public.desired_goals;
create policy desired_delete_own on public.desired_goals
  for delete to authenticated using (auth.uid() = owner_id);
