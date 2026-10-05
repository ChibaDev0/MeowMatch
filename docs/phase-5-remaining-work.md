# Phase 5 — งานคงเหลือและเกณฑ์ตรวจรับ

วิเคราะห์วันที่ 5 ตุลาคม 2026 · ผู้ตรวจ: เซน · ขอบเขต: checkout `D:/_DevProject/MeowMatch`

## สถานะและขอบเขตการตัดสิน

ผลรันล่าสุดจากรอบก่อน: 168 tests ผ่าน และ typecheck ผ่าน ตาม [รายงานตรวจรับ](phase-5-algorithm-audit.md) รอบนี้อ่านโค้ดและจัดทำ backlog ไม่ได้รัน tests/build/E2E ใหม่ จึงไม่ถือว่าเป็นการรับรองผลรันใหม่

ข้อผิดพลาดเดิม ALG-01–07, ข้อผิดพลาด coverage/จำนวนลูกที่พบเพิ่ม และ guard ห้ามคูณหลาย trait โดยไม่มี joint model มีผลทดสอบผ่านแล้ว ไม่เปิดกลับเป็นงานแก้ซ้ำ ยังคงชุดตรวจเหล่านี้ใน `npm test`

**ยังไม่ปิด Phase 5 ทั้งหมด** งานด้านอัลกอริทึมต้องมีทั้งผลคำนวณที่ถูกต้อง ข้อมูลต้นทางที่ครบและมีสิทธิ์ใช้ ผลย้อนหลังที่ตรวจสอบได้ และขอบเขตกฎที่ผ่านการรับรอง ไม่ใช่เพียง tests คณิตศาสตร์ผ่าน

P1 = ต้องปิดก่อนเปิดฟีเจอร์จริงที่เกี่ยวข้อง; P2 = hardening/ขอบเขตการใช้งานที่ต้องชัดก่อนรับตรวจเต็มระยะ ไม่มีรายการใดในเอกสารนี้ถือว่าแก้แล้วเพียงเพราะบันทึกไว้

## ความคืบหน้า increment 3 (5 ตุลาคม 2026) — P5-02 + P5-06 ระดับโค้ด

ทำตามลำดับงานข้อ 1 (P5-02 decision table + P5-06 validation) เฉพาะส่วนที่พิสูจน์ได้ด้วย unit/integration test (mock query) ยังไม่แตะ DB จริง/E2E:

- **P5-02 (บางส่วน):** รวม decision ด้านเพศไว้ที่ `constraints/biology.ts` `classifySexCompatibility` (confirmed/unknown/incompatible) ใช้ร่วมทั้ง pair และ target; เพิ่มฟิลด์ `sexCompatibility` ใน `PairAnalysisResult` และ `RankedCandidate`; sex=unknown ไม่ถูกตัดแต่ติดธง + warning และมี badge "เพศยังไม่ยืนยัน" ใน UI target; ระบุขอบเขตต่างของ welfare (pair ระงับเฉพาะ ear_type / target ตัดทั้งตัวเพราะ "ไม่แนะนำ") เป็นคอมเมนต์ชัดเจน — **ยังเปิด:** ขอบเขต welfare/health ต้องผ่าน domain review (RES-01) ก่อนถือว่าปิด
- **P5-06 (โค้ด+เทสต์เสร็จ):** zod ตรวจ payload ที่ขอบ server action (`map.ts` analysisCatIdSchema/targetLabelsSchema/analysisOptsSchema); `isValidGenotype` ตรวจความยาวคู่ allele + allele ในโมเดล; phenotype demo ใช้ canonical label + กันค่ากำกวม ("ไม่ทราบว่าขนสั้นหรือยาว" → insufficient_data); empty scenario set → insufficient_data ไม่ใช่ช่วง 0–0; topK ต้องเป็น safe integer ≥ 0 ไม่งั้นแสดงทั้งหมด

