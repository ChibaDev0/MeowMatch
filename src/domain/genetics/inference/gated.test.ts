import { describe, expect, it, vi } from "vitest";
import {
  estimateBayesian,
  monteCarloSimulate,
  runGatedInference,
  simulateDynamicProgramming,
} from "./gated";
import type { InferenceModel } from "../models/types";

/**
 * GEN-03/04 + SIM-01/02 — gated inference
 * พิสูจน์: ไม่มีโมเดล verified → unsupported (ไม่มีตัวเลข, ไม่เรียก runner);
 *          มีโมเดล verified → delegate ไป runner พร้อม contentHash (seam ของ algorithm จริง)
 */

function model(overrides: Partial<InferenceModel> = {}): InferenceModel {
  return {
    id: "test.coat_type.bayes",
    kind: "bayesian_prior",
    version: "1.0.0",
    verified: true,
    provenance: { source: "test", reviewer: "ผู้ตรวจ", reviewedAt: "2026-01-01", notes: "" },
    coverage: { categories: ["coat_type"], population: "test", limitations: [] },
    diagnostics: { sampleSize: 100 },
    payload: { p: 0.25 },
    ...overrides,
  };
}

describe("gated inference — gate ปิดในโปรดักชัน (registry ว่าง)", () => {
  it("estimateBayesian คืน unsupported และไม่เรียก runner", () => {
    const runner = vi.fn();
    const out = estimateBayesian("coat_type", runner);
    expect(out.status).toBe("unsupported");
    if (out.status === "unsupported") expect(out.reason).toMatch(/RES-01|ตรวจรับ/);
    expect(runner).not.toHaveBeenCalled();
  });

  it("DP และ Monte Carlo ก็ปิด gate เช่นกัน", () => {
    expect(simulateDynamicProgramming("coat_type", () => 1).status).toBe("unsupported");
    expect(monteCarloSimulate("coat_type", () => 1).status).toBe("unsupported");
  });
});

describe("gated inference — delegate เมื่อมีโมเดล verified (seam)", () => {
  it("ok + เรียก runner พร้อม contentHash เมื่อมีโมเดล verified ตรง kind/category", () => {
    const runner = vi.fn((m: InferenceModel, hash: string) => ({ used: m.id, hash }));
    const out = runGatedInference("bayesian_prior", "coat_type", runner, { models: [model()] });
    expect(out.status).toBe("ok");
    if (out.status === "ok") {
      expect(out.modelId).toBe("test.coat_type.bayes");
      expect(out.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(out.value).toEqual({ used: "test.coat_type.bayes", hash: out.contentHash });
    }
    expect(runner).toHaveBeenCalledOnce();
  });

  it("โมเดล verified=false ไม่ผ่าน gate แม้ส่งเข้ามา (เว้น allowUnverified)", () => {
    const runner = vi.fn(() => 1);
    const demo = [model({ verified: false })];
    expect(runGatedInference("bayesian_prior", "coat_type", runner, { models: demo }).status).toBe(
      "unsupported",
    );
    expect(runner).not.toHaveBeenCalled();
    // โหมดสาธิต
    expect(
      runGatedInference("bayesian_prior", "coat_type", runner, {
        models: demo,
        allowUnverified: true,
      }).status,
    ).toBe("ok");
  });

  it("ไม่ match category → unsupported (ไม่ข้ามขอบเขตโมเดล)", () => {
    const out = runGatedInference("bayesian_prior", "eye_color", () => 1, { models: [model()] });
    expect(out.status).toBe("unsupported");
  });
});
