import { describe, expect, it } from "vitest";
import { inferExact, ExactBudgetExceeded, priorSensitivity } from "./bayesian";
import { validateNetwork, type Node, type Evidence } from "./model";

// Shared latent parent => offspring outcomes are dependent, despite conditional independence.
export function family(prior = 0.3): Node[] {
  return [
    { id: "parent", states: ["a", "b"], parents: [], cpt: { "[]": [1 - prior, prior] } },
    ...["child1", "child2"].map((id) => ({
      id,
      states: ["no", "yes"],
      parents: ["parent"],
      cpt: { '["a"]': [0.9, 0.1], '["b"]': [0.2, 0.8] },
    })),
  ];
}

/** Independent full enumeration oracle, intentionally not using VE helpers. Small fixtures only. */
function enumerate(nodes: Node[], queries: string[], evidence: Evidence = {}) {
  const totals = new Map<string, number>();
  function walk(index: number, state: Record<string, string>) {
    if (index < nodes.length) {
      const node = nodes[index]!;
      for (const value of node.states) walk(index + 1, { ...state, [node.id]: value });
      return;
    }
    let p = 1;
    for (const node of nodes) {
      if (evidence.hard?.[node.id] !== undefined && evidence.hard[node.id] !== state[node.id])
        return;
      const i = node.states.indexOf(state[node.id]!);
      p *= node.cpt[JSON.stringify(node.parents.map((id) => state[id]))]![i]!;
      p *= evidence.likelihoods?.[node.id]?.[i] ?? 1;
    }
    const key = JSON.stringify(queries.map((q) => state[q]));
    totals.set(key, (totals.get(key) ?? 0) + p);
  }
  walk(0, {});
  const mass = [...totals.values()].reduce((a, b) => a + b, 0);
  return { mass, probabilities: new Map([...totals].map(([key, p]) => [key, p / mass])) };
}

