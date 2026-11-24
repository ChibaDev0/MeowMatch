-- MeowMatch — ยีนจำลอง (simulated genes) ที่เจ้าของระบุเอง เพื่อการเรียนรู้/จำลองการผสม
-- ไม่ใช่ผลตรวจ DNA · key = ยีน (L, hr, Fd, W, S, O, D, C) · value = AA / Aa / aa (ตัวผู้ยีนบน X: A / a)
-- เก็บเฉพาะยีนที่เจ้าของเลือก; ยีนที่ไม่ระบุ แอปคิดจากหน้าตาแมว (ดู src/domain/genes/model.ts)
-- server action ตรวจรหัสยีนและความสอดคล้องกับหน้าตาก่อนบันทึกเสมอ
alter table public.cats
  add column if not exists genes jsonb not null default '{}'::jsonb;

alter table public.cats
  drop constraint if exists cats_genes_shape;
alter table public.cats
  add constraint cats_genes_shape
  check (jsonb_typeof(genes) = 'object' and pg_column_size(genes) <= 1024);

comment on column public.cats.genes is
  'ยีนจำลองที่เจ้าของระบุ (เพื่อการเรียนรู้) ไม่ใช่ผลตรวจ DNA; {locus: AA|Aa|aa|A|a}';

-- ค้นหาแมวที่บันทึกยีนตรง (หน้าหาคู่: genes->>L = 'AA')
create index if not exists cats_genes_gin_idx on public.cats using gin (genes jsonb_path_ops);

-- RLS / สิทธิ์เดิมของตาราง cats ยังใช้ตามเดิม (เจ้าของแก้ได้เฉพาะแมวตัวเอง)
notify pgrst, 'reload schema';
