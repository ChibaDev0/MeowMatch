/**
 * Target search — reverse enumeration + constraint filtering + exact ranking
 * (10-algorithm-design §3, 07-genetics-engine §โหมด B)
 *
 * หลักการที่ห้ามละเมิด:
 *  - hard constraints มาก่อน: ตัวเดียวกัน, welfare (Fold×Fold), เพศที่ผสมกันไม่ได้ทางชีววิทยา
 *    "ความน่าจะเป็นสูงมาชดเชยข้อห้ามไม่ได้"
 *  - ไม่กรองพาหะทิ้ง: เป้าหมายลูกขนยาวไม่ตัดคู่ขนสั้นออก (คู่ขนสั้นอาจเป็นพาหะ L/l)
 *    → ใช้ engine คู่ (analyzePair) คำนวณโอกาส "ลูก" ตรงเป้าหมาย ไม่ใช่ phenotype ของคู่
 *  - target_probability = joint ของทุกเป้าหมาย; เป้าหมายที่ไม่รองรับ → คำนวณครบไม่ได้ (null)
 *  - ยังไม่มีโมเดล joint ของหลายลักษณะ → ไม่คูณ marginal มั่ว ๆ (ปิดไว้จนกว่าจะมี joint model)
 *  - จัดอันดับแบบแยกกลุ่มที่เปรียบเทียบกันได้ ไม่รวมเป็นคะแนนก้อนเดียว; tie-break ด้วย completeness แล้ว id
 */
import type { TraitCategory } from "@/lib/validation/common";
import type {
  RankedCandidate,
  TargetSearchResult,
  TraitOutcomeStatus,
} from "../contracts/types";
import type { AnalysisParent, TargetAnalysisInput } from "../contracts/input";
import { RULESET_REGISTRY_VERSION, resolveRuleset } from "../rules/registry";
import { assessPairEligibility, HEALTH_LIMITATION, MODEL_LIMITATION } from "../constraints/eligibility";
import { classifySexCompatibility } from "../constraints/biology";
import { analyzePair, ENGINE_VERSION } from "../pair/analyze";

type CandidateEval = RankedCandidate;

/** ลำดับกลุ่มสำหรับจัดอันดับ (เล็ก = มาก่อน) — computed ก่อน, แล้ว scenario, แล้วคำนวณไม่ได้ */
function statusRank(status: TraitOutcomeStatus): number {
  if (status === "computed") return 0;
  if (status === "scenario_range") return 1;
  return 2;
}

/** เลือกสถานะ "คำนวณไม่ได้" ที่สื่อความหมายที่สุดเมื่อมีหลายเป้าหมาย (ALG-05) */
function pickBlockingStatus(statuses: TraitOutcomeStatus[]): TraitOutcomeStatus {
  const order: TraitOutcomeStatus[] = [
    "blocked",
    "unsupported",
    "conflicting_evidence",
    "insufficient_data",
  ];
  for (const s of order) if (statuses.includes(s)) return s;
  return "unsupported";
}

