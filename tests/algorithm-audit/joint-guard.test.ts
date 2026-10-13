import { afterEach, expect, it, vi } from "vitest";
import * as registry from "../../src/domain/genetics/rules/registry";
import { coatTypeDemoRuleset } from "../../src/domain/genetics/rules/coat-type.demo";
import { analyzeTarget } from "../../src/domain/genetics/ranking/target";

afterEach(() => vi.restoreAllMocks());

// Synthetic second trait, deliberately reusing the same event. This is not a biological ruleset.
it.each(["ขนยาว", "ขนสั้น"])("does not multiply two supported marginal traits: %s", (coat) => {
  vi.spyOn(registry, "resolveRuleset").mockImplementation((category) => {
    if (category === "coat_type") return coatTypeDemoRuleset;
    if (category === "eye_color") return { ...coatTypeDemoRuleset, category: "eye_color" };
    return null;
  });
  const result = analyzeTarget({
    source: { catId: "a", name: "a", sex: "female", phenotype: { coat_type: coat, eye_color: coat } },
    candidates: [{ catId: "b", name: "b", sex: "male", phenotype: { coat_type: "ขนยาว", eye_color: "ขนยาว" } }],
    targets: { coat_type: "long", eye_color: "long" }, allowUnverifiedRulesets: true,
  });
  expect(result.unsupportedTargets).toEqual([]); // both marginal models exist
  expect(result.candidates[0]!.status).toBe("unsupported");
  expect(result.candidates[0]!.targetProbability).toBeNull();
  expect(result.candidates[0]!.lower).toBeUndefined();
  expect(result.candidates[0]!.upper).toBeUndefined();
  expect(result.coverage.complete).toBe(false);
});
