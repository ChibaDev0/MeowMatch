/**
 * Mate specification — "ต้องใช้แมวคู่ผสมแบบไหนถึงจะได้ลูกตามเป้า" (single locus, exact)
 * (ต่อยอด reverse enumeration ใน 10-algorithm-design §3 / 07-genetics-engine §โหมด B)
 *
 * ต่างจาก analyzeTarget: อันนั้น "จัดอันดับแมวที่มีอยู่"; อันนี้ "อธิบายสเปกคู่ผสมที่ต้องการ"
 * แม้เจ้าของยังไม่มีแมวตัวนั้น — บอกว่า genotype/phenotype แบบไหนให้โอกาสเท่าไร และถ้า
 * ผสมครั้งเดียวไม่พอก็อธิบายแผนหลายรุ่นแบบ exact
 *
 * หลักการที่ห้ามละเมิด (เหมือนทั้ง engine):
 *  - ใช้ได้เฉพาะหมวดที่มี ruleset; ไม่มี → unsupported (รอ RES-01) ไม่เดาตัวเลข
 *  - รองรับทีละลักษณะ (single locus) — ไม่คูณ marginal ข้ามลักษณะ
 *  - source genotype ไม่ทราบ → ใช้ scenario set (ช่วง min/max) ไม่แทนด้วย allele ปกติ
 *  - phenotype ลำพังแยกพาหะไม่ได้ → ติดธงว่าต้องยืนยันด้วย DNA
 */
import type { TraitCategory } from "@/lib/validation/common";
import type { AnalysisParent } from "../contracts/input";
import type { Probability, TraitOutcomeStatus } from "../contracts/types";
import type { Genotype } from "../transmission/mendelian";
import {
  genotypeKey,
  offspringGenotypes,
  parseGenotypeKey,
  littersForTargetProbability,
} from "../transmission/mendelian";
import { RULESET_REGISTRY_VERSION, resolveRuleset } from "../rules/registry";
import { ENGINE_VERSION } from "../pair/analyze";

export interface MatePartnerOption {
  /** genotype ของคู่ผสม เช่น "l/l" (normalize แล้ว) */
  genotypeKey: string;
  /** phenotype ที่ genotype นี้แสดงออก เช่น "ขนยาว" */
  phenotypeLabel: string;
  phenotypeCode: string;
  /** โอกาสลูกตรงเป้าต่อหนึ่งครอก เมื่อ source แน่นอน (null เมื่อ source เป็น scenario) */
  probability: Probability;
  /** ช่วงโอกาสเมื่อ source genotype ยังไม่แน่นอน */
  lower?: number;
  upper?: number;
  /**
   * true เมื่อ phenotype นี้มีได้หลาย genotype (แยกพาหะด้วยตาไม่ได้)
   * → ต้องยืนยัน genotype ของคู่ด้วยผล DNA ก่อนเชื่อโอกาสนี้
   */
  genotypeNeedsDnaConfirmation: boolean;
  /** จำนวนครอก (เชิงคณิต) เพื่อให้โอกาสพบลูกตรงเป้า ≥ เกณฑ์ (เฉพาะเมื่อ probability แน่นอน) */
  littersFor?: { threshold: number; litters: number | null }[];
}

export interface BreedingPlanStep {
  generation: number;
  cross: string;
  expectation: string;
}

export interface MateSpecResult {
  kind: "mate_spec";
  category: TraitCategory;
  targetCode: string;
  targetLabel: string;
  status: TraitOutcomeStatus;
  /** genotype ของ source ถ้าทราบแน่นอน (จากผล DNA); ไม่ทราบ → ใช้ scenario */
  sourceGenotypeConfirmed: boolean;
  sourceScenario: string[];
  /** คู่ที่ผสมครั้งเดียวได้ลูกตรงเป้า 100% ภายใต้ทุก scenario ของ source */
  guaranteed: MatePartnerOption[];
  /** คู่ที่มีโอกาส > 0 แต่ไม่การันตี (ต้องอาศัยหลายครอก/หลายรุ่น) */
  possible: MatePartnerOption[];
  /** คู่ที่โอกาสเป็นศูนย์ภายใต้ทุก scenario (ไม่แนะนำ) */
  impossible: MatePartnerOption[];
  /** แผนการผสม (อาจเป็นขั้นเดียว หรือหลายรุ่นเมื่อครั้งเดียวไม่พอ) */
  plan: BreedingPlanStep[];
  ruleset: {
    id: string;
    version: string;
    verified: boolean;
    references: string[];
    assumptions: string[];
  };
  warnings: string[];
  versions: {
    engineVersion: string;
    rulesetVersion: string;
    inputSchemaVersion: string;
    resultSchemaVersion: string;
  };
}

const DEFAULT_THRESHOLDS = [0.9, 0.95, 0.99];

/** คู่ allele ที่เป็นไปได้ทั้งหมด (ไม่สนลำดับ) จากชุด allele ของ ruleset */
function allGenotypes(alleles: readonly string[]): Genotype[] {
  const out: Genotype[] = [];
  for (let i = 0; i < alleles.length; i++)
    for (let j = i; j < alleles.length; j++) out.push([alleles[i]!, alleles[j]!] as const);
  return out;
}

