/**
 * Inference model / prior registry — ชนิดข้อมูลของ "โมเดลการอนุมาน" (GEN-05)
 *
 * แยก "ข้อมูลของโมเดล" (priors, transition/observation model) ออกจาก algorithm
 * ที่คำนวณ — เหมือน PhenotypeRuleset แต่สำหรับโหมดที่ต้องมี prior/likelihood
 * (Bayesian Network + Variable Elimination = GEN-03/04, Dynamic Programming = SIM-01,
 *  Monte Carlo = SIM-02)
 *
 * ⚠️ `verified=false` = ยังไม่ผ่านผู้เชี่ยวชาญ (RES-01). engine จะไม่ใช้โมเดลที่ยังไม่
 *    verified คำนวณผลจริงของผู้ใช้ และ **ห้ามใส่ตัวเลข prior ที่แต่งขึ้นเองลง registry**
 *    — registry เริ่มต้นว่างเปล่าจนกว่าจะมีโมเดลที่ผ่านตรวจรับพร้อมหลักฐาน
 *
 * อ้างอิง: MeowMatch/07-genetics-engine (§MLOps model/prior registry),
 *          MeowMatch/10-algorithm-design (§Bayesian/DP/Monte Carlo)
 */
import type { TraitCategory } from "@/lib/validation/common";

/** โหมดการอนุมานที่ต้องมีโมเดล/prior (นอกเหนือจาก exact Mendelian ที่ไม่ต้องมี prior) */
export type InferenceModelKind = "bayesian_prior" | "dp_transition" | "monte_carlo";

/** ที่มาและการตรวจรับของโมเดล — reviewer/reviewedAt เป็น null จนกว่าจะผ่าน RES-01 */
export interface ModelProvenance {
  /** ที่มาของข้อมูล/ประชากรอ้างอิง (เช่น งานวิจัย, ชุดข้อมูลที่มีสิทธิ์ใช้) */
  source: string;
  /** ผู้เชี่ยวชาญที่ตรวจรับ (RES-01); null = ยังไม่ตรวจ */
  reviewer: string | null;
  /** วันที่ตรวจรับ (ISO); null = ยังไม่ตรวจ */
  reviewedAt: string | null;
  notes: string;
}

/** ขอบเขตที่โมเดลใช้ได้ — ระบุชัดว่าครอบคลุมหมวด/ประชากรใด และข้อจำกัด */
export interface ModelCoverage {
  categories: TraitCategory[];
  /** ขอบเขตประชากรที่โมเดลนี้ประเมินได้ (เช่น สายพันธุ์/ภูมิภาค) */
  population: string;
  limitations: string[];
}

/** ตัวชี้วัดคุณภาพ/การ fit ของโมเดล — ไม่ใช่การรับประกันความแม่นยำของธรรมชาติ */
export interface ModelDiagnostics {
  calibration?: string;
  sampleSize?: number | null;
  notes?: string[];
}

/**
 * โมเดลการอนุมานหนึ่งตัว
 * payload = เนื้อหาโมเดล (prior distribution / transition / observation) รูปแบบขึ้นกับ kind
 * ปล่อยเป็น generic เพื่อไม่ผูกตัวเลขใด ๆ ไว้ที่ชั้น type
 */
export interface InferenceModel<TPayload = unknown> {
  /** รหัสเฉพาะ เช่น "coat_color.agouti.bayes" */
  id: string;
  kind: InferenceModelKind;
  version: string;
  /** true เฉพาะเมื่อผ่านการตรวจรับของผู้เชี่ยวชาญ (RES-01) */
  verified: boolean;
  provenance: ModelProvenance;
  coverage: ModelCoverage;
  diagnostics: ModelDiagnostics;
  payload: TPayload;
}

/** รายการโมเดลที่ resolve ได้พร้อม hash สำหรับ replay/immutability */
export interface ResolvedModel<TPayload = unknown> {
  model: InferenceModel<TPayload>;
  /** content hash — ผูกผลการวิเคราะห์กับเนื้อหาโมเดลที่ใช้จริง (audit/replay) */
  contentHash: string;
}