/** คำนวณผลของผู้สมัครหนึ่งราย เทียบกับ source ตามเป้าหมายที่ระบุ */
function evaluateCandidate(
  source: AnalysisParent,
  candidate: AnalysisParent,
  targetCats: TraitCategory[],
  modelled: Set<TraitCategory>,
  jointUnsupported: boolean,
  targets: Partial<Record<TraitCategory, string>>,
  allowUnverified: boolean,
): CandidateEval {
  const base = {
    candidateCatId: candidate.catId,
    candidateName: candidate.name,
    sexCompatibility: classifySexCompatibility(source, candidate),
  };

  // ยังไม่มีโมเดล joint ของหลายลักษณะ → คำนวณครบไม่ได้ (กัน risk #1)
  if (jointUnsupported || targetCats.length === 0) {
    return { ...base, status: "unsupported", targetProbability: null, completeness: 0 };
  }

  const pair = analyzePair({
    categories: targetCats,
    a: source,
    b: candidate,
    allowUnverifiedRulesets: allowUnverified,
  });

  const blockingStatuses: TraitOutcomeStatus[] = [];
  let allComputed = true;
  let usable = 0;
  let pExact = 1;
  let pLow = 1;
  let pHigh = 1;

  for (const cat of targetCats) {
    if (!modelled.has(cat)) {
      blockingStatuses.push("unsupported");
      allComputed = false;
      continue;
    }
    const desiredCode = targets[cat];
    const trait = pair.traits.find((t) => t.category === cat);
    const entry = trait?.distribution.find((d) => d.outcomeCode === desiredCode);

    if (trait?.status === "computed") {
      const p = entry?.probability ?? 0;
      pExact *= p;
      pLow *= p;
      pHigh *= p;
      usable++;
    } else if (trait?.status === "scenario_range") {
      allComputed = false;
      pLow *= entry?.lower ?? 0;
      pHigh *= entry?.upper ?? 0;
      usable++;
    } else {
      // insufficient_data / conflicting_evidence / blocked → คงสถานะจริงไว้ (ALG-05)
      blockingStatuses.push(trait?.status ?? "unsupported");
      allComputed = false;
    }
  }

  const completeness = targetCats.length === 0 ? 0 : usable / targetCats.length;

  if (blockingStatuses.length > 0) {
    return {
      ...base,
      status: pickBlockingStatus(blockingStatuses),
      targetProbability: null,
      completeness,
    };
  }
  if (allComputed) {
    return { ...base, status: "computed", targetProbability: pExact, completeness };
  }
  return {
    ...base,
    status: "scenario_range",
    targetProbability: null,
    lower: pLow,
    upper: pHigh,
    completeness,
  };
}

/** comparator: กลุ่มก่อน แล้วค่าในกลุ่ม แล้ว completeness แล้ว id (เสถียร) */
function compareCandidates(a: CandidateEval, b: CandidateEval): number {
  const byGroup = statusRank(a.status) - statusRank(b.status);
  if (byGroup !== 0) return byGroup;

  if (a.status === "computed") {
    const d = (b.targetProbability ?? 0) - (a.targetProbability ?? 0);
    if (Math.abs(d) > 1e-12) return d;
  } else if (a.status === "scenario_range") {
    const dl = (b.lower ?? 0) - (a.lower ?? 0);
    if (Math.abs(dl) > 1e-12) return dl;
    const du = (b.upper ?? 0) - (a.upper ?? 0);
    if (Math.abs(du) > 1e-12) return du;
  }

  if (b.completeness !== a.completeness) return b.completeness - a.completeness;
  return a.candidateCatId.localeCompare(b.candidateCatId);
}

