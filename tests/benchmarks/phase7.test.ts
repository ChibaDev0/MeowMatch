import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { inferExact } from "../../src/research/genetics/bayesian";
import { inferWithFallback } from "../../src/research/genetics/sampling";
import { planFiniteHorizon } from "../../src/research/genetics/planning";
import type { Node } from "../../src/research/genetics/model";

const chain = (length: number): Node[] =>
  Array.from({ length }, (_, i): Node => ({
    id: `n${String(i).padStart(3, "0")}`,
    states: ["0", "1"],
    parents: i === 0 ? [] : [`n${String(i - 1).padStart(3, "0")}`],
    cpt: i === 0 ? { "[]": [0.5, 0.5] } : { '["0"]': [0.8, 0.2], '["1"]': [0.2, 0.8] },
  }));

describe("Phase 7 synthetic algorithm benchmark", () => {
  it("records bounded exact, sampled fallback and DP workloads after checking results", () => {
    const runs: {
      name: string;
      iterations: number;
      p50Ms: number;
      p95Ms: number;
      maxMs: number;
    }[] = [];
    function measure(name: string, run: () => void, iterations = 20) {
      run();
      const times = Array.from({ length: iterations }, () => {
        const start = performance.now();
        run();
        return performance.now() - start;
      }).sort((a, b) => a - b);
      runs.push({
        name,
        iterations,
        p50Ms: times[Math.floor(iterations * 0.5)]!,
        p95Ms: times[Math.ceil(iterations * 0.95) - 1]!,
        maxMs: times[iterations - 1]!,
      });
    }
    for (const length of [8, 32, 128]) {
      const nodes = chain(length);
      const query = [nodes[length - 1]!.id];
      measure(`exact-chain-${length}`, () => {
        const result = inferExact(nodes, query);
        if (result.status !== "computed") throw new Error("Expected exact");
        expect(result.distribution[1]!.probability).toBeCloseTo(0.5, 10);
        expect(result.diagnostics.peakFactorCells).toBeLessThanOrEqual(4);
      });
    }
    const nodes = chain(8);
    measure(
      "budget-triggered-sampling-10000",
      () => {
        const result = inferWithFallback(
          nodes,
          ["n007"],
          {},
          { exact: { maxOperations: 1 }, sampling: { samples: 10000, seed: 42 } },
        );
        if (result.status !== "estimated") throw new Error("Expected sampled fallback");
        expect(result.distribution[1]!.probability).toBeCloseTo(0.5, 1);
        expect(result).toHaveProperty("fallback.reason", "exact_budget_exceeded");
      },
      10,
    );
    measure("dp-two-steps-32-states-4-actions", () => {
      const count = 32;
      const uniform = Array.from({ length: count }, () => 1 / count);
      const result = planFiniteHorizon(
        {
          states: uniform.map((_, i) => `s${i}`),
          initial: uniform,
          terminalUtility: uniform.map((_, i) => i / (count - 1)),
          stopUtility: uniform.map(() => 0),
          actions: Array.from({ length: 4 }, (_, i) => ({
            id: `a${i}`,
            allowed: uniform.map(() => true),
            reward: uniform.map(() => 0),
            transition: uniform.map(() => uniform),
          })),
        },
        2,
      );
      expect(result.expectedUtility).toBeCloseTo(0.5, 10);
    });
    mkdirSync("docs/benchmarks", { recursive: true });
    writeFileSync(
      "docs/benchmarks/phase7-algorithms.json",
      JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          node: process.version,
          platform: process.platform,
          scope:
            "Synthetic math fixtures only; includes validation and assertions; not a production SLA or biological validation",
          runs,
        },
        null,
        2,
      ) + "\n",
    );
    console.table(runs);
  });
});
