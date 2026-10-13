/**
 * Model / prior registry (GEN-05) — จุดเดียวที่ค้นโมเดลการอนุมานตามโหมด + หมวด trait
 *
 * หลักการ (เดียวกับ rules/registry.ts):
 *  - ค่าเริ่มต้นคืนเฉพาะโมเดลที่ `verified=true` (ผ่าน RES-01) — **ตอนนี้ว่างเปล่า**
 *  - ไม่มีโมเดล verified → โหมดที่ต้องใช้ prior (Bayesian/DP/Monte Carlo) ต้องคืน "unsupported"
 *    engine ห้ามแต่งเปอร์เซ็นต์จาก prior ที่ไม่มีจริง
 *  - immutable: ผูกผลกับ contentHash ของโมเดลที่ใช้จริง เพื่อ replay/audit
 *
 * ⚠️ **ห้ามเพิ่มโมเดลที่มีตัวเลข prior ซึ่งแต่งขึ้นเอง** — เพิ่มได้เมื่อมีหลักฐาน + ผู้ตรวจรับ
 *    (ตั้ง verified=true พร้อม provenance ครบ) เท่านั้น
 */
import { createHash } from "node:crypto";
import type { TraitCategory } from "@/lib/validation/common";
import type { InferenceModel, InferenceModelKind, ResolvedModel } from "./types";

/**
 * โมเดลที่ลงทะเบียนทั้งหมด — **ว่างเปล่าโดยตั้งใจ**
 * ยังไม่มีโมเดล/prior ที่ผ่านการตรวจรับของผู้เชี่ยวชาญ (RES-01)
 * โหมด Bayesian/DP/Monte Carlo จึงยัง gated ปิดอยู่ทั้งหมด (ดู inference adapters)
 */
export const ALL_MODELS: readonly InferenceModel[] = [];

/** เวอร์ชันรวมของ registry — เปลี่ยนเมื่อเพิ่ม/แก้โมเดล (ผูกกับผลเพื่อ replay) */
export const MODEL_REGISTRY_VERSION = "0.1.0-empty";

/** canonical JSON (เรียง key) เพื่อให้ hash เสถียรไม่ขึ้นกับลำดับ field */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(",")}}`;
}

/**
 * content hash ของโมเดล — ผูกผลการวิเคราะห์กับเนื้อหาโมเดลที่ใช้จริง
 * รวม id/kind/version/coverage/payload (ไม่รวม provenance.notes ที่เป็นข้อความอิสระ
 * แต่รวม verified/reviewer เพราะมีผลต่อว่าผลใช้ได้จริงไหม)
 */
export function modelContentHash(model: InferenceModel): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        id: model.id,
        kind: model.kind,
        version: model.version,
        verified: model.verified,
        reviewer: model.provenance.reviewer,
        reviewedAt: model.provenance.reviewedAt,
        coverage: model.coverage,
        payload: model.payload,
      }),
    )
    .digest("hex");
}

/**
 * เลือกโมเดลจากชุดที่ให้มา (แยกเป็น pure helper เพื่อทดสอบ gating ได้โดยไม่พึ่ง ALL_MODELS)
 * @param allowUnverified true = รวมโมเดลที่ยังไม่ผ่านตรวจรับ (โหมดสาธิต/ทดสอบเท่านั้น)
 */
export function selectModel(
  models: readonly InferenceModel[],
  kind: InferenceModelKind,
  category: TraitCategory,
  allowUnverified = false,
): ResolvedModel | null {
  const match = models.find(
    (m) =>
      m.kind === kind &&
      m.coverage.categories.includes(category) &&
      (allowUnverified || m.verified),
  );
  if (!match) return null;
  return { model: match, contentHash: modelContentHash(match) };
}

/** ค้นโมเดลที่ลงทะเบียนจริง — ปัจจุบันคืน null เสมอ (registry ว่าง = gate ปิด) */
export function resolveModel(
  kind: InferenceModelKind,
  category: TraitCategory,
  allowUnverified = false,
): ResolvedModel | null {
  return selectModel(ALL_MODELS, kind, category, allowUnverified);
}

/** โมเดลที่ผ่านตรวจรับแล้ว (verified) — ใช้รายงาน coverage ที่เปิดได้จริง */
export function listVerifiedModels(): readonly InferenceModel[] {
  return ALL_MODELS.filter((m) => m.verified);
}