export function analyzeTarget(input: TargetAnalysisInput): TargetSearchResult {
  const allowUnverified = input.allowUnverifiedRulesets ?? false;
  const targetCats = (Object.keys(input.targets) as TraitCategory[]).filter(
    (c) => input.targets[c] != null && input.targets[c] !== "",
  );

  // เป้าหมายที่ "มีโมเดลรองรับ" = มี ruleset และ outcome code อยู่ในชุดผลของ ruleset นั้น
  const modelled = new Set<TraitCategory>();
  const unsupportedTargets: string[] = [];
  for (const c of targetCats) {
    const rs = resolveRuleset(c, allowUnverified);
    const code = input.targets[c];
    if (rs && rs.outcomes.some((o) => o.code === code)) modelled.add(c);
    else unsupportedTargets.push(c);
  }

  // ยังไม่มี joint model สำหรับหลายลักษณะ → ปิดการคูณ marginal (risk #1)
  const jointUnsupported = modelled.size > 1;

  const omitted: string[] = [];
  const blockingWarnings = new Set<string>();
  const ranked: CandidateEval[] = [];
  const pending: CandidateEval[] = [];
  let evaluated = 0;
  let eligible = 0;

  for (const cand of input.candidates) {
    const eligibility = assessPairEligibility(input.source, cand);
    if (eligibility.status === "blocked") {
      omitted.push(cand.catId + ": " + eligibility.reasons.map((r) => r.code).join(", "));
      eligibility.reasons.forEach((r) => blockingWarnings.add(r.reason));
      continue;
    }
    const evaluation = evaluateCandidate(input.source, cand, targetCats, modelled, jointUnsupported, input.targets, allowUnverified);
    if (eligibility.status === "conditional") {
      pending.push(evaluation);
    } else {
      eligible++;
      ranked.push(evaluation);
    }
    evaluated++;
  }

  ranked.sort(compareCandidates);
  // ประเมินความครบจากทั้ง pool ก่อนตัดการแสดงผลด้วย topK
  const unresolvedCount = [...ranked, ...pending].filter(
    (c) => c.status !== "computed" && c.status !== "scenario_range",
  ).length;
  // topK ต้องเป็นจำนวนเต็มไม่ติดลบที่แทนค่าได้แน่นอน (P5-06); ค่าไม่ถูกต้อง → แสดงทั้งหมด
  const topK =
    input.topK !== undefined && Number.isSafeInteger(input.topK) && input.topK >= 0
      ? input.topK
      : ranked.length;
  const candidates = ranked.slice(0, topK);

  const warnings: string[] = [MODEL_LIMITATION, HEALTH_LIMITATION, ...blockingWarnings];
  if (allowUnverified) {
    warnings.push(
      "เปิดโหมดสาธิตคณิตศาสตร์ (ชุดกฎที่ยังไม่ผ่านการตรวจรับ) — ตัวเลขเป็นตัวอย่างการคำนวณ ไม่ใช่ผลจริง",
    );
  }
  if (unsupportedTargets.length > 0) {
    warnings.push(
      `มีเป้าหมายที่ยังไม่มีชุดกฎรองรับ (${unsupportedTargets.join(", ")}) — ผลรวมยังคำนวณครบเป้าหมายไม่ได้`,
    );
  }
  if (jointUnsupported) {
    warnings.push(
      "ตั้งเป้าหมายหลายลักษณะพร้อมกัน แต่ยังไม่มีโมเดล joint ที่อธิบาย linkage/interaction ได้ — ยังคำนวณรวมไม่ได้ (เลือกทีละลักษณะก่อน)",
    );
  }
  if (targetCats.length === 0) {
    warnings.push("ยังไม่ได้ตั้งเป้าหมายลูกแมว — เลือกอย่างน้อยหนึ่งลักษณะเพื่อจัดอันดับ");
  }
  if (input.poolComplete === false) {
    warnings.push("ดึงชุดผู้สมัครได้ไม่ครบ — อันดับนี้มาจากเท่าที่ดึงได้ อาจมีคู่ที่ยังไม่ถูกประเมิน");
  }
  if (unresolvedCount > 0) {
    warnings.push(`มีผู้สมัคร ${unresolvedCount} ตัวที่ยังคำนวณไม่ได้ครบ เพราะข้อมูลหรือโมเดลยังไม่พร้อม — ไม่ได้หมายถึงโอกาสเป็นศูนย์`);
  }
  const unknownSexCount = pending.length;
  if (unknownSexCount > 0) {
    warnings.push(
      `มีผู้สมัคร ${unknownSexCount} ตัวที่ยังไม่ทราบเพศ — แสดงในกลุ่มรอยืนยัน แยกจากอันดับคำนวณ`,
    );
  }

  return {
    kind: "target_search",
    candidates,
    pendingCandidates: pending.sort((a, b) => a.candidateCatId.localeCompare(b.candidateCatId)),
    unsupportedTargets,
    evaluatedCount: evaluated,
    eligibleCount: eligible,
    // ประเมินผู้สมัครครบทุกตัวในชุดที่ส่งมา (การตัด topK เป็นการตัด "การแสดงผล" ไม่ใช่การประเมิน)
    // แต่ถ้าชั้นดึงข้อมูลบอกว่า pool ไม่ครบ (P5-01) ต้องคืน false — สแกน array ครบไม่ได้แปลว่าดึง DB ครบ
    searchComplete: input.poolComplete !== false,
    warnings,
    // ความครบของผลต้องรวมสถานะข้อมูลของผู้สมัครทุกตัวด้วย (ALG-06)
    // (หมวดที่ไม่รองรับไม่ใส่ใน omitted เพื่อไม่ให้ UI นับเป็นจำนวนแมวที่ถูกตัด)
    coverage: {
      complete: targetCats.length > 0 && omitted.length === 0 && pending.length === 0 && unsupportedTargets.length === 0 && !jointUnsupported && unresolvedCount === 0,
      omitted,
    },
    versions: {
      engineVersion: ENGINE_VERSION,
      rulesetVersion: RULESET_REGISTRY_VERSION,
      inputSchemaVersion: "1",
      resultSchemaVersion: "2",
    },
  };
}
