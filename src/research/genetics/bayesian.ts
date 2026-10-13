import { z } from "zod";
import {
  cartesian,
  logAdd,
  outcome,
  queryStates,
  validateNetwork,
  type Evidence,
  type Network,
} from "./model";

export interface ExactDiagnostics {
  operations: number;
  peakFactorCells: number;
  eliminationOrder: string[];
}
export class ExactBudgetExceeded extends Error {
  constructor(public readonly diagnostics: ExactDiagnostics) {
    super("Exact inference budget exceeded");
  }
}
const budgetSchema = z
  .object({
    maxFactorCells: z.number().int().min(1).max(100_000).default(100_000),
    maxOperations: z.number().int().min(1).max(10_000_000).default(2_000_000),
  })
  .strict();
export type ExactBudget = z.input<typeof budgetSchema>;
type Factor = { vars: string[]; values: Map<string, number> };

/** Log-domain joint variable elimination with hard and likelihood evidence. */
export function inferExact(
  input: unknown,
  queries: string[],
  evidence: Evidence = {},
  budget: ExactBudget = {},
) {
  const network = validateNetwork(input, queries, evidence);
  return exactValidated(network, budget);
}

export function exactValidated(network: Network, budget: ExactBudget = {}) {
  const limits = budgetSchema.parse(budget);
  const diagnostics: ExactDiagnostics = { operations: 0, peakFactorCells: 0, eliminationOrder: [] };
  function spend(operations: number, cells = 0) {
    diagnostics.operations += operations;
    diagnostics.peakFactorCells = Math.max(cells, diagnostics.peakFactorCells);
    if (diagnostics.operations > limits.maxOperations || cells > limits.maxFactorCells)
      throw new ExactBudgetExceeded({
        ...diagnostics,
        eliminationOrder: [...diagnostics.eliminationOrder],
      });
  }
  const size = (vars: string[]) =>
    vars.reduce((n, id) => n * network.byId.get(id)!.states.length, 1);
  const combinations = (vars: string[]) => {
    spend(0, size(vars));
    return cartesian(vars.map((id) => network.byId.get(id)!.states));
  };
  const outputStates = queryStates(network); // Output size is not an exact-only budget; MC cannot evade it.
  let factors: Factor[] = network.nodes.map((node) => {
    const scope = [...node.parents, node.id];
    const vars = scope.filter((id) => !Object.hasOwn(network.evidence.hard, id));
    const rows = combinations(vars);
    spend(rows.length);
    return {
      vars,
      values: new Map(
        rows.map((states) => {
          const assigned = (id: string) =>
            Object.hasOwn(network.evidence.hard, id)
              ? network.evidence.hard[id]!
              : states[vars.indexOf(id)]!;
          const p =
            node.cpt[JSON.stringify(node.parents.map(assigned))]![
              node.states.indexOf(assigned(node.id))
            ]!;
          return [JSON.stringify(states), Math.log(p)];
        }),
      ),
    };
  });
  for (const [id, weights] of Object.entries(network.evidence.likelihoods).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const node = network.byId.get(id)!;
    if (Object.hasOwn(network.evidence.hard, id)) {
      factors.push({
        vars: [],
        values: new Map([
          ["[]", Math.log(weights[node.states.indexOf(network.evidence.hard[id]!)]!)],
        ]),
      });
    } else {
      spend(weights.length, weights.length);
      factors.push({
        vars: [id],
        values: new Map(node.states.map((s, i) => [JSON.stringify([s]), Math.log(weights[i]!)])),
      });
    }
  }
  function multiply(fs: Factor[]): Factor {
    const vars = [...new Set(fs.flatMap((f) => f.vars))].sort();
    const rows = combinations(vars);
    spend(rows.length * Math.max(1, fs.length));
    const indices = fs.map((f) => f.vars.map((id) => vars.indexOf(id)));
    return {
      vars,
      values: new Map(
        rows.map((states) => [
          JSON.stringify(states),
          fs.reduce(
            (sum, f, i) =>
              sum + f.values.get(JSON.stringify(indices[i]!.map((index) => states[index]!)))!,
            0,
          ),
        ]),
      ),
    };
  }
  const remaining = network.nodes
    .map((n) => n.id)
    .filter((id) => !network.queries.includes(id) && !Object.hasOwn(network.evidence.hard, id));
  while (remaining.length) {
    // Deterministic minimum intermediate-table size order; avoids total-joint enumeration.
    remaining.sort((a, b) => {
      const cost = (id: string) =>
        size([...new Set(factors.filter((f) => f.vars.includes(id)).flatMap((f) => f.vars))]);
      return cost(a) - cost(b) || (a < b ? -1 : a > b ? 1 : 0);
    });
    const id = remaining.shift()!;
    diagnostics.eliminationOrder.push(id);
    const involved = factors.filter((f) => f.vars.includes(id));
    const product = multiply(involved);
    const index = product.vars.indexOf(id);
    const sums = new Map<string, number>();
    spend(product.values.size);
    for (const [key, value] of product.values) {
      const states = JSON.parse(key) as string[];
      const reduced = JSON.stringify(states.filter((_, i) => i !== index));
      sums.set(reduced, logAdd(sums.get(reduced) ?? -Infinity, value));
    }
    factors = [
      ...factors.filter((f) => !f.vars.includes(id)),
      { vars: product.vars.filter((v) => v !== id), values: sums },
    ];
  }
  const final = multiply(factors);
  const mass = [...final.values.values()].reduce(logAdd, -Infinity);
  if (mass === -Infinity)
    return {
      status: "conflicting_evidence" as const,
      method: "variable_elimination" as const,
      diagnostics,
    };
  const distribution = outputStates.map((states) => {
    if (
      network.queries.some(
        (q, i) => Object.hasOwn(network.evidence.hard, q) && network.evidence.hard[q] !== states[i],
      )
    )
      return { ...outcome(network, states, 0), logProbability: null };
    const key = JSON.stringify(final.vars.map((id) => states[network.queries.indexOf(id)]!));
    const logProbability = final.values.get(key)! - mass;
    return {
      ...outcome(network, states, Math.exp(logProbability)),
      logProbability: logProbability === -Infinity ? null : logProbability,
    };
  });
  const norm = distribution.reduce((sum, item) => sum + item.probability, 0);
  distribution.forEach((item) => {
    item.probability /= norm;
    if (item.logProbability !== null) item.logProbability -= Math.log(norm);
  });
  return {
    status: "computed" as const,
    method: "variable_elimination" as const,
    distribution,
    logEvidence: mass,
    diagnostics,
  };
}