const UNSUPPORTED_NOTE =
  "หมวดนี้ยังไม่มีชุดกฎที่ผ่านการตรวจรับ (RES-01) — ยังระบุสเปกคู่ผสมไม่ได้ ไม่แต่งตัวเลข";

function base(
  category: TraitCategory,
  targetCode: string,
  status: TraitOutcomeStatus,
  warnings: string[],
): MateSpecResult {
  return {
    kind: "mate_spec",
    category,
    targetCode,
    targetLabel: targetCode,
    status,
    sourceGenotypeConfirmed: false,
    sourceScenario: [],
    guaranteed: [],
    possible: [],
    impossible: [],
    plan: [],
    ruleset: { id: "", version: "", verified: false, references: [], assumptions: [] },
    warnings,
    versions: {
      engineVersion: ENGINE_VERSION,
      rulesetVersion: RULESET_REGISTRY_VERSION,
      inputSchemaVersion: "1",
      resultSchemaVersion: "2",
    },
  };
}

export function requiredMateProfile(input: {
  source: AnalysisParent;
  category: TraitCategory;
  targetCode: string;
  allowUnverifiedRulesets?: boolean;
}): MateSpecResult {
  const { source, category, targetCode } = input;
  const allowUnverified = input.allowUnverifiedRulesets ?? false;

  const ruleset = resolveRuleset(category, allowUnverified);
  if (!ruleset) return base(category, targetCode, "unsupported", [UNSUPPORTED_NOTE]);

  const targetOutcome = ruleset.outcomes.find((o) => o.code === targetCode);
  if (!targetOutcome)
    return base(category, targetCode, "unsupported", [
      `เป้าหมาย "${targetCode}" ไม่อยู่ในชุดผลของกฎหมวดนี้`,
    ]);

  // genotype ของ source: ยืนยันแล้ว (DNA) → ชุดเดียว; ไม่งั้นแปลงจาก phenotype เป็น scenario set
  const confirmed = source.genotype?.[category];
  const sourceSet: Genotype[] = confirmed
    ? [confirmed]
    : ruleset.phenotypeToGenotypes(source.phenotype[category]) ?? [];
  if (sourceSet.length === 0)
    return base(category, targetCode, "insufficient_data", [
      "ข้อมูลลักษณะของแมวตั้งต้นไม่พอจะระบุชุดยีน (กรอกลักษณะที่ชัดเจน หรือเพิ่มผล DNA)",
    ]);

  const result = base(category, targetCode, "computed", []);
  result.targetLabel = targetOutcome.labelTh;
  result.sourceGenotypeConfirmed = Boolean(confirmed);
  result.sourceScenario = sourceSet.map((g) => genotypeKey(g));
  result.ruleset = {
    id: ruleset.id,
    version: ruleset.version,
    verified: ruleset.verified,
    references: [...ruleset.references],
    assumptions: [...ruleset.assumptions],
  };

  // phenotype ที่มีได้หลาย genotype → ดูด้วยตาแยกไม่ได้ ต้อง DNA
  const genotypesByPhenotype = new Map<string, number>();
  for (const g of allGenotypes(ruleset.alleles)) {
    const code = ruleset.genotypeToOutcome(g).code;
    genotypesByPhenotype.set(code, (genotypesByPhenotype.get(code) ?? 0) + 1);
  }

  // genotype ที่ให้ผลตรงเป้า — ใช้ตรวจว่าเป็น recessive-homozygous เพื่อวางแผนหลายรุ่น
  const targetGenotypes = allGenotypes(ruleset.alleles).filter(
    (g) => ruleset.genotypeToOutcome(g).code === targetCode,
  );
  const recessiveHomozygousTarget =
    targetGenotypes.length === 1 && targetGenotypes[0]![0] === targetGenotypes[0]![1];

  /** โอกาสลูกตรงเป้า เมื่อ source=gS × partner=gP */
  function targetProb(gS: Genotype, gP: Genotype): number {
    let p = 0;
    for (const [childKey, w] of offspringGenotypes(gS, gP)) {
      if (ruleset!.genotypeToOutcome(parseGenotypeKey(childKey)).code === targetCode) p += w;
    }
    return p;
  }

  const scenarioSource = sourceSet.length > 1;

  for (const gP of allGenotypes(ruleset.alleles)) {
    const probs = sourceSet.map((gS) => targetProb(gS, gP));
    const min = Math.min(...probs);
    const max = Math.max(...probs);
    const phenotype = ruleset.genotypeToOutcome(gP);
    const needsDna = (genotypesByPhenotype.get(phenotype.code) ?? 0) > 1;

    const option: MatePartnerOption = {
      genotypeKey: genotypeKey(gP),
      phenotypeLabel: phenotype.labelTh,
      phenotypeCode: phenotype.code,
      probability: scenarioSource ? null : probs[0]!,
      genotypeNeedsDnaConfirmation: needsDna,
    };
    if (scenarioSource) {
      option.lower = min;
      option.upper = max;
    } else {
      option.littersFor = DEFAULT_THRESHOLDS.map((threshold) => ({
        threshold,
        litters: littersForTargetProbability(probs[0]!, threshold),
      }));
    }

    if (min >= 1) result.guaranteed.push(option);
    else if (max <= 0) result.impossible.push(option);
    else result.possible.push(option);
  }

  // เรียงให้คู่ที่โอกาสสูงอยู่บน
  const score = (o: MatePartnerOption) => o.probability ?? o.upper ?? 0;
  result.guaranteed.sort((a, b) => score(b) - score(a) || a.genotypeKey.localeCompare(b.genotypeKey));
  result.possible.sort((a, b) => score(b) - score(a) || a.genotypeKey.localeCompare(b.genotypeKey));
  result.impossible.sort((a, b) => a.genotypeKey.localeCompare(b.genotypeKey));

  result.status = scenarioSource ? "scenario_range" : "computed";
  result.plan = buildPlan({
    sourceName: source.name,
    targetLabel: targetOutcome.labelTh,
    guaranteed: result.guaranteed,
    possible: result.possible,
    recessiveHomozygousTarget,
    targetGenotypeKey: targetGenotypes[0] ? genotypeKey(targetGenotypes[0]) : null,
    scenarioSource,
  });

  // คำเตือนตามสถานะ
  if (!ruleset.verified)
    result.warnings.push(
      "โหมดสาธิตคณิตศาสตร์ (ชุดกฎที่ยังไม่ผ่านการตรวจรับ) — ตัวเลขเป็นตัวอย่างการคำนวณ ไม่ใช่ผลจริง",
    );
  if (scenarioSource)
    result.warnings.push(
      "ยังไม่ทราบชุดยีนที่แน่นอนของแมวตั้งต้น — แสดงเป็นช่วงโอกาส ยืนยันด้วยผล DNA เพื่อระบุจำนวนครอกที่ชัดเจน",
    );
  if (result.guaranteed.some((o) => o.genotypeNeedsDnaConfirmation) ||
      result.possible.some((o) => o.genotypeNeedsDnaConfirmation))
    result.warnings.push(
      "คู่ผสมบางแบบมีลักษณะภายนอกเหมือนกันแต่ชุดยีนต่างกัน (พาหะ) — ดูด้วยตาแยกไม่ได้ ต้องยืนยันด้วยผล DNA",
    );
  result.warnings.push(
    "ระบุได้เฉพาะลักษณะ coat_type (ชนิดขน) เท่านั้น — พันธุ์ สี ลาย และชนิดหู ยังไม่มีชุดกฎรองรับ (รอ RES-01)",
  );

  return result;
}

