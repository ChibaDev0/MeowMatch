import { describe, expect, it } from "vitest";
import {
  ALL_MODELS,
  MODEL_REGISTRY_VERSION,
  listVerifiedModels,
  modelContentHash,
  resolveModel,
  selectModel,
} from "./registry";
import type { InferenceModel } from "./types";

/**
 * GEN-05 — model/prior registry
 * พิสูจน์ว่า gate ปิดโดยค่าเริ่มต้น (ไม่มีโมเดล verified → ไม่มี prior ให้คำนวณ),
 * verified gating ทำงาน, และ content hash เสถียร/เปลี่ยนตามเนื้อหา (immutability/replay)
 */

// โมเดลสังเคราะห์สำหรับทดสอบ gating เท่านั้น — ไม่ถูก ship ใน registry จริง (ไม่มีตัวเลขที่อ้างเป็นจริง)
function synthetic(overrides: Partial<InferenceModel> = {}): InferenceModel {
  return {
    id: "test.coat_type.synthetic",
    kind: "bayesian_prior",
    version: "0.0.0-test",
    verified: false,
    provenance: { source: "unit-test", reviewer: null, reviewedAt: null, notes: "synthetic" },
    coverage: { categories: ["coat_type"], population: "test", limitations: ["ไม่ใช่โมเดลจริง"] },
    diagnostics: { sampleSize: null },
    payload: { note: "placeholder" },
    ...overrides,
  };
}

describe("model registry — gate ปิดโดยค่าเริ่มต้น", () => {
  it("registry ว่างเปล่า: ไม่มีโมเดลที่ผ่านตรวจรับ (ไม่ ship prior ที่แต่งเอง)", () => {
    expect(ALL_MODELS).toHaveLength(0);
    expect(listVerifiedModels()).toHaveLength(0);
  });

  it("resolveModel คืน null เสมอ (ยังไม่มีโมเดล verified)", () => {
    expect(resolveModel("bayesian_prior", "coat_type")).toBeNull();
    expect(resolveModel("monte_carlo", "coat_color")).toBeNull();
    // แม้ allowUnverified ก็ยังว่าง เพราะ registry ไม่มีสมาชิก
    expect(resolveModel("dp_transition", "coat_type", true)).toBeNull();
  });

  it("มีเวอร์ชัน registry ผูกไว้ (ไว้ replay)", () => {
    expect(MODEL_REGISTRY_VERSION).toMatch(/empty/);
  });
});

describe("selectModel — verified gating", () => {
  it("โมเดล verified=false ถูกกรองออกเมื่อ allowUnverified=false", () => {
    const models = [synthetic({ verified: false })];
    expect(selectModel(models, "bayesian_prior", "coat_type")).toBeNull();
  });

  it("allowUnverified=true จึงจะได้โมเดล demo (พร้อม contentHash)", () => {
    const models = [synthetic({ verified: false })];
    const r = selectModel(models, "bayesian_prior", "coat_type", true);
    expect(r?.model.id).toBe("test.coat_type.synthetic");
    expect(r?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("โมเดล verified=true ถูกเลือกโดยค่าเริ่มต้น", () => {
    const models = [synthetic({ verified: true })];
    expect(selectModel(models, "bayesian_prior", "coat_type")?.model.verified).toBe(true);
  });

  it("ไม่ match kind หรือ category → null", () => {
    const models = [synthetic({ verified: true })];
    expect(selectModel(models, "monte_carlo", "coat_type")).toBeNull();
    expect(selectModel(models, "bayesian_prior", "eye_color")).toBeNull();
  });
});

describe("modelContentHash — immutability/replay", () => {
  it("เสถียร: โมเดลเดียวกันได้ hash เดิม", () => {
    const m = synthetic({ verified: true });
    expect(modelContentHash(m)).toBe(modelContentHash({ ...m }));
  });

  it("เปลี่ยนเมื่อ payload เปลี่ยน", () => {
    const a = synthetic({ payload: { p: 0.1 } });
    const b = synthetic({ payload: { p: 0.2 } });
    expect(modelContentHash(a)).not.toBe(modelContentHash(b));
  });

  it("เปลี่ยนเมื่อสถานะ verified เปลี่ยน (ผลใช้ได้จริงต่างกัน)", () => {
    expect(modelContentHash(synthetic({ verified: false }))).not.toBe(
      modelContentHash(synthetic({ verified: true })),
    );
  });

  it("ไม่ขึ้นกับลำดับ key ใน payload (canonical)", () => {
    const a = synthetic({ payload: { x: 1, y: 2 } });
    const b = synthetic({ payload: { y: 2, x: 1 } });
    expect(modelContentHash(a)).toBe(modelContentHash(b));
  });
});
