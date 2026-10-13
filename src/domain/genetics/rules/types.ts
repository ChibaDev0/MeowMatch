/**
 * Phenotype ruleset — ชั้นแปลง genotype ↔ phenotype (ฟังก์ชัน F)
 *
 * ruleset = "ข้อมูลของโมเดล" (กฎการถ่ายทอดแบบง่าย) แยกจาก algorithm ที่คำนวณ
 * ทุก ruleset มีเวอร์ชันและ id เพื่อ audit/replay ได้
 *
 * โปรเจกต์นี้เป็นการทดลองความน่าจะเป็น: ชุดกฎที่มีเป็นโมเดลตำราแบบง่าย (verified=false)
 * เปิดใช้ผ่าน allowUnverifiedRulesets ซึ่งหน้าใช้งานเปิดเป็นค่าเริ่มต้น
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
  /** โมเดลทดลองทั้งหมดเป็น false; flag นี้สงวนไว้เผื่อมีโมเดลที่ทบทวนแล้วในอนาคต */
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
