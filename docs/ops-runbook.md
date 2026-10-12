# MeowMatch — คู่มือปฏิบัติการ (OPS-01)

> ระยะ 6 ตาม `MeowMatch/03-tasks.md` — OPS-01: monitoring, backups, restore, rollout
> เงื่อนไขผ่าน: **ทดลอง restore และ rollback ใน staging ได้**
>
> เอกสารนี้เป็น runbook ปฏิบัติการ ไม่ผูกตัวเลข capacity/ราคาล่วงหน้า (ตาม 03-tasks)

อัปเดต: 2026-10-12

## 1. สภาพแวดล้อมและ config

| สิ่งที่ต้องมี | รายละเอียด |
|---|---|
| Supabase project | ref `qgkajyuoaffydydqbouv` (name MeowMatch), region `ap-southeast-2`, Postgres 17, plan ตามบัญชี |
| App env (`.env.local` / host env) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` |
| Server-only secrets | `SUPABASE_SERVICE_ROLE_KEY` (ห้าม commit / ห้ามส่ง client), feature flags เช่น `ANALYSIS_HISTORY_ENABLED` |

- **ห้าม** ใส่ service-role key หรือ secret ลงฝั่ง client bundle — ใช้เฉพาะ server action / migration / test harness ที่ gate ไว้
- Secrets หมุนเวียน (rotate) ที่ Supabase dashboard → regenerate แล้วอัปเดต host env; หลัง rotate ตรวจ smoke (ข้อ 5)

## 2. Migrations (ลำดับและสถานะ)

ไฟล์อยู่ที่ `supabase/migrations/` apply ตามลำดับหมายเลขด้วย Supabase MCP `apply_migration` หรือ CLI

สถานะ remote ปัจจุบัน (ตรวจด้วย `list_migrations`): **0001–0008 apply ครบ** รวม
`0005_storage_cats` (bucket `cat-photos` — การอัปโหลดรูปพร้อมใช้งานแล้ว) และ `0008_moderation` (SAFE-01)

- migration เป็น forward-only; เขียนแบบ idempotent (`if not exists` / `drop policy if exists`) ให้ re-apply ซ้ำได้
- การเปลี่ยน schema ที่ทำลายข้อมูล (drop column/table) ต้องมีแผน rollback + backup ก่อน (ข้อ 4/6)

## 3. Monitoring / alerting

- **Health endpoint:** `GET /api/v1/health` → `{"status":"ok",...}` (ไม่เปิดข้อมูลลับ)
  ตั้ง uptime check ภายนอก (เช่น ทุก 1 นาที) ยิง endpoint นี้ + alert เมื่อ non-2xx/timeout ติดต่อกัน
- **Supabase dashboard:** Database health, API/Auth logs, Storage usage — ตรวจเป็นระยะ
- **Advisors:** รัน security + performance advisors หลังทุกการเปลี่ยน schema
  (`get_advisors`) — ต้อง **ไม่มี finding ระดับ ERROR** ก่อนปล่อย release
- **Log query:** ใช้ `query_logs` ของ Supabase MCP เพื่อดู error spike / slow query
- **Moderation ops:** ผู้ดูแลตรวจคิวรายงานที่ `/admin/reports` (SAFE-01) — ดู openCount บนหัวข้อหน้า

### Baseline (อ้างอิง, ไม่ใช่เป้า capacity)

`npm run load` (autocannon, production build, เครื่อง dev local) `/api/v1/health` 50 conns × 10s:
≈ 890 rps, latency p50 41ms / p97.5 279ms, 0 error/timeout. **เป้า throughput/latency จริงตั้งตามสภาพแวดล้อม deploy**

## 4. Backups

- Supabase มี automated backup ตาม plan (daily; Point-in-Time Recovery เมื่อเปิดใช้ในแผนที่รองรับ)
  — ตรวจ/ตั้งค่าใน dashboard → Database → Backups
- **ความถี่ขั้นต่ำที่แนะนำ:** daily full + PITR (ถ้าแผนรองรับ) ก่อนเปิดใช้งานจริง
- **สิ่งที่ต้องสำรองนอกฐานข้อมูล:** Storage bucket `cat-photos` (รูปแมว) — รวมในแผน backup/DR
- ก่อน migration ที่มีความเสี่ยง: สร้าง on-demand backup / snapshot ก่อนเสมอ

## 5. Rollout (deploy) — ขั้นตอน

1. ผ่าน gate ก่อน: `npm run typecheck`, `npm run lint`, `npm test` (233), build สำเร็จ,
   public E2E ผ่าน (`npx playwright test`)
2. ถ้ามี migration ใหม่: on-demand backup → `apply_migration` ตามลำดับ → `get_advisors` (ต้องไม่มี ERROR)
3. Deploy แอป (build ใหม่) ไป host
4. **Smoke หลัง deploy:** `GET /api/v1/health` = 200; เข้า `/login` ได้; ล็อกอิน test user → `/home`;
   (ถ้าทำได้) รัน authenticated E2E opt-in กับ staging
5. เฝ้า log/error 15–30 นาทีแรก

## 6. Rollback

- **แอป:** redeploy build ก่อนหน้า (host keep ประวัติ) — แอปเป็น stateless ย้อนได้ทันที
- **Migration:** forward-only — การย้อนทำโดย migration ชดเชย (compensating) ที่เขียนใหม่
  หรือ restore จาก backup/PITR ไปจุดก่อน migration (ข้อ 7) **อย่า** แก้ schema ด้วยมือบน production โดยไม่บันทึกเป็น migration
- ลำดับย้อน: ถ้า migration ใหม่ไม่เข้ากับ build เก่า → redeploy build เก่าก่อน แล้วจึงตัดสินใจ restore schema

## 7. Restore drill (ซ้อม restore — เงื่อนไขผ่าน OPS-01)

เป้าหมาย: พิสูจน์ว่า restore สำเร็จและระบบกลับมาทำงานถูกต้อง โดย**ไม่แตะ production**

**วิธี A — Supabase branch/clone (staging):**
1. สร้าง branch/clone ของ project (Supabase branching) → ได้ DB แยกจาก production *(มีค่าใช้จ่าย — ขออนุมัติก่อน)*
2. (ถ้าซ้อม PITR) restore ไปเวลาที่กำหนดบน branch นั้น
3. รัน **acceptance** บน branch:
   - schema check (ข้อ 8) ต้องครบทุก object
   - `MEOWMATCH_LIVE_DB=<branch ref> npm run test:db` → 22 ผ่าน (RLS/role/history/moderation/audit)
     *(ชี้ env ไปที่ branch; harness สร้าง/ลบ fixture ของตัวเอง ปลอดภัย)*
   - smoke แอปชี้ไป branch (ข้อ 5.4)
4. บันทึกวันที่/ผล แล้วลบ branch

**วิธี B — logical restore ไป scratch project:** restore dump เข้าโปรเจกต์ทดสอบแยก แล้วทำ acceptance เดียวกัน

> ซ้อมอย่างน้อยก่อนเปิดใช้งานจริง 1 ครั้ง และทำซ้ำเมื่อ schema เปลี่ยนมาก; เก็บหลักฐาน (วันที่/commit/ผลรัน)

## 8. Schema acceptance (post-restore / post-migrate check)

รันบน DB เป้าหมายเพื่อยืนยันว่า object ของ MeowMatch ครบ (คาดว่าแต่ละค่า ≥ 1):

```sql
select
  (select count(*) from information_schema.tables where table_schema='public'
     and table_name in ('profiles','cats','cat_likes','breeding_analyses','desired_goals',
                        'reports','moderation_actions','analysis_runs')) as tables_present, -- คาด 8
  (select count(*) from information_schema.columns where table_schema='public'
     and table_name='profiles' and column_name='role') as profiles_role,                    -- คาด 1
  (select count(*) from information_schema.columns where table_schema='public'
     and table_name='cats' and column_name='moderation_status') as cats_moderation,         -- คาด 1
  (select count(*) from pg_proc where proname in
     ('is_admin','resolve_report','guard_profile_role','analysis_history','username_available')) as funcs; -- คาด ≥5
```

แล้วตรวจ RLS เปิดครบ: ทุกตารางใน `public` ต้อง `rowsecurity = true`
(`select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r'`)

## 9. Incident response (ย่อ)

1. ยืนยันอาการจาก health check/alert/log
2. ถ้ากระทบผู้ใช้วงกว้าง → rollback แอปก่อน (ข้อ 6) เพื่อหยุดเลือดก่อนหาสาเหตุ
3. เนื้อหาไม่เหมาะสม/ละเมิด → ผู้ดูแลใช้ `/admin/reports` ซ่อน listing (SAFE-01) + บันทึก audit
4. ข้อมูลเสียหาย → ประเมิน restore (ข้อ 7) บน staging ก่อนตัดสินใจกับ production
5. บันทึก timeline/สาเหตุ/การแก้ และปรับปรุง runbook
