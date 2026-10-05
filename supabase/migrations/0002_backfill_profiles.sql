-- MeowMatch — Backfill profiles (งาน AUTH-02 / แก้ redirect loop)
-- trigger handle_new_user สร้าง profile ให้เฉพาะ user ที่สมัครใหม่เท่านั้น
-- user ที่มีอยู่ก่อน migration 0001 (เช่น ผู้ใช้ Google ที่ login ไปแล้ว) จะไม่มี profile
-- → ทำให้ requireProfile หา profile ไม่เจอและเกิด redirect loop
-- statement นี้สร้าง profile ย้อนหลังให้ครบ (idempotent ด้วย on conflict do nothing)

insert into public.profiles (user_id, username, display_name, onboarding_status)
select
  u.id,
  nullif(u.raw_user_meta_data ->> 'username', '')::citext,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  case
    when nullif(u.raw_user_meta_data ->> 'username', '') is null then 'needs_username'
    else 'complete'
  end
from auth.users u
on conflict (user_id) do nothing;
