# domain/genetics/

Genetics Engine — ฟังก์ชันบริสุทธิ์ล้วน รับ input ที่ตรวจแล้ว คืนผลรูปแบบคงที่
**ห้ามเรียก LLM หรือ database โดยตรง** เพื่อให้ replay และทดสอบได้ (01-architecture)

| โฟลเดอร์ | หน้าที่ | ระยะ |
|---|---|---|
| `contracts/` | ชนิดข้อมูล input/result และ invariant (probability ∈ [0,1] หรือ null) | ✅ เริ่มแล้ว |
| `transmission/` | Mendelian exact enumeration (Punnett ขยาย) | ✅ single-locus แล้ว (GEN-02) |
| `inference/` | scenario manager และ Bayesian Network + Variable Elimination | GEN-03/04 |
| `constraints/` | สิทธิ์/consent, welfare gates, คุณสมบัติคู่ (hard constraints) | TARGET-01 |
| `ranking/` | target probability (joint) และ explainable ranking + evidence groups | TARGET-01 |
| `planning/` | finite-horizon DP และ Monte Carlo (ระยะวิจัย หลัง feature gate) | SIM-01/02 |
| `rules/` | phenotype rulesets ตาม variant ที่ผ่านผู้เชี่ยวชาญตรวจ (versioned) | RES-01 |
| `fixtures/` | golden fixtures สำหรับพิสูจน์ความถูกต้อง | GEN-02+ |

## หลักการที่ห้ามละเมิด (10-algorithm-design)

- "exact" = คำนวณครบตามโมเดล/ input ไม่ใช่ทำนายธรรมชาติ 100%
- ไม่มี ruleset ที่ผ่านตรวจ → `unsupported`; ไม่มี prior → scenario mode; ข้อมูลไม่พอ →
  `insufficient_data` (ห้ามใช้ 0 แทน "ไม่ทราบ")
- หลักฐานขัดกัน → `conflicting_evidence` (ห้าม normalize หารศูนย์หรือเปลี่ยนเป็น uniform)
- ใช้ **joint distribution** ของพ่อแม่ ไม่คูณค่ารายลักษณะโดยสมมติว่าอิสระ
- การตัด candidate/scenario ต้องรายงาน `coverage`; เกิน budget → `budget_exceeded`
