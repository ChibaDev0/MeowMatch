# Phase 6 — เตรียมเปิดใช้ (release prep)

> ระยะ 6: hardening, restore drill, moderation, คู่มือปฏิบัติการ
> เงื่อนไขผ่าน: **release gates ใน QC ผ่านครบ**
>
> หมายเหตุขอบเขต (2026-10-13): งานพันธุกรรม "ระยะ 7" และ gate ผู้เชี่ยวชาญ (RES-01) ถูกตัดออกแล้ว —
> โปรเจกต์เป็นการทดลองความน่าจะเป็น (ดู [docs/scope.md](scope.md)) · งานในเอกสารนี้ (moderation/QA/ops) ยังใช้ได้ตามเดิม

อัปเดต: 2026-10-12

## สถานะรายงาน (backlog Phase 6)

| ID | งาน | สถานะ | หลักฐาน |
|---|---|---|---|
| SAFE-01 | report/moderation + account abuse limits | ✅ โค้ด + unit + live-DB ผ่าน | ด้านล่าง |
| QA-01 | E2E, accessibility, load, security | ✅ a11y + E2E + load baseline ผ่าน | ด้านล่าง |
| OPS-01 | monitoring, backups, restore, rollout | ✅ runbook + restore-drill procedure + schema acceptance | [ops-runbook.md](ops-runbook.md) |

---

## SAFE-01 — รายงาน / ดูแลชุมชน / abuse limits

ปิดคำขอใน PRD "รายงานข้อมูลไม่เหมาะสม" และเงื่อนไข SAFE-01
("ซ่อน listing ที่ถูกรายงานได้ตาม role และมี audit").

### สิ่งที่ทำ

- **migration `0008_moderation.sql`** (apply บน remote `qgkajyuoaffydydqbouv` แล้ว 2026-10-12):
  - `profiles.role` (member/admin) + **trigger `guard_profile_role`** กันสมาชิกยกระดับ role ตัวเอง
    (SECURITY INVOKER → `current_user <> 'service_role'` คงค่าเดิมเงียบ ๆ) — ตั้ง admin ได้จากฝั่งระบบเท่านั้น
  - `is_admin()` (SECURITY DEFINER) อ่าน role ข้าม RLS ใช้ร่วมใน RLS/RPC
  - `cats.moderation_status` (active/hidden) + ปรับ RLS select ของ cats ให้ซ่อนแมว `hidden`
    จากสมาชิกคนอื่น/anon แต่เจ้าของและ admin ยังเห็น
  - ตาราง `reports` (เหตุผล/รายละเอียด/สถานะ) + RLS: insert ตัวเอง & ห้ามรายงานแมวตัวเอง,
    select เฉพาะของตัวเองหรือ admin; **ไม่มี update/delete policy** (เปลี่ยนสถานะผ่าน RPC เท่านั้น)
  - **abuse limit:** unique partial index `reports_open_unique` กันรายงานซ้ำ (เปิดค้าง) ต่อ (ผู้รายงาน, แมว)
  - ตาราง `moderation_actions` (**audit** การกระทำผู้ดูแล) select เฉพาะ admin
  - RPC `resolve_report(report_id, decision, note)` (SECURITY DEFINER, ตรวจ `is_admin()` ภายใน) —
    transaction เดียว: อัปเดตรายงาน + ระงับ/คืนแมว + บันทึก audit (hide/unhide/dismiss/reviewing/reopen)
- **server:** `src/server/moderation/actions.ts` (`reportCatAction`, `resolveReportAction`) +
  `queries.ts` (`getReportQueue`); `requireAdmin`/`isAdmin` ใน `server/auth/session.ts`
- **UI:** ปุ่มรายงานบนการ์ดหน้าหาคู่ (`features/moderation/report-button.tsx`),
  หน้าผู้ดูแล `/admin/reports` (`AdminReports`) เข้าได้เฉพาะ admin (ลิงก์ใน sidebar แสดงเมื่อเป็น admin),
  ป้าย "ถูกผู้ดูแลระงับ" ในหน้าแมวของฉัน
- **soft cap:** รายงานที่เปิดค้างต่อผู้ใช้ไม่เกิน 20 รายการ (กันสแปมรายงาน)

### หลักฐาน

- `npm test` **233 ผ่าน** (เพิ่ม 15: `src/server/moderation/actions.test.ts`), `typecheck`/`lint`/`build` ผ่าน
- `npm run test:db` (live Supabase, opt-in `MEOWMATCH_LIVE_DB=qgkajyuoaffydydqbouv`) **22 ผ่าน**
  (รวม moderation live 12 ข้อ): กันยกระดับ role, is_admin, ห้ามรายงานแมวตัวเอง/สวมสิทธิ์,
  กันรายงานซ้ำ (23505), สมาชิกเห็นเฉพาะรายงานตัวเอง, สมาชิก resolve ไม่ได้ (42501),
  admin hide → actioned+hidden+audit, แมว hidden มองไม่เห็นข้ามผู้ใช้/anon แต่เจ้าของ+admin เห็น,
  audit เห็นเฉพาะ admin, unhide คืนการแสดง
