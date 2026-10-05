/**
 * Rule registry — จุดเดียวที่ค้น ruleset ตามหมวด trait (07-genetics-engine §MLOps "rule registry")
 *
 * หลักการ:
 *  - ค่าเริ่มต้นคืนเฉพาะ ruleset ที่ verified=true (ผ่าน RES-01) — ตอนนี้ยังไม่มี
 *  - allowUnverified=true ใช้สำหรับ "โหมดสาธิตคณิตศาสตร์" และ golden fixtures เท่านั้น
 *  - ไม่มี ruleset สำหรับหมวดนั้น → engine ต้องคืน status "unsupported"
 */
import type { TraitCategory } from "@/lib/validation/common";
import type { PhenotypeRuleset } from "./types";
import { coatTypeDemoRuleset } from "./coat-type.demo";

/** ruleset ทั้งหมดที่ลงทะเบียน (ยังไม่ verified สักตัวจนกว่าผู้เชี่ยวชาญตรวจ) */
const ALL_RULESETS: readonly PhenotypeRuleset[] = [coatTypeDemoRuleset];

/** เวอร์ชันรวมของ registry (เปลี่ยนเมื่อเพิ่ม/แก้ ruleset — ใช้ผูกกับผลเพื่อ replay) */
export const RULESET_REGISTRY_VERSION = "0.1.0-demo";

/**
 * ค้น ruleset ของหมวด trait
 * @param allowUnverified true = รวม ruleset ที่ยังไม่ผ่านตรวจรับ (โหมดสาธิต/ทดสอบ)
 */
export function resolveRuleset(
  category: TraitCategory,
  allowUnverified = false,
): PhenotypeRuleset | null {
  const match = ALL_RULESETS.find((r) => r.category === category);
  if (!match) return null;
  if (!match.verified && !allowUnverified) return null;
  return match;
}
