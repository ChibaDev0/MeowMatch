/**
 * Pair analysis orchestrator (โหมด A — 07-genetics-engine §โหมด A)
 *
 * ฟังก์ชันบริสุทธิ์: รับ input ที่ตรวจสิทธิ์แล้ว คืน PairAnalysisResult รูปแบบคงที่
 * ตัดสินสถานะรายลักษณะตามข้อมูลที่มีจริง — ไม่เติมเปอร์เซ็นต์ที่คำนวณไม่ได้:
 *   - ไม่มี ruleset ที่ใช้ได้           → unsupported
 *   - มี ruleset แต่ไม่รู้จักรูปลักษณ์  → insufficient_data
 *   - ทราบ genotype พ่อแม่แน่นอน        → computed (distribution รวม = 1)
 *   - ทราบเพียงชุด scenario (ไม่มี prior) → scenario_range (ช่วง min/max ไม่ใช่ CI)
 *   - welfare gate                      → blocked (ไม่ให้คำแนะนำ)
 */
import type { TraitCategory } from "@/lib/validation/common";
import type {
  PairAnalysisResult,
  TraitDistributionEntry,
  TraitResult,
} from "../contracts/types";
import type { AnalysisParent, PairAnalysisInput } from "../contracts/input";
import type { Genotype } from "../transmission/mendelian";
import type { PhenotypeRuleset } from "../rules/types";
import { RULESET_REGISTRY_VERSION, resolveRuleset } from "../rules/registry";
import { outcomeDistribution, scenarioBounds } from "../inference/scenario";
import { checkPairWelfare } from "../constraints/welfare";

export const ENGINE_VERSION = "0.1.0";
const INPUT_SCHEMA_VERSION = "1";
const RESULT_SCHEMA_VERSION = "1";

/** หา genotype set ของฝ่ายหนึ่งในหมวดหนึ่ง: ใช้ genotype ที่ยืนยันแล้วก่อน แล้วค่อย map จากรูปลักษณ์ */
function genotypeSetFor(
  parent: AnalysisParent,
  category: TraitCategory,
  ruleset: PhenotypeRuleset,
): Genotype[] | null {
  const verified = parent.genotype?.[category];
  if (verified) return [verified];
  return ruleset.phenotypeToGenotypes(parent.phenotype[category]);
}

function buildTrait(
  category: TraitCategory,
  input: PairAnalysisInput,
  blockedReasons: Map<TraitCategory, { reason: string; references: string[] }>,
): TraitResult {
  // 1) welfare gate มาก่อนเสมอ
  const blocked = blockedReasons.get(category);
  if (blocked) {
    return {
      category,
      status: "blocked",
      distribution: [],
      assumptions: [blocked.reason],
      references: blocked.references,
    };
  }

  // 2) ต้องมี ruleset ที่ใช้ได้
  const ruleset = resolveRuleset(category, input.allowUnverifiedRulesets ?? false);
  if (!ruleset) {
    return {
      category,
      status: "unsupported",
      distribution: [],
      assumptions: [
        "ยังไม่มีชุดกฎ (ruleset) ที่ผ่านการตรวจรับของผู้เชี่ยวชาญสำหรับลักษณะนี้ (RES-01)",
      ],
      references: [],
    };
  }

  // 3) หา genotype set ของทั้งสองฝ่าย
  const aSet = genotypeSetFor(input.a, category, ruleset);
  const bSet = genotypeSetFor(input.b, category, ruleset);
  const baseAssumptions = [
    ...ruleset.assumptions,
    ...(ruleset.verified ? [] : ["⚠️ โหมดสาธิตคณิตศาสตร์: ชุดกฎนี้ยังไม่ผ่านการตรวจรับ ไม่ใช่ผลสำหรับแมวจริง"]),
  ];

  if (!aSet || !bSet) {
    const missing: string[] = [];
    if (!aSet) missing.push(input.a.name);
    if (!bSet) missing.push(input.b.name);
    return {
      category,
      status: "insufficient_data",
      distribution: [],
      assumptions: [
        `ข้อมูลรูปลักษณ์ยังไม่พอ/ไม่รู้จักค่าของ: ${missing.join(", ")}`,
        ...baseAssumptions,
      ],
      references: ruleset.references,
    };
  }

  // 4) genotype แน่นอนทั้งคู่ → computed; ไม่งั้น → scenario_range
  const determined = aSet.length === 1 && bSet.length === 1;
  if (determined) {
    const dist = outcomeDistribution(aSet[0]!, bSet[0]!, ruleset);
    const distribution: TraitDistributionEntry[] = ruleset.outcomes.map((o) => ({
      outcomeCode: o.code,
      labelTh: o.labelTh,
      probability: dist.get(o.code) ?? 0,
    }));
    return {
      category,
      status: "computed",
      distribution,
      assumptions: baseAssumptions,
      references: ruleset.references,
    };
  }

  const bounds = scenarioBounds(aSet, bSet, ruleset);
  const distribution: TraitDistributionEntry[] = ruleset.outcomes.map((o) => {
    const b = bounds.get(o.code) ?? { lower: 0, upper: 0 };
    return { outcomeCode: o.code, labelTh: o.labelTh, probability: null, lower: b.lower, upper: b.upper };
  });
  return {
    category,
    status: "scenario_range",
    distribution,
    assumptions: [
      "ไม่ทราบ genotype พ่อแม่แน่นอนและไม่มี prior ที่ใช้ได้ — แสดงเป็นช่วงของกรณีที่เป็นไปได้ (ไม่ใช่ confidence interval และไม่ได้ถ่วงน้ำหนักเท่ากัน)",
      ...baseAssumptions,
    ],
    references: ruleset.references,
  };
}

export function analyzePair(input: PairAnalysisInput): PairAnalysisResult {
  const welfare = checkPairWelfare(input.a, input.b);
  const blockedReasons = new Map(
    welfare.map((w) => [w.category, { reason: w.reason, references: w.references }]),
  );

  const traits = input.categories.map((c) => buildTrait(c, input, blockedReasons));

  const omitted = traits
    .filter((t) => t.status === "unsupported" || t.status === "insufficient_data" || t.status === "blocked")
    .map((t) => `${t.category}: ${t.status}`);

  const warnings: string[] = welfare.map((w) => w.reason);
  if (input.allowUnverifiedRulesets) {
    warnings.push(
      "เปิดโหมดสาธิตคณิตศาสตร์ (ชุดกฎที่ยังไม่ผ่านการตรวจรับ) — ตัวเลขเป็นตัวอย่างการคำนวณ ไม่ใช่ผลจริงสำหรับแมวของคุณ",
    );
  }

  return {
    kind: "pair",
    traits,
    warnings,
    coverage: { complete: omitted.length === 0, omitted },
    versions: {
      engineVersion: ENGINE_VERSION,
      rulesetVersion: RULESET_REGISTRY_VERSION,
      inputSchemaVersion: INPUT_SCHEMA_VERSION,
      resultSchemaVersion: RESULT_SCHEMA_VERSION,
    },
  };
}
