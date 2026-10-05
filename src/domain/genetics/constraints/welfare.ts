/**
 * Welfare gate — เงื่อนไขสวัสดิภาพที่ "คะแนน/ความน่าจะเป็นสูงมาชดเชยไม่ได้"
 * (MeowMatch/07-genetics-engine §Welfare gate)
 *
 * รุ่นแรกครอบคลุมเฉพาะกฎที่ระบุชัดในเอกสาร:
 *  - ไม่แนะนำการจับคู่เพื่อสร้าง fold-associated variant; คู่ Fold × Fold ถูก block
 *    (Scottish Fold สัมพันธ์กับ TRPV4 — แม้ copy เดียวก็มีความเสี่ยงต่อกระดูก/กระดูกอ่อน)
 * เกณฑ์สุขภาพ/อายุ/ความพร้อมผสมอื่นต้องให้ผู้เชี่ยวชาญกำหนดก่อนใช้งานจริง — ยังไม่ตั้งค่าเดา
 */
import type { AnalysisParent } from "../contracts/input";

/** รูปลักษณ์หูที่บ่งชี้ Scottish Fold (หูพับ) จากข้อความที่เจ้าของกรอก */
function looksFold(parent: AnalysisParent): boolean {
  const ear = parent.phenotype.ear_type;
  return !!ear && ear.includes("พับ");
}

export interface WelfareFinding {
  /** หมวดที่ถูกระงับผล (เช่น ear_type) */
  category: "ear_type";
  reason: string;
  references: string[];
}

/**
 * ตรวจ welfare สำหรับการวิเคราะห์คู่
 * คืนรายการ finding (ว่าง = ไม่พบประเด็น) — ชั้น analyze จะแปลงเป็น status "blocked" + warning
 */
export function checkPairWelfare(a: AnalysisParent, b: AnalysisParent): WelfareFinding[] {
  const findings: WelfareFinding[] = [];
  if (looksFold(a) && looksFold(b)) {
    findings.push({
      category: "ear_type",
      reason:
        "คู่ Fold × Fold (หูพับทั้งคู่) ถูกระงับคำแนะนำ เพราะเกี่ยวข้องกับความเสี่ยงด้านกระดูก/กระดูกอ่อน (TRPV4) — ระบบไม่ออกแบบให้หูพับเป็นเป้าหมายด้านความสวย",
      references: ["UC Davis VGL — Scottish Fold: https://vgl.ucdavis.edu/test/scottish-fold"],
    });
  }
  return findings;
}
