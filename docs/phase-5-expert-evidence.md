# Phase 5 — ข้อเสนอผู้เชี่ยวชาญและแฟ้มหลักฐาน v0.2

> **อัปเดตรอบดำเนินงาน 12 ต.ค. 2026:** ดู [ผลจากแพ็กเกจอนุมัติและบันทึกครบ 19 ข้อ](phase-5-approval/README.md) — engine 0.2.0 ใช้ข้อห้ามระดับคู่ร่วมกัน ระงับเมื่อรายงานหูพับอย่างน้อยหนึ่งฝ่าย และแยก unknown sex ออกจากอันดับแล้ว ภายใต้คำสั่งผู้ใช้ให้ค้นข้อมูลและทำต่อ เป็นนโยบายซอฟต์แวร์แบบระมัดระวัง ไม่ใช่ professional approval; รายการอนุมัติจริง/DNA consent ยังเปิด ข้อความพฤติกรรม runtime รุ่นก่อนด้านล่างเป็นประวัติ

จัดทำ 12 ตุลาคม 2026 (Asia/Bangkok) · สถานะ **AI_PROPOSED / HUMAN_APPROVAL_PENDING** · ไม่ใช่ใบรับรองทางสัตวแพทย์

ต่อยอด [รายการรับ review เดิม](phase-5-expert-review.md) และ [backlog Phase 5](phase-5-remaining-work.md) อ่านโค้ดปัจจุบันและค้นหลักฐานปฐมภูมิ แต่ไม่ได้เปลี่ยน engine, migrations, policy จริง หรือ verified=true เอกสารนี้เสนอคำตอบที่ผู้รับผิดชอบใช้ตัดสินได้ ไม่ลงนามแทนมนุษย์

## 1. ข้อสรุปที่นำไปตัดสินได้

1. เสนอให้ใช้ **decision table เดียวกันทั้ง pair/target** และระงับคำแนะนำทั้งคู่เมื่อมี welfare risk ไม่ให้เลือก trait อื่นเพื่อข้ามข้อห้าม การแสดงข้อมูลเชิงการศึกษาต้องแยกออกจาก flow แนะนำคู่และรออนุมัติ
2. FGF5 มีหลาย variant; l/l ใน demo เป็น abstraction ไม่ใช่รหัส DNA จริงของแมวทุกตัว เสนอเปิดผลจริงเฉพาะ panel/variant/haplotype ที่รับรอง และคง phenotype-only ใน demo/scenario ที่ขอบเขตได้รับอนุมัติเท่านั้น
3. Fold เพียงฝ่ายเดียวไม่ควรถูกตีความว่าไม่มีความเสี่ยง การเสนอระงับคำแนะนำในกรณีนี้เป็น **ข้อเสนอนโยบาย AI** ที่อาศัยหลักฐาน TRPV4 ไม่ใช่ข้อสรุปจากแหล่งวิจัยว่าต้องใช้ UI แบบใด
4. ผลตรวจ DNA ที่ accepted, กฎที่ approved และ consent ที่ active เป็นคนละสถานะ ต้องผ่านทุกสถานะก่อนใช้ข้อมูล
5. ฐานข้อมูล history ผ่านการตรวจบางส่วนแล้วตามรายงาน 12 ต.ค.; ห้ามย้อนกลับไปอ้างว่ายังไม่ apply หรือถือว่าผ่าน consent DNA ไปด้วย

## 2. ทะเบียนหลักฐานที่ตรวจในรอบนี้

วันที่เข้าถึงทุกแหล่ง: 12 ต.ค. 2026 ไม่ได้เก็บสำเนาต้นฉบับครบทุกแหล่งหรือรับรองว่าเป็น systematic literature review ควรเก็บ revision/digest ของหลักฐานที่อนุมัติในรอบลงนาม

