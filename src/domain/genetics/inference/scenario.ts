/**
 * Scenario manager — จัดการกรณี genotype พ่อแม่ "ไม่ทราบแน่นอน" (10-algorithm-design §2)
 *
 * หลักการที่ห้ามละเมิด:
 *  - ไม่มี prior → ห้ามให้น้ำหนักแต่ละ scenario เท่ากัน; รายงานเป็น "ช่วง min/max" ของกรณีที่ครอบคลุม
 *  - ช่วงนี้ไม่ใช่ confidence interval และใช้ได้ต่อเมื่อแจกแจง scenario ครบ
 *  - แปลง genotype → phenotype ผ่าน ruleset เท่านั้น แล้วรวม outcome ที่เท่ากัน
 */
import { offspringGenotypes, parseGenotypeKey } from "../transmission/mendelian";
import type { Genotype } from "../transmission/mendelian";
import type { PhenotypeRuleset } from "../rules/types";

/** ช่วงความน่าจะเป็นของ outcome หนึ่งค่าภายใต้ scenario set */
export interface OutcomeBound {
  lower: number;
  upper: number;
}

/**
 * distribution ของ phenotype ลูก เมื่อ "ทราบ genotype พ่อแม่แน่นอน" (computed case)
 * คืน Map<outcomeCode, probability> ซึ่งผลรวม = 1
 */
export function outcomeDistribution(
  a: Genotype,
  b: Genotype,
  ruleset: PhenotypeRuleset,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [key, p] of offspringGenotypes(a, b)) {
    const outcome = ruleset.genotypeToOutcome(parseGenotypeKey(key));
    out.set(outcome.code, (out.get(outcome.code) ?? 0) + p);
  }
  return out;
}

/**
 * ช่วง min/max ของแต่ละ outcome เมื่อ genotype พ่อแม่เป็น "ชุด scenario"
 * แจกแจงทุกคู่ (a,b) ในชุด คำนวณ distribution เต็มรูป (outcome ที่ไม่ปรากฏ = 0)
 * แล้วเก็บค่าต่ำสุด/สูงสุดของแต่ละ outcome ข้ามทุกคู่
 */
export function scenarioBounds(
  aSet: readonly Genotype[],
  bSet: readonly Genotype[],
  ruleset: PhenotypeRuleset,
): Map<string, OutcomeBound> {
  const bounds = new Map<string, OutcomeBound>();
  for (const a of aSet) {
    for (const b of bSet) {
      const dist = outcomeDistribution(a, b, ruleset);
      for (const o of ruleset.outcomes) {
        const p = dist.get(o.code) ?? 0;
        const cur = bounds.get(o.code);
        bounds.set(
          o.code,
          cur
            ? { lower: Math.min(cur.lower, p), upper: Math.max(cur.upper, p) }
            : { lower: p, upper: p },
        );
      }
    }
  }
  return bounds;
}
