# EX-G01 — แฟ้ม candidate FGF5

สถานะ: `AI_PROPOSED / HUMAN_APPROVAL_PENDING` · ไม่ได้ลงทะเบียนใน production

| ฟิลด์ | ค่า |
|---|---|
| Candidate ID | coat_type.fgf5_panel_exact |
| Candidate version | 0.1.0-candidate (ข้อเสนอชื่อเวอร์ชัน ไม่มี executable ruleset) |
| Candidate executable digest | null — ยังไม่มี artifact ของกฎจริง ห้ามใช้ hash ของเอกสารแทน |
| Trait / outcomes | coat_type / short, long เท่านั้น |
| Model ที่เสนอ | autosomal recessive; สอง chromosome haplotypes, transmission 1/2 ภายใต้สมมติฐานที่ต้องรับรอง |
| ประชากร/สายพันธุ์ที่รับรอง | PENDING — ไม่เหมารวมแมวทุกตัวจากหน้ารายงาน assay |
| Phenotype-only | ไม่ระบุ genotype จริงจากขนยาว/สั้นลำพัง; ไม่มี prior ให้ใช้ point estimate |
| ไม่รองรับ | hairless, สี/ลาย/ตา/หู, multi-trait joint, หลายรุ่น, unnormalized variant, no-call แทน N |
| ผู้ทบทวน genetics / lab / welfare | null / null / null |
| วันที่และหลักฐานอนุมัติ | null |

## Manifest ราย variant ที่ต้องเติมจากหลักฐานจริง

| Historical notation | ที่มา | Transcript accession/version | Genome build / normalized HGVS | Assay ID/version / lab alias | Phase / quality / no-call | สถานะ |
|---|---|---|---|---|---|---|
| ins356T | S1 Mut1 | PENDING | PENDING | PENDING | PENDING | ห้ามเปิด |
| 406 C>T; R136X | S1 Mut2 | PENDING | PENDING | PENDING | PENDING | ห้ามเปิด |
| del474T | S1 Mut3 | PENDING | PENDING | PENDING | PENDING | ห้ามเปิด |
| 475 A>C; T159P | S1 Mut4 | PENDING | PENDING | PENDING | resolve marker/causal disagreement S7 | ห้ามเปิด |
| c.577G>A; p.Ala193Thr | S3 | PENDING | PENDING | PENDING | full text/assay validation ยังขาด | ห้ามเปิด |

S1–S8 อ้างทะเบียนใน [แฟ้มหลักฐาน v0.2](../phase-5-expert-evidence.md) ตารางนี้ไม่ใช่ canonical HGVS manifest การจับคู่ M1–M4 กับ notation ต้องยืนยันจากผู้ตรวจ assay ไม่เดาจากลำดับแถว

## Fixtures อิสระที่ต้องตรวจ

[FX01–FX09](../phase-5-expert-evidence.md#6-fixtures-พร้อมเฉลยอิสระสำหรับรับ-review) มีเฉลยและสมมติฐานเดิม ลายนิ้วมือไฟล์หลักฐานอยู่ใน manifest ของแพ็กเกจ การเปลี่ยนเฉลยต้องเปลี่ยน digest และให้ผู้เชี่ยวชาญตรวจใหม่

ก่อนใช้เป็น golden fixtures ต้องระบุผู้จัดทำ/ผู้ตรวจเฉลยจริง, input haplotype ที่ normalize แล้ว, assay coverage, fixture hash, หลักฐานหน้า/ตารางต่อ mapping รวมถึง no-call, unknown allele, compound heterozygote, cis/trans, conflict และ scenario ที่ไม่มี prior

## เงื่อนไขเปิดและเพิกถอน

เปิดได้เมื่อ evidence accepted, rule approved และ consent active ครบทั้งสามชุด พร้อม scope/version/digest ตรงกันและ software/DB/UI acceptance ผ่านตามขอบเขต การเปลี่ยน assay, variant mapping, phase, penetrance หรือ evidence ที่ขัดแย้งต้องพักเวอร์ชันนั้นเพื่อ review ใหม่ ผู้รับผิดชอบเพิกถอนยังรอแต่งตั้ง จึงยังไม่เปิดใช้งานจริง
