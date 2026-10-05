-- MeowMatch — Cats + Likes (งาน CAT-01 / DISC-01 / FAV-01, เวอร์ชัน MVP)
-- เก็บข้อมูลแมวแบบ denormalized (text ตรง ๆ) ให้ตรงกับฟอร์มเพิ่มแมวปัจจุบัน
-- โครง normalized เต็ม (breeds / trait_options / cat_traits ใน 06-database) ไว้ทำภายหลัง
-- อ้างอิง: MeowMatch/00-prd, MeowMatch/06-database, MeowMatch/08-api-security

-- ===================== cats =====================
-- owner_id = NULL หมายถึง "แมวตัวอย่างของระบบ" (seed) ที่ทุกคนเห็นในหน้าหาคู่
create table if not exists public.cats (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  breed           text,
  sex             text not null default 'unknown'
                  check (sex in ('male', 'female', 'unknown')),
  age_months      integer check (age_months is null or (age_months >= 0 and age_months <= 600)),
  coat            text,          -- ขนสั้น / ขนยาว / ไม่มีขน
  eye_color       text,          -- ตาสีฟ้า / ตาสีทอง / ตาสีเขียว ...
  ear_type        text,          -- หูตั้ง / หูพับ
  temperament     text check (temperament is null or char_length(temperament) <= 500),
  photo_path      text,          -- รูปใน public/ หรือ URL จาก Storage (ภายหลัง)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.cats is 'ข้อมูลแมวของสมาชิก; owner_id NULL = แมวตัวอย่างของระบบ (seed)';

create index if not exists cats_owner_id_idx on public.cats (owner_id);
create index if not exists cats_created_at_idx on public.cats (created_at desc);

drop trigger if exists trg_cats_updated_at on public.cats;
create trigger trg_cats_updated_at
  before update on public.cats
  for each row execute function public.set_updated_at();

-- ===================== cat_likes =====================
create table if not exists public.cat_likes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  cat_id     uuid not null references public.cats (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cat_id)
);

comment on table public.cat_likes is 'แมวที่สมาชิกกดใจไว้ (หน้าหาคู่)';

create index if not exists cat_likes_cat_id_idx on public.cat_likes (cat_id);

-- ===================== RLS: cats =====================
alter table public.cats enable row level security;

-- ทุกสมาชิกที่ล็อกอินเห็นแมวได้ทั้งหมด (จำเป็นต่อหน้าหาคู่ที่แชร์ข้ามผู้ใช้)
drop policy if exists cats_select_all on public.cats;
create policy cats_select_all on public.cats
  for select to authenticated using (true);

-- เพิ่ม/แก้/ลบ ได้เฉพาะแมวของตัวเอง (seed ที่ owner_id NULL แก้ผ่าน client ไม่ได้)
drop policy if exists cats_insert_own on public.cats;
create policy cats_insert_own on public.cats
  for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists cats_update_own on public.cats;
create policy cats_update_own on public.cats
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists cats_delete_own on public.cats;
create policy cats_delete_own on public.cats
  for delete to authenticated using (auth.uid() = owner_id);

-- ===================== RLS: cat_likes =====================
alter table public.cat_likes enable row level security;

drop policy if exists cat_likes_select_own on public.cat_likes;
create policy cat_likes_select_own on public.cat_likes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists cat_likes_insert_own on public.cat_likes;
create policy cat_likes_insert_own on public.cat_likes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists cat_likes_delete_own on public.cat_likes;
create policy cat_likes_delete_own on public.cat_likes
  for delete to authenticated using (auth.uid() = user_id);

-- ===================== seed: แมวตัวอย่าง 3 ตัว (คละเพศ) =====================
-- owner_id NULL → แสดงให้ทุกคนในหน้าหาคู่ ตั้งแต่ยังไม่มีผู้ใช้คนอื่นลงข้อมูล
-- idempotent: ใส่ก็ต่อเมื่อยังไม่มี seed cat (owner_id is null)
insert into public.cats (owner_id, name, breed, sex, age_months, coat, eye_color, ear_type, photo_path)
select * from (values
  (null::uuid, 'นาชิ',   'Maine Coon',    'female', 12, 'ขนยาว', 'ตาสีฟ้า',   'หูตั้ง', '/cats/maine-coon.png'),
  (null::uuid, 'ทาโอะ',  'British Shorthair', 'male', 8, 'ขนสั้น', 'ตาสีทอง',  'หูตั้ง', '/cats/british-blue.png'),
  (null::uuid, 'ซากุระ', 'Scottish Fold', 'female', 12, 'ขนสั้น', 'ตาสีเขียว', 'หูพับ',  '/cats/scottish-cream.png')
) as v(owner_id, name, breed, sex, age_months, coat, eye_color, ear_type, photo_path)
where not exists (select 1 from public.cats where owner_id is null);
