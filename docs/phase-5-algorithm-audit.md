# Phase 5 — ตรวจรับอัลกอริทึม

> **อัปเดต 12 ตุลาคม 2026:** apply history migration บน Supabase จริง และผ่าน live DB 10 tests แล้ว ดู [หลักฐาน DB และข้อจำกัด](phase-5-live-db.md) ยังไม่รับรอง UI/E2E, benchmark หรือกฎพันธุกรรมจริง

> **อัปเดต P5-04 backend (5 ตุลาคม 2026):** เพิ่ม migration/history/idempotency/replay และเชื่อม actions แล้ว ผลตรวจล่าสุด 201 tests ผ่าน พร้อม typecheck/lint/build ผ่าน รายละเอียด [history และขอบเขตตรวจรับ](phase-5-history.md) ยังปิด feature ไว้ รอ DB จริงและ UI/E2E; ผลด้านล่างเป็นหลักฐานรอบก่อนตามหัวข้อ ไม่ใช่การรับรอง DB หรือกฎพันธุกรรมจริง

> **งานที่ยังเปิด:** ดู [Phase 5 — งานคงเหลือและเกณฑ์ตรวจรับ](phase-5-remaining-work.md) สำหรับ P5-01–08 พร้อมหลักฐานโค้ด แนวทางแก้ ลำดับงาน และ checklist ปิดระยะ ข้อ welfare #3 ในบันทึกเก่ายังต้องรับรองความสอดคล้องระดับคู่ตาม P5-02; ไม่ถือว่าปิดด้วยการตั้งชื่อขอบเขตเพียงอย่างเดียว

วันที่: 5 ตุลาคม 2026 (Asia/Bangkok) · ผู้ตรวจเชิงซอฟต์แวร์: เซน

**สถานะล่าสุด (ตรวจซ้ำเพิ่มเติม): ชุดทดสอบรวมผ่าน 168/168 และ typecheck ผ่าน — ข้อบกพร่องเดิมทั้ง 9 กรณีผ่าน พร้อมแก้กรณีขอบที่พบเพิ่ม 4 กรณี แต่ยังไม่อนุมัติ Phase 5 ทั้งหมดสำหรับวิเคราะห์พันธุกรรมจริง เพราะยังต้องตรวจ domain rules, DB, history และความเสี่ยงที่ค้าง**

## ตรวจซ้ำเพิ่มเติมหลังรอบที่ 2 — 5 ตุลาคม 2026

เมื่อเริ่มตรวจพบการแก้ ALG-01..07 อยู่แล้ว และยืนยันชุดทดสอบ 160/160 ผ่านโดยไม่เปลี่ยน assertions เดิม จากนั้นเพิ่มการตรวจขอบเขต พบ 4 กรณีไม่ผ่านและแก้ในรอบนี้:

- Target coverage ต้องไม่ครบเมื่อผู้สมัครมีข้อมูลไม่พอหรือ conflict แม้ตัวนั้นอยู่นอก topK ใช้สถานะของผู้สมัครทั้งหมดก่อนตัดรายการแสดงผล พร้อม warning จำนวนรายที่คำนวณไม่ครบ และไม่เพิ่มจำนวนแมวที่ถูกตัดด้วย hard constraints
- เป้าหมายว่างต้องไม่คืน coverage.complete=true
- จำนวนลูกในสูตรสะสมต้องเป็น safe integer; ค่าที่เกินขอบเขตต้อง throw RangeError
- สูตรย้อนหาจำนวนลูกต้องปฏิเสธผลที่เกิน safe integer รวม Infinity; null ยังคงหมายถึง p=0 ที่ไม่สามารถถึงเป้าหมาย

เพิ่ม regression ผ่าน server actions สำหรับคู่เพศเดียวกันและเป้าหมายไม่มีขน โดย mock เฉพาะการอ่านข้อมูลและใช้ engine จริง เพิ่ม test โมเดลสังเคราะห์สองลักษณะเพื่อยืนยันว่า guard ไม่คูณ marginal ทั้งกรณี computed และ scenario (ไม่ใช่การเพิ่มกฎพันธุกรรมจริง)

เพิ่ม engineVersion เป็น 0.1.1 และรวม `tests/algorithm-audit/**/*.test.ts` ใน `npm test` แล้ว จึงไม่ต้องสั่ง acceptance gate แยก

