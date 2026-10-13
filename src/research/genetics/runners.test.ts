import { describe, expect, it } from "vitest";
import {
  researchHash,
  runResearchAlgorithm,
  runRegisteredAlgorithm,
  type AlgorithmRequest,
} from "./runners";
import type { InferenceModel } from "@/domain/genetics/models/types";

const model = (): InferenceModel => ({
  id: "synthetic",
  version: "test-1",
  kind: "bayesian_prior",
  verified: false,
  provenance: {
    source: "synthetic test",
    reviewer: null,
    reviewedAt: null,
    notes: "Not feline data",
  },
  coverage: { categories: ["coat_type"], population: "synthetic", limitations: ["test only"] },
  diagnostics: {},
  payload: {
    schemaVersion: 1,
    nodes: [{ id: "x", states: ["a", "b"], parents: [], cpt: { "[]": [0.6, 0.4] } }],
  },
});
const request = (): AlgorithmRequest => ({
  kind: "bayesian_prior",
  category: "coat_type",
  population: "synthetic",
  queries: ["x"],
});

describe("versioned research runners and installed registry gate", () => {
  it("executes research payloads with immutable-content identities and explicit scope", () => {
    const result = runResearchAlgorithm(model(), request());
    expect(result.status).toBe("evaluated");
    expect(result.researchOnly).toBe(true);
    expect(result).toHaveProperty("result.status", "computed");
    expect(result).toHaveProperty("provenance.algorithmVersion", "phase7-0.2.0");
    expect(runResearchAlgorithm(model(), { ...request(), population: "real cats" }).status).toBe(
      "unsupported",
    );
    expect(runResearchAlgorithm(model(), { ...request(), category: "eye_color" }).status).toBe(
      "unsupported",
    );
  });
  it("keeps installed production registry unsupported for both algorithms", () => {
    expect(runRegisteredAlgorithm(request()).status).toBe("unsupported");
    expect(
      runRegisteredAlgorithm({
        kind: "dp_transition",
        category: "coat_type",
        population: "synthetic",
        horizon: 2,
      }).status,
    ).toBe("unsupported");
  });
  it("executes a planning payload only through its own kind", () => {
    const m = model();
    m.kind = "dp_transition";
    m.payload = {
      schemaVersion: 1,
      planning: {
        states: ["s"],
        initial: [1],
        terminalUtility: [1],
        stopUtility: [1],
        actions: [],
      },
    };
    expect(
      runResearchAlgorithm(m, {
        kind: "dp_transition",
        category: "coat_type",
        population: "synthetic",
        horizon: 2,
      }),
    ).toHaveProperty("result.expectedUtility", 1);
    expect(runResearchAlgorithm(m, request()).status).toBe("unsupported");
  });
  it("binds model and request changes, stable across object key order", () => {
    expect(researchHash({ b: [1, 2], a: 1 })).toBe(researchHash({ a: 1, b: [1, 2] }));
    const a = runResearchAlgorithm(model(), request());
    const changed = model();
    changed.provenance.source = "different source";
    const b = runResearchAlgorithm(changed, request());
    if (a.status !== "evaluated" || b.status !== "evaluated") throw new Error("Expected evaluated");
    expect(a.provenance.modelHash).not.toBe(b.provenance.modelHash);
    const c = runResearchAlgorithm(model(), {
      ...request(),
      population: "synthetic",
      ...{ evidence: { hard: { x: "a" } } },
    });
    if (c.status !== "evaluated") throw new Error("Expected evaluated");
    expect(c.provenance.requestHash).not.toBe(a.provenance.requestHash);
  });
  it.each([NaN, Infinity, undefined, new Date(), Array(2)])(
    "rejects lossy replay values %s",
    (value) => expect(() => researchHash({ value })).toThrow(),
  );
  it("rejects payload schema drift instead of invoking an arbitrary runner", () => {
    const m = model();
    m.payload = { schemaVersion: 2, nodes: [] };
    expect(() => runResearchAlgorithm(m, request())).toThrow();
  });
});
