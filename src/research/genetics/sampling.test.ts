import { describe, expect, it } from "vitest";
import { inferExact } from "./bayesian";
import { inferSampled, inferWithFallback, seededRandom } from "./sampling";
import type { Node } from "./model";

const network = (): Node[] => [
  { id: "latent", states: ["0", "1"], parents: [], cpt: { "[]": [0.6, 0.4] } },
  ...["a", "b"].map((id) => ({
    id,
    states: ["0", "1"],
    parents: ["latent"],
    cpt: { '["0"]': [0.95, 0.05], '["1"]': [0.1, 0.9] },
  })),
];

describe("seeded likelihood weighting", () => {
  it("replays exact seeds independently of input node order", () => {
    const options = { samples: 1500, seed: 42 };
    const first = inferSampled(network(), ["a", "b"], {}, options);
    expect(inferSampled(network().reverse(), ["a", "b"], {}, options)).toEqual(first);
    expect(inferSampled(network(), ["a", "b"], {}, { ...options, seed: 43 })).not.toEqual(first);
    const random = seededRandom(0);
    for (let i = 0; i < 100; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
  it.each([{}, { hard: { a: "1" } }, { likelihoods: { a: [0.1, 0.9] } }])(
    "matches exact correlated distributions for %j",
    (evidence) => {
      const exact = inferExact(network(), ["a", "b"], evidence);
      const estimate = inferSampled(network(), ["a", "b"], evidence, { samples: 12000, seed: 13 });
      if (exact.status !== "computed" || estimate.status !== "estimated")
        throw new Error("Expected results");
      estimate.distribution.forEach((d, i) =>
        expect(Math.abs(d.probability - exact.distribution[i]!.probability)).toBeLessThan(0.025),
      );
      expect(estimate.diagnostics.effectiveSamples).toBeGreaterThan(100);
      expect(estimate.distribution.reduce((s, d) => s + d.probability, 0)).toBeCloseTo(1, 12);
    },
  );
  it("does not declare conflicts from missing rare positive-weight samples", () => {
    const nodes: Node[] = [
      { id: "rare", states: ["0", "1"], parents: [], cpt: { "[]": [1 - 1e-15, 1e-15] } },
      {
        id: "observed",
        states: ["0", "1"],
        parents: ["rare"],
        cpt: { '["0"]': [1, 0], '["1"]': [0, 1] },
      },
    ];
    const result = inferSampled(
      nodes,
      ["rare"],
      { hard: { observed: "1" } },
      { samples: 1000, seed: 0 },
    );
    expect(result.status).toBe("insufficient_data");
    expect(result).not.toHaveProperty("distribution");
    expect(inferExact(nodes, ["rare"], { hard: { observed: "1" } }).status).toBe("computed");
  });
  it("does not report zero error for an unobserved event", () => {
    const nodes: Node[] = [
      { id: "x", states: ["0", "1"], parents: [], cpt: { "[]": [1 - 1e-15, 1e-15] } },
    ];
    const result = inferSampled(nodes, ["x"], {}, { samples: 1000, seed: 7 });
    if (result.status !== "estimated") throw new Error("Expected estimate");
    expect(result.distribution[1]!.standardError).toBeNull();
    expect(result.warnings).toContain("Unobserved states are not proof of zero probability");
  });
  it("preserves tiny likelihoods and reports low ESS separately", () => {
    const tiny = inferSampled(
      network(),
      ["latent"],
      { likelihoods: { a: [1e-250, 1e-250], b: [1e-250, 1e-250] } },
      { samples: 1000, seed: 4 },
    );
    expect(tiny.status).toBe("estimated");
    expect(tiny.diagnostics.effectiveSamples).toBeCloseTo(1000, 6);
    expect(
      inferSampled(
        network(),
        ["latent"],
        { likelihoods: { a: [1e-250, 1e-250], b: [1e-250, 1e-250] } },
        { samples: 100, seed: 4 },
      ).status,
    ).toBe("estimated");
    expect(inferSampled(network(), ["latent"], {}, { samples: 5, seed: 4 }).status).toBe(
      "insufficient_data",
    );
  });
  it.each([
    { samples: 0, seed: 1 },
    { samples: 100, seed: -1 },
    { samples: 100, seed: 1.5 },
    { samples: Infinity, seed: 1 },
  ])("rejects invalid options %j", (options) => {
    expect(() => inferSampled(network(), ["latent"], {}, options)).toThrow();
  });
});

describe("exact first fallback", () => {
  const sampling = { samples: 1000, seed: 42 };
  it("uses exact when it fits even with sampling configured", () => {
    const result = inferWithFallback(network(), ["a"], {}, { sampling });
    expect(result.method).toBe("variable_elimination");
    expect(result).not.toHaveProperty("fallback");
  });
  it("reports measured budget overflow; sampling requires explicit options", () => {
    const exact = { maxOperations: 1 };
    const blocked = inferWithFallback(network(), ["a"], {}, { exact });
    expect(blocked.status).toBe("budget_exceeded");
    const sampled = inferWithFallback(network(), ["a"], {}, { exact, sampling });
    expect(sampled.status).toBe("estimated");
    expect(sampled).toHaveProperty("fallback.reason", "exact_budget_exceeded");
    expect(sampled).toHaveProperty("fallback.exactDiagnostics.operations");
  });
  it("never samples to mask malformed models or proven conflicts", () => {
    const nodes = network();
    delete nodes[1]!.cpt['["0"]'];
    expect(() => inferWithFallback(nodes, ["a"], {}, { sampling })).toThrow();
    const conflict = inferWithFallback(
      network(),
      ["a"],
      { likelihoods: { b: [0, 0] } },
      { sampling },
    );
    expect(conflict.status).toBe("conflicting_evidence");
    expect(conflict).not.toHaveProperty("fallback");
  });
});
