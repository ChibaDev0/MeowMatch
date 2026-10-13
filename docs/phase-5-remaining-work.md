# Phase 5 — งานคงเหลือ (ขอบเขตการทดลองความน่าจะเป็น)

> อัปเดต 2026-10-13 · เอกสารนี้ปรับให้ตรงกับ **[docs/scope.md](scope.md)**: MeowMatch เป็น
> โปรเจกต์ทดลองความน่าจะเป็น ไม่ใช้ DNA/ผู้เชี่ยวชาญ งานที่เคยผูกกับการตรวจรับ DNA/ผู้เชี่ยวชาญ
> (เดิม P5-03 รับรองกฎ, P5-05 consent/สิทธิ์ DNA, และ gate RES-01) **ถูกตัดออกจากขอบเขตแล้ว**

## บริบท

engine คำนวณความน่าจะเป็นทำงานเป็นค่าเริ่มต้นในหน้าใช้งาน (โหมดทดลอง) มีโมเดลรายลักษณะ
3 หมวด (coat_type / coat_color / coat_pattern) ชุดทดสอบปัจจุบันผ่าน 329 ข้อ typecheck/lint/build ผ่าน

รายการด้านล่างคือ **งานวิศวกรรมที่ยังทำให้ดีขึ้นได้** ภายในขอบเขตการทดลอง — ไม่มีรายการใด
ต้องรอผู้เชี่ยวชาญหรือข้อมูล DNA

## งานที่ยังเปิด

| ID | งาน | ระดับ | สถานะ |
|---|---|---|---|
| P5-01 | Candidate pool: ดึงครบ, แยก error จาก empty, ป้าย real/demo | P1 | ทำแล้วระดับ mock (`getAnalysisCandidates` + provenance + searchComplete) — รอยืนยันบน DB จริง |
| P5-02 | กฎในตัวให้ตรงกันทุกโหมด (เพศ/เพศไม่ทราบ/หูพับ) | P1 | รวม `classifySexCompatibility` ใช้ร่วม pair/target แล้ว; กฎสวัสดิภาพหูพับเป็นกฎง่ายในตัว |
| P5-04 | History / idempotency / replay / provenance | P1 | backend + DB acceptance 10 tests ผ่าน; ปิด feature ไว้ รอ UI/refresh/E2E ([phase-5-history](phase-5-history.md)) |
| P5-06 | Runtime validation ของ payload และขอบเขตโมเดล | P2 | ✅ zod ที่ server action + genotype/phenotype guard + topK + empty-set พร้อมเทส |
| P5-07 | Budget / ขนาดงาน / ความหมายของ coverage | P2 | มี benchmark engine แล้ว ([phase-5-benchmark](phase-5-benchmark.md)); runtime budget/cancellation ยังเปิด |
| P5-08 | E2E ครบเส้นทาง pair/target + history | P1 | ยังไม่มี analysis E2E ที่ยืนยันค่าผลครบเส้นทาง |

## รายละเอียด

### P5-01 — ดึงชุดผู้สมัครครบและไม่แปลง error เป็นผลว่าง
`getAnalysisCandidates(excludeCatId?)` คืน `CandidatePool { cats, source, complete, error, fetched, expected }`
แยก error จาก empty และติดป้าย demo ชัดเจน · **เหลือ:** ยืนยันบน DB จริง (ผูกกับ P5-08)

### P5-02 — กฎในตัวให้ตรงกันทุกโหมด
decision เพศรวมที่ `constraints/biology.ts` (`classifySexCompatibility`): confirmed/unknown/incompatible
ใช้ร่วมทั้ง pair และ target; sex=unknown ไม่ถูกตัดแต่ติดธง + warning ·
กฎสวัสดิภาพ (กันแนะนำหูพับ × หูพับ) เป็น **กฎความปลอดภัยง่าย ๆ ในตัวโปรแกรม** ไม่ใช่งานตรวจรับ

### P5-04 — ประวัติผลที่บันทึกและ replay ได้
migration `0007_analysis_history` + history/idempotency/replay service (canonical snapshot, input hash,
immutable artifact, versions/coverage) · apply บน DB จริงและผ่าน live DB 10 tests แล้ว
([phase-5-live-db](phase-5-live-db.md)) · ค่าเริ่มต้น `ANALYSIS_HISTORY_ENABLED=false` · **เหลือ:** UI/refresh/E2E

### P5-06 — ตรวจข้อมูลตอน runtime ก่อนเข้าโมเดล ✅
zod ตรวจ payload ที่ขอบ server action; `isValidGenotype` ตรวจคู่ allele; phenotype ใช้ canonical label +
กันค่ากำกวม (→ insufficient_data); empty scenario set → insufficient_data; topK ต้องเป็นจำนวนเต็ม ≥ 0

### P5-07 — Budget และความหมายของ coverage
มีชุด benchmark รันซ้ำได้ `npm run benchmark:genetics` ([phase-5-benchmark](phase-5-benchmark.md)) ·
**เหลือ:** runtime budget/cancellation และเป้าหมายเวลาที่ตกลงกัน

### P5-08 — หลักฐานรับตรวจผ่าน UI/server/DB
เพิ่ม E2E ของ pair และ target: computed/scenario/unsupported/conflict/blocked, error/empty/partial, history ·
ตรวจ UI ภาษาไทยว่าช่วงไม่ถูกย่อเป็นเปอร์เซ็นต์เดียว, null ไม่กลายเป็น 0%, warning/เวอร์ชัน/scope เห็นบนมือถือ

## ลำดับที่เสนอ

1. P5-01 ยืนยันบน DB จริง + P5-08 E2E ครอบ pair/target
2. P5-04 UI/refresh ของประวัติ
3. P5-07 runtime budget/cancellation
