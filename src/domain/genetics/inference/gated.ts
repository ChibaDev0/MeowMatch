/**
 * Gated inference (GEN-03/04, SIM-01/02) — โครงที่ "ปิด gate" สำหรับโหมดที่ต้องมี prior/โมเดล
 *
 * โหมด exact Mendelian (pair/target) ไม่ต้องมี prior จึงทำงานได้เลย
 * แต่โหมดต่อไปนี้ต้องมีโมเดลที่ผ่านตรวจรับ (RES-01) ก่อนจึงจะคืนตัวเลขได้:
 *   - bayesian_prior : Bayesian Network + Variable Elimination (GEN-03/04)
 *   - dp_transition  : finite-horizon Dynamic Programming (SIM-01)
 *   - monte_carlo    : Monte Carlo fallback (SIM-02)
 *
 * สัญญา: ถ้าไม่มีโมเดล verified ใน registry → คืน `unsupported` (ไม่มีตัวเลข)
 *        algorithm จริงเสียบผ่าน `runner` ซึ่งจะถูกเรียก **เฉพาะเมื่อมีโมเดลจริงเท่านั้น**
 *        ชั้นนี้จึงรับประกันว่า engine ไม่แต่งเปอร์เซ็นต์จาก prior ที่ไม่มีอยู่
 *
 * อ้างอิง: MeowMatch/10-algorithm-design, MeowMatch/07-genetics-engine
 */
import type { TraitCategory } from "@/lib/validation/common";
import { ALL_MODELS, selectModel } from "../models/registry";
import type { InferenceModel, InferenceModelKind } from "../models/types";

export type GatedOutcome<T> =
  | {
      status: "unsupported";
      mode: InferenceModelKind;
      category: TraitCategory;
      /** เหตุผลที่ยังคำนวณไม่ได้ (ไว้แสดง limitation ให้ผู้ใช้) */
      reason: string;
    }
  | {
      status: "ok";
      mode: InferenceModelKind;
      category: TraitCategory;
      modelId: string;
      modelVersion: string;
      /** ผูกผลกับเนื้อหาโมเดลที่ใช้จริง (audit/replay) */
      contentHash: string;
      value: T;
    };

const REASON: Record<InferenceModelKind, string> = {
  bayesian_prior:
    "ยังไม่มีโมเดล Bayesian/prior ที่ผ่านการตรวจรับ (RES-01) สำหรับลักษณะนี้ — ยังไม่เปิดผลประมาณการ",
  dp_transition:
    "ยังไม่มี transition/observation model ที่ผ่านการตรวจรับสำหรับการจำลองหลายรุ่น — ยังไม่เปิดผล",
  monte_carlo:
    "ยังไม่มีโมเดลสุ่ม (sampling distribution) ที่ผ่านการตรวจรับ — ยังไม่เปิดผล Monte Carlo",
};

/**
 * เรียกใช้การอนุมานแบบ gated: resolve โมเดลก่อน ถ้าไม่มี verified → unsupported
 * @param runner algorithm จริง (VE/DP/MC) ที่รับโมเดล — ถูกเรียกเฉพาะเมื่อ resolve ได้
 * @param opts.models override ชุดโมเดล (ทดสอบ); default = ALL_MODELS (ว่างในโปรดักชัน)
 * @param opts.allowUnverified โหมดสาธิตเท่านั้น
 */
export function runGatedInference<T>(
  kind: InferenceModelKind,
  category: TraitCategory,
  runner: (model: InferenceModel, contentHash: string) => T,
  opts: { models?: readonly InferenceModel[]; allowUnverified?: boolean } = {},
): GatedOutcome<T> {
  const resolved = selectModel(
    opts.models ?? ALL_MODELS,
    kind,
    category,
    opts.allowUnverified ?? false,
  );
  if (!resolved) {
    return { status: "unsupported", mode: kind, category, reason: REASON[kind] };
  }
  return {
    status: "ok",
    mode: kind,
    category,
    modelId: resolved.model.id,
    modelVersion: resolved.model.version,
    contentHash: resolved.contentHash,
    value: runner(resolved.model, resolved.contentHash),
  };
}

/** GEN-03/04 — Bayesian Network + Variable Elimination (ปิด gate จนกว่าจะมี prior ตรวจรับ) */
export function estimateBayesian<T>(
  category: TraitCategory,
  runner: (model: InferenceModel, contentHash: string) => T,
  opts?: { models?: readonly InferenceModel[]; allowUnverified?: boolean },
): GatedOutcome<T> {
  return runGatedInference("bayesian_prior", category, runner, opts);
}

/** SIM-01 — finite-horizon Dynamic Programming (ปิด gate จนกว่าจะมี transition model) */
export function simulateDynamicProgramming<T>(
  category: TraitCategory,
  runner: (model: InferenceModel, contentHash: string) => T,
  opts?: { models?: readonly InferenceModel[]; allowUnverified?: boolean },
): GatedOutcome<T> {
  return runGatedInference("dp_transition", category, runner, opts);
}

/** SIM-02 — Monte Carlo (ปิด gate จนกว่าจะมี sampling model + วัด exact budget ก่อน) */
export function monteCarloSimulate<T>(
  category: TraitCategory,
  runner: (model: InferenceModel, contentHash: string) => T,
  opts?: { models?: readonly InferenceModel[]; allowUnverified?: boolean },
): GatedOutcome<T> {
  return runGatedInference("monte_carlo", category, runner, opts);
}