function buildPlan(args: {
  sourceName: string;
  targetLabel: string;
  guaranteed: MatePartnerOption[];
  possible: MatePartnerOption[];
  recessiveHomozygousTarget: boolean;
  targetGenotypeKey: string | null;
  scenarioSource: boolean;
}): BreedingPlanStep[] {
  const { sourceName, targetLabel } = args;
  // ผสมครั้งเดียวได้ → แผนขั้นเดียว
  if (args.guaranteed.length > 0) {
    const g = args.guaranteed[0]!;
    return [
      {
        generation: 1,
        cross: `${sourceName} × คู่ที่มีชุดยีน ${g.genotypeKey} (ลักษณะ${g.phenotypeLabel})`,
        expectation: `ลูกทุกตัวเป็น${targetLabel} (100%) ในครอกเดียว`,
      },
    ];
  }
  if (args.possible.length === 0) return [];

  const best = args.possible[0]!;
  const perLitter =
    best.probability != null
      ? `${Math.round(best.probability * 100)}% ต่อครอก`
      : `${Math.round((best.lower ?? 0) * 100)}–${Math.round((best.upper ?? 0) * 100)}% ต่อครอก (ขึ้นกับชุดยีนจริงของแมวตั้งต้น)`;
  const steps: BreedingPlanStep[] = [
    {
      generation: 1,
      cross: `${sourceName} × คู่ที่มีลักษณะ${best.phenotypeLabel} (ชุดยีน ${best.genotypeKey})`,
      expectation: `โอกาสได้ลูก${targetLabel} ประมาณ ${perLitter}`,
    },
  ];
  // เป้าหมายแบบด้อย-โฮโมไซกัส: ลูกที่ตรงเป้าจะมี genotype แน่นอน → รุ่นถัดไปการันตีได้
  if (args.recessiveHomozygousTarget && args.targetGenotypeKey) {
    steps.push({
      generation: 2,
      cross: `ลูก${targetLabel}ที่ได้ (ชุดยีน ${args.targetGenotypeKey}) × คู่ลักษณะ${targetLabel} (${args.targetGenotypeKey})`,
      expectation: `ลูก${targetLabel}ที่ออกมาในรุ่นแรกมีชุดยีน ${args.targetGenotypeKey} แน่นอน นำไปผสมกับคู่ชุดยีนเดียวกันจะได้ลูก${targetLabel} 100% ในรุ่นถัดไป`,
    });
  }
  return steps;
}
