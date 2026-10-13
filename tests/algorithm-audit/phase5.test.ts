import { describe, expect, it } from "vitest";
import { analyzePair } from "../../src/domain/genetics/pair/analyze";
import { analyzeTarget } from "../../src/domain/genetics/ranking/target";
import { atLeastOneInLitter, littersForTargetProbability } from "../../src/domain/genetics/transmission/mendelian";
import type { Genotype } from "../../src/domain/genetics/transmission/mendelian";
import type { AnalysisParent } from "../../src/domain/genetics/contracts/input";

const cat = (catId: string, extra: Partial<AnalysisParent> = {}): AnalysisParent => ({
  catId, name: catId, sex: catId === "a" ? "female" : "male",
  phenotype: { coat_type: "ขนยาว" }, ...extra,
});

describe("Phase 5 follow-up boundaries", () => {
  it("incomplete candidate evidence remains incomplete even outside topK", () => {
    const result = analyzeTarget({
      source: cat("a"), candidates: [cat("b"), cat("c", { phenotype: {} })],
      targets: { coat_type: "long" }, allowUnverifiedRulesets: true, topK: 1,
    });
    expect(result.candidates[0]!.status).toBe("computed");
    expect(result.coverage.complete).toBe(false);
    expect(result.coverage.omitted).toHaveLength(0); // missing evidence is not a filtered cat
  });
  it("empty target cannot have complete coverage", () => {
    expect(analyzeTarget({ source: cat("a"), candidates: [cat("b")], targets: {} }).coverage.complete).toBe(false);
  });
  it("unsafe litter count is rejected", () => {
    expect(() => atLeastOneInLitter(0.5, Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
  it("inverse count outside safe integer range is rejected rather than returning Infinity", () => {
    expect(() => littersForTargetProbability(Number.MIN_VALUE, 0.9)).toThrow(RangeError);
  });
});
const pair = (a: AnalysisParent, b: AnalysisParent) => analyzePair({
  a, b, categories: ["coat_type"], allowUnverifiedRulesets: true,
});
const target = (code: string, candidate = cat("b")) => analyzeTarget({
  source: cat("a"), candidates: [candidate], targets: { coat_type: code },
  allowUnverifiedRulesets: true,
});

describe("Phase 5 independent mathematical acceptance", () => {
  const genotypes: Genotype[] = [["L", "L"], ["L", "l"], ["l", "l"]];
  // Independently specified Punnett table: rows/columns LL, Ll, ll.
  const longProbabilities = [[0, 0, 0], [0, 0.25, 0.5], [0, 0.5, 1]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    it(`Punnett ${i}/${j}: exact probability, mass conservation and parent symmetry`, () => {
      const a = cat("a", { phenotype: {}, genotype: { coat_type: genotypes[i]! } });
      const b = cat("b", { phenotype: {}, genotype: { coat_type: genotypes[j]! } });
      const result = pair(a, b).traits[0]!;
      expect(result.status).toBe("computed");
      expect(result.distribution.find(d => d.outcomeCode === "long")!.probability).toBe(longProbabilities[i]![j]);
      expect(result.distribution.reduce((sum, d) => sum + d.probability!, 0)).toBe(1);
      expect(pair(b, a).traits[0]!.distribution).toEqual(result.distribution);
    });
  }
});

describe("Phase 5 release blockers — ordinary assertions, not expected failures", () => {
  it("ALG-01: unsupported hairless outcome must not become computed probability zero", () => {
    const result = target("hairless");
    expect(result.candidates[0]!.targetProbability).toBeNull();
    expect(result.candidates[0]!.status).toBe("unsupported");
  });
  it("ALG-02: contradictory phenotype and verified genotype need an explicit conflict", () => {
    const result = pair(cat("a", { genotype: { coat_type: ["L", "L"] } }), cat("b"));
    expect(result.traits[0]!.status).toBe("conflicting_evidence");
    expect(result.coverage.complete).toBe(false);
  });
  it("ALG-03: allele outside the registered model must not produce a computed distribution", () => {
    const result = pair(cat("a", { phenotype: {}, genotype: { coat_type: ["X", "X"] } }), cat("b"));
    expect(result.traits[0]!.status).not.toBe("computed");
  });
  it("ALG-04: same-sex pair must be blocked consistently with target search", () => {
    const result = pair(cat("a", { sex: "male" }), cat("b", { sex: "male" }));
    expect(result.traits[0]!.status).toBe("blocked");
  });
  it("ALG-05: missing phenotype must retain insufficient_data in target results", () => {
    expect(target("long", cat("b", { phenotype: {} })).candidates[0]!.status).toBe("insufficient_data");
  });
  it("ALG-06: unsupported target must make coverage incomplete", () => {
    const result = analyzeTarget({ source: cat("a"), candidates: [cat("b")], targets: { eye_color: "blue" } });
    expect(result.coverage.complete).toBe(false);
  });
  it("ALG-07a: nonfinite probability must be rejected", () => {
    expect(() => atLeastOneInLitter(NaN, 4)).toThrow(RangeError);
  });
  it("ALG-07b: invalid inverse probability must be rejected", () => {
    expect(() => littersForTargetProbability(1.1, 0.9)).toThrow(RangeError);
  });
  it("ALG-07c: tiny positive p must retain positive probability", () => {
    expect(atLeastOneInLitter(1e-20, 1)).toBeGreaterThan(0);
  });
});
