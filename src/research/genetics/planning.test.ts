import { describe, expect, it } from "vitest";
import { planFiniteHorizon, type PlanningModel } from "./planning";

const model = (): PlanningModel => ({
  states: ["s0", "s1"],
  initial: [0.7, 0.3],
  terminalUtility: [0, 1],
  stopUtility: [0, 1],
  discount: 0.9,
  actions: [
    {
      id: "a",
      allowed: [true, false],
      transition: [
        [0.2, 0.8],
        [0.4, 0.6],
      ],
      reward: [-0.1, -0.1],
    },
    {
      id: "b",
      allowed: [true, true],
      transition: [
        [0.5, 0.5],
        [0.1, 0.9],
      ],
      reward: [-0.01, -0.01],
    },
  ],
});

function treeValue(m: PlanningModel, state: number, steps: number): number {
  if (!steps) return m.terminalUtility[state]!;
  return Math.max(
    m.stopUtility[state]!,
    ...m.actions
      .filter((a) => a.allowed[state])
      .map(
        (a) =>
          a.reward[state]! +
          (m.discount ?? 1) *
            a.transition[state]!.reduce((sum, p, to) => sum + p * treeValue(m, to, steps - 1), 0),
      ),
  );
}

describe("finite horizon Bellman policy", () => {
  it.each([0, 1, 2])("matches an independent exhaustive decision tree at horizon %i", (horizon) => {
    const m = model();
    const original = structuredClone(m);
    const result = planFiniteHorizon(m, horizon);
    expect(result.expectedUtility).toBeCloseTo(
      m.initial.reduce((s, p, i) => s + p * treeValue(m, i, horizon), 0),
      12,
    );
    expect(Object.values(result.terminalDistribution).reduce((a, b) => a + b)).toBeCloseTo(1, 12);
    expect(m).toEqual(original);
  });
  it("preserves optimal stopping and cannot use disallowed actions", () => {
    const m = model();
    m.actions[0]!.allowed = [false, false];
    m.actions[0]!.reward = [1000, 1000];
    const result = planFiniteHorizon(m, 2);
    expect(result.policyByRemainingSteps.flat()).not.toContain("a");
    expect(result.policyByRemainingSteps[2]![1]).toBeNull();
    expect(result.stoppedProbability).toBeGreaterThanOrEqual(0.3);
  });
  it("allows only stop when all actions are excluded", () => {
    const m = model();
    m.actions.forEach((a) => {
      a.allowed = [false, false];
    });
    const result = planFiniteHorizon(m, 2);
    expect(result.stoppedProbability).toBeCloseTo(1);
    expect(result.expectedUtility).toBeCloseTo(0.3);
    expect(result.terminalDistribution).toEqual({ s0: 0.7, s1: 0.3 });
  });
  it("breaks ties deterministically, preferring stop and then lexical action ids", () => {
    const m = model();
    m.discount = 1;
    m.actions = ["z", "a"].map((id) => ({
      id,
      allowed: [true, true],
      transition: [
        [0, 1],
        [0, 1],
      ],
      reward: [0, 0],
    }));
    const result = planFiniteHorizon(m, 1);
    expect(result.policyByRemainingSteps[1]).toEqual(["a", null]);
    m.actions.reverse();
    expect(planFiniteHorizon(m, 1)).toEqual(result);
  });
  it("accepts no-action and single-state boundary models", () => {
    const m: PlanningModel = {
      states: ["s"],
      initial: [1],
      terminalUtility: [2],
      stopUtility: [-1],
      actions: [],
    };
    expect(planFiniteHorizon(m, 0).expectedUtility).toBe(2);
    expect(planFiniteHorizon(m, 2).expectedUtility).toBe(-1);
  });
  it.each([-1, 3, 1.5, NaN])("rejects invalid horizon %s", (horizon) =>
    expect(() => planFiniteHorizon(model(), horizon)).toThrow(),
  );
  it("rejects invalid dimensions, duplicate actions, NaN, and unnormalized transitions", () => {
    const bad = model();
    bad.actions[0]!.transition[0] = [0.1, 0.1];
    expect(() => planFiniteHorizon(bad, 2)).toThrow();
    const duplicate = model();
    duplicate.actions[1]!.id = "a";
    expect(() => planFiniteHorizon(duplicate, 2)).toThrow();
    const nan = model();
    nan.terminalUtility[0] = NaN;
    expect(() => planFiniteHorizon(nan, 1)).toThrow();
    const short = model();
    short.actions[0]!.allowed = [];
    expect(() => planFiniteHorizon(short, 1)).toThrow();
  });
});
