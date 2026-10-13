import { createHmac } from "node:crypto";
import { z } from "zod";
import { ExactBudgetExceeded, exactValidated, type ExactBudget } from "./bayesian";
import {
  logAdd,
  outcome,
  queryStates,
  validateNetwork,
  type Evidence,
  type Network,
} from "./model";

const samplingSchema = z
  .object({
    samples: z.number().int().min(1).max(1_000_000),
    seed: z.number().int().min(0).max(0xffffffff),
    minimumEffectiveSamples: z.number().int().min(2).max(1_000_000).default(100),
  })
  .strict();
export type SamplingOptions = z.input<typeof samplingSchema>;

/** Counter-based reproducible 53-bit draws; seed is for replay, never for security. */
export function seededRandom(seed: number) {
  z.number().int().min(0).max(0xffffffff).parse(seed);
  const key = Buffer.alloc(4);
  key.writeUInt32BE(seed);
  let counter = 0;
  let buffer = Buffer.alloc(0);
  let offset = 0;
  return () => {
    if (offset >= buffer.length) {
      const block = Buffer.alloc(8);
      block.writeBigUInt64BE(BigInt(counter++));
      buffer = createHmac("sha256", key).update(block).digest();
      offset = 0;
    }
    const high = buffer.readUInt32BE(offset) >>> 5;
    const low = buffer.readUInt32BE(offset + 4) >>> 6;
    offset += 8;
    return (high * 67108864 + low) / 9007199254740992;
  };
}

export function drawCategorical(probabilities: number[], random: () => number) {
  const u = random();
  let cumulative = 0;
  let lastPositive = 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i]! > 0) lastPositive = i;
    cumulative += probabilities[i]!;
    if (u < cumulative) return i;
  }
  return lastPositive;
}

/** Likelihood weighting samples the complete joint network, sharing latent parents. */
export function inferSampled(
  input: unknown,
  queries: string[],
  evidence: Evidence,
  options: SamplingOptions,
) {
  return sampleValidated(validateNetwork(input, queries, evidence), options);
}

function sampleValidated(network: Network, options: SamplingOptions) {
  const config = samplingSchema.parse(options);
  if (config.samples * network.nodes.length > 5_000_000)
    throw new Error("Sampling operation budget exceeded");
  const states = queryStates(network);
  const random = seededRandom(config.seed);
  const totals = new Map<string, { logWeight: number; logSquaredWeight: number; hits: number }>();
  let logWeight = -Infinity;
  let logSquaredWeight = -Infinity;
  let positiveWeightSamples = 0;
  for (let i = 0; i < config.samples; i++) {
    const assigned = new Map<string, string>();
    let weight = 0;
    for (const node of network.nodes) {
      const row = node.cpt[JSON.stringify(node.parents.map((id) => assigned.get(id)!))]!;
      let index: number;
      if (Object.hasOwn(network.evidence.hard, node.id)) {
        index = node.states.indexOf(network.evidence.hard[node.id]!);
        weight += Math.log(row[index]!);
      } else index = drawCategorical(row, random);
      assigned.set(node.id, node.states[index]!);
      if (Object.hasOwn(network.evidence.likelihoods, node.id))
        weight += Math.log(network.evidence.likelihoods[node.id]![index]!);
    }
    if (weight === -Infinity) continue;
    positiveWeightSamples++;
    logWeight = logAdd(logWeight, weight);
    logSquaredWeight = logAdd(logSquaredWeight, 2 * weight);
    const key = JSON.stringify(network.queries.map((id) => assigned.get(id)!));
    const item = totals.get(key) ?? { logWeight: -Infinity, logSquaredWeight: -Infinity, hits: 0 };
    item.logWeight = logAdd(item.logWeight, weight);
    item.logSquaredWeight = logAdd(item.logSquaredWeight, 2 * weight);
    item.hits++;
    totals.set(key, item);
  }
  const effectiveSamples =
    positiveWeightSamples === 0
      ? 0
      : Math.min(positiveWeightSamples, Math.exp(2 * logWeight - logSquaredWeight));
  const diagnostics = {
    samples: config.samples,
    seed: config.seed,
    prng: "hmac-sha256-counter-53-v1",
    positiveWeightSamples,
    effectiveSamples,
    zeroWeightSamples: config.samples - positiveWeightSamples,
    numericalResolution: "53-bit uniform draws; extremely rare events require specialized methods",
  };
  if (effectiveSamples + 1e-10 * Math.max(1, effectiveSamples) < config.minimumEffectiveSamples)
    return {
      status: "insufficient_data" as const,
      method: "likelihood_weighting" as const,
      reason:
        positiveWeightSamples === 0 ? "no_positive_weight_samples" : "low_effective_sample_size",
      diagnostics,
    };
  const distribution = states.map((row) => {
    const item = totals.get(JSON.stringify(row));
    const p = item ? Math.exp(item.logWeight - logWeight) : 0;
    const squaredTotal = Math.exp(logSquaredWeight - 2 * logWeight);
    const squaredInside = item ? Math.exp(item.logSquaredWeight - 2 * logWeight) : 0;
    // Self-normalized importance-sampling asymptotic variance; no finite-sample guarantee.
    const variance = Math.max(
      0,
      (1 - p) ** 2 * squaredInside + p ** 2 * Math.max(0, squaredTotal - squaredInside),
    );
    return {
      ...outcome(network, row, p),
      observedSamples: item?.hits ?? 0,
      standardError:
        p === 0 || p === 1 ? null : Math.sqrt((variance * config.samples) / (config.samples - 1)),
    };
  });
  const norm = distribution.reduce((s, d) => s + d.probability, 0);
  distribution.forEach((d) => {
    d.probability /= norm;
  });
  return {
    status: "estimated" as const,
    method: "likelihood_weighting" as const,
    distribution,
    diagnostics,
    warnings: [
      "Asymptotic standard errors are diagnostics, not certified confidence bounds",
      ...(distribution.some((d) => d.observedSamples === 0)
        ? ["Unobserved states are not proof of zero probability"]
        : []),
    ],
  };
}

/** MC is opt-in and runs only after this exact attempt actually exceeds its configured budget. */
export function inferWithFallback(
  input: unknown,
  queries: string[],
  evidence: Evidence = {},
  options: {
    exact?: ExactBudget;
    sampling?: SamplingOptions;
  } = {},
) {
  const network = validateNetwork(input, queries, evidence);
  if (options.sampling) samplingSchema.parse(options.sampling);
  try {
    return exactValidated(network, options.exact);
  } catch (error) {
    if (!(error instanceof ExactBudgetExceeded)) throw error;
    if (!options.sampling)
      return {
        status: "budget_exceeded" as const,
        method: "variable_elimination" as const,
        diagnostics: error.diagnostics,
      };
    return {
      ...sampleValidated(network, options.sampling),
      fallback: { reason: "exact_budget_exceeded" as const, exactDiagnostics: error.diagnostics },
    };
  }
}
