# Phase 4 — ทดสอบ MVP-A (QC report)

> ระยะ 4 ตาม `MeowMatch/03-tasks.md`: private beta ระบบข้อมูลแมว
> เงื่อนไขผ่าน: **E2E / security / mobile ผ่าน** โดยยังไม่อ้างว่าผลวิเคราะห์พันธุกรรมพร้อม (นั่นคือระยะ 5)

อัปเดต: 2026-10-05

## สรุปผล

| ชั้น | เครื่องมือ | จำนวน | สถานะ |
|---|---|---|---|
| A — unit/integration | Vitest | 76 เทสต์ (+5 เดิม = 81) | ✅ ผ่าน |
| B — E2E public + security | Playwright (chromium + mobile) | route-protection, auth-flow, smoke | ✅ ผ่าน |
| C — mobile/responsive | Playwright | responsive (login hero) + nav (opt-in) | ✅ ผ่าน |
| D — security review | Supabase advisors | ไม่มี ERROR; 4 WARN | ✅ ผ่าน |

คำสั่งรัน: `npm run test` · `npm run typecheck` · `npm run lint` · `npx playwright test`

## ชั้น A — Vitest (ไม่ใช้ฐานข้อมูล)

ทดสอบตรรกะหลักของ MVP-A โดย mock Supabase client (`src/test/supabase-mock.ts`) ไม่ยิง remote:

- `src/lib/validation/common.test.ts` — username regex (a-z0-9_ 3–30, lowercase), password 8–72
- `src/lib/validation/auth.test.ts` — register/login/forgot/reset, รหัสผ่านยืนยันไม่ตรง, normalize email
- `src/server/cats/photos.test.ts` — ตรวจชนิด/ขนาดรูป (≤5MB), แปลง `photo_path` → URL
- `src/server/cats/queries.test.ts` — `ageLabel`, `applyDemoFilters`, demo fallback + pagination, ownership guard ใน `getCatForEdit`/`getMyCats`
- `src/server/cats/actions.test.ts` — ตรวจ input, ต้องล็อกอิน, **ownership guard** (แก้/ลบ/เผยแพร่แมวคนอื่นไม่ได้), schema-missing (42P01), toggle like
- `src/server/goals/actions.test.ts` — **GOAL-01: กันเลือกแมวต้นทางของคนอื่น**, update-or-insert แถวล่าสุด

## ชั้น B/C — Playwright E2E

- `tests/e2e/smoke.spec.ts` — `/` → `/login`, สลับหน้า login ↔ register
- `tests/e2e/route-protection.spec.ts` — **security**: เข้าหน้า member (`/home`, `/my-cats`, `/discover`, `/profile`, …) และหน้าแก้ไขแมวโดยไม่ล็อกอิน → เด้ง `/login`
- `tests/e2e/auth-flow.spec.ts` — client validation (zodResolver) บล็อก submit เมื่อข้อมูลไม่ผ่าน (ไม่ยิง server)
- `tests/e2e/responsive.spec.ts` — หน้า login: hero แสดงบนเดสก์ท็อป ซ่อนบนมือถือ

### Authenticated E2E — OPT-IN (ปิดเป็นค่าเริ่มต้น)

เส้นทางที่ต้องมี session จริงแยกเป็น opt-in เพื่อ**ไม่แตะ Supabase remote** ในการรันปกติ:

- `tests/e2e/authenticated.spec.ts` — เข้าถึง member ได้, nav responsive (sidebar ↔ bottom-nav), เพิ่มแมว → เห็นในรายการ
- `tests/e2e/auth.setup.ts` / `auth.teardown.ts` — สร้าง/ลบผู้ใช้ทดสอบผ่าน service-role

เปิดใช้:

```bash
TEST_E2E_AUTH=1 SUPABASE_SERVICE_ROLE_KEY=<service-role-key> npx playwright test
```

> ⚠️ เมื่อเปิด จะสร้าง/ลบผู้ใช้ทดสอบและข้อมูลแมวบน Supabase remote จริง (teardown ลบ user → FK cascade)
> ยังไม่ได้รันจริงในรอบนี้ (ต้องมี service-role key)

## ชั้น D — Security review (Supabase advisors)

Project `qgkajyuoaffydydqbouv` — ทุกตารางใน `public` เปิด **RLS** แล้ว
(`profiles`, `cats`, `cat_likes`, `breeding_analyses`, `desired_goals`) · ไม่มี finding ระดับ ERROR

WARN (จัดลำดับตามความสำคัญ):

1. **Leaked password protection ปิดอยู่** — ควรเปิด (ตรวจรหัสผ่านกับ HaveIBeenPwned)
   → https://supabase.com/docs/guides/auth/password-security
2. `username_available` เป็น `SECURITY DEFINER` เรียกได้โดย anon/authenticated — **ตั้งใจ** (เช็ค username ตอนสมัคร; username ไม่ใช่ authorization key) แต่ควรทบทวนความเสี่ยง enumeration
   → https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
3. Extension `citext` อยู่ใน schema `public` — ควรย้ายไป schema อื่น (hygiene)
   → https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

## ข้อสังเกตที่พบระหว่างทดสอบ

1. **middleware ไม่ได้กัน route** — `src/middleware.ts` รีเฟรช session เท่านั้น; ตัวกั้นจริงคือ `requireProfile()` ใน `(member)/layout.tsx` (ยืนยันแล้วด้วย route-protection E2E) ✅ ทำงานถูกต้อง แต่ควรรู้ไว้ว่าการกั้นอยู่ที่ layout ไม่ใช่ edge
2. **ฟอร์มแมว + `sex`** — `readCatFields` ส่ง `null` เมื่อ field หาย และ `z.enum().default()` ไม่ครอบ `null` ฟอร์มจริงส่ง `sex` เสมอ (เป็น `<select>`) จึงไม่กระทบ แต่ถ้า field หายจะได้ error รวม "ข้อมูลไม่ถูกต้อง" โดยไม่มี fieldError เจาะจง (low priority)
3. **`getDiscoverCats` ใช้ `select("*")`** แล้ว `toView` ตัดฟิลด์ส่วนตัวทิ้งฝั่ง server (ไม่รั่วออก client) — พิจารณา select เฉพาะคอลัมน์สาธารณะเพื่อลด data ที่ดึง
4. **migration 0005 (storage) ยังไม่ applied** — การอัปโหลดรูปจริงยังไม่ทำงานจนกว่าจะ apply (gate MEDIA-01)

## ยังไม่ครอบคลุมในรอบนี้ (เสนอต่อ)

- Load test (QA-01) — ยังไม่ทำ
- Accessibility audit เชิงลึก (axe) — ทำได้เป็น E2E เพิ่ม
- authenticated journey เชิงลึก (publish/unpublish, like → desired-cats) — ขยายใน `authenticated.spec.ts` เมื่อเปิด opt-in
