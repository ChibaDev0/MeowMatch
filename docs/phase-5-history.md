# P5-04 — History / idempotency / replay

> อัปเดต 12 ตุลาคม 2026: apply 0007 บน Supabase MeowMatch แล้ว และผ่าน DB จริง 10 tests ดู [ผลตรวจ DB](phase-5-live-db.md) ข้อความด้านล่างเป็นขอบเขต backend ที่จัดทำเมื่อ 5 ตุลาคม; ข้อจำกัดว่า “ยังไม่ได้ apply/ทดสอบ DB” ของรอบนั้นถูกแทนที่ด้วยรายงานล่าสุดแล้ว ส่วน UI/E2E และ feature flag ยังไม่เปิด

วันที่ 5 ตุลาคม 2026 · checkout `D:/_DevProject/MeowMatch`

## ขอบเขตที่เพิ่ม

เพิ่ม migration `0007_analysis_history.sql`, service `src/server/analysis/history.ts`, read/replay actions และเชื่อม pair/target actions แล้ว เปิดด้วย `ANALYSIS_HISTORY_ENABLED=true` หลังตรวจ DB เท่านั้น ค่าเริ่มต้นปิด ไม่เปลี่ยนผลคำนวณของ engine และไม่ยกระดับ demo rules เป็นกฎจริง

- `analysis_runs`: unique `(owner_id, idempotency_key)` + transaction advisory lock; เก็บ request hash แยกจาก input hash
- Canonical snapshot เก็บข้อมูล phenotype/name/sex ที่ engine ใช้จริง พร้อม input และ result versions, coverage, assumptions/warnings ในผล, candidate pool metadata, scope, demo flag, inference method และเวลาใน DB ไม่มี genotype/DNA ingestion
- ส่งคำขอเดิมด้วย UUID key เดิมจะอ่านผลเดิมก่อนอ่านข้อมูลแมวใหม่; เปลี่ยน payload แต่ใช้ key เดิมเป็น conflict ผู้ใช้ต่างคนใช้ key เดียวกันได้
- กรณีแข่งขันกันบันทึก คืนผลจากแถวที่ชนะการบันทึกเสมอ ไม่คืน draft ของแต่ละ request
- ข้อมูลสาธิตที่ใช้รหัสไม่ใช่ UUID หรือ pool `source=demo` ไม่บันทึกเป็นประวัติข้อมูลจริง คืน `history.status=demo_data`; ข้อมูลแมวจริงที่เปิด demo rules บันทึกได้โดยติด `provenance.demo=true`
- เมื่อปิด feature คืน `history.status=disabled`; เมื่อเปิดแล้ว DB ล้มเหลวคืน error ไม่อ้างว่าบันทึกสำเร็จ
- อ่านด้วย `getAnalysisHistoryAction(runId)` และคำนวณซ้ำด้วย `replayAnalysisHistoryAction(runId)` ทุกครั้งตรวจ session และสิทธิ์ปัจจุบัน ไม่ส่ง snapshot กลับ browser

## สัญญาของ client

ทั้งสอง analysis actions รับ `opts.idempotencyKey` เป็น UUID เพิ่มจาก `opts.demo` ให้สร้าง key ใหม่เมื่อผู้ใช้เริ่มการวิเคราะห์ใหม่ และใช้ key เดิมสำหรับ retry ของคำขอเดียวกัน ห้ามนำ key เดิมไปใช้กับตัวเลือกใหม่ ถ้าไม่ส่ง key เซิร์ฟเวอร์สร้างใหม่ต่อ invocation ซึ่งไม่ป้องกัน browser retry คนละ invocation

ผลที่บันทึกแล้วมี `history: { status: "saved", runId }` ให้เก็บ runId ใน URL/state ที่อยู่ข้าม refresh แล้วเรียก read action เพื่อเปิดผลเดิม **รอบนี้ทำ backend เท่านั้น ยังไม่ได้เพิ่มหน้าประวัติ การเก็บ key/runId ใน UI หรือ E2E หลัง refresh** จึงยังไม่ปิดเกณฑ์ P5-04 ทั้งหมด

## สิทธิ์และการถอนข้อมูล

ไม่มี direct authenticated/anonymous access ในตารางใหม่หรือ RPC; execute อนุญาตเฉพาะ service role โดย service อ่าน owner จาก `auth.getUser()` ไม่รับ owner/result/snapshot จาก client

RPC ตรวจ source เป็นแมวของผู้ใช้ และแมวอื่นทุกตัวเป็นของผู้ใช้หรือ public + liked ณ เวลาบันทึก/อ่าน/replay ใช้ row locks ตอน save เพื่อให้การซ่อน/ลบ/ถอนใจแข่งขันกับ save ผ่าน transaction ได้อย่างตรวจสอบได้ **การกดใจไม่ใช่ consent ของ DNA** และ RPC ปฏิเสธ genotype ใน snapshot

