/**
 * Pair analysis orchestrator (โหมด A — 07-genetics-engine §โหมด A)
 *
 * ฟังก์ชันบริสุทธิ์: รับ input ที่ตรวจสิทธิ์แล้ว คืน PairAnalysisResult รูปแบบคงที่
 * ตัดสินสถานะรายลักษณะตามข้อมูลที่มีจริง — ไม่เติมเปอร์เซ็นต์ที่คำนวณไม่ได้:
 *   - ไม่มี ruleset ที่ใช้ได้                  → unsupported
 *   - รูปลักษณ์ไม่รู้จัก / allele นอกโมเดล       → insufficient_data
 *   - phenotype ขัดกับ genotype ที่ยืนยัน       → conflicting_evidence
 *   - ทราบ genotype พ่อแม่แน่นอน               → computed (distribution รวม = 1)
 *   - ทราบเพียงชุด scenario (ไม่มี prior)        → scenario_range (ช่วง min/max ไม่ใช่ CI)
 *   - welfare gate / เพศผสมกันไม่ได้             → blocked (ไม่ให้คำแนะนำ)
 */
import type { TraitCategory } from "@/lib/validation/common";
import type {
  PairAnalysisResult,
  TraitDistributionEntry,
  TraitOutcomeStatus,
  TraitResult,
} from "../contracts/types";
import type { AnalysisParent, PairAnalysisInput } from "../contracts/input";
import type { Genotype } from "../transmission/mendelian";
import { genotypeKey } from "../transmission/mendelian";
import type { PhenotypeRuleset } from "../rules/types";
import { RULESET_REGISTRY_VERSION, resolveRuleset } from "../rules/registry";
import { outcomeDistribution, scenarioBounds } from "../inference/scenario";
import { checkPairWelfare } from "../constraints/welfare";
import { classifySexCompatibility, pairSexIncompatible } from "../constraints/biology";

export const ENGINE_VERSION = "0.1.1";
const INPUT_SCHEMA_VERSION = "1";
const RESULT_SCHEMA_VERSION = "1";

/** สถานะที่ถือว่า "ได้ผลที่ใช้ได้" — นอกเหนือจากนี้จะถูกรายงานใน coverage.omitted */
function isResolved(status: TraitOutcomeStatus): boolean {
  return status === "computed" || status === "scenario_range" || status === "estimated";
}

/** ผลการแปลงข้อมูลฝ่ายหนึ่งเป็นชุด genotype — แยกกรณีขัดแย้ง/ข้อมูลไม่พอออกชัดเจน */
type ParentResolution =
  | { kind: "genotypes"; set: Genotype[] }
  | { kind: "insufficient"; reason: string }
  | { kind: "conflict"; reason: string };

/**
 * genotype ที่ใช้ได้ต้องเป็น "คู่ allele สองตัว" และทุก allele อยู่ในโมเดลของ ruleset เวอร์ชันนี้
 * (P5-06 — ตรวจ runtime: ความยาว tuple + allele นอกโมเดล; ไม่เชื่อ type อย่างเดียว)
 */
function isValidGenotype(g: Genotype, ruleset: PhenotypeRuleset): boolean {
  return Array.isArray(g) && g.length === 2 && g.every((a) => ruleset.alleles.includes(a));
}

/**
 * แปลงข้อมูลฝ่ายหนึ่งในหมวดหนึ่งเป็นชุด genotype:
 *  - มี genotype ที่ยืนยัน → ตรวจ allele ในโมเดล (ALG-03) และความสอดคล้องกับ phenotype (ALG-02)
 *  - ไม่มี genotype → map จากรูปลักษณ์ (null = ไม่รู้จักค่า → insufficient)
 */
function resolveParent(
  parent: AnalysisParent,
  category: TraitCategory,
  ruleset: PhenotypeRuleset,
): ParentResolution {
  const geno = parent.genotype?.[category];
  const phenoLabel = parent.phenotype[category];

  if (geno) {
    if (!isValidGenotype(geno, ruleset)) {
      return {
        kind: "insufficient",
        reason: `genotype ของ ${parent.name} ไม่อยู่ในโมเดลเวอร์ชันนี้ (ต้องเป็นคู่ allele ${ruleset.alleles.join("/")})`,
      };
    }
    const phenoSet = ruleset.phenotypeToGenotypes(phenoLabel);
    if (phenoSet) {
      const key = genotypeKey(geno);
      const consistent = phenoSet.some((g) => genotypeKey(g) === key);
      if (!consistent) {
        return {
          kind: "conflict",
          reason: `รูปลักษณ์ที่กรอก (${phenoLabel}) ขัดกับผล genotype (${geno.join("/")}) ของ ${parent.name}`,
        };
      }
    }
    return { kind: "genotypes", set: [geno] };
  }

  const set = ruleset.phenotypeToGenotypes(phenoLabel);
  // null = ไม่รู้จักค่า/กำกวม; [] = scenario set ว่าง → ถือเป็นข้อมูลไม่พอ ไม่ใช่ช่วง 0–0 (P5-06)
  if (!set || set.length === 0) {
    return { kind: "insufficient", reason: `ข้อมูลรูปลักษณ์ยังไม่พอ/ไม่รู้จักค่าของ ${parent.name}` };
  }
  return { kind: "genotypes", set };
}

