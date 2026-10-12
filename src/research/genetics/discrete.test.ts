import { describe, expect, it } from "vitest";
import { posterior, propagate, sampleJoint, type Node } from "./discrete";

// Synthetic arithmetic fixtures, never feline population priors.
const graph = (): Node[] => [
  { id: "A", states: ["0", "1"], parents: [], cpt: { "[]": [0.6, 0.4] } },
  {
    id: "B",
    states: ["0", "1"],
    parents: ["A"],
    cpt: { '["0"]': [0.8, 0.2], '["1"]': [0.1, 0.9] },
  },
];

describe("research variable elimination", () => {
  it("matches independent joint enumeration and Bayes conditioning", () => {
    const result = posterior(graph(), "A", { B: "1" });
    expect(result.status).toBe("computed");
    if (result.status === "computed") {
      expect(result.probabilities["1"]).toBeCloseTo((0.4 * 0.9) / (0.6 * 0.2 + 0.4 * 0.9), 12);
      expect(Object.values(result.probabilities).reduce((a, b) => a + b)).toBeCloseTo(1);
    }
    expect(posterior(graph().reverse(), "B")).toEqual(posterior(graph(), "B"));
  });
  it("handles observed queries and impossible evidence", () => {
    expect(posterior(graph(), "A", { A: "1" })).toEqual({
      status: "computed",
      probabilities: { "0": 0, "1": 1 },
    });
    const nodes = graph();
    nodes[0]!.cpt["[]"] = [1, 0];
    expect(posterior(nodes, "B", { A: "1" }).status).toBe("conflicting_evidence");
  });
  it("rejects cycles, missing CPTs, invalid evidence and non-normalized priors", () => {
    const nodes = graph();
    nodes[0]!.parents = ["B"];
    nodes[0]!.cpt = { '["0"]': [0.6, 0.4], '["1"]': [0.6, 0.4] };
    expect(() => posterior(nodes, "A")).toThrow("Cyclic");
    const missing = graph();
    delete missing[1]!.cpt['["1"]'];
    expect(() => posterior(missing, "A")).toThrow();
    expect(() => posterior(graph(), "A", { unknown: "1" })).toThrow();
    const invalid = graph();
    invalid[0]!.cpt["[]"] = [NaN, 1];
    expect(() => posterior(invalid, "A")).toThrow();
  });
  it("handles tiny nonzero evidence in log space", () => {
    const nodes = graph();
    nodes[0]!.cpt["[]"] = [1, 1e-200];
    nodes[1]!.cpt['["1"]'] = [1, 1e-200];
    expect(posterior(nodes, "A", { A: "1", B: "1" })).toEqual({
      status: "computed",
      probabilities: { "0": 0, "1": 1 },
    });
  });
});

describe("research finite horizon", () => {
  it("matches explicit two-level path enumeration", () => {
    const initial = [0.3, 0.7];
    const t = [
      [0.8, 0.2],
      [0.1, 0.9],
    ];
    const expected = [0, 1].map((k) =>
      initial.reduce((sum, p, i) => sum + p * t[i]!.reduce((s, q, j) => s + q * t[j]![k]!, 0), 0),
    );
    propagate(initial, t, 2).forEach((p, i) => expect(p).toBeCloseTo(expected[i]!, 12));
    expect(propagate(initial, t, 0)).toEqual(initial);
    expect(() => propagate(initial, t, 3)).toThrow();
    expect(() => propagate(initial, [[1], [1]], 1)).toThrow();
  });
});

describe("research joint sampler", () => {
  it("replays seeds and stays close to exact mass", () => {
    const result = sampleJoint([0.2, 0.8, 0], 10000, 42);
    expect(sampleJoint([0.2, 0.8, 0], 10000, 42)).toEqual(result);
    expect(result.counts[2]).toBe(0);
    expect(Math.abs(result.probabilities[0]! - 0.2)).toBeLessThan(result.absoluteError95);
    expect(result.counts.reduce((a, b) => a + b)).toBe(10000);
  });
  it("retains uncertainty for unobserved events and rejects invalid inputs", () => {
    expect(sampleJoint([1 - 1e-12, 1e-12], 10, 0).absoluteError95).toBeGreaterThan(0);
    expect(() => sampleJoint([0.4, 0.4], 10, 0)).toThrow();
    expect(() => sampleJoint([1], 0, 0)).toThrow();
    expect(() => sampleJoint([1], 10, -1)).toThrow();
  });
});