หลักฐาน: `npm test` 176 ผ่าน (รวม audit gate), typecheck/lint/build ผ่าน เทสต์ใหม่อยู่ใน `fixtures/pair.golden.test.ts` (เพศ/validation), `fixtures/target.golden.test.ts` (unknown sex/topK), `server/analysis/target-actions.test.ts` (zod)

## ความคืบหน้า increment 4 (5 ตุลาคม 2026) — P5-01 candidate pool

เพิ่ม `getAnalysisCandidates(excludeCatId?)` ใน `server/cats/queries.ts`:
- แบ่งหน้าแบบลำดับเสถียร (created_at desc, cat_id asc) + ใช้ `count` รู้ว่าครบหรือยัง + guard จำนวนหน้า
- คืน `CandidatePool { cats, source: "real"|"demo", complete, error, fetched, expected }` — **error แยกจาก empty** และ **missing schema → demo ที่ติด `source:"demo"`** ไม่อ้างเป็นข้อมูลจริง
- error กลางทาง → `complete=false` (ไม่รายงานว่าครบ); แมวที่ถูกซ่อน (RLS) หายได้โดยไม่ถือเป็น error
- engine รับ `poolComplete` → ตั้ง `searchComplete=false` เมื่อ pool ไม่ครบ; server action คืน `pool` ให้ UI; หน้า desired-cats แสดง "ค้นจากแมวที่กดใจ N ตัว ไม่ใช่ทุกตัวในระบบ" + ป้าย demo/ดึงไม่ครบ

หลักฐาน: `npm test` 185 ผ่าน, typecheck/lint/build ผ่าน เทสต์ครอบ 0 แถว, หลายหน้า, ล้มกลางหน้า (timeout), แมวถูกซ่อน, missing schema, exclude source (`server/cats/queries.test.ts`) และ provenance/`searchComplete` (`server/analysis/target-actions.test.ts`). **ยังเปิด:** ยืนยันบน DB จริง (ผูกกับ P5-05/P5-08) ยังไม่ได้ทำในชั้น unit/mock นี้

## ภาพรวมงานที่ยังเปิด

| ID | งาน | ระดับ | สถานะหลักฐาน | เชื่อม backlog |
|---|---|---|---|---|
| P5-01 | Candidate pool, error และแหล่งข้อมูลสาธิต | P1 | พบช่องว่างใน server query/contract | TARGET-01 / PAIR-01 |
| P5-02 | ข้อห้ามระดับคู่และเพศไม่ทราบ | P1 | พบพฤติกรรมไม่สอดคล้องจากโค้ด; ต้องกำหนดนโยบาย | RES-01 / GEN-02 / TARGET-01 |
| P5-03 | กฎที่รองรับจริงและหลักฐาน DNA | P1 ก่อนเปิดผลจริง | registry ยังมีเฉพาะ demo; server ยังส่ง phenotype | RES-01 / GEN-01 |
| P5-04 | History, replay, idempotency และ provenance | P1 | มีตารางตั้งต้น แต่ actions ไม่บันทึกผล | HIST-01 / GEN-05 |
| P5-05 | สิทธิ์ DB, consent และถอนข้อมูล | P1 | พบข้อจำกัดของ policy ใน migration; ยังไม่ทดสอบ DB จริง | SEC-01 / GEN-01 / HIST-01 |
| P5-06 | Runtime validation และขอบเขตข้อมูล | P2; ยกระดับก่อนเปิด DNA | พบ validation ไม่ครบ; กรณีใหม่ยังไม่รันพิสูจน์ | GEN-02 / PAIR-01 / TARGET-01 |
| P5-07 | Budget, ขนาดงาน และ coverage ที่สื่อความหมายตรงกัน | P2 | ยังไม่มี budget enforcement/benchmark ในเส้นทางที่ตรวจ | GEN-05 / TARGET-01 |
| P5-08 | E2E และหลักฐานปิดระยะ | P1 ก่อนปิด Phase 5 | ยังไม่มีหลักฐานทดสอบ analysis ครบเส้นทาง | QA-01 / PAIR-01 / TARGET-01 / HIST-01 |