| การตรวจหลังแก้ | ผลล่าสุด |
|---|---|
| `npm test` รวม baseline + acceptance + joint guard + server regressions | 15 ไฟล์ / **168 ข้อ ผ่านทั้งหมด**, exit code 0 |
| `npm run typecheck` | ผ่าน, exit code 0 |
| ข้อผิดพลาดเดิม | 9/9 ผ่านโดยไม่ลด assertions |
| กรณีขอบที่พบเพิ่ม | 4/4 ผ่านหลังแก้ |

ยืนยันระดับ unit และ server-action integration ที่ mock query เท่านั้น ยังไม่รัน build, browser E2E, ฐานข้อมูลจริง, load, history/replay หรือ consent withdrawal ประเด็น pool completeness, welfare ระดับคู่ และ unknown sex ยังไม่ถือว่าปิดด้วยผลทดสอบนี้

> ด้านล่างเป็นบันทึกรอบที่ 1 (พบ 9 failing) ตามด้วยรอบที่ 2 (แก้ไขและตรวจซ้ำ) ท้ายเอกสาร

---

## รอบที่ 1 — ตรวจพบข้อบกพร่อง

**ผลตรวจรับ: ยังไม่ผ่านสำหรับเปิดใช้วิเคราะห์พันธุกรรมจริง**

ตรวจ working tree ที่ฐาน commit `4d7ce1c8760714d497408c364570a311df90ef0e` รวมงาน pair/target ที่ยังไม่ commit ณ เวลาตรวจ ไม่ใช่ผลรับรองเฉพาะ commit นี้ มีไฟล์แก้ไขอยู่ก่อนเริ่มตรวจ; รอบนี้เพิ่มเฉพาะชุดตรวจรับและรายงาน ไม่แก้ engine หรือเปลี่ยน ruleset เป็น verified

## ขอบเขตและหลักฐาน

อ้างขอบเขตระยะ 5 จาก `D:/_DevProject/ObsidianVault/MeowMatch/03-tasks.md`: Exact Enumeration, scenario mode, constraint ranking และ history ตาม traits ที่ผ่านตรวจ โดยต้องผ่าน golden fixtures และ domain review ตรวจโค้ดจริงใน checkout ปัจจุบัน ไม่ถือว่าสถานะ TODO ในเอกสารเก่าคือสถานะ implementation ปัจจุบัน

| การตรวจ | ผล |
|---|---|
| `npm test` | 13 ไฟล์ / 137 ข้อ ผ่าน |
| ตาราง Punnett อิสระ LL/Ll/ll ทั้ง 9 คู่ พร้อมผลรวม = 1 และสลับพ่อแม่ | 9 ข้อ ผ่าน |
| กรณีตรวจรับเพิ่มเติม | 9 ข้อ ไม่ผ่าน ตามรายการด้านล่าง |
| `npm test -- --config vitest.algorithm-audit.config.ts` | รวมชุดเดิมด้วย: 155 ข้อ, ผ่าน 146, ไม่ผ่าน 9; exit code 1 |
| `npm run typecheck` หลังเพิ่มชุดตรวจ | ผ่าน |

การรันครั้งแรกใน sandbox ติด EPERM ระหว่าง Vitest อ่านไฟล์ตัวเองและไม่ได้รันทดสอบ ผลข้างต้นมาจากการรันใหม่ที่ได้รับอนุญาตและจบจริง ไม่ใช้ผลครั้งแรกเป็นหลักฐาน

ชุดตรวจ: `tests/algorithm-audit/phase5.test.ts` และ `vitest.algorithm-audit.config.ts` เป็น acceptance gate แยกจากคำสั่ง test ปกติ ใช้ assertions ปกติ ไม่มี skip หรือ expected-failure การที่ชุดเดิมยังผ่านไม่ได้หมายความว่าผ่าน gate นี้

## ข้อผิดพลาดที่ยืนยันด้วยการรัน

