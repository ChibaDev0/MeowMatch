-- MeowMatch — Storage bucket สำหรับรูปแมว (งาน MEDIA-01, เวอร์ชัน MVP)
-- เก็บรูปแมวที่ผู้ใช้อัปโหลดใน bucket 'cat-photos'
-- ข้อตกลง path: {owner_id}/{uuid}.{ext}  → โฟลเดอร์แรก = เจ้าของ (ใช้บังคับสิทธิ์)
-- cats.photo_path เก็บ "object key" ภายใน bucket (เช่น "a1b2.../xyz.jpg")
--   ส่วนแมวตัวอย่าง (seed) ยังเก็บ path รูป static ใน public/ (ขึ้นต้นด้วย '/')
-- อ้างอิง: MeowMatch/06-database, MeowMatch/08-api-security

-- ===================== bucket =====================
-- public = true เพื่อให้ next/image ดึงผ่าน public URL ได้ (ข้อมูลแมวเป็นสาธารณะในหน้าหาคู่)
-- จำกัดชนิดไฟล์และขนาด (5 MB) ที่ชั้น storage อีกชั้นนอกเหนือจากการตรวจใน server action
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cat-photos',
  'cat-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ===================== RLS: storage.objects (เฉพาะ bucket นี้) =====================
-- อ่านได้สาธารณะ (รูปแมวแสดงในหน้าหาคู่ให้ทุกคนเห็น)
drop policy if exists cat_photos_read on storage.objects;
create policy cat_photos_read on storage.objects
  for select to public
  using (bucket_id = 'cat-photos');

-- อัปโหลด/แก้/ลบ ได้เฉพาะไฟล์ในโฟลเดอร์ของตัวเอง (โฟลเดอร์แรก = auth.uid())
drop policy if exists cat_photos_insert_own on storage.objects;
create policy cat_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists cat_photos_update_own on storage.objects;
create policy cat_photos_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists cat_photos_delete_own on storage.objects;
create policy cat_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cat-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
