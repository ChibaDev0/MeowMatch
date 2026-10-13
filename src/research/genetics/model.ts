import { z } from "zod";

const name = z.string().min(1).max(128);
export const probability = z.number().finite().min(0).max(1);
export const distributionSchema = z
  .array(probability)
  .min(1)
  .max(100_000)
  .superRefine((values, ctx) => {
    if (Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 1e-10)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Distribution must sum to one" });
  });
const nodeSchema = z
  .object({
    id: name,
    states: z.array(name).min(1).max(64),
    parents: z.array(name).max(127),
    cpt: z.record(distributionSchema),
  })
  .strict();
export type Node = z.infer<typeof nodeSchema>;
const networkSchema = z.array(nodeSchema).min(1).max(128);
export const evidenceSchema = z
  .object({
    hard: z.record(name).default({}),
    /** Likelihood of an observation conditional on each state, not a posterior/prior. */
    likelihoods: z.record(z.array(probability).min(1).max(64)).default({}),
  })
  .strict();
export type Evidence = z.input<typeof evidenceSchema>;

export interface Network {
  nodes: Node[];
  byId: Map<string, Node>;
  evidence: z.output<typeof evidenceSchema>;
  queries: string[];
}

/** Runtime validation for JSON/review artifacts, including all unreachable CPT rows. */
export function validateNetwork(
  input: unknown,
  queries: string[],
  evidence: Evidence = {},
): Network {
  const nodes = networkSchema.parse(input);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) throw new Error("Duplicate node id");
  if (
    !queries.length ||
    new Set(queries).size !== queries.length ||
    queries.some((q) => !byId.has(q))
  )
    throw new Error("Invalid query");
  let cells = 0;
  for (const node of nodes) {
    if (
      new Set(node.states).size !== node.states.length ||
      new Set(node.parents).size !== node.parents.length ||
      node.parents.some((p) => !byId.has(p))
    )
      throw new Error("Invalid states/parents");
    const expectedRows = node.parents.reduce((size, p) => size * byId.get(p)!.states.length, 1);
    cells += expectedRows * node.states.length;
    if (cells > 100_000) throw new Error("Model table limit exceeded");
    if (Object.keys(node.cpt).length !== expectedRows) throw new Error("Invalid CPT coverage");
    for (const [key, row] of Object.entries(node.cpt)) {
      const parentStates: unknown = JSON.parse(key);
      if (
        !Array.isArray(parentStates) ||
        parentStates.length !== node.parents.length ||
        key !== JSON.stringify(parentStates) ||
        parentStates.some(
          (s, i) => typeof s !== "string" || !byId.get(node.parents[i]!)!.states.includes(s),
        ) ||
        row.length !== node.states.length
      )
        throw new Error("Invalid CPT row");
      // Remove accepted floating-point normalization noise for exact/sampling consistency.
      const mass = row.reduce((a, b) => a + b, 0);
      node.cpt[key] = row.map((p) => p / mass);
    }
  }
  const ordered: Node[] = [];
  const active = new Set<string>();
  const done = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw new Error("Cyclic graph");
    if (done.has(id)) return;
    active.add(id);
    const node = byId.get(id)!;
    [...node.parents].sort().forEach(visit);
    active.delete(id);
    done.add(id);
    ordered.push(node);
  }
  [...byId.keys()].sort().forEach(visit);
  const parsed = evidenceSchema.parse(evidence);
  for (const [id, state] of Object.entries(parsed.hard)) {
    if (!byId.get(id)?.states.includes(state)) throw new Error("Invalid hard evidence");
  }
  for (const [id, weights] of Object.entries(parsed.likelihoods)) {
    if (!byId.has(id) || weights.length !== byId.get(id)!.states.length)
      throw new Error("Invalid likelihood evidence");
  }
  return { nodes: ordered, byId, evidence: parsed, queries: [...queries] };
}

export function logAdd(a: number, b: number): number {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const high = Math.max(a, b);
  return high + Math.log1p(Math.exp(Math.min(a, b) - high));
}

export function cartesian(domains: readonly string[][]): string[][] {
  return domains.reduce<string[][]>(
    (rows, domain) => rows.flatMap((row) => domain.map((s) => [...row, s])),
    [[]],
  );
}

export function queryStates(network: Network, limit = 100_000): string[][] {
  const domains = network.queries.map((q) => network.byId.get(q)!.states);
  if (domains.reduce((n, d) => n * d.length, 1) > limit)
    throw new Error("Query output limit exceeded");
  return cartesian(domains);
}

export interface Outcome {
  states: Record<string, string>;
  probability: number;
}
export function outcome(network: Network, states: string[], p: number): Outcome {
  return {
    states: Object.fromEntries(network.queries.map((q, i) => [q, states[i]!])),
    probability: p,
  };
}
