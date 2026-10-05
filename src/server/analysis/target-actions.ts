"use server";

import type { TraitCategory } from "@/lib/validation/common";
import type { TargetSearchResult } from "@/domain/genetics/contracts/types";
import { analyzeTarget } from "@/domain/genetics/ranking/target";
import { getAnalysisCandidates, getMyCats, type CandidateSource } from "@/server/cats/queries";
import {
  analysisCatIdSchema,
  analysisOptsSchema,
  catToParent,
  targetLabelsSchema,
  targetLabelToCode,
} from "./map";

/**
 * ค้นหาคู่ตามเป้าหมาย (TARGET-01) — ชั้น server ตรวจสิทธิ์ก่อนส่งให้ engine (07-genetics-engine §B)
 *  - source ต้องเป็นแมวของผู้ใช้
 *  - candidate pool = แมวที่ผู้ใช้กดใจไว้ (เข้าถึง/ยินยอมแล้ว) — ตัด source ออก
 *  - เป้าหมายส่งเป็นป้ายภาษาไทย แล้ว map เป็น outcome code; หมวดที่ไม่มี ruleset = unsupported
 */

/** ป้ายเป้าหมายที่ผู้ใช้เลือก (ตรงกับ dropdown ในหน้า desired-cats) */
export type TargetLabels = {
  coat?: string;
  eye?: string;
  ear?: string;
};

/** provenance ของชุดผู้สมัคร (P5-01) — ให้ UI แยก real/demo และบอกว่าดึงไม่ครบ */
export type CandidatePoolInfo = {
  source: CandidateSource;
  complete: boolean;
  error: string | null;
  fetched: number;
  expected: number | null;
};

export type TargetAnalysisResponse =
  | { ok: true; result: TargetSearchResult; pool: CandidatePoolInfo }
  | { ok: false; error: string };

function buildTargets(labels: TargetLabels): Partial<Record<TraitCategory, string>> {
  const t: Partial<Record<TraitCategory, string>> = {};
  if (labels.coat) t.coat_type = targetLabelToCode("coat_type", labels.coat);
  if (labels.eye) t.eye_color = targetLabelToCode("eye_color", labels.eye);
  if (labels.ear) t.ear_type = targetLabelToCode("ear_type", labels.ear);
  return t;
}

export async function analyzeTargetAction(
  sourceCatId: string,
  labels: TargetLabels,
  opts?: { demo?: boolean },
): Promise<TargetAnalysisResponse> {
  // ตรวจ payload ตอน runtime ก่อน (P5-06) — กันชนิด/รูปแบบผิดจาก client
  const idParsed = analysisCatIdSchema.safeParse(sourceCatId);
  if (!idParsed.success) return { ok: false, error: "กรุณาเลือกแมวต้นทางก่อน" };
  const labelsParsed = targetLabelsSchema.safeParse(labels ?? {});
  if (!labelsParsed.success) return { ok: false, error: "รูปแบบเป้าหมายไม่ถูกต้อง" };
  if (!analysisOptsSchema.safeParse(opts).success) {
    return { ok: false, error: "ตัวเลือกไม่ถูกต้อง" };
  }
  const sourceId = idParsed.data;

  const targets = buildTargets(labelsParsed.data);
  if (Object.keys(targets).length === 0) {
    return { ok: false, error: "กรุณาตั้งเป้าหมายลูกแมวอย่างน้อยหนึ่งลักษณะ" };
  }

  const [myCats, pool] = await Promise.all([
    getMyCats(),
    getAnalysisCandidates(sourceId),
  ]);

  const source = myCats.find((c) => c.id === sourceId);
  if (!source) return { ok: false, error: "แมวต้นทางต้องเป็นแมวของคุณ" };

  const result = analyzeTarget({
    source: catToParent(source),
    targets,
    candidates: pool.cats.map(catToParent),
    allowUnverifiedRulesets: opts?.demo ?? false,
    poolComplete: pool.complete,
  });

  return {
    ok: true,
    result,
    pool: {
      source: pool.source,
      complete: pool.complete,
      error: pool.error,
      fetched: pool.fetched,
      expected: pool.expected,
    },
  };
}
