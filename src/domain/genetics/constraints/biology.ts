/**
 * ข้อจำกัดเชิงชีววิทยาระดับคู่ (hard constraint ใช้ร่วมทุกโหมด — pair และ target)
 * แยกจาก welfare gate: นี่คือ "ผสมกันไม่ได้ทางชีววิทยา" ไม่ใช่เรื่องความเสี่ยงสุขภาพ
 */
import type { AnalysisParent } from "../contracts/input";
import type { SexCompatibility } from "../contracts/types";

/**
 * จัดกลุ่มความเข้ากันด้านเพศของคู่ (P5-02 — decision table ใช้ร่วมทุกโหมด)
 *  - unknown      = อย่างน้อยหนึ่งตัวไม่ทราบเพศ → ยังไม่ยืนยันว่าผสมกันได้ (ไม่ใช่ข้อห้าม)
 *  - incompatible = ทราบเพศทั้งคู่และเป็นเพศเดียวกัน → ผสมกันไม่ได้ (hard block)
 *  - confirmed    = ทราบเพศทั้งคู่และคนละเพศ
 */
export function classifySexCompatibility(
  a: AnalysisParent,
  b: AnalysisParent,
): SexCompatibility {
  if (a.sex === "unknown" || b.sex === "unknown") return "unknown";
  return a.sex === b.sex ? "incompatible" : "confirmed";
}

/** เพศที่ทราบแน่และเป็นเพศเดียวกัน → ผสมกันให้เกิดลูกไม่ได้ (hard constraint) */
export function pairSexIncompatible(a: AnalysisParent, b: AnalysisParent): boolean {
  return classifySexCompatibility(a, b) === "incompatible";
}
