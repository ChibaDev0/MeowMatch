import type { AnalysisParent } from "../contracts/input";
import { classifySexCompatibility } from "./biology";
import { checkPairWelfare } from "./welfare";

/** Conservative product policy, not veterinary clearance or a verified genetics rule. */
export function assessPairEligibility(a: AnalysisParent, b: AnalysisParent) {
  const sexCompatibility = classifySexCompatibility(a, b);
  const reasons: { code: string; reason: string; references: string[] }[] = [];
  if (a.catId === b.catId) {
    reasons.push({ code: "same_as_source", reason: "ไม่สามารถจับคู่แมวตัวเดียวกันได้", references: [] });
  }
  if (sexCompatibility === "incompatible") {
    reasons.push({ code: "same_sex", reason: "ข้อมูลระบุว่าแมวทั้งสองเป็นเพศเดียวกัน — ระงับคำแนะนำการจับคู่", references: [] });
  }
  reasons.push(...checkPairWelfare(a, b).map((finding) => ({ ...finding, code: "welfare_blocked" })));
  return {
    sexCompatibility,
    status: reasons.length > 0 ? "blocked" as const : sexCompatibility === "unknown" ? "conditional" as const : "model_only" as const,
    reasons,
  };
}

export const MODEL_LIMITATION = "โอกาสนี้คำนวณตามกฎและหลักฐานที่ระบุ ไม่ใช่การรับรองลักษณะหรือสุขภาพของลูกแมวแต่ละตัว";
export const HEALTH_LIMITATION = "การคำนวณลักษณะลูกไม่ได้ยืนยันความพร้อมด้านสุขภาพ อายุ การทำหมัน หรือความเกี่ยวดองของคู่นี้ และหูตั้งไม่ใช่หลักฐานว่าผลตรวจ TRPV4 เป็นลบ";
