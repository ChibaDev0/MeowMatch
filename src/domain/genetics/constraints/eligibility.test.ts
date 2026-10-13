import { describe, expect, it } from "vitest";
import { analyzePair } from "../pair/analyze";
import { analyzeTarget } from "../ranking/target";
import type { AnalysisParent } from "../contracts/input";
import { assessPairEligibility } from "./eligibility";

const cat = (catId: string, over: Partial<AnalysisParent> = {}): AnalysisParent => ({
  catId, name: catId, sex: catId === "a" ? "female" : "male",
  phenotype: { coat_type: "ขนยาว", ear_type: "หูตั้ง" }, ...over,
});
const pair = (a: AnalysisParent, b: AnalysisParent) => analyzePair({ a, b, categories: ["coat_type", "ear_type"], allowUnverifiedRulesets: true });
const target = (a: AnalysisParent, candidates: AnalysisParent[], topK?: number) => analyzeTarget({ source: a, candidates, targets: { coat_type: "long" }, allowUnverifiedRulesets: true, topK });

describe("shared conservative pair policy", () => {
  it.each([
    ["หูพับ", "หูตั้ง"], ["หูตั้ง", "หูพับ"], ["หูพับ", "หูพับ"], ["หูพับ", undefined],
    [" Fold ", "หูตั้ง"], ["Scottish Fold", "หูตั้ง"],
  ])("blocks all requested traits and coat-only ranking for %s × %s", (earA, earB) => {
    const a = cat("a", { phenotype: { ear_type: earA, coat_type: "ขนยาว" } });
    const b = cat("b", { phenotype: { ear_type: earB, coat_type: "ขนยาว" } });
    for (const [left, right] of [[a, b], [b, a]]) {
      const result = pair(left!, right!);
      expect(result.pairEligibility).toBe("blocked");
      expect(result.traits.every((t) => t.status === "blocked" && t.distribution.length === 0)).toBe(true);
      const search = target(left!, [right!]);
      expect(search.candidates).toEqual([]);
      expect(search.pendingCandidates).toEqual([]);
      expect(search.coverage.omitted.join()).toContain("welfare_blocked");
      expect(search.warnings.join()).toContain("ระงับคำแนะนำทุกลักษณะ");
      expect(search.searchComplete).toBe(true);
    }
  });
  it("does not diagnose Fold from negated or ambiguous free text", () => {
    for (const label of ["ไม่ใช่หูพับ", "ไม่ทราบว่าหูพับหรือหูตั้ง", ""]) {
      const result = pair(cat("a", { phenotype: { ear_type: label } }), cat("b"));
      expect(result.pairEligibility).toBe("model_only");
      expect(result.warnings.join()).toContain("ไม่ได้ยืนยันความพร้อม");
    }
  });
  it("blocks the same cat in both entry points even if reported sex differs", () => {
    const a = cat("a"); const b = cat("a", { sex: "male" });
    expect(pair(a, b).traits.every((t) => t.status === "blocked")).toBe(true);
    expect(target(a, [b]).coverage.omitted.join()).toContain("same_as_source");
  });
  it("preserves all blocking reasons, including welfare with same sex", () => {
    const a = cat("a", { phenotype: { ear_type: "หูพับ" } });
    const b = cat("b", { sex: "female" });
    expect(assessPairEligibility(a, b).reasons.map((r) => r.code)).toEqual(["same_sex", "welfare_blocked"]);
    expect(pair(a, b).warnings.join()).toContain("Fold");
  });
  it("keeps unknown-sex model results out of ranking and topK without replacing them with zero", () => {
    const a = cat("a");
    const u = cat("unknown", { sex: "unknown" });
    const result = target(a, [u, cat("b"), cat("c")], 1);
    expect(result.candidates.map((c) => c.candidateCatId)).toEqual(["b"]);
    expect(result.pendingCandidates[0]).toMatchObject({ candidateCatId: "unknown", targetProbability: 1 });
    expect(result.eligibleCount).toBe(2);
    expect(result.evaluatedCount).toBe(3);
    expect(result.searchComplete).toBe(true);
    expect(result.coverage.complete).toBe(false);
    expect(pair(a, u).pairEligibility).toBe("conditional");
    expect(target(a, [u], 0).pendingCandidates).toHaveLength(1);
  });
  it("unknown source moves all nonblocked candidates to pending; welfare takes precedence", () => {
    const result = target(cat("a", { sex: "unknown" }), [cat("b"), cat("c", { phenotype: { ear_type: "หูพับ" } })]);
    expect(result.candidates).toHaveLength(0);
    expect(result.pendingCandidates).toHaveLength(1);
    expect(result.evaluatedCount).toBe(1);
    expect(result.eligibleCount).toBe(0);
    expect(result.coverage.omitted.join()).toContain("welfare_blocked");
  });
  it("still gates real rules and preserves null for unsupported pending results", () => {
    const result = analyzeTarget({ source: cat("a"), candidates: [cat("b", { sex: "unknown" })], targets: { coat_type: "long" } });
    expect(result.pendingCandidates[0]).toMatchObject({ status: "unsupported", targetProbability: null });
    expect(result.versions).toMatchObject({ engineVersion: "0.2.0", resultSchemaVersion: "2", rulesetVersion: "0.2.0-demo" });
  });
});
