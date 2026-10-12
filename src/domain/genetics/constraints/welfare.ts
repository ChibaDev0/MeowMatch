/**
 * Welfare gate — เงื่อนไขสวัสดิภาพที่ "คะแนน/ความน่าจะเป็นสูงมาชดเชยไม่ได้"
 * (MeowMatch/07-genetics-engine §Welfare gate)
 *
 * รุ่นแรกครอบคลุมเฉพาะกฎที่ระบุชัดในเอกสาร:
 *  - ระงับคำแนะนำเมื่อมีรายงานหูพับอย่างน้อยหนึ่งฝ่าย (นโยบายระมัดระวัง ไม่ใช่การวินิจฉัย)
 *    (Scottish Fold สัมพันธ์กับ TRPV4 — แม้ copy เดียวก็มีความเสี่ยงต่อกระดูก/กระดูกอ่อน)
 * เกณฑ์สุขภาพ/อายุ/ความพร้อมผสมอื่นต้องให้ผู้เชี่ยวชาญกำหนดก่อนใช้งานจริง — ยังไม่ตั้งค่าเดา
 */
import type { AnalysisParent } from "../contracts/input";

/** รูปลักษณ์หูที่บ่งชี้ Scottish Fold (หูพับ) จากข้อความที่เจ้าของกรอก */
function looksFold(parent: AnalysisParent): boolean {
  const ear = parent.phenotype.ear_type;
  return typeof ear === "string" && ["หูพับ", "fold", "folded", "scottish fold"].includes(ear.trim().toLowerCase());
}

export interface WelfareFinding {
  /** ที่มาของ finding; ข้อห้ามมีผลระดับคู่ ไม่ใช่เฉพาะหมวดนี้ */
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
  if (looksFold(a) || looksFold(b)) {
    findings.push({
      category: "ear_type",
      reason:
        "มีข้อมูลหูพับ (Fold) อย่างน้อยหนึ่งฝ่าย ระบบระงับคำแนะนำทุกลักษณะเนื่องจากประเด็นสวัสดิภาพ โปรดให้สัตวแพทย์ประเมิน ข้อมูลรูปลักษณ์นี้ไม่ใช่ผลตรวจ TRPV4",
      references: ["UC Davis VGL — Scottish Fold: https://vgl.ucdavis.edu/test/scottish-fold"],
    });
  }
  return findings;
}