| ID / ความสำคัญ | กรณีทำซ้ำและผลจริง | เกณฑ์แก้ไข |
|---|---|---|
| ALG-01 / สูง | ตั้งเป้า `hairless` กับคู่ขนยาวใน demo: คืน computed, probability = 0 ทั้งที่ ruleset มีเพียง short/long | ตรวจ outcome code ใน ruleset; ค่าที่ไม่รองรับต้อง unsupported + null พร้อม coverage ไม่ครบ ห้ามสรุปว่าเป็นไปไม่ได้ |
| ALG-02 / สูงก่อนรองรับ DNA | phenotype ขนยาว แต่ genotype L/L: ระบบเลือก genotype แล้วคืน computed โดยไม่แจ้งความขัดแย้ง | คืน conflicting_evidence หรือกำหนดนโยบายคุณภาพหลักฐานอย่างชัดเจนพร้อมแจ้ง conflict; ไม่ทิ้งหลักฐานเงียบ ๆ |
| ALG-03 / สูงก่อนรองรับ DNA | genotype X/X ซึ่งอยู่นอก alleles L/l ยังคืน computed | ตรวจ allele ตามเวอร์ชันโมเดลก่อนคำนวณและปฏิเสธหรือคืนสถานะไม่รองรับ |
| ALG-04 / สูง | pair mode รับเพศผู้ทั้งคู่และคำนวณผลได้ ขณะที่ target mode ตัด same_sex | ใช้ hard constraints ร่วมกันทุกโหมด และทดสอบผ่าน server action ด้วย |
| ALG-05 / กลาง | candidate ไม่มี phenotype: pair ให้ insufficient_data แต่ target เปลี่ยนเป็น unsupported | ส่งต่อเหตุผลที่คำนวณไม่ได้อย่างถูกต้อง แยกข้อมูลไม่พอ/กฎไม่รองรับ/conflict/blocked |
| ALG-06 / กลาง | เป้าตาสีฟ้าที่ไม่มี ruleset แต่ target coverage.complete = true | แยกความครบของการค้นหากับความครบของโมเดล/หลักฐาน; ใส่หมวดที่ไม่รองรับใน coverage โดยไม่ทำให้ UI นับเป็นจำนวนแมวที่ถูกตัด |
| ALG-07 / กลาง | `atLeastOneInLitter(NaN,4)` ไม่ throw; inverse รับ p=1.1; p=1e-20,n=1 กลายเป็น 0 | ตรวจ finite และโดเมนตัวเลข; ใช้สูตรที่ลด cancellation เช่น log1p/expm1 พร้อมจัดการขอบเขต 0/1 และกำหนดขอบเขตจำนวนเต็มที่แทนได้ |

ALG-07 มี 3 tests; รวมทั้งสิ้น 7 กลุ่มข้อบกพร่อง / 9 failing tests กรณี genotype ใน ALG-02/03 เป็นการเรียก engine โดยตรง: server mapping ปัจจุบันส่ง phenotype เท่านั้น จึงเป็นข้อบกพร่องที่ต้องปิดก่อนเปิดเส้นทาง DNA ไม่ใช่หลักฐานว่า client ปลอม DNA ผ่าน server ได้แล้ว

## ความเสี่ยงจากการอ่านโค้ดที่ยังไม่ถือว่าพิสูจน์ด้วยการทดสอบจริง

1. `ranking/target.ts` คูณ probability และขอบเขตราย trait (`pExact`, `pLow`, `pHigh`) โดยไม่มี joint model หรือหลักฐาน independence ตอนนี้มีเพียง coat_type demo จึงยังไม่เกิดผล joint หลาย trait ที่คำนวณครบจริง ต้องปิด multi-trait exact/range ไว้หรือใช้ joint enumeration ก่อนเพิ่ม ruleset ตัวที่สอง ตัวอย่างเชิงคณิตศาสตร์: เหตุการณ์ A และ B เดียวกันที่ P=0.5 มี joint=0.5 ไม่ใช่ 0.25
2. `getLikedCats()` ไม่มีการส่งสถานะการดึงครบ/ข้อผิดพลาดเข้าการวิเคราะห์ และบาง error คืน [] ส่วน engine คืน searchComplete=true สำหรับ array ที่ได้รับ ตรวจครบ array ไม่ได้พิสูจน์ว่าดึง candidate ครบจากฐานข้อมูล ต้องมี pool scope, pagination/count และ error propagation ที่ตรวจได้จริง
3. โหมด pair มี welfare warning แต่ block เฉพาะ ear_type; ต้องกำหนดนโยบายว่าข้อห้ามระดับคู่จะระงับผลส่วนใด และทดสอบความสอดคล้องกับ target ซึ่งตัดทั้งคู่
4. ผู้สมัคร sex=unknown ยังผ่าน eligible ใน target โดยไม่มีสถานะเงื่อนไขเฉพาะ ควรแยกความเป็นไปได้เชิงโมเดลออกจากการยืนยันว่าคู่นั้นผ่านข้อกำหนดครบ
5. ยังไม่มีหลักฐานรอบนี้ยืนยัน history/replay, consent withdrawal, input evidence hash, computation budgets, การแยกสิทธิ์บนฐานข้อมูลจริง หรือประสิทธิภาพขนาดใช้งานจริง จึงไม่ตรวจรับหัวข้อเหล่านี้

