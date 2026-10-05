/**
 * Phenotype ruleset — ชั้นแปลง genotype ↔ phenotype (ฟังก์ชัน F ใน 10-algorithm-design §1)
 *
 * ruleset = "ข้อมูลของโมเดล" (กฎพันธุกรรม) แยกจาก algorithm ที่คำนวณ
 * ทุก ruleset ต้องมีเวอร์ชันและสถานะ verified เพื่อ audit/replay (07-genetics-engine §MLOps)
 *
 * ⚠️ verified=false หมายถึง "ยังไม่ผ่านผู้เชี่ยวชาญ (RES-01)" — engine จะไม่ใช้คำนวณผลจริง
 *    ของผู้ใช้ เว้นแต่เปิด allowUnverifiedRulesets เพื่อ "โหมดสาธิตคณิตศาสตร์" เท่านั้น
 */
import type { TraitCategory } from "@/lib/validation/common";
import type { Genotype } from "../transmission/mendelian";

/** ผลลัพธ์ phenotype หนึ่งค่า (รหัสภายใน + ชื่อไทย) */
export interface PhenotypeOutcome {
  code: string;
  labelTh: string;
}

export interface PhenotypeRuleset {
  category: TraitCategory;
  /** รหัสเฉพาะของ ruleset เช่น "coat_type.fgf5_recessive_demo" */
  id: string;
  version: string;
  /** true เมื่อผ่านการตรวจรับของผู้เชี่ยวชาญ (RES-01) แล้วเท่านั้น */
  verified: boolean;
  /** allele ที่เป็นไปได้ใน locus นี้ */
  alleles: readonly string[];
  /** ค่า phenotype ที่เป็นไปได้ทั้งหมด (ใช้เติม distribution ให้ครบ) */
  outcomes: readonly PhenotypeOutcome[];
  /**
   * แปลงรูปลักษณ์ที่เจ้าของกรอก → ชุด genotype ที่สอดคล้อง (scenario set)
   * คืน null เมื่อ "ไม่รู้จักค่า label นี้" (→ insufficient_data ไม่ใช่ unsupported)
   */
  phenotypeToGenotypes(label: string | undefined): Genotype[] | null;
  /** แปลง genotype ลูก → phenotype ที่แสดงออก (ฟังก์ชัน F — ตอนนี้เป็น mapping 0/1) */
  genotypeToOutcome(g: Genotype): PhenotypeOutcome;
  references: string[];
  assumptions: string[];
}