describe("joint log-domain variable elimination", () => {
  it.each<Evidence>([
    {},
    { hard: { child1: "yes" } },
    { likelihoods: { child1: [0.25, 0.75] } },
    { hard: { parent: "b" }, likelihoods: { child1: [0.25, 0.75], child2: [0.8, 0.2] } },
  ])("matches full enumeration for %j", (evidence) => {
    const nodes = family();
    const queries = ["child2", "parent"];
    const expected = enumerate(nodes, queries, evidence);
    const result = inferExact(nodes.reverse(), queries, evidence);
    expect(result.status).toBe("computed");
    if (result.status !== "computed") return;
    expect(result.logEvidence).toBeCloseTo(Math.log(expected.mass), 12);
    result.distribution.forEach((d) =>
      expect(d.probability).toBeCloseTo(
        expected.probabilities.get(JSON.stringify(queries.map((q) => d.states[q]))) ?? 0,
        12,
      ),
    );
  });
  it("does not replace a correlated joint outcome with multiplied marginals", () => {
    const result = inferExact(family(), ["child1", "child2"]);
    if (result.status !== "computed") throw new Error("Expected computed");
    const both = result.distribution.find(
      (d) => d.states.child1 === "yes" && d.states.child2 === "yes",
    )!.probability;
    expect(both).toBeCloseTo(0.7 * 0.1 ** 2 + 0.3 * 0.8 ** 2, 12);
    expect(both).not.toBeCloseTo((0.7 * 0.1 + 0.3 * 0.8) ** 2, 6);
  });
  it("handles collider CPTs, multi-state nodes and negative diagnostic evidence", () => {
    const nodes: Node[] = [
      { id: "a", states: ["0", "1", "2"], parents: [], cpt: { "[]": [0.2, 0.3, 0.5] } },
      { id: "b", states: ["0", "1"], parents: [], cpt: { "[]": [0.4, 0.6] } },
      {
        id: "c",
        states: ["0", "1"],
        parents: ["b", "a"],
        cpt: Object.fromEntries(
          ["0", "1"].flatMap((b) =>
            ["0", "1", "2"].map((a) => [
              JSON.stringify([b, a]),
              [0.1 + Number(a) * 0.2 + Number(b) * 0.1, 0.9 - Number(a) * 0.2 - Number(b) * 0.1],
            ]),
          ),
        ),
      },
    ];
    const result = inferExact(nodes, ["a", "b"], { hard: { c: "0" } });
    const expected = enumerate(nodes, ["a", "b"], { hard: { c: "0" } });
    if (result.status !== "computed") throw new Error("Expected computed");
    result.distribution.forEach((d) =>
      expect(d.probability).toBeCloseTo(
        expected.probabilities.get(JSON.stringify([d.states.a, d.states.b]))!,
        12,
      ),
    );
  });
  it("handles exponentially large total joint spaces with small factors", () => {
    const nodes: Node[] = Array.from({ length: 40 }, (_, i) => ({
      id: `x${i}`,
      states: ["0", "1"],
      parents: [],
      cpt: { "[]": [0.6, 0.4] },
    }));
    const result = inferExact(nodes, ["x39"]);
    expect(result.status).toBe("computed");
    expect(result.diagnostics.peakFactorCells).toBe(2);
  });
  it("uses finite log evidence when ordinary likelihood products underflow", () => {
    const result = inferExact(family(), ["parent"], {
      likelihoods: { child1: [1e-250, 1e-250], child2: [1e-250, 1e-250] },
    });
    if (result.status !== "computed") throw new Error("Expected computed");
    expect(result.logEvidence).toBeCloseTo(2 * Math.log(1e-250), 10);
    expect(result.distribution[1]!.probability).toBeCloseTo(0.3, 12);
  });
  it("preserves log probability when an individual outcome is below floating-point range", () => {
    const nodes: Node[] = [
      { id: "a", states: ["0", "1"], parents: [], cpt: { "[]": [1, 1e-250] } },
      { id: "b", states: ["0", "1"], parents: [], cpt: { "[]": [1, 1e-250] } },
    ];
    const result = inferExact(nodes, ["a", "b"]);
    if (result.status !== "computed") throw new Error("Expected computed");
    const tiny = result.distribution[3]!;
    expect(tiny.probability).toBe(0);
    expect(tiny.logProbability).toBeCloseTo(2 * Math.log(1e-250), 10);
  });
  it("distinguishes impossible likelihoods and rejects missing/invalid input without defaults", () => {
    expect(inferExact(family(), ["parent"], { likelihoods: { child1: [0, 0] } }).status).toBe(
      "conflicting_evidence",
    );
    expect(() => inferExact(family(), ["parent"], { likelihoods: { child1: [0.5] } })).toThrow();
    expect(() => inferExact(family(), [])).toThrow();
    expect(() => inferExact(family(), ["parent", "parent"])).toThrow();
    const bad = family();
    bad[0]!.cpt["[]"] = [0.5, 0.4];
    expect(() => inferExact(bad, ["parent"])).toThrow();
  });
  it.each([NaN, Infinity, -0.1, 1.1, undefined])("rejects invalid CPT values %s", (value) => {
    const nodes = family();
    (nodes[0]!.cpt["[]"] as unknown[])[0] = value;
    expect(() => inferExact(nodes, ["parent"])).toThrow();
  });
  it("rejects sparse arrays, malformed keys, duplicate states, missing rows and cycles", () => {
    const sparse = family();
    sparse[0]!.cpt["[]"] = Array(2) as number[];
    expect(() => inferExact(sparse, ["parent"])).toThrow();
    const malformed = family();
    malformed[1]!.cpt = { bad: [0.5, 0.5], '["b"]': [0.2, 0.8] };
    expect(() => inferExact(malformed, ["parent"])).toThrow();
    const duplicate = family();
    duplicate[0]!.states = ["a", "a"];
    expect(() => inferExact(duplicate, ["parent"])).toThrow();
    const cyclic = family();
    cyclic[0]!.parents = ["child1"];
    cyclic[0]!.cpt = { '["no"]': [0.5, 0.5], '["yes"]': [0.5, 0.5] };
    expect(() => inferExact(cyclic, ["parent"])).toThrow("Cyclic");
  });
  it("enforces actual factor/operation budgets and never mutates inputs", () => {
    const nodes = family();
    const original = structuredClone(nodes);
    expect(() => inferExact(nodes, ["child1", "child2"], {}, { maxFactorCells: 1 })).toThrow(
      ExactBudgetExceeded,
    );
    expect(() => inferExact(nodes, ["parent"], {}, { maxOperations: 1 })).toThrow(
      ExactBudgetExceeded,
    );
    expect(() => inferExact(nodes, ["parent"], {}, { maxOperations: NaN })).toThrow();
    inferExact(nodes, ["parent"]);
    expect(nodes).toEqual(original);
  });
  it("treats object-prototype-like node names as data", () => {
    const nodes: Node[] = [
      { id: "toString", states: ["0", "1"], parents: [], cpt: { "[]": [0.4, 0.6] } },
    ];
    expect(validateNetwork(nodes, ["toString"]).nodes).toHaveLength(1);
    const out = inferExact(nodes, ["toString"]);
    if (out.status !== "computed") throw new Error("Expected computed");
    expect(out.distribution[1]!.probability).toBeCloseTo(0.6);
  });
  it("reports separate prior sensitivity ranges and incomplete scenarios", () => {
    const result = priorSensitivity(
      [
        { id: "low", nodes: family(0.1) },
        { id: "high", nodes: family(0.9) },
      ],
      ["child1"],
    );
    if (result.status !== "computed") throw new Error("Expected computed");
    expect(result.ranges[1]!.min).toBeCloseTo(0.17);
    expect(result.ranges[1]!.max).toBeCloseTo(0.73);
    expect(
      priorSensitivity(
        [
          { id: "zero", nodes: family(0) },
          { id: "high", nodes: family(0.9) },
        ],
        ["child1"],
        { hard: { parent: "b" } },
      ).status,
    ).toBe("incomplete");
  });
});
