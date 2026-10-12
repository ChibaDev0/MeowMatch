# Phase 7 — ขยายวิสัยทัศน์ (gated infrastructure)

> ระยะ 7 ตาม `MeowMatch/03-tasks.md`: กฎหลายยีน/สี/ตา/หูที่ยืนยันได้ + จำลองหลายรุ่น
> เงื่อนไขผ่าน: **แต่ละกฎมีหลักฐานและผลทดสอบ; ไม่สัญญาว่าจะคำนวณทุก trait ได้**
>
> ผู้ใช้ตัดสินใจ (2026-10-12): ทำ Phase 7 เป็น **infra ที่ปิด gate** เท่านั้น —
> แกนพันธุกรรม (GEN-03/04 Bayesian priors, SIM-01/02) ยัง **บล็อกที่ RES-01**
> (ต้องมี prior/likelihood ที่ผู้เชี่ยวชาญตรวจรับ) จึง **ไม่ปล่อยเปอร์เซ็นต์พันธุกรรมจริง**

อัปเดต: 2026-10-13

เพิ่มเติมตามคำขอพัฒนา Algorithm (2026-10-13): [Algorithm core และชุดตรวจรับ RES-01](phase-7-research-handoff.md) มี joint log-space VE, likelihood evidence, prior sensitivity, finite-horizon DP และ seeded likelihood-weighting fallback พร้อม research runners แล้ว ใช้ gate เดิมผ่าน `runRegisteredAlgorithm` ได้ แต่ยังไม่ต่อ pair/target/UI และยังไม่มี empirical prior/ผู้ตรวจรับ จึงยังไม่เปิดผลจริง

## หลักการ: ทำโครงให้ครบ แต่ "ปิด gate" ไม่แต่งตัวเลข

โหมด exact Mendelian (pair/target ใน Phase 5) ไม่ต้องมี prior จึงทำงานได้
แต่โหมดต่อยอดต้องมีโมเดล/prior ที่ผ่านตรวจรับก่อน:

| โหมด | backlog | สถานะ |
|---|---|---|
| Bayesian Network + Variable Elimination | GEN-03 / GEN-04 | Algorithm วิจัยพร้อม; gated — ไม่มีโมเดล verified |
| finite-horizon Dynamic Programming (≤2 รุ่น) | SIM-01 | Fully observed DP วิจัยพร้อม; gated — ไม่มี transition/observation model จริง |
| Monte Carlo fallback | SIM-02 | Joint-network likelihood weighting พร้อม; gated — ไม่มีโมเดลจริง |
| model/prior registry, diagnostics, cache versions | GEN-05 | ✅ infra พร้อม (registry ว่างโดยตั้งใจ) |

**กฎเหล็ก:** registry ของโมเดลเริ่มต้น **ว่างเปล่า** — ไม่มีการใส่ตัวเลข prior ที่แต่งขึ้นเอง
การเพิ่มโมเดลทำได้เมื่อมีหลักฐาน + ผู้ตรวจรับ (ตั้ง `verified=true` พร้อม provenance) เท่านั้น

## GEN-05 — model/prior registry (infra keystone)

- `src/domain/genetics/models/types.ts` — `InferenceModel` (id/kind/version/verified/provenance/
  coverage/diagnostics/payload), ขนานกับ `PhenotypeRuleset` แต่สำหรับโหมดที่ต้องมี prior
- `src/domain/genetics/models/registry.ts`:
  - `ALL_MODELS = []` — **ว่างโดยตั้งใจ** (gate ปิดทุกโหมด)
  - `resolveModel(kind, category, allowUnverified=false)` — คืนเฉพาะ `verified` โดยค่าเริ่มต้น
  - `modelContentHash(model)` — canonical hash ผูกผลกับเนื้อหาโมเดลที่ใช้จริง (immutability/replay)
  - `selectModel(models, …)` — pure helper ทดสอบ gating ได้โดยไม่พึ่ง registry จริง
  - `MODEL_REGISTRY_VERSION = "0.1.0-empty"`

## GEN-03/04 + SIM-01/02 — gated inference adapters

`src/domain/genetics/inference/gated.ts`:

