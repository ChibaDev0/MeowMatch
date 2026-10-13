/** Compatibility helpers for the research API. Never registered for real genetic results. */
import { inferExact } from "./bayesian";
import { distributionSchema, type Node } from "./model";
import { seededRandom, drawCategorical } from "./sampling";
export type { Node } from "./model";

function distribution(values: number[], size: number) {
  distributionSchema.parse(values);
  if (values.length !== size) throw new Error("Invalid distribution dimensions");
}

export function posterior(nodes: Node[], query: string, evidence: Record<string, string> = {}) {
  const result = inferExact(nodes, [query], { hard: evidence });
  if (result.status !== "computed") return { status: result.status };
  if (result.distribution.some((d) => d.probability === 0 && d.logProbability !== null))
    throw new Error("Use inferExact logProbability for outcomes below numeric range");
  return {
    status: "computed" as const,
    probabilities: Object.fromEntries(
      result.distribution.map((d) => [d.states[query]!, d.probability]),
    ),
  };
}
/** Finite Markov propagation, at most two steps; no breeding recommendation/optimization. */
export function propagate(initial: number[], transition: number[][], steps: number) {
  if (
    !initial.length ||
    !Number.isInteger(steps) ||
    steps < 0 ||
    steps > 2 ||
    transition.length !== initial.length
  )
    throw new Error("Invalid horizon/model");
  distribution(initial, initial.length);
  transition.forEach((row) => distribution(row, initial.length));
  let current = [...initial];
  for (let step = 0; step < steps; step++) {
    current = current.map((_, j) => current.reduce((sum, p, i) => sum + p * transition[i]![j]!, 0));
  }
  return current;
}

/** Seeded categorical sampling from an explicit joint-state distribution, research only. */
export function sampleJoint(probabilities: number[], samples: number, seed: number) {
  if (
    !probabilities.length ||
    !Number.isSafeInteger(samples) ||
    samples < 1 ||
    samples > 1_000_000 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new Error("Invalid sampling input");
  distribution(probabilities, probabilities.length);
  if (samples * probabilities.length > 5_000_000)
    throw new Error("Sampling operation budget exceeded");
  const mass = probabilities.reduce((a, b) => a + b, 0);
  const normalized = probabilities.map((p) => p / mass);
  const random = seededRandom(seed);
  const counts = probabilities.map(() => 0);
  for (let n = 0; n < samples; n++) {
    const chosen = drawCategorical(normalized, random);
    counts[chosen] = counts[chosen]! + 1;
  }
  return {
    counts,
    samples,
    seed,
    prng: "hmac-sha256-counter-53-v1",
    probabilities: counts.map((n) => n / samples),
    // Simultaneous Hoeffding bound (union bound), including zero observed rare events.
    errorAssumption:
      "Ideal independent draws; PRNG quality and biological validity are not certified",
    absoluteError95: Math.min(
      1,
      Math.sqrt(Math.log((2 * probabilities.length) / 0.05) / (2 * samples)),
    ),
  };
}
