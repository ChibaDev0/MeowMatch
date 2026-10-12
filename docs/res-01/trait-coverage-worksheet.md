# RES-01 — Worksheet รายการกฎอนุญาต / ไม่รองรับ (trait coverage)

สถานะ: **AI_PREPARED / HUMAN_DECISION_PENDING** · ทุกค่าคำตัดสินยัง `PENDING`

> นี่คือ deliverable หลักของ RES-01 ("มีรายการกฎอนุญาต/ไม่รองรับพร้อมหลักฐาน")
> ผู้ตรวจกรอกคอลัมน์ **คำตัดสิน / Model / หลักฐาน / Scope / เงื่อนไขไม่รองรับ** ต่อหมวด
> ค่าเริ่มต้นทุกหมวดคือ `not_supported` — ต้องมีคำตัดสิน `allowed` + หลักฐานจึงจะเปลี่ยน

หมวดที่เครื่องมือวิเคราะห์รู้จัก (จาก `ANALYZED_CATEGORIES` ในโค้ด): `coat_type`, `coat_color`,
`coat_pattern`, `eye_color`, `ear_type` — `temperament` **ไม่คำนวณพันธุกรรม** โดยตั้งใจ

---

## A. ตารางตัดสินราย category

สำหรับแต่ละหมวด เลือก `allowed` หรือ `not_supported`; ถ้า `allowed` ต้องกรอกทุกช่องที่เหลือ

### A1. coat_type (ชนิดขน — เช่น short / long)

| ช่อง | ค่า |
|---|---|
| คำตัดสิน (`allowed` / `not_supported`) | `PENDING` |
| Outcomes ที่รองรับ | `PENDING` (เช่น short, long เท่านั้น?) |
| Model ที่รับรอง (เช่น autosomal recessive) | `PENDING` |
| Variant→phenotype mapping (HGVS + assay) | ดู [fgf5-candidate.md](../phase-5-approval/fgf5-candidate.md) — manifest ต้องเติม |
| Scope ประชากร/สายพันธุ์ที่รับรอง | `PENDING` |
| Phenotype-only ยอมรับได้หรือไม่ / เงื่อนไข | `PENDING` |
| เงื่อนไข **ไม่รองรับ** (ต้องระบุชัด) | `PENDING` (เช่น hairless, no-call, compound het) |
| หลักฐานปฐมภูมิ (แหล่ง + หน้า/ตาราง) | `PENDING` |
| Golden fixtures + เฉลย (ID/hash) | `PENDING` (ดู FX01–FX09 ในแฟ้มหลักฐาน) |

### A2. coat_color (สีขน)

| ช่อง | ค่า |
|---|---|
| คำตัดสิน | `PENDING` (ค่าเริ่มต้น: `not_supported`) |
| เหตุผล/หลักฐานถ้า `allowed` | `PENDING` |
| เงื่อนไขไม่รองรับ | `PENDING` |

### A3. coat_pattern (ลายขน)

| ช่อง | ค่า |
|---|---|
| คำตัดสิน | `PENDING` (ค่าเริ่มต้น: `not_supported`) |
| เหตุผล/หลักฐานถ้า `allowed` | `PENDING` |
| เงื่อนไขไม่รองรับ | `PENDING` |

### A4. eye_color (สีตา)

| ช่อง | ค่า |
|---|---|
| คำตัดสิน | `PENDING` (ค่าเริ่มต้น: `not_supported`) |
| เหตุผล/หลักฐานถ้า `allowed` | `PENDING` |
| เงื่อนไขไม่รองรับ | `PENDING` |

### A5. ear_type (ชนิดหู — เกี่ยวกับ welfare: Scottish Fold)

| ช่อง | ค่า |
|---|---|
| คำตัดสิน | `PENDING` (ค่าเริ่มต้น: `not_supported`) |
| Model / variant (เช่น TRPV4) | `PENDING` |
| ความเชื่อมโยงสุขภาพ (osteochondrodysplasia) | `PENDING` — ดู EX-W01/W02 |
| Phenotype "หูตั้ง" ยืนยัน genotype ได้หรือไม่ | `PENDING` (งานวิจัยชี้ว่า het อาจเปลี่ยนรูปหูได้) |
| เงื่อนไขไม่รองรับ | `PENDING` |
| หลักฐานปฐมภูมิ | `PENDING` |

---

## B. ข้อจำกัดข้ามหมวด (ต้องยืนยันแยก)

| ประเด็น | คำตัดสินที่ต้องการ | ค่า |
|---|---|---|
| **Welfare block** Fold×Fold (หูพับทั้งคู่) ระงับทั้ง pair | ยืนยัน/แก้ไขนโยบาย | `PENDING` (ดู EX-W01) |
| **Same-sex / unknown-sex** behavior | ยืนยันความหมาย confirmed/conditional/blocked | `PENDING` (ดู EX-W03/W04) |
| **Joint multi-trait** (คูณ marginals) | ยังปิดไว้ — เปิดได้เมื่อมีโมเดล joint จริง | `PENDING` (ดู EX-G04) |
| **หลายรุ่น / prior** | ไม่ใส่ prior ถ้าไม่มีโมเดล | `PENDING` (ดู EX-G05) |
| **ข้อความ UI / limitation** | ตรวจถ้อยคำขอบเขตสุขภาพ+คณิตศาสตร์ | `PENDING` (ดู EX-W07) |

---

## C. เงื่อนไขการปิด worksheet นี้

RES-01 ถือว่าเสร็จเมื่อ:

1. ทุกหมวดใน A มีคำตัดสัน `allowed` หรือ `not_supported` ที่ชัดเจน (ไม่เหลือ `PENDING`)
2. ทุกหมวด `allowed` มีหลักฐานปฐมภูมิ + scope + golden fixtures ครบ
3. ข้อจำกัดใน B ได้รับการยืนยัน
4. [`sign-off.json`](sign-off.json) ลงนามครบ และ `scripts/check-res01-signoff.mjs` ผ่าน
5. ผู้ตรวจระบุ **เงื่อนไขทบทวนใหม่** และ **ผู้รับผิดชอบเพิกถอน** ของแต่ละกฎที่เปิด

> หมวดที่ตัดสิน `not_supported` ก็ถือว่า "เสร็จ" ตามนิยาม RES-01 ได้ — เป้าหมายคือ *รายการที่ชัดเจน*
> ว่าอะไรรองรับ/ไม่รองรับพร้อมเหตุผล ไม่ใช่การบังคับให้เปิดทุกหมวด