## P5-01 — ดึงชุดผู้สมัครครบและไม่แปลงข้อผิดพลาดเป็นผลว่าง

**หลักฐาน:** `src/server/cats/queries.ts:getLikedCats` อ่าน likes และ cats โดยไม่มี loop pagination/count ที่ส่งกลับผู้เรียก; query error บางกรณีคืน `[]` และกรณี missing schema คืน demo cats ส่วน `src/server/analysis/target-actions.ts` รับเพียง array แล้วส่งเข้า `analyzeTarget` ซึ่งคืน `searchComplete=true` สำหรับรายการที่ได้รับ การสแกน array ครบจึงยังไม่ยืนยันว่าดึงฐานข้อมูลครบ

**ต้องแก้:** สร้าง query สำหรับการวิเคราะห์ที่คืนข้อมูลพร้อม scope, complete, source (real/demo), จำนวนที่ดึง/จำนวนที่คาด และ error ที่แยกจาก empty state ให้ server action ส่งสถานะต่อถึง UI; ทำ pagination อย่างมีลำดับเสถียรและกำหนดวิธีรับมือข้อมูลเปลี่ยนระหว่างหน้า ห้ามแอบใช้ demo data เป็นผลจากฐานข้อมูลจริง การเปิด demo ต้องมีป้ายและ provenance ชัดเจน

**เกณฑ์ผ่าน:** ทดสอบ 0 รายจริง, มากกว่าหนึ่งหน้า, หน้ากลางล้มเหลว, cats บางตัวถูกซ่อน, query timeout และ missing schema; ไม่มีกรณีดึงไม่ครบ/ล้มเหลวแล้วรายงานผลค้นหาจริงว่าครบ การตัด topK หลังประเมินครบยังนับ evaluatedCount ถูกต้อง คำอธิบาย UI ระบุว่าค้นจากแมวที่กดใจ ไม่ใช่ทุกตัวในระบบ

## P5-02 — ทำข้อห้ามและสถานะไม่ทราบให้ตรงกันทุกโหมด

**หลักฐาน:** `constraints/biology.ts` ไม่ตัด sex=unknown และยังไม่มีสถานะเงื่อนไขเฉพาะ; `pair/analyze.ts` ระงับ welfare เฉพาะหมวด ear_type แต่ `ranking/target.ts` ตัด candidate ทั้งตัวเมื่อพบ welfare finding แม้ตั้งเป้า coat_type ดังนั้นข้อ #3 ที่บันทึกว่า “ชัดเจนขึ้น” ในรอบก่อนยังไม่ใช่หลักฐานว่าพฤติกรรมทั้งสองโหมดตรงกัน

**ต้องแก้:** กำหนด decision table ร่วมสำหรับ same cat, same sex, unknown sex, welfare ระดับคู่/ระดับ trait และเป้าหมายที่ห้ามแนะนำ แยก “คำนวณได้ภายใต้สมมติฐาน” จาก “ผ่านเงื่อนไขคู่ครบแล้ว”; ให้ domain review ตัดสินขอบเขต welfare ก่อนเปลี่ยนกฎ ไม่ตั้งเกณฑ์สุขภาพ/อายุโดยเดา

**เกณฑ์ผ่าน:** ทดสอบคู่เดียวกันผ่าน pair และ target ทั้งกรณีขอ ear_type และไม่ขอ ear_type; ทั้งสองโหมดใช้ข้อห้ามเดียวกันหรืออธิบายขอบเขตผลที่ต่างกันอย่างชัดเจน ผู้สมัคร sex=unknown ต้องไม่ถูกแสดงเหมือนยืนยันความเข้ากันแล้ว และคะแนนสูงไม่ลบล้างข้อห้าม

## P5-03 — รับรองกฎจริงและเส้นทางหลักฐาน DNA

**หลักฐาน:** `rules/registry.ts` ลงทะเบียน coat-type demo ที่ verified=false เท่านั้น; `server/analysis/map.ts` ส่ง phenotype ไม่มี verified genotype ingestion การผ่าน Punnett table ไม่ใช่การรับรองกฎราย variant

