# supabase/

ฐานข้อมูล PostgreSQL บน Supabase — จัดการด้วย SQL migrations

- `migrations/` — ไฟล์ SQL แบบมีเวอร์ชัน (ตาราง index RLS และ functions)
  > ยังว่างโดยตั้งใจ: schema จริงเป็นงาน **DB-01** ซึ่งขึ้นกับการตัดสินใจ **DEC-02**
  > (นโยบายการเผยแพร่และ consent DNA) ดู logical schema ที่ `MeowMatch/06-database`
- `seed.sql` — ข้อมูลอ้างอิง/ข้อมูลสังเคราะห์เท่านั้น (breeds, trait_options) **ห้ามใส่ข้อมูลจริง**
- `tests/` — ทดสอบ constraints และ RLS (สมาชิก A/B/anonymous/admin)

## เริ่มใช้งาน local (เมื่อมี Supabase CLI)

```bash
supabase start                 # รัน local stack (Postgres + Auth + Storage)
supabase db reset              # ใช้ migrations + seed ใหม่ทั้งหมด
npm run db:types               # สร้าง src/types/database.ts จาก schema
```

## หลักการ (จาก 06-database / 08-api-security)

- เปิด RLS ทุกตารางที่เข้าถึงผ่าน Data API; แยก SELECT/INSERT/UPDATE/DELETE และใช้ WITH CHECK
- ข้อมูลส่วนตัวกับข้อมูลเผยแพร่แยกตาราง (เช่น `cats` vs `cat_listings`)
- Storage เป็น private buckets (`cat-images`, `avatars`, `genetic-reports`) ออก signed URL อายุสั้น
- ห้ามเก็บ password/token ในตารางแอป; Supabase Auth ดูแล credentials
