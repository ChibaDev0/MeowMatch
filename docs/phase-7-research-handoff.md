# Phase 7 — Algorithm core และงานตรวจรับที่เหลือ

อัปเดต 13 ตุลาคม 2026 · เซน (AI งานวิศวกรรม) · Algorithm `phase7-0.2.0`

**พัฒนาตัวคำนวณ VE, DP และ Monte Carlo สำหรับงานวิจัยแล้ว พร้อม tests และ benchmark**
ยังไม่ถือว่า Phase 7 พร้อมเปิดผลจริง: โมเดลพันธุกรรม/ประชากรและ RES-01 ยังไม่มีการตรวจรับ

## สิ่งที่ทำเสร็จในขอบเขต Algorithm

| ส่วน | ความสามารถ |
|---|---|
| GEN-03: สัญญาโมเดล | ตรวจ JSON runtime, DAG, unique states/parents, CPT ครบและ normalized; ตรวจทุกแถวแม้ evidence ทำให้เข้าไม่ถึง |
| GEN-04: Bayesian | Joint Variable Elimination ใน log space, hard/likelihood evidence, ลำดับกำจัดตัวแปรตามขนาด intermediate factor, prior sensitivity แยกแต่ละโมเดล |
| SIM-01: DP | Bellman backward induction 0–2 ขั้น, terminal utility/reward/discount, allowed actions ต่อ state, stop option, policy และ terminal distribution |
| SIM-02: Monte Carlo | Likelihood weighting ของ joint network; ลูกที่มีพ่อแม่แฝงร่วมกันใช้ latent state เดียวกันในแต่ละ sample; reproducible seed, ESS และ asymptotic standard error |
| Exact-first | ลอง exact จริงก่อน; fallback แบบ opt-in เฉพาะ typed budget overflow พร้อม diagnostics; ไม่สุ่มเพื่อกลบ invalid model/conflict |
| Runner | `runResearchAlgorithm` ตรวจ population/category/kind และคืน `researchOnly: true` พร้อม algorithm version/model hash/request hash |
| Gate integration | `runRegisteredAlgorithm` ใช้ registry เดิม ไม่มี model override หรือ allow-unverified option; registry ปัจจุบันว่างจึง unsupported |

โค้ดและวิธีเรียก: [README ของ Algorithm](../src/research/genetics/README.md)

## ขอบเขตที่สำคัญ

- DP เป็น **fully observed joint-state model** ไม่ใช่ POMDP; การมอง genotype แฝงว่าเป็น state ที่ผู้ใช้รู้จริงจะผิดสมมติฐาน ต้องออกแบบ observation/belief model ก่อนใช้กรณีนั้น
- ค่า utility และ allowed actions เป็นข้อมูลที่ caller ส่งมา ตัว Algorithm ไม่รับรองข้อห้ามทางสวัสดิภาพเอง
- `conflicting_evidence` มาจาก exact zero support; Monte Carlo ที่สุ่มไม่พบ positive weight คืน `insufficient_data` ไม่สรุป conflict
- เหตุการณ์ที่ไม่พบในการสุ่มไม่ใช่หลักฐานว่าความน่าจะเป็นเป็นศูนย์; standard error ที่ขอบ 0/1 เป็น null พร้อมคำเตือน
- ผล exact ที่เล็กกว่าขอบเขต floating-point มี `logProbability` เก็บค่าไว้; null หมายถึง zero support ขณะที่ finite log แม้ probability เป็น 0 หมายถึง underflow ของรูปเลขปกติ
- `sampleJoint` มี Hoeffding bound ภายใต้สมมติฐาน ideal independent draws เท่านั้น; ไม่ใช้ bound นี้รับรอง weighted sampling
- PRNG เป็น HMAC-SHA256 counter แบบ 53-bit ที่ versioned เพื่อ replay; ยังต้องประเมินความเหมาะสมกับ rare events ในโมเดลจริง
- Replay hashes เป็นตัวระบุเนื้อหา ไม่ใช่ลายเซ็นรับรองจากผู้เชี่ยวชาญ

