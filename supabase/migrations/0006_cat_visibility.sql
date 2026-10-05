-- MeowMatch — Cat visibility / unpublish (ปิด gate Phase 3: "สิทธิ์ถอนเผยแพร่")
-- เพิ่มคอลัมน์ is_public ให้เจ้าของ "ซ่อน" แมวของตัวเองจากหน้าหาคู่ได้
-- ยังคงแนวทาง MVP (denormalized) — ยังไม่แยกตาราง cats / cat_listings (รอ DEC-02)
-- อ้างอิง: MeowMatch/03-tasks (DISC-01/FAV-01), MeowMatch/08-api-security

-- ===================== is_public =====================
-- default true → คงพฤติกรรมเดิม (แมวที่มีอยู่และ seed ยังสาธารณะทั้งหมด)
alter table public.cats
  add column if not exists is_public boolean not null default true;

comment on column public.cats.is_public is
  'true = แสดงในหน้าหาคู่; false = เจ้าของซ่อนไว้ (ถอนเผยแพร่) เห็นได้เฉพาะเจ้าของ';

-- index บางส่วนสำหรับหน้าหาคู่ (เรียงใหม่สุดก่อน เฉพาะแมวที่เผยแพร่)
create index if not exists cats_public_created_idx
  on public.cats (created_at desc)
  where is_public;

-- ===================== RLS: แก้ select ให้เคารพ is_public =====================
-- เดิม: ทุกคนเห็นแมวทั้งหมด (using true)
-- ใหม่: เห็นได้ถ้าแมวนั้น "เผยแพร่" หรือเป็นแมวของตัวเอง
--   - seed (owner_id NULL) is_public=true → ทุกคนเห็น
--   - แมวคนอื่นที่ถูกซ่อน → ไม่โผล่ในหน้าหาคู่ (RLS กันถึงชั้นข้อมูล ไม่ใช่แค่ UI)
--   - แมวของตัวเองที่ถูกซ่อน → เจ้าของยังเห็นในหน้า "แมวของฉัน"
drop policy if exists cats_select_all on public.cats;
drop policy if exists cats_select_visible on public.cats;
create policy cats_select_visible on public.cats
  for select to authenticated
  using (is_public or auth.uid() = owner_id);