- **Security advisors** (หลัง apply): ไม่มี finding ระดับ ERROR
  - WARN ใหม่จาก SAFE-01: `is_admin()` และ `resolve_report()` เป็น SECURITY DEFINER ที่ authenticated เรียกได้ —
    **ตั้งใจ** (is_admin อ่าน role ข้าม RLS; resolve_report ตรวจ `is_admin()` ภายในก่อนทุกการแก้) แนวเดียวกับ `username_available`
  - WARN/INFO เดิมคงอยู่: citext in public, leaked-password protection ปิด, `analysis_runs` RLS-no-policy (ตั้งใจ, เขียนผ่าน RPC)

### ยังเปิด / ขอบเขต

- ไม่มี auto-moderation/ML — รายงานเข้าคิวให้ผู้ดูแลตัดสินด้วยมือ (ตามขอบเขต MVP)
- การแต่งตั้ง admin ทำด้วย SQL/service-role (ไม่มี UI) — ตามข้อกำหนด PRD "ตั้งจากฝั่งระบบเท่านั้น"

---

## QA-01 — E2E, accessibility, load, security

ปิดช่องว่างที่ Phase 4 QC เสนอต่อ (load test, axe a11y, authenticated journey) + E2E ของ SAFE-01

### Accessibility (axe-core)

- `tests/e2e/a11y.spec.ts` — สแกน `/login`, `/register`, `/forgot-password` ด้วย `@axe-core/playwright`
  (WCAG 2.0/2.1 A & AA) fail เมื่อพบ violation ระดับ **serious/critical**
- ผล: **ผ่านทั้ง 3 หน้า × 2 viewport** (desktop + mobile) ไม่มี serious/critical

### E2E (Playwright)

- ชุด public (ไม่ต้องบัญชี): `npx playwright test --project=chromium --project=mobile-chrome` → **38 ผ่าน**
  (smoke, route-protection, responsive, auth-flow, a11y)
- ชุด authenticated (opt-in `TEST_E2E_AUTH=1`): เพิ่มใน `authenticated.spec.ts` — **9 ผ่าน** รวม
  - รายงานแมวในหน้าหาคู่ (เปิด modal → เลือกเหตุผล → ส่ง → "ส่งรายงานแล้ว")
  - สมาชิกทั่วไปเข้า `/admin/reports` ถูกเด้ง `/home` และไม่เห็นลิงก์ศูนย์ดูแลชุมชนใน sidebar
  - (เดิม) เข้าถึง /home, nav responsive, เพิ่มแมว
  - ⚠️ เขียน/ลบผู้ใช้ทดสอบ + report บน Supabase remote จริง (teardown ลบทิ้ง → FK cascade)

### Load test (autocannon)

- harness `scripts/load/run.mjs` (`npm run load -- --url=... --duration= --connections=`) —
  default endpoint `/api/v1/health` (read-only); fail เมื่อมี error/timeout/non-2xx
- **baseline** (production build `next start`, เครื่อง dev local, 50 conns × 10s, `/api/v1/health`):
  requests 8,897 · **rps_mean ≈ 890** · latency p50 41ms / p97.5 279ms / max 543ms · **0 error/timeout/non-2xx**
  - หมายเหตุ: เป็นตัวเลขบนเครื่อง dev + build เท่านั้น ไม่ใช่เป้าหมาย capacity ของ production —
    เป้าหมาย throughput/latency จริงต้องตกลงตามสภาพแวดล้อม deploy (OPS-01) และวัดบน endpoint ที่สื่อความหมาย

### Security

- Supabase security advisors หลัง 0008: **ไม่มี ERROR** (ดูหมวด SAFE-01) — gate ความปลอดภัยคงผ่าน
- live-DB RLS/role/abuse/audit ครอบคลุมใน `npm run test:db` (22 ผ่าน)

---

## OPS-01 — monitoring, backups, restore, rollout

คู่มือปฏิบัติการเต็มอยู่ที่ **[ops-runbook.md](ops-runbook.md)** ครอบคลุม: สภาพแวดล้อม/secret,
ลำดับ migration, monitoring (health endpoint + advisors + log + moderation queue), backups
(รวม storage `cat-photos`), rollout + smoke, rollback, **restore drill** (Supabase branch/scratch +
acceptance), schema acceptance query และ incident response

### หลักฐาน

- migrations remote **0001–0008 ครบ** (ตรวจด้วย `list_migrations`) — รวม 0005 storage (อัปโหลดรูปพร้อม) + 0008 moderation
- project `ACTIVE_HEALTHY`, Postgres 17, region ap-southeast-2
- **schema acceptance query** (ข้อ 8 ของ runbook) รันจริงบน remote: tables_present=8, profiles.role=1,
  cats.moderation_status=1, funcs=5, **tables_without_rls=0** (ทุกตาราง public เปิด RLS)
- health endpoint ตอบ 200; load baseline (QA-01) ไม่มี error
- restore drill เป็น **procedure ที่รันได้** (acceptance = schema check + `npm run test:db` 22 + smoke);
  การรัน restore จริงบน Supabase branch มีค่าใช้จ่าย → รอผู้ใช้อนุมัติก่อนทำบน staging

### ยังเปิด / ขอบเขต

- ยังไม่ได้ **รัน** restore drill จริงบน staging branch (ต้องอนุมัติค่าใช้จ่าย Supabase branch) — procedure พร้อมแล้ว
- Backup schedule/PITR ตั้งค่าใน Supabase dashboard ตาม plan (runbook ระบุค่าที่แนะนำ)
- External uptime monitor ยังไม่ได้ผูกบริการจริง (runbook ระบุวิธี)
