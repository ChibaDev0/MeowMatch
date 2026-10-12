# P5-07 — Benchmark ของ genetics engine

วันที่ 12 ตุลาคม 2026 · ขอบเขต: benchmark ระดับ engine ด้วยข้อมูลสังเคราะห์

## วิธีรันซ้ำและหลักฐาน

รัน `npm run benchmark:genetics` จาก checkout นี้ ผลดิบอยู่ที่ [phase-5-latest.json](benchmarks/phase-5-latest.json) แต่ละรอบจะเขียนทับไฟล์นี้ จึงควรเก็บสำเนาหรือ commit ก่อนรันใหม่ ไฟล์บันทึกเวลา UTC พร้อมเขตเวลา Asia/Bangkok, revision, working tree, SHA256 ของ engine/fixtures, รุ่น Node, CPU และ RAM โดยไม่อ่านข้อมูลผู้ใช้หรือ credentials

ใช้ Node environment แยกจาก jsdom และ unit suite รันทีละ worker; อุ่นเครื่อง 10 samples แล้ววัด 40 samples รายงาน p50/p95 แบบ nearest-rank และค่าสูงสุด เก็บเวลาทุก sample เพื่อให้ตรวจซ้ำได้ pair/scenario วัด batch ละ 100 ครั้งแล้วหารจำนวนครั้ง ดังนั้น p95 ส่วนนั้นเป็น percentile ของค่าเฉลี่ย batch ไม่ใช่ tail latency รายคำขอ ส่วน target วัดหนึ่งคำขอต่อ sample

การสร้าง fixture, assertions และ JSON serialization อยู่นอกเวลาที่จับ ขนาด input/result เป็นจำนวนไบต์ UTF-8 ของ JSON ไม่ใช่ heap usage หรือขนาด immutable history snapshot ไม่มีการตั้ง timing assertion ที่ทำให้เครื่องช้าถูกตีความเป็นข้อผิดพลาดทางคณิตศาสตร์

## Workload และการตรวจความถูกต้อง

- Pair: exact และ scenario ขนสั้น × ขนสั้น; scenario function วัด 2×2 ซึ่งเป็นชุดใหญ่สุดที่ mapper ของ demo ปัจจุบันสร้างได้ ไม่สร้าง scenario ซ้ำแล้วอ้างว่าเป็นโมเดลใหม่
- Target: ผู้สมัคร 0, 100, 1,000, 10,000 และ 10,001 ตัว แต่ละขนาดมี exact, scenario, mixed และ default gate พร้อม topK=0, 10 และทั้งหมด รวม 60 workload และ pair/scenario อีก 3 workload
- Mixed: สลับคู่เพศเดียวกัน, ข้อมูลไม่พอ, scenario และ exact ตรวจ filtered/evaluated counts แยกกัน
- ตรวจผล exact=100%, scenario=0–25% และ probability=null; default gate ยัง unsupported และ null
- ตรวจว่าการกลับลำดับ input ให้ผลจัดอันดับเดิม, topK เป็นเพียงการตัดรายการแสดง, pool ไม่ครบให้ searchComplete=false

เพดาน query ปัจจุบันคือ 50 แถว × 200 หน้า = 10,000 ตัว การวัด 10,001 เป็นการเรียก engine ตรงเหนือเพดาน query **ไม่ใช่หลักฐานว่ามี runtime limit หรือ cancellation แล้ว** ตัว engine ยังประเมินทุกตัวที่รับมา

## ผลรันที่บันทึก

รอบสุดท้ายใช้เวลา 48.27 วินาที รวม 63 workload (หนึ่ง benchmark test) บน Windows x64, Node v24.14.0, Intel Core i5-13500, RAM ประมาณ 31.75 GiB ไม่รัน typecheck/unit/lint พร้อมกับรอบวัดสุดท้าย ผล target ด้านล่างคืนอันดับทั้งหมด:

| กรณี | จำนวนผู้สมัคร | p50 (ms) | p95 (ms) | สูงสุด (ms) |
|---|---:|---:|---:|---:|
| Exact | 1,000 | 2.178 | 3.015 | 3.143 |
| Scenario | 1,000 | 7.015 | 7.592 | 7.962 |
| Exact | 10,000 | 23.824 | 25.274 | 28.165 |
| Scenario | 10,000 | 103.648 | 124.338 | 140.602 |
| Mixed | 10,000 | 28.798 | 29.803 | 32.415 |
| Default gate | 10,000 | 7.660 | 9.054 | 10.786 |
| Scenario | 10,001 | 73.807 | 87.435 | 104.853 |

Pair exact p95 = 0.004275 ms, pair scenario = 0.013761 ms และ scenario function 2×2 = 0.008640 ms (ทั้งหมดเป็นค่าเฉลี่ยต่อ batch) ผล scenario 10,000 ตัวมี input JSON 1,240,229 ไบต์ และ result JSON 2,040,582 ไบต์ ขนาดผลลัพธ์นี้ควรวัดต่อในเส้นทางเว็บ/history ก่อนเปิดใช้

10,001 ตัวที่เร็วกว่า 10,000 ตัวไม่ใช่หลักฐานว่าเพิ่มข้อมูลแล้วเร็วขึ้น: workload รันตามลำดับและได้รับผลจาก JIT/GC/ภาระเครื่อง จึงใช้เป็น baseline ของแต่ละกรณี ไม่สรุปเส้น scaling แบบแม่นยำหรืออ้าง throughput หลายผู้ใช้จากการกลับค่า latency

การตรวจประกอบ: benchmark ผ่าน, unit/integration 201/201 ผ่าน, typecheck และ lint ผ่าน ไม่รัน build/E2E/live DB ใหม่เพราะรอบนี้เพิ่มชุดวัดและเอกสาร ไม่แก้ runtime แอป ผลครั้งแรกใน sandbox ติด EPERM ตอนอ่าน Vitest และ lint ติด Access denied ของ SWC; รันซ้ำนอก sandbox สำเร็จ

## เป้าหมายเวลาสำหรับพิจารณา

เสนอ engineering target เบื้องต้น: target 10,000 ตัว p95 ไม่เกิน 1,000 ms ต่อคำขอในเครื่องอ้างอิง และ pair/scenario ค่าเฉลี่ย batch p95 ไม่เกิน 1 ms ต่อครั้ง ต้องให้ทีมตกลงและวัดบนเครื่อง deployment ก่อนถือเป็นเกณฑ์รับตรวจที่อนุมัติแล้ว ไม่ใช่ SLA ของหน้าเว็บ

## ขอบเขตที่ยังไม่ปิด

รายงานนี้ทำส่วน benchmark ของ P5-07 ไม่ปิด P5-07 ทั้งรายการ ยังต้องออกแบบ/ทดสอบ runtime budget, cancellation, พฤติกรรม ณ limit/เกิน limit และแยก pool/evaluation/model/evidence completeness ใน contract การกรอง hard constraints ต้องไม่ถูกตีความว่าค้นหาไม่ครบ และช่วงจาก scenario ที่แจกแจงไม่ครบต้องไม่แสดงเสมือนเป็นช่วงครบ

ยังไม่ได้วัด DB/network/auth, history persistence/snapshot จริง, browser, cold start, heap peak หรือหลายผู้ใช้พร้อมกัน ข้อมูลทดสอบนี้ไม่ใช่ candidate pool จริง ผลเร็วของ default gate ไม่ใช่ความเร็วของกฎจริงที่ผู้เชี่ยวชาญรับรอง และไม่ได้เปลี่ยน `verified=false` หรือเปิด history

RES-01 และ P5-08 ยังคงเป็นเกณฑ์แยกตาม [งานคงเหลือ Phase 5](phase-5-remaining-work.md)