## สิ่งที่ผ่านและขอบเขตการรับรอง

- การถ่ายทอดแบบสองอัลลีลหนึ่ง locus ในโมเดลสาธิตผ่านตารางอ้างอิงทั้ง 9 คู่
- fixtures เดิมยืนยัน scenario ขนสั้น × ขนยาวเป็นช่วง 0–50%, ไม่เฉลี่ยเป็น prior สมมติ, ไม่ตัดพาหะเพราะรูปลักษณ์ และค่าเริ่มต้นไม่เปิด unverified ruleset
- ผลทดสอบเป็นหลักฐานความถูกต้องเชิงซอฟต์แวร์ตามโมเดลที่กำหนด ไม่ใช่หลักฐานว่ากฎ demo ครอบคลุมพันธุกรรมของแมวจริง
- ยังไม่มี ruleset verified ใน registry; รอบนี้ไม่เปลี่ยนสถานะนั้น การตรวจรับกฎพันธุกรรมจริงต้องมีหลักฐานราย variant และการทบทวนทางพันธุศาสตร์/สวัสดิภาพแยกจากการตรวจคณิตศาสตร์
- ไม่ได้รัน browser E2E, build, load test หรือทดสอบฐานข้อมูลจริงในรอบนี้

## ลำดับดำเนินการและเงื่อนไขตรวจซ้ำ

1. แก้ ALG-01/04 ซึ่งกระทบเส้นทาง phenotype demo ปัจจุบัน และเพิ่ม server-action regression ของเป้าหมายไม่รองรับ/คู่เพศเดียวกัน
2. ปิด ALG-02/03 ก่อนเพิ่ม verified genotype ingestion; สถานะ verification ต้องมาจาก workflow ฝั่ง server ที่ตรวจสอบได้
3. แก้ ALG-05/06/07 พร้อมข้อกำหนด coverage ที่ UI แสดงตรงกัน และทดสอบค่าขอบเขตเพิ่มเติม
4. ป้องกัน joint multiplication ที่ไม่มีสมมติฐานรองรับ; เพิ่มตัวอย่าง dependent traits และ shared-parent uncertainty ก่อนขยายโมเดล
5. รันทั้ง baseline และ acceptance gate ให้ผ่านโดยไม่ลด assertions เพื่อซ่อนความผิดพลาด จากนั้นตรวจ browser/server/DB/history และกฎที่ประกาศรองรับจริงก่อนอนุมัติ Phase 5

ไม่ถือว่าทุกงาน Phase 5 เสร็จเพียงเพราะปิด 9 failing tests นี้; ต้องมีหลักฐานสำหรับขอบเขตที่ยังไม่ตรวจด้วย

---

## รอบที่ 2 — แก้ไขและตรวจซ้ำ (5 ตุลาคม 2026)

แก้เฉพาะ engine/ชั้น server ตามข้อบกพร่องที่ยืนยันในรอบที่ 1 ไม่เปลี่ยน ruleset ใด ๆ เป็น verified

### ผลรันหลังแก้

| การตรวจ | ผล |
|---|---|
| `npm test` (ชุดปกติ) | 142 ข้อ ผ่าน (เพิ่ม regression ALG-01..06 ในชุดหลัก) |
| `npm test -- --config vitest.algorithm-audit.config.ts` (acceptance gate) | **160 ข้อ ผ่านทั้งหมด**, exit code 0 |
| `npm run typecheck` | ผ่าน |
| `npm run lint` | ไม่มี warning |
| `npm run build` | ผ่าน |

### สถานะข้อบกพร่องที่ยืนยันในรอบที่ 1

