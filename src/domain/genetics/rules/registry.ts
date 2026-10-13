/**
 * Rule registry — จุดเดียวที่ค้น ruleset ตามหมวด trait
 *
 * โปรเจกต์นี้เป็น "การทดลองความน่าจะเป็น" — ชุดกฎที่มีเป็นโมเดลตำราแบบง่าย
 * (single-locus) ไว้คำนวณโอกาสของลักษณะลูก ไม่ใช่ผลตรวจ DNA จริงของแมว
 *
 * หลักการ:
 *  - ทุก ruleset ปัจจุบันเป็นโมเดลทดลอง (verified=false) → ต้องเปิดโหมดทดลอง
 *    (allowUnverified=true) จึงจะนำมาคำนวณ ซึ่งเป็นค่าเริ่มต้นของหน้าใช้งาน
 *  - flag `verified` สงวนไว้เผื่ออนาคต (เช่นถ้ามีโมเดลที่ทบทวนแล้ว) — ตอนนี้ไม่มีผลต่อสโคป
 *  - ไม่มี ruleset สำหรับหมวดนั้น → engine คืนสถานะ "unsupported"
 */
import type { TraitCategory } from "@/lib/validation/common";
import type { PhenotypeRuleset } from "./types";
import { coatTypeDemoRuleset } from "./coat-type.demo";
import { coatColorDemoRuleset } from "./coat-color.demo";
import { coatPatternDemoRuleset } from "./coat-pattern.demo";

/** ruleset ทั้งหมดที่ลงทะเบียน (โมเดลทดลองสำหรับคำนวณความน่าจะเป็น) */
const ALL_RULESETS: readonly PhenotypeRuleset[] = [
  coatTypeDemoRuleset,
  coatColorDemoRuleset,
  coatPatternDemoRuleset,
];

/** เวอร์ชันรวมของ registry (เปลี่ยนเมื่อเพิ่ม/แก้ ruleset — ใช้ผูกกับผลเพื่อ replay) */
export const RULESET_REGISTRY_VERSION = "0.2.0-demo";

/**
 * ค้น ruleset ของหมวด trait
 * @param allowUnverified true = รวมโมเดลทดลอง (ค่าเริ่มต้นของหน้าใช้งานคือเปิด)
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
