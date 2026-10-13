# domain/genetics/

เครื่องคำนวณความน่าจะเป็น — ฟังก์ชันบริสุทธิ์ล้วน รับ input ที่ตรวจแล้ว คืนผลรูปแบบคงที่
**ห้ามเรียก LLM หรือ database โดยตรง** เพื่อให้ replay และทดสอบได้

> โปรเจกต์นี้เป็นการทดลองความน่าจะเป็น (ดู [docs/scope.md](../../../docs/scope.md)) —
> โมเดลเป็นตัวอย่างตำราแบบง่าย ไม่ใช่ผล DNA จริง และไม่ต้องให้ผู้เชี่ยวชาญตรวจรับ

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `contracts/` | ชนิดข้อมูล input/result และ invariant (probability ∈ [0,1] หรือ null) |
| `transmission/` | Mendelian exact enumeration (Punnett ขยาย) — single-locus |
| `inference/` | scenario manager (ช่วงของกรณีที่เป็นไปได้เมื่อ genotype ไม่แน่) |
| `constraints/` | คุณสมบัติคู่/กฎในตัว (เพศ, สวัสดิภาพหูพับ) เป็น hard constraints |
| `ranking/` | target probability และสเปกของคู่ที่ต้องใช้ (mate-spec) + อันดับอธิบายได้ |
| `rules/` | โมเดลทดลองรายลักษณะ (coat_type / coat_color / coat_pattern) — มีเวอร์ชัน |
| `fixtures/` | golden fixtures สำหรับพิสูจน์ความถูกต้องของการคำนวณ |

> `planning/` (DP/Monte Carlo) และ `inference/gated` เป็นโครงทดลองที่ไม่ได้ใช้งานในขอบเขตปัจจุบัน

## หลักการที่ห้ามละเมิด

- "exact" = คำนวณครบตามโมเดล/ input ไม่ใช่ทำนายธรรมชาติ 100%
- ไม่มีโมเดลสำหรับลักษณะนั้น → `unsupported`; genotype ไม่แน่ → scenario range; ข้อมูลไม่พอ →
  `insufficient_data` (ห้ามใช้ 0 แทน "ไม่ทราบ")
- หลักฐานขัดกัน → `conflicting_evidence` (ห้าม normalize หารศูนย์หรือเปลี่ยนเป็น uniform)
- การตัด candidate/scenario ต้องรายงาน `coverage`