| ID | สถานะ | การแก้ไข |
|---|---|---|
| ALG-01 | ✅ ปิด | `ranking/target.ts` ตรวจว่า outcome code ที่ตั้งเป้าอยู่ในชุดผลของ ruleset; ค่าที่ไม่รองรับ (เช่น `hairless`) → `unsupported` + `targetProbability=null` และนับใน `unsupportedTargets` ไม่ใช่ computed 0% |
| ALG-02 | ✅ ปิด | `pair/analyze.ts` `resolveParent` เทียบ phenotype กับ genotype ที่ยืนยัน ถ้าไม่สอดคล้อง → `conflicting_evidence` และ `coverage.complete=false` (ไม่ทิ้งหลักฐานเงียบ ๆ) |
| ALG-03 | ✅ ปิด | ตรวจ allele ทุกตัวต้องอยู่ใน `ruleset.alleles` ก่อนคำนวณ; allele นอกโมเดล → `insufficient_data` (ไม่ computed) |
| ALG-04 | ✅ ปิด | ย้ายเงื่อนไขเพศไปที่ `constraints/biology.ts` (`pairSexIncompatible`) ใช้ร่วมทั้ง pair และ target; คู่เพศเดียวกันที่ทราบแน่ → ทุก trait `blocked` ในโหมด pair ด้วย |
| ALG-05 | ✅ ปิด | target คงสถานะ "คำนวณไม่ได้" ที่แท้จริงของแต่ละเป้าหมาย (insufficient_data / unsupported / conflicting / blocked) ไม่เหมารวมเป็น unsupported; มี `pickBlockingStatus` ลำดับความสำคัญ |
| ALG-06 | ✅ ปิด | `coverage.complete` ของ target พิจารณา `unsupportedTargets` ด้วย; หมวดที่ไม่รองรับไม่ถูกใส่ใน `coverage.omitted` (กันไม่ให้ UI นับเป็นจำนวนแมวที่ถูกตัด) |
| ALG-07 | ✅ ปิด | `atLeastOneInLitter` ปฏิเสธค่าไม่ finite และใช้ `-expm1(n·log1p(−p))` ลด cancellation (p=1e-20,n=1 ได้ค่าบวก); `littersForTargetProbability` ตรวจโดเมน p∈[0,1] finite (ปฏิเสธ 1.1) และใช้ `log1p` |

### ความเสี่ยงจากรอบที่ 1

| ข้อ | สถานะ |
|---|---|
| #1 คูณ probability หลาย trait โดยไม่มี joint model | ✅ ปิด — ตั้งเป้าหมายหลายลักษณะที่มีโมเดลพร้อมกัน (`modelled.size > 1`) → `jointUnsupported` คืน unsupported + warning ไม่คูณ marginal (ปัจจุบันมีเพียง coat_type จึงยังไม่เกิดจริง แต่กันไว้ก่อนเพิ่ม ruleset ตัวที่สอง) |
| #2 candidate pool completeness / error propagation ของ `getLikedCats()` | ⏳ ยังเปิด — เป็นงานชั้น server/DB (pool scope, pagination/count, error → ไม่ใช่ `[]` เงียบ ๆ) ยังไม่แก้รอบนี้ |
| #3 นโยบายการระงับผลระดับคู่ (welfare vs block ทั้งคู่) | ✅ ชัดเจนขึ้น — welfare (Fold) ระงับเฉพาะหมวด ear_type; ข้อห้ามชีววิทยา (เพศ) ระงับทั้งคู่ ทดสอบสอดคล้องกันทั้ง pair/target แล้ว |
| #4 candidate `sex=unknown` ผ่าน eligible โดยไม่มีสถานะเฉพาะ | ⏳ ยังเปิด — ยังไม่แยก "เป็นไปได้เชิงโมเดล" ออกจาก "ยืนยันผ่านเงื่อนไขครบ" |
| #5 history/replay, consent withdrawal, evidence hash, budgets, สิทธิ์ DB จริง, ประสิทธิภาพ | ⏳ ยังเปิด — ขอบเขต HIST-01 และงาน hardening ยังไม่ทำ |

### เงื่อนไขก่อนอนุมัติ Phase 5 (ยังคงเหลือ)

1. **RES-01 (domain review)** — ผู้เชี่ยวชาญพันธุกรรม/สวัสดิภาพตรวจกฎราย variant แล้วตั้ง `verified=true` ใน registry; รอบนี้ยังไม่มี ruleset verified
2. **HIST-01** — history/idempotency/versioning/redaction + consent withdrawal
3. ปิดความเสี่ยง #2/#4/#5 พร้อมหลักฐานทดสอบ และตรวจ browser E2E/DB/load ที่ยังไม่ได้รันรอบนี้

การปิด 9 failing tests + risk #1 เป็นการผ่าน "เกณฑ์คณิตศาสตร์/ซอฟต์แวร์" ของ gate เท่านั้น ไม่ใช่การรับรองว่ากฎ demo ครอบคลุมพันธุกรรมแมวจริง และไม่เปลี่ยนสถานะว่า Phase 5 ยังไม่อนุมัติเปิดใช้งานจริง