| ID / ประเภท | แหล่งและสิ่งที่รองรับ | ขอบเขตการอ่าน/ข้อจำกัด |
|---|---|---|
| S1 / งานวิจัยปฐมภูมิ | Kehler et al., 2007, *Four Independent Mutations…*, DOI 10.1093/jhered/esm072: FGF5 และการถ่ายทอด recessive รวม compound heterozygotes; [PDF จาก Johns Hopkins](https://pages.jh.edu/ryugolab/pdfs/kehler_etal_2007_jhered.pdf) | อ่านส่วนวิธี genotyping, Table 2 และ Results/Discussion; พิกัดเป็น nomenclature ในงานปี 2007 ต้อง normalize เทียบ reference transcript ก่อน implement |
| S2 / เจ้าของ assay | [UC Davis VGL — Long Hair](https://vgl.ucdavis.edu/test/long-hair-cat): หน้า assay ระบุ M1–M4 และผล N/N, N/Mi, Mi/Mj | ไม่ใช้ข้อความหน้า panel แทนการยืนยันว่า assay ครอบคลุม variants ทั้งหมดที่ทราบในปัจจุบัน |
| S3 / งานวิจัยปฐมภูมิ | Shaffer et al., 2021, DOI 10.1007/s00439-021-02373-1, [PMID 34599367](https://pubmed.ncbi.nlm.nih.gov/34599367/): รายงาน c.577G>A, p.Ala193Thr ใน Maine Coon | ตรวจ abstract ที่ search provider คืนจาก PubMed; เปิดหน้าโดยตรง/DOI ไม่สำเร็จ จึงไม่อ้างว่าตรวจ full text, supplementary data หรือ assay validation แล้ว |
| S4 / งานวิจัยปฐมภูมิ | Gandolfi et al., 2016, DOI 10.1016/j.joca.2016.03.019, [PMID 27063440](https://pubmed.ncbi.nlm.nih.gov/27063440/): TRPV4 c.1024G>T / p.V342F เชื่อม folded ear และ osteochondrodysplasia | อ่าน abstract งานพันธุศาสตร์และ functional study; ไม่ใช้คำนวณความรุนแรงรายตัวจาก genotype |
| S5 / เจ้าของ assay | [UC Davis VGL — Scottish Fold](https://vgl.vetmed.ucdavis.edu/test/scottish-fold): N/SF อาจมีปัญหากระดูก/กระดูกอ่อนและ SF/SF มีความเสี่ยงรุนแรงกว่า; onset/progression แปรผัน | อ่าน Quick Summary/Explanation/Additional Details; ไม่มีสมการทำนายความรุนแรงสำหรับระบบนี้ |
| S6 / งานวิจัยปฐมภูมิ | Gandolfi et al., 2010, DOI 10.1007/s00335-010-9290-6, [PMID 20953787](https://pubmed.ncbi.nlm.nih.gov/20953787/): KRT71 variants ของ Sphynx/Devon Rex | อ่าน abstract; สนับสนุนให้แยก hairless ออกจากกฎ FGF5 ไม่รองรับการเหมารวมแมวไม่มีขนทุกแบบ |
| S7 / งานวิจัยปฐมภูมิ | Drögemüller et al., 2007, DOI 10.1111/j.1365-2052.2007.01590.x, [PMID 17433015](https://pubmed.ncbi.nlm.nih.gov/17433015/) | abstract กับ Discussion ของ S1 มีการตีความ marker/causality บางตำแหน่งต่างกัน ต้องให้ผู้เชี่ยวชาญ resolve ไม่รวมทุก SNP เป็น causal allele |
| S8 / ผู้ดำเนินการแล็บ | [VGL FAQ](https://vgl.ucdavis.edu/services/faq): ชื่อพ่อแม่ที่ผู้ส่งกรอกในรายงานไม่เท่ากับ DNA-verified parentage | ใช้แยก report identity, parentage และ genotype; ไม่ใช่ข้อกำหนด consent ของผลิตภัณฑ์ |

## 3. EX-W01–07: decision table ที่เสนอ

**ทั้งหมดเป็นข้อเสนอใหม่ ไม่ใช่พฤติกรรม runtime ที่แก้แล้ว** ผู้อนุมัติ: สัตวแพทย์ด้านสุขภาพ/การสืบพันธุ์และ welfare ร่วมกับนักพันธุศาสตร์ตามประเด็น และ product owner สำหรับนิยามสถานะ/การแสดงผล

ลำดับประเมินที่เสนอ: สิทธิ์ใช้ข้อมูล → ข้อห้ามระดับคู่ → หลักฐานขัดกัน → ข้อมูลจำเป็นไม่ครบ → กฎ/assay รองรับหรือไม่ → คำนวณ → จัดอันดับ เก็บ reasons ทั้งหมด ไม่ให้การเลือก primary status ลบเหตุผลอื่น การขัดแย้งเฉพาะ coat ต้องไม่ทำให้หลักฐาน health ที่มีปัญหาหายไป

| กรณี / decision | Pair ที่เสนอ | Target ที่เสนอ | เหตุผลและผู้รับรอง |
|---|---|---|---|
| ตัวเดียวกัน / เพศเดียวกันตามข้อมูลยืนยัน | blocked ทั้งคู่ | ไม่เข้าอันดับ | EX-W03/04: กำหนดความหมาย “ยืนยัน” และ provenance ของเพศ; ไม่เรียก opposite-sex ว่าผ่านสุขภาพ |
| Fold ทั้งสอง หรือมีผล TRPV4 risk ที่รับรองแล้วอย่างน้อยหนึ่งฝ่าย | blocked สำหรับคำแนะนำทุก trait | ตัดออกก่อนคะแนน | EX-W01/02: ข้อเสนอนโยบาย conservative จาก S4/S5; vet ต้องตัดสินเรื่องหน้าการศึกษาแยก |
| Fold เพียงฝ่ายเดียว อีกฝ่าย straight | พัก/ระงับคำแนะนำทั้งคู่ ไม่อ้าง “ปลอดภัย” | ไม่จัดเป็นคู่แนะนำ | EX-W02: S5 ระบุผลกระทบใน one-copy จึงห้ามใช้การไม่เกิด SF/SF เป็นตัวแทนสุขภาพดี |
| Fold หนึ่งฝ่าย อีกฝ่ายไม่ทราบ | ระงับคำแนะนำและระบุสิ่งที่ต้องตรวจเพิ่ม | ไม่เข้าอันดับ | known risk ไม่ถูก unknown ของอีกฝ่ายชดเชย; ไม่เดา genotype จากคำว่าหูพับ |
| ไม่มี Fold ที่รายงาน แต่สถานะหู/สุขภาพไม่ทราบ | ข้อมูลพันธุกรรมอื่นอาจคำนวณแบบมีเงื่อนไขได้; ไม่รับรองความเหมาะสมคู่ | กลุ่ม “รอข้อมูล” แยกจากอันดับแนะนำ | EX-W02/05: หูตรง/ไม่มีข้อความไม่ใช่ DNA-negative; vet กำหนดข้อมูลขั้นต่ำ |
| Sex=unknown ฝ่ายใดฝ่ายหนึ่ง | conditional พร้อมเหตุผล; ไม่กำหนดเป็น probability=0 | แสดงกลุ่มรอยืนยัน ไม่รวมอันดับแนะนำ | EX-W03: เป็นข้อเสนอเปลี่ยนจากโค้ดปัจจุบันที่ยัง rank unknown; ต้องอนุมัติก่อน |
| Opposite-sex ตามผู้ใช้กรอก | compatibility เฉพาะ “ตามข้อมูลเพศ” | ยังต้องผ่าน gate อื่น | EX-W04: ห้ามใช้ confirmed แทนรับรองความพร้อมสืบพันธุ์ |
| ทำหมันที่ยืนยันแล้ว/มีข้อห้ามจากสัตวแพทย์ | blocked สำหรับ pairing advice | ตัดก่อน ranking | EX-W05: ให้ vet กำหนด evidence ที่ยอมรับและขอบเขตข้อยกเว้น ไม่ให้ผู้ใช้ override ด้วยคะแนน |
| อายุ/สุขภาพ/ความเกี่ยวดองไม่ครบหรือข้อมูลหมดอายุ | needs_review; ไม่อนุมานว่าปลอดภัย | พักจากกลุ่มแนะนำ | EX-W05: อายุขั้นต่ำ/สูงสุด, เกณฑ์โรค, ระยะพัก, freshness และเกณฑ์ kinship ยัง PENDING; ไม่ตั้งเลขเอง |
| DNA–phenotype หรือรายงาน DNA ขัดกัน | conflicting_evidence สำหรับส่วนที่พึ่งข้อมูลนั้น; welfare ยังมีอำนาจระงับทั้งคู่ | ไม่จัดอันดับเป็นผลที่ยืนยันแล้ว | EX-W06: ให้ผู้ตรวจเช็กตัวอย่าง/panel/phase/ฉบับแก้ไข; ไม่เลือกฉบับใหม่สุดอัตโนมัติ |
| หลักฐานครบ แต่ trait ไม่อยู่ใน ruleset | unsupported, probability=null | ไม่ให้ joint probability | EX-W07: outcome ที่ไม่รองรับไม่ใช่โอกาสศูนย์ |

`conditional`/`needs_review` ในตารางเป็นแนวคิดของผลการประเมินความเหมาะสม ไม่ได้สั่งเพิ่ม enum ทับ `TraitOutcomeStatus` ทันที เสนอแยก `pairEligibility` กับ `traitInferenceStatus` เพื่อให้การคำนวณทางคณิตศาสตร์ไม่เท่ากับคำแนะนำผสมพันธุ์

### ข้อความไทยเสนอให้อนุมัติ (EX-W07)

- Unknown sex: “เพศของแมวอย่างน้อยหนึ่งตัวยังไม่ยืนยัน ผลนี้เป็นการคำนวณภายใต้สมมติฐาน และยังไม่จัดเป็นคู่แนะนำ”
- Welfare: “คู่นี้มีข้อมูลที่เกี่ยวข้องกับความเสี่ยงด้านสวัสดิภาพ ระบบระงับคำแนะนำการจับคู่ โปรดให้สัตวแพทย์ประเมินข้อมูลที่เกี่ยวข้อง”
- Health incomplete: “ข้อมูลสุขภาพหรือความพร้อมสืบพันธุ์ยังไม่ครบ การคำนวณลักษณะลูกไม่ได้ยืนยันว่าคู่นี้เหมาะสมสำหรับการผสมพันธุ์”
- Model result: “โอกาสนี้คำนวณตามกฎและหลักฐานที่ระบุ ไม่ใช่การรับรองลักษณะหรือสุขภาพของลูกแมวแต่ละตัว”
- Panel negative: “ไม่พบ variant ในรายการที่ตรวจ ไม่ได้ยืนยันว่าไม่มี variant อื่นนอกขอบเขตการตรวจ”
- Conflict: “หลักฐานบางส่วนขัดกัน จึงพักผลที่เกี่ยวข้องจนกว่าจะตรวจสอบรายงานและตัวตนตัวอย่างแล้ว”

## 4. EX-G01: FGF5 และขอบเขต assay

S1 รายงาน recessive inheritance และ compound heterozygosity; S3 ระบุ variant เพิ่มใน Maine Coon จึงไม่ควรยึด panel สี่ตำแหน่งเป็นการพิสูจน์ว่าตรวจครบทั้งหมด หน้า S2 ระบุ M1–M4 เท่านั้น ณ วันที่เข้าถึง **ข้ออนุมานเชิงระบบ:** ต้องเก็บรายการที่ assay ตรวจจริง ไม่ขยาย N/N ให้หมายถึง wild type ทั้ง gene โดยอัตโนมัติ

| ชื่ออ้างอิงในงาน | รายละเอียดสำหรับนำไปตรวจ normalization | สถานะเสนอ |
|---|---|---|
| S1 Mutation 1 | ins356T ตาม notation ในบทความ | รอผู้เชี่ยวชาญผูก transcript/build และ lab code |
| S1 Mutation 2 | 406 C>T; R136X | เช่นเดียวกัน |
| S1 Mutation 3 | del474T | เช่นเดียวกัน; ต้องทราบ haplotype/phase กับตำแหน่งใกล้เคียง |
| S1 Mutation 4 | 475 A>C; T159P | เช่นเดียวกัน; อย่านำ SNP ที่เป็น marker ใน S7 มารวมโดยไม่ review |
| S3 variant เพิ่ม | c.577G>A; p.Ala193Thr | evidence candidate; ต้องอ่าน full text/assay validation และยืนยัน aliases ก่อนเปิด |

ตารางนี้เป็น **historical notation register ไม่ใช่ canonical HGVS manifest** ข้อมูลยังขาด transcript accession/version, genome build, normalized HGVS, assay identifier/version, analytic sensitivity/no-call rules และ human review ไม่อนุมัติรายการเป็น production allele จากตารางนี้

### สัญญาโมเดลที่เสนอให้ review

- `N` หมายถึง haplotype ที่ไม่มี causal allele **ในขอบเขตที่อนุมัติและตรวจได้**; `a`, `b` ใน fixtures คือคนละ accepted loss-of-function haplotype ภายใต้โมเดล ไม่ใช่สตริง L/l ที่ใช้แทนผล DNA โดยไม่ mapping
- ต้องมีสอง chromosome haplotypes ไม่ใช่นับจำนวน positive sites แล้วสรุปเป็นสอง mutant alleles หาก phase ไม่ทราบให้แจกแจง feasible cis/trans scenarios; ห้ามคูณ sites ภายใน gene ราวกับอิสระ
- Phenotype ขนสั้นอย่างเดียวไม่แยก N/N จาก N/a; phenotype ขนยาวอย่างเดียวไม่ระบุ variant หรือ phase ให้ผลจริงเป็น insufficient_data/unsupported ตาม scope ที่อนุมัติ หรือช่วงเมื่อมี feasible set ที่ตรวจครบ ไม่ตั้ง prior 50/50
- โมเดลกำหนด 1/2 transmission ต่อ parental haplotype, ไม่มี mutation/selection และ mapping outcome ตามกฎที่อนุมัติ สิ่งใดไม่อยู่ในสมมติฐานต้องระบุไม่รองรับ
- เสนอ rule ใหม่ `coat_type.fgf5_panel_exact` version `0.1.0-candidate` แยกจาก demo; ยังเป็นชื่อ/เวอร์ชันเสนอ ไม่ได้สร้าง registry entry และ approval=PENDING

## 5. EX-G02–05: ขอบเขตที่ยังปิด

| ประเด็น | ข้อเสนอและเหตุผล |
|---|---|
| Hairless | คง unsupported; S6 เป็นหลักฐานว่าต้องพิจารณา KRT71/ขอบเขต phenotype แยก ไม่อนุมานจาก FGF5 short outcome |
| สี/ลาย/ตา/หู | คง unsupported ใน engine นี้ ไม่กล่าวว่าทางวิทยาศาสตร์คำนวณไม่ได้ เพียงยังไม่มี rule+assay+fixture ที่อนุมัติ; TRPV4 welfare rule ไม่เท่ากับอนุญาตตั้งเป้าหูพับ |
| หลาย traits | คง joint guard; การเพิ่ม ruleset ที่สองไม่อนุมัติ independence ต้องระบุ dependency/phase และมี joint fixtures ก่อนเปิด |
| Priors | ไม่มี approved population/likelihood จึงคง scenario mode; ความถี่ในชุดงานวิจัยไม่ใช่ prior ของประชากรผู้ใช้โดยอัตโนมัติ |
| หลายรุ่น | ยังปิด DP/Monte Carlo production; ไม่ทำเป็น blocker ของขอบเขต exact หนึ่ง locus ที่อนุมัติแล้ว และไม่ใช้จำนวนลูกเชิงคณิตศาสตร์เป็นคำแนะนำให้เพิ่มการผสม |

## 6. Fixtures พร้อมเฉลยอิสระสำหรับรับ review

**Fixture pack v0.2-candidate; human validation=PENDING** ตัวเลขด้านล่างคำนวณด้วยตาราง gametes สี่ช่องด้วยมือ ไม่เรียก production engine ไม่ใช่การรับรองแมวจริง สมมติ a/b เป็น causal haplotypes คนละแบบที่ accepted แล้ว, recessive mapping และครบ assay/phase ไม่มี uncertainty อื่น

| ID | พ่อแม่ | เฉลยอิสระ (สี่ช่องโอกาสเท่ากัน) | โอกาส long ตามโมเดล |
|---|---|---|---|
| FX01 | N/a × N/a | N/N, N/a, N/a, a/a | 1/4 |
| FX02 | N/a × a/b | N/a, N/b, a/a, a/b | 1/2 |
| FX03 | a/b × a/b | a/a, a/b, a/b, b/b | 1 |
| FX04 | N/N × a/b | N/a, N/b, N/a, N/b | 0; ทุกตัวเป็น carrier ในโมเดล |
| FX05 | {N/N หรือ N/a} × a/a; ไม่มี prior | scenario 1: long=0; scenario 2: long=1/2 | probability=null; bounds=[0,1/2] |
| FX06 | positive a และ b แต่ไม่ทราบ cis/trans × N/N | cis [ab]/N: 1/2 N/[ab], 1/2 N/N; trans a/b: 1/2 N/a, 1/2 N/b | long=0 ทั้งสอง scenario ภายใต้สมมติฐาน; carrier range=[1/2,1] แสดงว่า phase ยังสำคัญ |
| FX07 | no-call, panel ขาด variant จำเป็น หรือไม่รู้จัก allele | ไม่สร้าง N แทนสิ่งที่หาย | null + insufficient_data/unsupported ตามสาเหตุ |
| FX08 | สมมติ trait A และ B คือ event เดียวกัน P=1/2 | P(A∩B)=1/2 | ห้ามคืน 1/4 จาก marginal multiplication |
| FX09 | สมมติมี shared parent state: chance=0.6 ที่ลูกแต่ละตัวมี p=0.5; อีก state p=0; ลูก 4 ตัว | 0.6×[1−(1−0.5)^4]+0.4×0 = 0.5625 | ไม่ใช่ 1−(1−0.3)^4 = 0.7599; prior นี้เป็นตัวอย่าง ไม่ใช่ prior แมวจริง |

FX06 ใช้ `[ab]` แทนสอง sites บน chromosome เดียว และ **สมมติ** ว่า haplotype นั้นเข้าข่าย causal ตาม rule ที่รับรอง ไม่ได้อ้างว่ามี haplotype นี้ในประชากรจริง ค่าทั้งหมดต้องผ่านผู้เชี่ยวชาญก่อนสร้าง golden fixtures ของกฎจริง

ตรวจเลขซ้ำวันที่ 12 ต.ค. ด้วยสคริปต์อิสระที่แจกแจง gametes สี่ช่องโดยไม่ import engine: FX01–04 ตรงเฉลยทั้ง 4 ข้อ และ FX09 ได้ 0.5625 เทียบกับ marginal shortcut 0.7599; exit code 0 เป็น arithmetic check เท่านั้น ไม่ใช่การรันทดสอบ production หรือ biological validation ส่วน FX05–08 เป็นตารางเหตุผล/สมมติฐานสำหรับผู้ทบทวน ยังไม่ใช่ regression tests ที่รันผ่าน

Policy fixtures เพิ่มเติม: Fold หนึ่ง/สองฝ่ายและตั้งเป้า coat-only ต้องได้ eligibility เหมือน decision table; unknown-sex ต้องไม่อยู่ ranked recommendations; withdraw consent แล้ว replay ไม่คืน payload; relike/re-consent ไม่ชุบผลเก่าที่ถูกเพิกถอน; no-call ไม่แสดง 0% tests เหล่านี้ต้อง implement หลัง decision approval ไม่ใช่รายงานว่าผ่านแล้ว

## 7. P5-05: ข้อเสนอ workflow DNA/consent และคำตัดสินนโยบาย

S8 แยกชื่อพ่อแม่ที่กรอกออกจาก verified parentage **ข้อเสนอระบบ:** เอกสารรายงานที่อ่านออกยังไม่พิสูจน์ว่าตัวอย่างเป็นของ cat ID นั้น ผู้ตรวจต้องบันทึกวิธีผูก sample/report/cat และระดับความมั่นใจโดยไม่แต่ง chain-of-custody ที่ไม่เคยมี

### สถานะสามชุดที่แยกกัน

- Evidence: submitted → identity_check → technical_review → accepted / rejected / needs_review; accepted → superseded / revoked เมื่อมีหลักฐานใหม่ ผู้ตรวจต้องเป็นบัญชีที่มีบทบาทและมี reason/audit event
- Rule: draft → domain_review → approved / rejected / revoked แยกจาก evidence ของแมวแต่ละตัว
- Consent: pending → active → withdrawn/expired/replaced; ต้องตรวจ scope และ subject/controller ทุกครั้งก่อน inference/read/replay ไม่ใช้ flag verified แทน consent

### ชุดข้อมูลรับรองที่เสนอ

cat ID และ identifier ที่ตรวจได้; report ID/issuer/version/digest; sample ID, ผู้เก็บและวันที่ถ้าทราบ; lab/panel version และ covered variants; transcript/build/nomenclature; genotype/haplotype และ phase confidence; no-call/quality flags; ผู้ตรวจตัวตนและผู้แปลผล, วันเวลา/เหตุผล; rule artifact version; consent record ID/scope/version ห้ามเก็บข้อมูลส่วนตัวผู้ส่งเกินความจำเป็นเพียงเพื่อ replay

| Policy ID | ข้อเสนอ AI | ใครต้องตัดสิน / สิ่งที่ยังขาด |
|---|---|---|
| CP01 ผู้ให้สิทธิ์ | สิทธิ์ดู listing/กดใจไม่ใช่สิทธิ์ใช้ DNA; ตรวจผู้มีอำนาจอนุญาตแยก | Product owner/ผู้รับผิดชอบข้อมูล: หลักฐานเจ้าของ/ผู้แทน และกรณี dispute |
| CP02 วัตถุประสงค์ | แยก consent สำหรับ pair, target, เก็บ history/replay, แชร์ผล และงานวิจัย/ฝึกโมเดล; งานวิจัยไม่เปิดตามค่าเริ่มต้น | Product/privacy owner อนุมัติ scope และข้อความ; ผู้เชี่ยวชาญกำหนดข้อจำกัดการใช้ผล |
| CP03 ถอนสิทธิ์ | ปิด inference/read/replay ที่พึ่งหลักฐานนั้นทันทีเมื่อ withdrawal มีผล; invalidate cache และ derived runs | Privacy/product owner กำหนด effective time/SLA, retention และข้อมูล audit ที่เก็บได้; ทีมวิศวกรรมทดสอบ race จริง |
| CP04 History | เสนอ tombstone ที่ไม่คืน DNA/snapshot/result ที่ถูกถอน ไม่ regenerate จาก cache; re-consent ใช้ run ใหม่ | Product/privacy owner ตัดสินระยะเก็บ metadata/เหตุผลการเก็บ; ผู้รับผิดชอบกฎหมายตรวจข้อบังคับที่ใช้จริง ไม่รับรองทางกฎหมายจากเอกสารนี้ |
| CP05 โอนเจ้าของ | ไม่โอน DNA consent ไปผู้รับใหม่อัตโนมัติ; ระงับสิทธิ์เก่าและให้เจ้าของใหม่ยืนยันอำนาจ | Product/privacy owner ตัดสินสิทธิ์รายงานเดิมและข้อพิพาท; แยกจาก trigger transfer ที่ DB ทดสอบแล้ว |
| CP06 รายงานแก้ไข | supersede รายงานเก่าแบบมีเหตุผลและติดธง runs ที่ได้รับผล; ไม่เลือกไฟล์ล่าสุดโดยอัตโนมัติ | ผู้ตรวจแล็บ/นักพันธุศาสตร์ตัดสินความถูกต้อง; product owner ตัดสินการแจ้งผู้ใช้ |
| CP07 ผู้ตรวจ/การอุทธรณ์ | แยก submitter จาก approver; สิทธิ์ผู้ตรวจถูกกำหนดฝั่ง server; ต้องอุทธรณ์/เพิกถอนได้ | Vet/genetics lead รับรองคุณสมบัติผู้ตรวจ; product/security owner ดูแลบทบาทและ audit |

ข้อเสนอ retention/consent ข้างต้นเป็นการออกแบบผลิตภัณฑ์ ไม่ใช่ข้อวินิจฉัยว่ากฎหมายใดอนุญาต/บังคับอะไร ต้องได้รับคำตอบจากผู้รับผิดชอบก่อน implement DNA collection จริง

## 8. สถานะใหม่และการส่งต่องาน

ตาม [รายงาน live DB 12 ต.ค.](phase-5-live-db.md): migration 0007 apply แล้ว; live acceptance 10/10 รวม permissions, replay/redaction, ownership transfer และ concurrent requests 20 คำขอ; baseline บันทึก 201 tests รอบนี้ไม่ได้รันซ้ำ **ไม่เปิดงาน DB ที่ผ่านแล้วกลับมาเป็น “ยังไม่ apply”** แต่ DNA genotype ถูกปฏิเสธในขอบเขตนั้น จึงไม่ใช้ผลผ่านแทน DNA consent acceptance

History ยังปิดรอ UI/refresh/E2E; P5-04 UI, P5-07 benchmark และ P5-08 E2E ให้ทีมวิศวกรรมดำเนินต่อได้ ไม่ต้องรอผู้เชี่ยวชาญทุกขั้น

| กลุ่มส่งอนุมัติ | ผู้รับผิดชอบ | สิ่งส่งกลับที่ต้องมี |
|---|---|---|
| EX-W01–07 / ตารางข้อ 3 | Vet welfare/reproduction + genetics ตามเรื่อง + product owner | approve/revise/reject ต่อแถว, เหตุผล/แหล่ง, ข้อความ UI, ชื่อจริง/คุณสมบัติ/เวลา/ลายเซ็นหรือหลักฐานยืนยัน |
| EX-G01–05 / ข้อ 4–6 | Feline geneticist + lab reviewer | normalized variant/assay manifest, full-text review ที่ขาด, scope/limitations, เฉลยที่ตรวจอิสระ, artifact/fixture digest |
| CP01–07 / ข้อ 7 | Product/privacy owner, vet/lab reviewer และผู้รับผิดชอบกฎหมายตามเรื่อง | scope/retention/withdrawal decisions, ข้อความ consent, reviewer workflow และ SLA ที่ตกลง |

Approval records ของทุกกลุ่มยัง PENDING ผู้จัดทำ AI ไม่มีสถานะเป็นผู้ลงนามวิชาชีพ อ่านหลักฐานแล้วไม่เท่ากับ approved release คง demo/unsupported gates จนได้คำอนุมัติที่ผูกกับเวอร์ชันจริง และผ่านการทดสอบ implementation ตามขอบเขตนั้น