/** Versioned alternative priors/models are evaluated separately, never averaged without weights. */
export function priorSensitivity(
  variants: { id: string; nodes: unknown }[],
  queries: string[],
  evidence: Evidence = {},
) {
  if (
    !variants.length ||
    variants.length > 32 ||
    new Set(variants.map((v) => v.id)).size !== variants.length ||
    variants.some((v) => !v.id)
  )
    throw new Error("Invalid sensitivity variants");
  const runs = variants.map((v) => ({ id: v.id, result: inferExact(v.nodes, queries, evidence) }));
  const first = runs[0]!.result;
  if (runs.some((run) => run.result.status !== "computed") || first.status !== "computed")
    return { status: "incomplete" as const, runs };
  const domain = first.distribution.map((d) => JSON.stringify(d.states));
  const distributions = runs.map((run) => {
    if (run.result.status !== "computed") throw new Error("Unreachable");
    const values = new Map(
      run.result.distribution.map((d) => [JSON.stringify(d.states), d.probability]),
    );
    if (values.size !== domain.length || domain.some((key) => !values.has(key)))
      throw new Error("Incompatible sensitivity domains");
    return values;
  });
  return {
    status: "computed" as const,
    runs,
    ranges: first.distribution.map((d, i) => ({
      states: d.states,
      min: Math.min(...distributions.map((values) => values.get(domain[i]!)!)),
      max: Math.max(...distributions.map((values) => values.get(domain[i]!)!)),
    })),
  };
}
