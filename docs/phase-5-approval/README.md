# Phase 5 — ผลดำเนินงานจากแพ็กเกจขออนุมัติ

วันที่ 12 ตุลาคม 2026 · Asia/Bangkok · จัดทำโดยเซน (AI, งานวิศวกรรม)

ต้นทาง: [Claude Artifact — แพ็กเกจขออนุมัติ Phase 5](https://claude.ai/artifact/87Tg3ZPs9R89LZCrznTkJB), [แฟ้มหลักฐาน v0.2](../phase-5-expert-evidence.md), [รายการทบทวน](../phase-5-expert-review.md)

ผู้ใช้ให้ค้นข้อมูลและดำเนินงานต่อ จึงนำข้อเสนอที่จำกัดการแนะนำและเพิ่มความชัดเจนของผลมาทำเป็น **นโยบายซอฟต์แวร์แบบระมัดระวัง** เวอร์ชัน engine `0.2.0` ไม่ตีความคำสั่งนี้เป็นคำลงนามทางสัตวแพทย์ พันธุศาสตร์ หรือกฎหมาย การอนุมัติวิชาชีพทั้ง 19 ข้อยังคง `HUMAN_APPROVAL_PENDING` และ registry กฎจริงยังไม่เปิด

## สิ่งที่ทำในซอฟต์แวร์

- EX-W01/02: pair และ target ใช้ `assessPairEligibility` ร่วมกัน แมวตัวเดียวกัน เพศเดียวกันตามข้อมูล และรายงานหูพับอย่างน้อยหนึ่งฝ่ายระงับทั้งคู่ แม้ขอเฉพาะ coat_type; เก็บทุกเหตุผลเมื่อมีหลายข้อห้าม
- EX-W03: เพศไม่ทราบยังคำนวณแบบมีเงื่อนไขได้ แต่ไป `pendingCandidates` ไม่มีอันดับคะแนน ไม่ใช้โควตา topK และไม่นับใน eligibleCount; evaluatedCount นับทั้ง ranked/pending ที่คำนวณจริง
- EX-W04: `confirmed` หมายถึงต่างเพศตามข้อมูลเท่านั้น; `pairEligibility=model_only` ไม่ได้หมายถึงพร้อมสืบพันธุ์ ส่วน `conditional` และ `blocked` แยกจากสถานะคณิตศาสตร์ราย trait
- EX-W07: UI ภาษาไทยแยกรายการรอยืนยัน ไม่เรียกผล 100% ว่ารับรองธรรมชาติ เพิ่มข้อความจำกัดสุขภาพและการคำนวณ และใช้ชื่อ “อันดับคำนวณตามโมเดล”
- เก็บ artifact `engine-0.1.1.json` เดิม เพิ่ม `engine-0.2.0.json` และ result schema `2` ใช้กับผลใหม่; replay ของ artifact เก่าถูกปฏิเสธอย่างชัดเจน ไม่คำนวณย้อนหลังด้วยนโยบายใหม่แล้วอ้างว่าเหมือนเดิม ระบบเดิมยังไม่มี runtime สำหรับ replay หลายเวอร์ชัน
- แยกบันทึกคำตัดสินครบ 19 ข้อพร้อมช่องหลักฐาน/ขอบเขต/เวอร์ชัน/ผู้ตัดสิน ไม่มีชื่อหรือลายเซ็นผู้เชี่ยวชาญที่แต่งขึ้น

การไม่พบหูพับไม่ใช่ผลตรวจ TRPV4-negative ข้อมูลหูใช้ค่าที่รู้จักแบบตรงตัว (trim/case-normalized) ไม่ค้นคำว่า “พับ” ภายในประโยค เช่น “ไม่ใช่หูพับ” และไม่วินิจฉัย genotype จากข้อความ ยังไม่มีช่องรับหลักฐาน TRPV4 ที่ผ่านการรับรองหรือข้อห้ามสุขภาพครบทุกด้าน

## หลักฐานที่ตรวจเพิ่มเติมในรอบนี้

| ID | แหล่งปฐมภูมิ/เจ้าของ assay | สิ่งที่นำมาใช้และขอบเขตการอ่าน |
|---|---|---|
| R1 | [UC Davis VGL — Scottish Fold](https://vgl.ucdavis.edu/test/scottish-fold) | อ่านคำอธิบายและผล N/SF, SF/SF: หนึ่งสำเนาเกี่ยวข้องกับผลต่อกระดูกอ่อน; ไม่ใช้คำนวณความรุนแรงรายตัว การระงับทุก trait เป็นการเลือกนโยบายผลิตภัณฑ์ของรอบนี้ |
| R2 | [UC Davis VGL — Long Hair](https://vgl.ucdavis.edu/test/long-hair-cat) | อ่านคำอธิบายผลและ Additional Details: assay ตรวจสี่ mutation ที่ระบุ และยอมรับว่ามี mutation อื่นได้ จึงไม่เปลี่ยน N/N เป็นการรับรองทุก variant |
| R3 | [Shaffer et al. 2021, PMID 34599367](https://pubmed.ncbi.nlm.nih.gov/34599367/) | ตรวจ bibliographic metadata ผ่าน search; direct PubMed/DOI เปิดไม่สำเร็จในรอบนี้ จึงยังไม่มีหลักฐานว่าตรวจ full text/supplement/assay validation ครบ |
| R4 | [Gandolfi et al. 2010, KRT71](https://pmc.ncbi.nlm.nih.gov/articles/PMC2974189/) | เปิดฉบับ PMC ได้และอ่าน abstract จาก PubMed; สนับสนุนการคง hairless แยกจาก FGF5 ยังไม่ได้รับรอง mapping ราย variant |
| R5 | [Matsumoto et al. 2026, DOI 10.1002/age.70114](https://pubmed.ncbi.nlm.nih.gov/42087835/) | อ่าน abstract และ conflict-of-interest: รายงาน heterozygous cats ที่หูเปลี่ยนจากพับเป็นตั้ง ข้อมูลนี้ย้ำว่ารูปลักษณ์อย่างเดียวไม่ยืนยัน genotype; ไม่ใช้สัดส่วนในตัวอย่างเป็น prior ของประชากรผู้ใช้ |

เข้าถึง 12 ตุลาคม 2026 ไม่มีการอ้างว่าทำ systematic review หรือทวนสอบงานวิจัยทุกชุด การอ่านเอกสารกับการรับรองกฎผลิตภัณฑ์เป็นคนละขั้น

## บันทึกคำตัดสินทั้ง 19 ข้อ

| กลุ่ม | บันทึก | สถานะงานซอฟต์แวร์/สิ่งที่เหลือ |
|---|---|---|
| Welfare ขอบเขตทั้งคู่ | [EX-W01](decisions/EX-W01.md), [EX-W02](decisions/EX-W02.md) | ข้อห้ามซอฟต์แวร์ทำแล้ว; ยังรอ professional review และทางรับ DNA จริง |
| เพศ/ความหมายสถานะ | [EX-W03](decisions/EX-W03.md), [EX-W04](decisions/EX-W04.md) | แยก pending และ model-only แล้ว; ยังไม่กำหนดว่าหลักฐานใดเป็นการยืนยันเพศทางวิชาชีพ |
| สุขภาพ/หลักฐานขัดกัน | [EX-W05](decisions/EX-W05.md), [EX-W06](decisions/EX-W06.md) | คงคำเตือนและ conflict guard เดิม; ยังไม่มี threshold สุขภาพหรือ workflow รายงานหลายฉบับที่รับรอง |
| ข้อความ UI | [EX-W07](decisions/EX-W07.md) | เพิ่มข้อความขอบเขตและ pending UI แล้ว; ยังรอผู้รับผิดชอบตรวจถ้อยคำ |
| FGF5 | [EX-G01](decisions/EX-G01.md) | ดู [candidate dossier](fgf5-candidate.md); ไม่เปิดกฎจริง |
| Hairless / trait อื่น | [EX-G02](decisions/EX-G02.md), [EX-G03](decisions/EX-G03.md) | ยังคง unsupported ไม่แทนด้วยศูนย์ |
| Joint / prior / หลายรุ่น | [EX-G04](decisions/EX-G04.md), [EX-G05](decisions/EX-G05.md) | คง guards; ไม่เพิ่ม prior หรือคูณ marginals โดยไม่มีโมเดล |
| ผู้ให้สิทธิ์ / วัตถุประสงค์ | [CP01](decisions/CP01.md), [CP02](decisions/CP02.md) | คงข้อเสนอ ไม่เปิดรับรายงาน DNA จนมี ownership/consent workflow |
| ถอนสิทธิ์ / history | [CP03](decisions/CP03.md), [CP04](decisions/CP04.md) | ยังต้องตกลง effective time/SLA/retention และทดสอบ DNA withdrawal race จริง |
| โอนเจ้าของ / รายงานแก้ไข / ผู้ตรวจ | [CP05](decisions/CP05.md), [CP06](decisions/CP06.md), [CP07](decisions/CP07.md) | ยังต้องมี consent/evidence workflow ฝั่ง server พร้อม audit และทดสอบสิทธิ์จริง |

ข้อมูลเครื่องอ่าน: [decisions.json](decisions.json) · ลายนิ้วมือเอกสาร/ซอร์ส: [manifest.json](manifest.json)

## การตรวจรับรอบนี้

ดู [ผลตรวจรับ](verification.md) สำหรับคำสั่ง ผลจริง และข้อจำกัด ไม่ใช้การผ่าน unit/component tests แทนการทดสอบ browser, live DB หรือ domain approval

## งานที่ยังปิดไม่ได้จากการค้นข้อมูลอย่างเดียว

1. ผู้ทบทวนจริงตรวจ normalized variant/assay manifest และลงนาม scope/digest/fixtures ของกฎที่จะเปิด ใช้ [แฟ้ม FGF5](fgf5-candidate.md) ส่งต่อได้
2. เจ้าของนโยบายกำหนดผู้ให้สิทธิ์ วัตถุประสงค์ retention ระยะถอนสิทธิ์และผู้รับผิดชอบ จากนั้นจึงพัฒนา DNA evidence/consent ingestion และทดสอบ DB จริง การกดใจไม่ใช่ DNA consent
3. งาน P5-04 UI/history, P5-07 budget/cancellation และ P5-08 app E2E ที่อยู่นอกแพ็กเกจอนุมัตินี้ยังติดตามใน [backlog](../phase-5-remaining-work.md) ไม่ปิด Phase 5 ทั้งระยะจากการแก้ข้อห้ามรอบนี้

ทุกการเปลี่ยนกฎหรือหลักฐานที่มีผลต่อผลลัพธ์ต้องออกเวอร์ชันใหม่และ review ใหม่ แก้ manifest เพื่อเตรียมรอบใหม่ได้ แต่ห้ามนำ digest ใหม่ไปแทนรุ่นที่ลงนามย้อนหลัง
