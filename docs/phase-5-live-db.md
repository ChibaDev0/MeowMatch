# P5-04 — ผลตรวจ Supabase จริง

วันที่ 12 ตุลาคม 2026 (Asia/Bangkok)

## สถานะ

ใช้โปรเจกต์ **MeowMatch** เดิม `qgkajyuoaffydydqbouv` สถานะ ACTIVE_HEALTHY, PostgreSQL 17.11 ไม่สร้างโปรเจกต์ใหม่ Apply migration `0007_analysis_history` สำเร็จผ่าน Supabase MCP และตรวจ migration history ได้เวอร์ชัน **20261012055441** (ไฟล์ใน repo ใช้ชื่อเดิมตามลำดับ 0007)

ก่อนทำตรวจพบ migrations 0001–0006 ครบ, `analysis_runs` ยังไม่มี และ `breeding_analyses` มี 0 แถว เพิ่ม schema ตามไฟล์ที่เตรียมไว้ ไม่ reset ฐานข้อมูล ไม่เปลี่ยนกฎพันธุกรรมหรือการอนุมัติผู้เชี่ยวชาญ

## หลักฐานทดสอบ

ชุด `tests/supabase/history.live.test.ts` เรียก Supabase Auth/Data API/RPC จริง ใช้บัญชีสังเคราะห์ใหม่สองบัญชีและแมวที่สร้างสำหรับการทดสอบเท่านั้น ไม่มีการส่งอีเมล (admin createUser + email_confirm) ท้ายชุด sign out และลบบัญชีทดสอบตาม IDs ที่สร้างในรอบนั้น ข้อมูลแมว/likes/history ล้างผ่าน cascade

ผลรันสุดท้าย: **10/10 tests ผ่าน, 1 ไฟล์, exit code 0**, ใช้เวลา 19.18 วินาที เริ่ม 12:58:30 น. ชุด baseline 201 tests ผ่านร่วมกับ live 9 tests ในรอบแรก (210 ผ่าน); รอบสุดท้ายแยก live config ให้รันเฉพาะ DB 10 tests แล้ว ไม่ใช้ผล mocked tests แทน DB acceptance

| กรณี | ผล |
|---|---|
| Anonymous และผู้ใช้ A/B อ่าน/เขียน analysis_runs ตรง, เรียก RPC ตรง, ปลอม legacy result | ถูกปฏิเสธด้วย 42501 |
| Pair save/read + คนละ owner | ผลถูกบันทึก; owner อื่นอ่าน run ไม่ได้ |
| แก้ phenotype ปัจจุบันแล้วเปิด/replay | ใช้ snapshot เดิม; ผล replay ตรงต้นฉบับ |
| Target + pool ไม่ครบ | เก็บ input/result/pool metadata ครบ ไม่อ้าง searchComplete |
| 20 คำขอ HTTP พร้อมกัน key เดียว | มี 1 แถว ทุกคำขอได้ run และผลของผู้ชนะเดียวกัน |
| Key เดิม payload ต่าง / คนละ owner | Conflict / namespace แยก |
| Source ไม่มีสิทธิ์, candidate ไม่มีอยู่, genotype | ปฏิเสธ access_denied / dna_not_supported |
| Unlike | ล้าง envelope และมี invalidated_at; relike ไม่ชุบ run เก่า |
| Hide / republish | ล้างประวัติผู้ใช้อื่น; publish ใหม่ไม่คืน run เก่า |
| Save แข่งขันกับ unlike | หลัง withdrawal commit ไม่มี envelope ที่อ่านได้ |
| ย้ายเจ้าของแมว | ล้าง snapshot แม้ย้ายมาเป็นของเจ้าของ run |
| ลบแมว | ล้าง envelope และอ่านเพื่อ replay ไม่ได้ |

ตรวจ PostgreSQL privileges โดยตรง: RLS=true, anon SELECT=false, authenticated INSERT=false, anon/authenticated RPC EXECUTE=false, service_role RPC EXECUTE=true

หลังรันสุดท้ายตรวจ SQL ยืนยัน fixture users=0, fixture cats=0, history runs=0; `npm run typecheck` และ `npm run lint` ผ่าน ไม่ได้รัน build/UI E2E ใหม่ในรอบ DB นี้

ทดสอบแข่งคำขอผ่าน API จริง แต่ไม่ได้บังคับทุก lock interleaving หรือจำลองทุก isolation level จึงไม่อ้าง exhaustive concurrency proof และตัวเลขเวลานี้ไม่ใช่ capacity benchmark

## วิธีรันซ้ำ

ต้องมี `.env.local` ของโปรเจกต์นี้พร้อม URL/anon/service-role keys; ไม่พิมพ์ keys ลง log และไม่ commit secrets

```powershell
$env:MEOWMATCH_LIVE_DB='qgkajyuoaffydydqbouv'
npm run test:db
```

Config แยกจาก `npm test` และต้อง opt-in project ref ตรงกันก่อนเขียนข้อมูลทดสอบ หลังรันตรวจว่า fixture users/cats/history ของรอบทดสอบไม่เหลือ หาก cleanup ล้มชุดทดสอบต้อง fail และรายงาน IDs เพื่อ cleanup เฉพาะรายการนั้น

## Security Advisor

ไม่พบ warning ของ history functions ที่เปิดให้ anon/authenticated เรียกได้ มี INFO `RLS enabled, no policy` ของ analysis_runs โดยตั้งใจ: ไม่เปิด table access ให้ client และใช้ server-only RPC ที่ตรวจสิทธิ์เอง ไม่เพิ่ม policy เพื่อทำให้คำเตือนเงียบ

คำเตือนเดิมที่ยังต้องพิจารณาแยกจาก P5-04:

- `citext` อยู่ใน public schema — [แนวทางย้าย extension](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- `username_available` เป็น SECURITY DEFINER ที่ anon/authenticated เรียกได้ ตาม flow ตรวจชื่อผู้ใช้เดิม — [แนวทางตรวจสิทธิ์ฟังก์ชัน](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) ต้องประเมิน flow ก่อนเปลี่ยน ไม่สรุปว่าปลอดภัยทุกด้านจากเจตนาเดิมเพียงอย่างเดียว
- Leaked password protection ยังปิด — [แนวทางตั้งค่า Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## ยังไม่ปิด Phase 5 ทั้งหมด

คง `ANALYSIS_HISTORY_ENABLED` ปิดไว้ตามเดิมในแอป ยังต้องเชื่อม UI จัดเก็บ idempotency key/runId และเปิดประวัติหลัง refresh, E2E บนเว็บจริง (P5-08) และ benchmark/budget (P5-07) · งาน consent/DNA policy และผู้เชี่ยวชาญถูกตัดออกจากขอบเขตแล้ว (ดู [scope.md](scope.md))