function blockedTrait(
  category: TraitCategory,
  reason: string,
  references: string[],
): TraitResult {
  return { category, status: "blocked", distribution: [], assumptions: [reason], references };
}

function buildTrait(
  category: TraitCategory,
  input: PairAnalysisInput,
  pairBlocked: { reason: string; references: string[] } | null,
  welfareByCategory: Map<TraitCategory, { reason: string; references: string[] }>,
): TraitResult {
  // 1) ข้อห้ามระดับคู่ (เพศผสมกันไม่ได้) → ระงับทุก trait
  if (pairBlocked) return blockedTrait(category, pairBlocked.reason, pairBlocked.references);

  // 2) welfare gate เฉพาะหมวด (เช่น Fold × Fold → ear_type)
  const welfare = welfareByCategory.get(category);
  if (welfare) return blockedTrait(category, welfare.reason, welfare.references);

  // 3) ต้องมี ruleset ที่ใช้ได้
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

  const a = resolveParent(input.a, category, ruleset);
  const b = resolveParent(input.b, category, ruleset);
  const baseAssumptions = [
    ...ruleset.assumptions,
    ...(ruleset.verified ? [] : ["⚠️ โหมดสาธิตคณิตศาสตร์: ชุดกฎนี้ยังไม่ผ่านการตรวจรับ ไม่ใช่ผลสำหรับแมวจริง"]),
  ];

  // 4) หลักฐานขัดกัน (phenotype vs genotype) มาก่อนข้อมูลไม่พอ
  if (a.kind === "conflict" || b.kind === "conflict") {
    const reasons = [a, b].filter((r) => r.kind === "conflict").map((r) => r.reason);
    return {
      category,
      status: "conflicting_evidence",
      distribution: [],
      assumptions: [...reasons, ...baseAssumptions],
      references: ruleset.references,
    };
  }

  if (a.kind === "insufficient" || b.kind === "insufficient") {
    const reasons = [a, b].filter((r) => r.kind === "insufficient").map((r) => r.reason);
    return {
      category,
      status: "insufficient_data",
      distribution: [],
      assumptions: [...reasons, ...baseAssumptions],
      references: ruleset.references,
    };
  }

  const aSet = a.set;
  const bSet = b.set;

  // 5) genotype แน่นอนทั้งคู่ → computed; ไม่งั้น → scenario_range
  const determined = aSet.length === 1 && bSet.length === 1;
  if (determined) {
    const dist = outcomeDistribution(aSet[0]!, bSet[0]!, ruleset);
    const distribution: TraitDistributionEntry[] = ruleset.outcomes.map((o) => ({
      outcomeCode: o.code,
      labelTh: o.labelTh,
      probability: dist.get(o.code) ?? 0,
    }));
    return { category, status: "computed", distribution, assumptions: baseAssumptions, references: ruleset.references };
  }

  const bounds = scenarioBounds(aSet, bSet, ruleset);
  const distribution: TraitDistributionEntry[] = ruleset.outcomes.map((o) => {
    const bnd = bounds.get(o.code) ?? { lower: 0, upper: 0 };
    return { outcomeCode: o.code, labelTh: o.labelTh, probability: null, lower: bnd.lower, upper: bnd.upper };
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
  // ข้อห้าม/สถานะระดับคู่ (P5-02 — decision table ร่วมกับโหมด target)
  const sexCompatibility = classifySexCompatibility(input.a, input.b);
  const sexBlocked = pairSexIncompatible(input.a, input.b)
    ? {
        reason: "แมวทั้งสองเป็นเพศเดียวกันที่ทราบแน่ จึงผสมกันให้เกิดลูกไม่ได้ — ระงับผลการวิเคราะห์",
        references: [] as string[],
      }
    : null;

  // หมายเหตุขอบเขต (P5-02): welfare แบบ Fold × Fold ระงับเฉพาะหมวด ear_type ในโหมด pair
  // (ผู้ใช้เลือกคู่นี้เอง จึงแสดงลักษณะอื่นได้) ต่างจากโหมด target ที่ "ไม่แนะนำ" คู่นี้จึงตัดทั้งตัว
  const welfare = checkPairWelfare(input.a, input.b);
  const welfareByCategory = new Map(
    welfare.map((w) => [w.category, { reason: w.reason, references: w.references }] as const),
  );

  const traits = input.categories.map((c) =>
    buildTrait(c, input, sexBlocked, welfareByCategory),
  );

  const omitted = traits
    .filter((t) => !isResolved(t.status))
    .map((t) => `${t.category}: ${t.status}`);

  const warnings: string[] = [];
  if (sexBlocked) warnings.push(sexBlocked.reason);
  else if (sexCompatibility === "unknown") {
    warnings.push(
      "เพศของแมวอย่างน้อยหนึ่งตัวยังไม่ยืนยัน — ผลเป็นการคำนวณภายใต้สมมติฐาน ยังไม่ยืนยันว่าคู่นี้ผสมกันได้",
    );
  }
  warnings.push(...welfare.map((w) => w.reason));
  if (input.allowUnverifiedRulesets) {
    warnings.push(
      "เปิดโหมดสาธิตคณิตศาสตร์ (ชุดกฎที่ยังไม่ผ่านการตรวจรับ) — ตัวเลขเป็นตัวอย่างการคำนวณ ไม่ใช่ผลจริงสำหรับแมวของคุณ",
    );
  }

  return {
    kind: "pair",
    traits,
    sexCompatibility,
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