**ต้องทำ:** จัดทำรายการ trait ที่เปิดได้/ไม่ได้ พร้อม model assumptions, variants, limitations, แหล่งหลักฐาน, ผู้ทบทวน, วันที่, เวอร์ชัน และ fixtures อิสระ เพิ่ม workflow ตรวจหลักฐาน DNA ฝั่ง server หาก release จะรับ DNA ให้เก็บเอกสารเป็น private และแยกสถานะตรวจสอบจากคำกรอกผู้ใช้ เปลี่ยน verified ได้หลังมีหลักฐานการอนุมัติ ไม่ใช้ flag เดียวแทนกระบวนการทั้งหมด

**เกณฑ์ผ่าน:** fixture ตามขอบเขตกฎจริงและ conflict/unknown/out-of-model ผ่าน; client กำหนด verified เองไม่ได้; demo/default modes แยกชัดทั้ง UI และประวัติ หากยังไม่มี domain review ให้คง unsupported สำหรับผลจริงและประกาศเป็น demo release เท่านั้น ไม่ปิด Phase 5 ฝั่งพันธุกรรมจริง

## P5-04 — ประวัติผลที่บันทึกและ replay ได้

**หลักฐาน:** `supabase/migrations/0004_features.sql` มี breeding_analyses พร้อม result JSON แต่ `server/analysis/actions.ts` และ `target-actions.ts` คืนผลโดยไม่มีการบันทึก analysis run; ยังไม่พบ service สำหรับ snapshot/idempotency/replay ในเส้นทางนี้

**ต้องแก้:** ออกแบบ run สำหรับทั้ง pair และ target เก็บ canonical input/evidence snapshot ที่มีสิทธิ์ใช้, input hash, engine/ruleset/schema versions, inference method, scope/coverage, assumptions, demo flag และเวลา กำหนด immutable ruleset artifacts และ replay policy; ใช้ idempotency key ที่ผูกกับผู้ใช้และ request พร้อม unique constraint/transaction

**เกณฑ์ผ่าน:** รีเฟรชแล้วเปิดผลเดิมได้, ส่งซ้ำ/พร้อมกันไม่สร้าง run ซ้ำ, key เดิมแต่ payload ต่างถูกจัดการชัดเจน, ผลเดิมไม่เปลี่ยนเมื่อแก้ข้อมูลแมว, replay เวอร์ชันเดิมได้เฉพาะเมื่อสิทธิ์ยังอนุญาต และถอนหลักฐานแล้วมี invalidation/redaction ตาม P5-05 ห้าม hash แทนข้อมูลต้นทางแล้วอ้างว่า replay ได้

## P5-05 — ปิดช่องว่างสิทธิ์และการถอนข้อมูลก่อนเปิด history

**หลักฐาน:** migration 0004 มี insert policy ของ breeding_analyses ตรวจเพียง `auth.uid() = owner_id` ไม่ตรวจ ownership/access ของ parent_a/parent_b หรือที่มาของ result JSON; ไม่พบ migration ถัดไปที่เพิ่มเงื่อนไขนี้จากไฟล์ที่อ่าน นี่เป็นข้อจำกัดจาก schema ใน repo ไม่ใช่ผลยืนยันว่าเจาะฐานข้อมูล live ได้แล้ว

**ต้องแก้:** บังคับเขียนผลผ่านเส้นทางที่คำนวณและตรวจสิทธิ์จริง เช่น transactional RPC ที่ออกแบบสิทธิ์อย่างรัดกุม; กัน client ปลอมผลหรืออ้าง parent ที่ไม่มีสิทธิ์ ตรวจสิทธิ์ปัจจุบันตอนคำนวณ/อ่าน/replay แยกสิทธิ์ดู listing จากสิทธิ์ใช้หลักฐาน DNA; กำหนดผลต่อประวัติ/cache เมื่อ unlike, ซ่อน listing, ถอน consent หรือลบแมว

