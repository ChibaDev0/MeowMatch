import { z } from "zod";
import { distributionSchema, probability } from "./model";

const utility = z.number().finite().min(-1_000_000).max(1_000_000);
const actionSchema = z
  .object({
    id: z.string().min(1).max(128),
    /** State-level permission after domain/welfare constraints, never inferred here. */
    allowed: z.array(z.boolean()),
    transition: z.array(distributionSchema),
    reward: z.array(utility),
  })
  .strict();
const planningSchema = z
  .object({
    states: z.array(z.string().min(1).max(128)).min(1).max(256),
    initial: distributionSchema,
    terminalUtility: z.array(utility),
    /** Explicit stop value at every state. Stopping is always available. */
    stopUtility: z.array(utility),
    actions: z.array(actionSchema).max(32),
    discount: probability.default(1),
  })
  .strict();
export type PlanningModel = z.input<typeof planningSchema>;

/** Bellman backward induction, fully observed joint states, at most two decisions. */
export function planFiniteHorizon(input: unknown, horizon: number) {
  if (!Number.isInteger(horizon) || horizon < 0 || horizon > 2)
    throw new Error("Invalid planning horizon");
  const model = planningSchema.parse(input);
  const n = model.states.length;
  if (
    new Set(model.states).size !== n ||
    new Set(model.actions.map((a) => a.id)).size !== model.actions.length ||
    [model.initial, model.terminalUtility, model.stopUtility].some((row) => row.length !== n)
  )
    throw new Error("Invalid planning dimensions");
  model.actions.forEach((action) => {
    if (
      action.allowed.length !== n ||
      action.transition.length !== n ||
      action.reward.length !== n ||
      action.transition.some((row) => row.length !== n)
    )
      throw new Error("Invalid action dimensions");
    action.transition = action.transition.map((row) => {
      const sum = row.reduce((a, b) => a + b, 0);
      return row.map((p) => p / sum);
    });
  });
  const initialSum = model.initial.reduce((a, b) => a + b, 0);
  model.initial = model.initial.map((p) => p / initialSum);
  const actions = [...model.actions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const values = [model.terminalUtility.slice()];
  const policies: (string | null)[][] = [model.states.map(() => null)];
  for (let remaining = 1; remaining <= horizon; remaining++) {
    const nextValues: number[] = [];
    const policy: (string | null)[] = [];
    for (let state = 0; state < n; state++) {
      let best = model.stopUtility[state]!;
      let chosen: string | null = null;
      for (const action of actions) {
        if (!action.allowed[state]) continue;
        const candidate =
          action.reward[state]! +
          model.discount *
            action.transition[state]!.reduce(
              (sum, p, to) => sum + p * values[remaining - 1]![to]!,
              0,
            );
        // Exact ties keep stop, then lexically first action. No welfare tie-break is invented.
        if (candidate > best) {
          best = candidate;
          chosen = action.id;
        }
      }
      nextValues.push(best);
      policy.push(chosen);
    }
    values.push(nextValues);
    policies.push(policy);
  }
  let active = model.initial.slice();
  const stopped = model.states.map(() => 0);
  for (let remaining = horizon; remaining > 0; remaining--) {
    const next = model.states.map(() => 0);
    active.forEach((mass, state) => {
      const id = policies[remaining]![state];
      if (id === null) stopped[state] = stopped[state]! + mass;
      else {
        const action = actions.find((a) => a.id === id)!;
        action.transition[state]!.forEach((p, to) => {
          next[to] = next[to]! + mass * p;
        });
      }
    });
    active = next;
  }
  return {
    status: "computed" as const,
    method: "finite_horizon_dp" as const,
    horizon,
    expectedUtility: model.initial.reduce((sum, p, state) => sum + p * values[horizon]![state]!, 0),
    valuesByRemainingSteps: values,
    policyByRemainingSteps: policies,
    terminalDistribution: Object.fromEntries(
      model.states.map((s, i) => [s, active[i]! + stopped[i]!]),
    ),
    stoppedProbability: stopped.reduce((a, b) => a + b, 0),
    assumptions: [
      "Fully observed joint Markov states",
      "Allowed actions and utilities supplied by caller",
      "No biological or welfare approval implied",
    ],
  };
}
