# RES-01 — แพ็กเกจให้ผู้เชี่ยวชาญตรวจรับ trait coverage / welfare

จัดเตรียมโดย: งานวิศวกรรม (AI) · อัปเดต 2026-10-13 · Asia/Bangkok

> เอกสารนี้คือ **จุดเริ่มต้นเดียว** สำหรับงาน RES-01 ในแผน `03-tasks.md`
> ("ให้ผู้เชี่ยวชาญตรวจ trait coverage/welfare · เสร็จเมื่อ **มีรายการกฎอนุญาต/ไม่รองรับพร้อมหลักฐาน**")
>
> **สิ่งที่วิศวกรรมเตรียมให้แล้ว = โครง ชุดตรวจ และช่องกรอก** — ไม่มีการเติมเปอร์เซ็นต์พันธุกรรม
> ไม่มีการแต่งชื่อ/ลายเซ็นผู้เชี่ยวชาญ และ registry ของกฎจริงยัง **ว่างเปล่า** จนกว่าจะมีคำตัดสินจริง

---

## 1. RES-01 ปลดบล็อกอะไร

RES-01 เป็นคอขวดของสองสิ่งที่ตอนนี้ปิดอยู่:

| ถูกบล็อก | สถานะปัจจุบัน | ปลดเมื่อ RES-01 ให้ |
|---|---|---|
| **ระยะ 5 — ผลพันธุกรรมจริง** (ตอนนี้เป็น DEMO เท่านั้น) | ทุก ruleset `verified: false` → default ตอบ `unsupported`/`—` | per-category verdict = `allowed` + scope + หลักฐาน |
| **ระยะ 7 — Bayesian/DP/MC ผลจริง** | research runner มีแล้วแต่ registry โมเดลว่าง → `unsupported` | model review packet ที่ลงนาม (prior/CPT + scope) |

จนกว่าจะได้คำตัดสินข้างบน ระบบ **จะไม่** แสดงเปอร์เซ็นต์พันธุกรรมจริง — นี่คือพฤติกรรมที่ถูกต้องตามนโยบาย

---

## 2. จุดที่คำตัดสินของคุณไปเชื่อมกับโค้ด (gate)

คำตัดสินไม่ได้อยู่แค่ในกระดาษ — มัน map เข้า gate จริง 2 จุด:

1. **Ruleset gate (ระยะ 5)** — `src/domain/genetics/rules/` มี flag `verified` ต่อ ruleset
   `resolveRuleset(cat, allowUnverified)` คืน `null` ถ้า ruleset ยัง `verified:false` และไม่ได้เปิดโหมด demo
   → คุณอนุมัติหมวดใด วิศวกรรมจึงจะสร้าง ruleset artifact + ตั้ง `verified:true` เฉพาะ scope ที่คุณลงนาม
2. **Model registry gate (ระยะ 7)** — `src/domain/genetics/models/registry.ts` (`ALL_MODELS` ว่าง)
   runner ต้องมี `provenance.reviewer / reviewedAt / source` ครบถึงจะไม่ตอบ `unsupported`
   → ฟิลด์เหล่านี้มาจาก [`../phase-7-model-review.json`](../phase-7-model-review.json) ที่คุณลงนาม

**วิศวกรรมไม่ตั้ง `verified:true` เอง** และการ "สั่งให้ค้นข้อมูล/ทำซอฟต์แวร์" ไม่นับเป็นลายเซ็นรับรองทางพันธุศาสตร์

---

## 3. ลำดับการทำงานของผู้ตรวจ (เดินตามนี้)