**เกณฑ์ผ่าน:** ทดสอบ DB จริงด้วยผู้ใช้ A/B/anonymous รวม direct table write, forged result, parent ของคนอื่น, hidden/deleted parent และถอนสิทธิ์ระหว่าง request; ไม่มีผล/หลักฐานส่วนตัวรั่ว และไม่ใช้ cache เก่าหลังหมดสิทธิ์ การกดใจเพียงอย่างเดียวไม่ถือเป็นหลักฐาน DNA consent

## P5-06 — ตรวจข้อมูลตอน runtime ก่อนเข้าโมเดล

**หลักฐาน:** TypeScript types ไม่ตรวจ payload ตอน runtime; target action ใช้ labels/opts โดยยังไม่มี schema validation ชัดเจน; `allelesInModel` ใช้ every โดยไม่ตรวจความยาว tuple; demo phenotype mapper ใช้ includes("ยาว"/"สั้น"); topK ถูกส่งเข้า slice โดยไม่มี domain validation เฉพาะ

**ต้องแก้:** กำหนด schema สำหรับ IDs/labels/demo options, genotype สอง allele ตาม registry, target codes และ topK จำนวนเต็มในขอบเขต; map phenotype ด้วย canonical code หรือรายการค่าที่รองรับแน่นอน ปฏิเสธ/คืนสถานะไม่รองรับสำหรับข้อความกำกวม; ตั้ง contract ว่า scenario set ว่างคือข้อมูลไม่พอหรือ conflict ไม่ใช่ช่วง 0–0

**เกณฑ์ผ่าน:** เพิ่ม tests ก่อนแก้สำหรับ null/ชนิดผิด, genotype ว่าง/หนึ่ง/สาม allele, ค่านอกโมเดล, phenotype เช่น “ไม่ทราบว่าขนสั้นหรือยาว”, topK NaN/ติดลบ/เศษส่วน และ empty scenario set ต้องไม่ throw แบบหลุดการจัดการหรือปล่อยผล computed ที่ไม่มีความหมาย ไม่อ้างว่าทุกกรณีเหล่านี้เป็น bug ที่พิสูจน์ด้วยการรันแล้วในรอบนี้

## P5-07 — Budget และความหมายของ coverage

**หลักฐาน:** scenarioBounds แจกแจงทุกคู่ scenario; target ประเมินและ sort ผู้สมัครทั้งหมด ยังไม่พบ runtime budget enforcement ในเส้นทางเหล่านี้; coverage.omitted ใช้กับแมวที่ถูกกรอง ส่วนความไม่ครบของโมเดลอยู่คนละ field/status

**ต้องทำ:** วัดเวลาบนขนาดข้อมูลที่รองรับจริงก่อนกำหนด candidate/scenario limits; กำหนดแยก pool completeness, evaluation completeness, model/evidence completeness และจำนวนที่ถูกกรองกับจำนวนที่ไม่ประเมิน ประเมินครบแต่ถูก hard constraint ไม่ใช่เหตุผลว่าค้นหาไม่ครบ ถ้าหยุดกลางทางให้ searchComplete=false พร้อม omitted reasons/budget status และห้ามเรียก partial ranges ว่าขอบเขตครบ

**เกณฑ์ผ่าน:** ทดสอบ ณ limit/เกิน limit, cancellation, counts, deterministic ranking/tie-break และ topK; มี benchmark และเป้าหมายเวลาที่ทีมตกลง ไม่จำเป็นต้องสร้าง Monte Carlo เพื่อผ่าน Phase 5 ถ้า exact/scenario ยังอยู่ใน budget

## P5-08 — หลักฐานรับตรวจผ่าน UI/server/DB