## ผลตรวจล่าสุด

- Full Vitest: **26 ไฟล์ / 311 tests ผ่าน** รวม research 62 tests
- TypeScript และ lint ผ่าน
- Independent reference: exhaustive joint enumeration (รวม collider และหลาย state), Bayes conditioning, exhaustive decision tree ของ DP
- Boundary/invalid: sparse arrays, NaN/Infinity, invalid CPT/DAG/evidence/query, impossible evidence, tiny likelihoods, budgets, blocked actions, rare unobserved events และ seed replay
- Existing history source-drift และ gate regression ผ่าน; production engine/artifact ไม่เปลี่ยน
- ไม่ได้ทดสอบ browser/E2E หรือรับรองชีววิทยา เพราะไม่มีการเปลี่ยนเส้นทางผู้ใช้

[Benchmark JSON](benchmarks/phase7-algorithms.json) วันที่ 13 ตุลาคม 2026 (เวลาไทย):

| ชุดข้อมูลสังเคราะห์ | p95 (ms) |
|---|---:|
| exact chain 8 nodes | 1.70 |
| exact chain 32 nodes | 6.56 |
| exact chain 128 nodes | 38.19 |
| sampled fallback 10,000 samples | 155.30 |
| DP 32 states, 4 actions, 2 steps | 2.00 |

Benchmark รวม validation และ assertions และรันร่วมช่วง regression/lint; ไม่ใช่ production SLA
กรณี fallback จงใจตั้ง exact operation budget = 1 เพื่อทดสอบเส้นทาง fallback ไม่ได้อ้างว่า graph นี้ใหญ่จนต้องสุ่ม

รันทวน:

```text
npx vitest run src/research/genetics
npx vitest run
npm run typecheck
npm run lint
npx vitest run --config vitest.benchmark.config.ts tests/benchmarks/phase7.test.ts
node scripts/check-phase7-review.mjs
```

## งานที่ต้องมีก่อนเปิดผลจริง

1. กำหนด variant/population coverage, source dataset/version/license, วิธีจัดการความเกี่ยวดอง/ข้อมูลขาด และ prior/CPT/likelihood จริง
2. ผู้เชี่ยวชาญตรวจ independent fixtures, held-out calibration, prior sensitivity, welfare constraints และ rare-event strategy; ลงนามขอบเขตและ digest ที่ตรวจจริง
3. ออกแบบ observation model/POMDP หาก state ไม่ได้สังเกตจริง; ทบทวน utility/action constraints และ family transition model ตาม domain
4. ทำ approval registry ที่ผูก digest/revocation ไม่ใช้ verified boolean เพียงอย่างเดียว; runner ปัจจุบันยังระบุ researchOnly แม้ registry จะมีโมเดลในอนาคต
5. Promote/snapshot Algorithm ที่รับรองเข้ากับ production engine พร้อม version bump, เชื่อมหลักฐาน server/pair/target/UI และทดสอบ cross-layer/E2E

[แบบร่าง RES-01](phase-7-model-review.json) ยังคงมีช่องที่ขาด 23 ช่อง ตัวตรวจ checklist ใช้ตรวจความครบของช่องเท่านั้น ไม่ได้ตรวจลายเซ็น/ความถูกต้องทางวิชาการ และไม่มี exit code ที่อนุมัติ production

## หลักวิธีที่ใช้

พัฒนาตามหลัก factor multiplication/sum-out ของ [Poole & Mackworth: Exact Probabilistic Inference](https://artint.info/3e/html/ArtInt3e.Ch9.S5.html), การให้น้ำหนักหลักฐานของ [Stochastic Simulation](https://artint.info/3e/html/ArtInt3e.Ch9.S7.html) และ backward value iteration ของ [Decision Processes](https://artint.info/3e/html/ArtInt3e.Ch12.S5.html) โดยใช้ implementation และ fixtures ของโปรเจกต์เอง