Trigger ล้าง envelope ทั้งก้อน (รวมชื่อ/phenotype/result) เมื่อถอนใจ ลบแมว ย้ายเจ้าของ หรือซ่อนแมวของผู้อื่น; เก็บ tombstone ของ key และ metadata เพื่อไม่ให้ retry ชุบข้อมูลที่ถอนแล้วกลับมา การเผยแพร่/กดใจใหม่ไม่คืนข้อมูลเก่า การแก้ phenotype ปกติไม่เปลี่ยน snapshot จึงคำนวณซ้ำจากต้นฉบับได้ ตัดผลทั้ง run เมื่อผู้สมัครเพียงตัวเดียวหมดสิทธิ์ แทนการคืนอันดับบางส่วนที่อาจชวนเข้าใจผิด

Migration ปิด insert/update ทาง client ของ `breeding_analyses` เดิมด้วย แต่ยังไม่ migrate/redact ประวัติเก่าตารางนั้น และยังไม่ประกาศผ่าน P5-05 ต้องตรวจข้อมูลเก่ากับสิทธิ์จริงก่อนเปิดใช้

## Artifact และ replay policy

`src/server/analysis/artifacts/engine-0.1.1.json` เก็บ source ของ engine/rules/constraints/transmission และ common contracts เป็น artifact สำหรับตรวจย้อนหลัง ใช้ canonical SHA-256 ผูกกับ run; unit test ตรวจว่าไฟล์จริงตรงกับ artifact และไม่มี source ที่ถูกเพิ่มแล้วหลุดรายการ ไม่เก็บเพียง hash แทน source หรือ input

ห้ามแก้ artifact นี้เพื่อให้ tests ผ่านเมื่อเปลี่ยน engine: ให้ออก artifact ชื่อ/เวอร์ชันใหม่ เก็บ artifact เก่าไว้ และเพิ่ม explicit version resolver พร้อม fixtures หากต้องการรองรับ replay รุ่นเก่า runtime ปัจจุบันรองรับ artifact ปัจจุบันเท่านั้น ถ้า hash ไม่ตรงจะปฏิเสธ replay ไม่แทนด้วย engine ล่าสุดแบบเงียบ ๆ การเปิดอ่านผลเดิมยังทำได้เมื่อมีสิทธิ์ ผล replay ต้องตรงกับผลที่บันทึกทั้งหมดจึงคืนให้ผู้ใช้

Source artifact ไม่ใช่ executable sandbox/ตัวติดตั้ง dependency ของรุ่นเก่า ไม่ใช้ eval หรือรัน source ที่มาจาก DB

## ผลตรวจระดับโค้ด

ดูผลตรวจรอบนี้ใน `phase-5-remaining-work.md` เทสต์ service ใช้ mock DB/in-memory store ครอบคลุม canonical hash, immutable input, pair/target replay, version mismatch, result mismatch, retry/conflict/user isolation, concurrent winner contract, revoked access, feature gate, session และ action→RPC metadata

การจำลอง concurrent winner เป็นหลักฐานสัญญา service **ไม่ใช่หลักฐานว่า PostgreSQL lock/unique constraint/RLS/trigger ผ่านจริง** ไม่ได้ apply migration กับ DB ใดในรอบนี้

## DB / UI acceptance ที่ยังต้องรัน

1. Apply migrations 0001–0007 บนฐานข้อมูลทดสอบที่แยกจากผู้ใช้จริง; ทดสอบ A/B/anonymous ว่าอ่าน/เขียนตารางใหม่หรือเรียก RPC ตรงไม่ได้ และปลอม result ผ่าน legacy table ไม่ได้
2. Server role + owner ที่ได้จาก session: pair และ target บันทึกได้; source ของผู้อื่น, unliked, hidden, deleted และ genotype snapshot ถูกปฏิเสธ
3. คำขอ key เดียว payload เดิม 20 connections พร้อมกันมีแถวเดียวและทุก response เป็น run/result เดียว; key เดิม payload ต่าง conflict; คนละ owner ไม่ชนกัน
4. เปลี่ยน phenotype แล้วเปิดผลเดิม/replay ยังได้ต้นฉบับ; เปลี่ยน artifact แล้ว replay ปฏิเสธอย่างชัดเจน
5. ต่าง connection ถอนใจ/ซ่อน/ลบระหว่าง lookup–save และระหว่าง save–read ตรวจว่าหลัง withdrawal commit ไม่มี envelope ที่อ่านได้ ตรวจการ rollback/deadlock/retry ตาม isolation จริง
6. ตรวจ tombstone/redaction เมื่อ hide/delete/unlike/reparent และไม่คืนข้อมูลหลัง relike; ตรวจ retention ของ cat IDs/request hashes รวม legacy history ตาม P5-05
7. เพิ่ม UI เก็บ idempotency key/runId และเปิดผลหลัง refresh พร้อมป้าย saved/disabled/demo/error; รัน E2E ทั้งสองโหมดบนแอป+DB จริง (P5-08)
8. วัดขนาด snapshot/เวลา/limits บน candidate pool จริงก่อนเปิดใช้ (P5-07) ไม่ตั้งเพดานโดยเดา

รายการผู้เชี่ยวชาญแยกอยู่ใน [phase-5-expert-review.md](phase-5-expert-review.md) และส่งต่อไปแชท “ตรวจสอบและทดสอบ Algorithm” แล้ว ไม่มีการรับรองแทนผู้เชี่ยวชาญในรอบนี้