**หลักฐาน:** ชุด E2E ที่ตรวจมี auth, route protection, responsive และ CRUD เป็นหลัก ยังไม่พบ analysis E2E ที่ยืนยันค่าผลและ history ครบเส้นทาง; ผล 168 tests ใช้ mock query ใน server-action tests ส่วน build/lint ที่ระบุในรายงานรอบที่ 2 เป็นบันทึกก่อนหน้า ไม่ใช่หลักฐาน build ของ working tree หลังทุกการแก้ล่าสุด

**ต้องทำ:** เพิ่ม E2E ของ pair และ target พร้อมข้อมูลทดสอบแยกจากข้อมูลผู้ใช้ ครอบคลุม demo/default, computed/scenario/unsupported/conflict/blocked, error/empty/partial, history และถอนสิทธิ์ ตรวจ UI ภาษาไทยว่าช่วงไม่ถูกแสดงเป็นเปอร์เซ็นต์เดียว, null ไม่กลายเป็น 0%, warning/เวอร์ชัน/scope ยังเห็นบนมือถือ

**เกณฑ์ผ่าน:** แนบคำสั่ง/วันที่/commit หรือ snapshot/สภาพแวดล้อม/ผลรันสำหรับ tests, typecheck, lint ที่โปรเจกต์รองรับ, build, browser E2E และ DB isolation; เมื่อข้ามรายการให้ระบุเหตุผลและขอบเขตที่ยังไม่รับรอง ไม่ใช้ภาพหน้าจอหรือ HTTP 200 เป็นหลักฐาน end-to-end

## ลำดับทำงานที่เสนอ

1. P5-01 และ decision table ของ P5-02; ทำ P5-06 ควบคู่กับ validation ของ server inputs
2. ออกแบบ P5-04 และ P5-05 ร่วมกันก่อนเปิดบันทึกผล เพื่อไม่ให้ history สร้างช่องทางข้ามสิทธิ์
3. ดำเนิน P5-03 แยกตาม trait ที่ตั้งใจเปิด; คง demo gate จนผ่าน domain review
4. วัดและกำหนด P5-07 ตามขอบเขตจริง แล้วใช้ P5-08 ตรวจงานทั้งหมดหลังรวมการแก้

Bayesian Network/Variable Elimination, Dynamic Programming, Monte Carlo และ multi-trait genetics ใหม่ยังเป็นงานต่อยอด ไม่เพิ่มเข้าขอบเขต Phase 5 โดยอัตโนมัติ Guard ที่ปิดความสามารถเหล่านี้อย่างซื่อสัตย์เพียงพอจนกว่าจะมีโมเดล/ข้อมูลรองรับ

## Checklist ปิด Phase 5

- [~] P5-01 ข้อมูลครบ/ผิดพลาด/สาธิตแยกได้และมี tests (getAnalysisCandidates + provenance + searchComplete, ทดสอบระดับ mock แล้ว); **รอยืนยันบน DB จริง (P5-05/P5-08)**
- [~] P5-02 decision table เพศรวมศูนย์แล้ว (classifySexCompatibility) pair/target ใช้ร่วมกัน + surface unknown; **รอ domain review ขอบเขต welfare/health ก่อนปิด**
- [ ] P5-03 มีหลักฐานรับรองกฎทุก trait ที่ประกาศใช้จริง หรือจำกัด release เป็น demo ชัดเจน
- [ ] P5-04 ผลทั้งสองโหมดมี history/idempotency/provenance/replay ที่ตรวจได้
- [ ] P5-05 สิทธิ์และถอนข้อมูลผ่าน DB tests จริง
- [x] P5-06 payload และขอบเขตโมเดลผ่าน runtime validation (zod ที่ server action + isValidGenotype + canonical phenotype + topK guard + empty-set) พร้อมเทสต์
- [ ] P5-07 มีขอบเขตงาน/benchmark และรายงาน partial results ถูกต้อง
- [ ] P5-08 แนบผลรันครบเส้นทางของ revision ที่ส่งตรวจ

การเลือก demo release เป็นการจำกัดขอบเขตส่งมอบ ต้องระบุชัดว่ายังไม่ใช่การผ่าน Phase 5 สำหรับผลพันธุกรรมจริง