| ลำดับ | ไฟล์ | สิ่งที่ต้องทำ |
|---|---|---|
| 1 | README นี้ | เข้าใจ scope, สิ่งที่ปลดบล็อก และ gate |
| 2 | [`trait-coverage-worksheet.md`](trait-coverage-worksheet.md) | **หัวใจของ RES-01** — ชี้ขาดราย trait ว่า `allowed` / `not_supported` พร้อมหลักฐาน |
| 3 | [`../phase-5-approval/`](../phase-5-approval/README.md) | ทบทวน 19 คำตัดสิน welfare/genetics เดิม (EX-W/EX-G/CP) ที่ยัง `HUMAN_APPROVAL_PENDING` และกรอกช่อง "ผู้ตัดสินจริง" |
| 4 | [`../phase-5-approval/fgf5-candidate.md`](../phase-5-approval/fgf5-candidate.md) | ถ้าจะเปิด coat_type: เติม variant/assay manifest + fixtures ให้ครบ |
| 5 | [`../phase-7-model-review.json`](../phase-7-model-review.json) | ถ้าจะเปิด Bayesian/DP/MC: เติม prior/CPT/graph + validation + approval |
| 6 | [`sign-off.json`](sign-off.json) | ลงนามสรุป: ตัวตนผู้ตรวจ คุณสมบัติ และ verdict ราย category |

ตรวจความครบของแพ็กเกจ (presence check เท่านั้น ไม่รับรองความถูกต้องวิชาการ):

```bash
node scripts/check-res01-signoff.mjs
```

exit 0 = ครบช่อง · exit 1 = ยังมีช่องว่าง · ข้อความจะบอกว่าช่องไหนหาย

---

## 4. คุณสมบัติผู้ตรวจที่ต้องการ

RES-01 ต้องการอย่างน้อย **สองบทบาท** (คนเดียวครบทั้งคู่ได้ถ้ามีคุณสมบัติ):

- **นักพันธุศาสตร์แมว / สัตวแพทย์พันธุศาสตร์** — ตัดสิน model, variant→phenotype mapping, scope ประชากร
- **ผู้ตรวจแล็บ/assay** — ยืนยัน assay ID/version, HGVS normalization, no-call/quality policy

หมวดที่เกี่ยวกับสุขภาพ/สวัสดิภาพ (เช่น ear_type / Fold) ควรมี **ผู้เชี่ยวชาญ welfare** ร่วมด้วย

---

## 5. กฎเหล็ก (ห้ามข้าม)

1. **ห้ามเติมเปอร์เซ็นต์/ prior ที่ไม่มีหลักฐานรองรับ** — ไม่มีข้อมูล = คง `not_supported` ไม่ใช่เดาเป็น 0 หรือค่าเฉลี่ย
2. ทุกค่า `allowed` ต้องมี **หลักฐานปฐมภูมิ + scope ประชากร** ที่ระบุชัด — assay ที่ตรวจ 4 variant ไม่เท่ากับรับรองทุก variant
3. **Phenotype ลำพังไม่ยืนยัน genotype** (เช่น ขนยาว/หูตั้ง) — ระบุเงื่อนไขที่ยอมรับได้หรือปฏิเสธ
4. การเปลี่ยน assay / variant mapping / penetrance / หลักฐานที่ขัดกัน → **พักเวอร์ชันนั้นเพื่อ review ใหม่** ห้ามนำ digest ใหม่ไปแทนรุ่นที่ลงนามไว้
5. การลงนามผูกกับ **SHA-256 ของไฟล์ artifact จริง** ไม่ใช่ hash ของเอกสารข้อเสนอ

---

## 6. หลังได้ลายเซ็นครบ วิศวกรรมจะทำ

1. สร้าง ruleset artifact ตาม scope ที่อนุมัติ + ตั้ง `verified:true` เฉพาะหมวดนั้น + golden fixtures จากเฉลยที่ผู้ตรวจรับรอง
2. (ถ้ามี model packet) ลงทะเบียนโมเดลใน registry พร้อม provenance + content hash
3. ต่อ adapter เข้า pair/target + UI และ **bump `ENGINE_VERSION`** (ตอนนี้ 0.2.0)
4. รัน acceptance: unit + live-DB + browser E2E + benchmark ภายใต้ scope ที่ลงนาม
5. บันทึก manifest/digest รอบใหม่ (ห้ามทับรุ่นที่ลงนามย้อนหลัง)

ก่อนครบทั้งหมด: ระบบคงสถานะ DEMO/gated และแจ้งขอบเขตตามเดิม