- `runGatedInference(kind, category, runner, opts)` — resolve โมเดลก่อน:
  - ไม่มีโมเดล verified → `{ status: "unsupported", reason }` **ไม่เรียก runner, ไม่มีตัวเลข**
  - มีโมเดล verified → เรียก `runner(model, contentHash)` (seam ของ algorithm จริง) คืน `status: "ok"`
- wrappers: `estimateBayesian` (GEN-03/04), `simulateDynamicProgramming` (SIM-01), `monteCarloSimulate` (SIM-02)
- ชั้นนี้รับประกันว่า engine จะ **ไม่แต่งเปอร์เซ็นต์จาก prior ที่ไม่มีอยู่** — algorithm VE/DP/MC
  ตัวจริงเสียบผ่าน `runner` ได้เมื่อมีโมเดลที่ผ่าน RES-01 แล้วเท่านั้น

## หลักฐาน infra เดิม (2026-10-12)

- `npm test` **249 ผ่าน** — เพิ่ม `models/registry.test.ts` (11: gate ว่าง, verified gating,
  content hash เสถียร/เปลี่ยนตามเนื้อหา/canonical) + `inference/gated.test.ts` (5: unsupported +
  ไม่เรียก runner, delegate เมื่อมีโมเดล verified, ไม่ข้ามขอบเขต category)
- audit gate (`vitest.algorithm-audit.config.ts`) **249 ผ่าน**; typecheck/lint ผ่าน
- **source-drift guard** (`history.test.ts`) จับไฟล์ engine ใหม่ได้ — อัปเดต artifact
  `engine-0.2.0.json` ให้ snapshot ครบ 16 ไฟล์ (พฤติกรรม engine ไม่เปลี่ยน ENGINE_VERSION คง 0.2.0
  เพราะ adapter ยังไม่ถูกต่อเข้าเส้นทาง pair/target)

## หลักฐาน Algorithm (2026-10-13)

- Full regression 311 tests ผ่าน รวม research 62 tests; typecheck/lint ผ่าน
- เทียบ VE กับ exhaustive enumeration และ DP กับ exhaustive decision tree; ตรวจ shared-latent family correlation, tiny likelihoods, budget fallback และ rare unobserved samples
- [ผล benchmark](benchmarks/phase7-algorithms.json) และ [ขอบเขต/งานส่งต่อ](phase-7-research-handoff.md)
- Production engine/artifact ไม่เปลี่ยน; research runners ระบุ `researchOnly: true` เสมอ

## ยังเปิด (บล็อกที่ RES-01 / production integration)

- **GEN-03** โครง Bayesian graph + priors + evidence likelihood ที่ผ่าน review (ต้องมีข้อมูลประชากร)
- **GEN-04** domain fixtures/held-out calibration ของโมเดลจริง และ promote research adapter เข้าผลจริง (reference/conflict/sensitivity ระดับคณิตศาสตร์ทำแล้ว)
- **SIM-01** transition/observation model + terminal objective ที่ตรวจรับ; ต้องเพิ่ม belief-state planning หาก state ไม่ได้สังเกตจริง (fully observed DP เทียบต้นไม้เล็กแล้ว)
- **SIM-02** sampling/rare-event strategy ที่ตรวจรับและปรับ budget กับ workload จริง (joint sampling, seed, ESS/error diagnostics และ exact-first fallback ทำแล้ว)
- กฎหลายยีน/สี/ตา/หู ที่ยืนยันได้ (ต่อจาก coat_type demo) — ต้องมีหลักฐานรายกฎ
- การต่อ adapter เข้าเส้นทาง pair/target + UI ทำเมื่อมีโมเดล verified (จะ bump ENGINE_VERSION ตอนนั้น)

**สรุป:** infra + gate พร้อมรองรับโหมดต่อยอดทั้งหมดแล้ว แต่ **ไม่เปิดผลจริง**จนกว่าจะมีโมเดลที่ผ่าน
การตรวจรับของผู้เชี่ยวชาญพร้อมหลักฐาน — ตรงตามวินัย "ไม่เติม %" ของโปรเจกต์
