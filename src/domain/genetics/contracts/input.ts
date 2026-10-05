/**
 * MeowMatch Genetics Engine — สัญญา input (contracts/input)
 *
 * หลักการจากเอกสาร (MeowMatch/07-genetics-engine §โหมด A, §รูปแบบผลลัพธ์):
 *  - engine รับเฉพาะ input ที่ "ตรวจสิทธิ์/ตรวจรูปแบบแล้ว" จากชั้น server เท่านั้น
 *    (ชั้น server เป็นผู้ยืนยัน ownership/consent — engine ไม่แตะ DB/LLM)
 *  - phenotype = รูปลักษณ์ที่เจ้าของกรอก (ข้อความที่ map เป็นรหัสภายใน)
 *  - genotype = ชุดยีนที่ "ยืนยันแล้ว" เท่านั้น (เช่นผล DNA) — client ปลอม verified ไม่ได้
 *  - ไม่ทราบ genotype ต้องปล่อยว่าง ห้ามแทนด้วย allele ปกติ
 */
import type { CatSex, TraitCategory } from "@/lib/validation/common";
import type { Genotype } from "../transmission/mendelian";

/** ฝ่ายพ่อแม่หนึ่งตัวที่ส่งเข้า engine (ข้อมูลผ่านการตรวจสิทธิ์จาก server แล้ว) */
export interface AnalysisParent {
  catId: string;
  name: string;
  sex: CatSex;
  /** รูปลักษณ์ที่เจ้าของกรอก ต่อหมวด trait (ค่าข้อความอย่างที่เก็บใน cats.*) */
  phenotype: Partial<Record<TraitCategory, string>>;
  /** genotype ที่ยืนยันแล้วต่อหมวด (เช่นผล DNA) — ปล่อยว่างเมื่อไม่ทราบ */
  genotype?: Partial<Record<TraitCategory, Genotype>>;
}

/** input ของการวิเคราะห์คู่ (โหมด A) */
export interface PairAnalysisInput {
  /** หมวด trait ที่ต้องการวิเคราะห์ (engine จะคืนผลครบทุกหมวดที่ขอ) */
  categories: readonly TraitCategory[];
  a: AnalysisParent;
  b: AnalysisParent;
  /**
   * เปิดใช้ ruleset ที่ "ยังไม่ผ่านการตรวจรับของผู้เชี่ยวชาญ" (demo คณิตศาสตร์เท่านั้น)
   * ค่าเริ่มต้น false — ผลจริงของผู้ใช้ต้องใช้เฉพาะ ruleset ที่ verified (RES-01)
   */
  allowUnverifiedRulesets?: boolean;
}

/** input ของการค้นหาคู่ตามเป้าหมาย (โหมด B — reverse search + constraint filtering + ranking) */
export interface TargetAnalysisInput {
  /** แมวตั้งต้น (ต้องเป็นของผู้ใช้ — ตรวจที่ชั้น server) */
  source: AnalysisParent;
  /**
   * เป้าหมายลูกแมว: outcome code ที่ต้องการต่อหมวด (เช่น { coat_type: "long" })
   * หมวดที่ไม่ได้ระบุ = "ไม่จำกัด" (ไม่สร้างเงื่อนไขเพิ่ม)
   */
  targets: Partial<Record<TraitCategory, string>>;
  /** รายการแมวผู้สมัครที่ "เข้าถึง/ยินยอมแล้ว" (เช่น แมวที่กดใจไว้) */
  candidates: readonly AnalysisParent[];
  allowUnverifiedRulesets?: boolean;
  /** คืนเฉพาะอันดับต้น ๆ (ค่าเริ่มต้น = ทั้งหมดที่ประเมินได้) */
  topK?: number;
}
