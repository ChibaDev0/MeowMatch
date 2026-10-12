# Phase 7 algorithm API (research only)

Server-side TypeScript kernels. No empirical feline priors, approved phenotype mapping, or breeding recommendations are embedded here. Entry points are not wired to application routes. Production registry remains empty.

## Bayesian inference

```ts
import { inferExact } from "./bayesian";
import { inferWithFallback } from "./sampling";

// Synthetic arithmetic example, not a feline population model.
const nodes = [
  { id: "latent", states: ["a", "b"], parents: [], cpt: { "[]": [0.6, 0.4] } },
  { id: "observed", states: ["no", "yes"], parents: ["latent"],
    cpt: { '["a"]': [0.8, 0.2], '["b"]': [0.1, 0.9] } },
];
const exact = inferExact(nodes, ["latent"], { hard: { observed: "yes" } });
const uncertainEvidence = inferExact(nodes, ["latent"], {
  likelihoods: { observed: [0.2, 0.8] },
});
const bounded = inferWithFallback(nodes, ["latent"], {}, {
  exact: { maxFactorCells: 100_000, maxOperations: 2_000_000 },
  sampling: { samples: 10_000, seed: 42, minimumEffectiveSamples: 100 },
});
```

CPT keys are canonical JSON arrays of parent state strings, in `parents` order. Each row follows the node's `states` order and must sum to one (round-off tolerance 1e-10). Every parent combination must be present. Accepted round-off noise is normalized in a cloned model; inputs are never modified. Missing values are rejected, not filled with guessed priors.

Hard evidence asserts a state. Likelihood evidence supplies `P(observation | state)` for every state in the same order; it is not a posterior and need not sum to one. Independent observation factors are an explicit model assumption. Joint evidence that cannot factor this way needs an observation node/CPT. Unknown evidence should be omitted, not encoded as a normal allele or zero vector.

Query multiple variables together for a joint distribution. Do not multiply marginals to estimate correlated offspring or traits. Shared latent variables are sampled once per joint sample.

Exact returns `computed` with distribution, `logEvidence` and work diagnostics, or `conflicting_evidence` without probabilities. Each outcome includes `logProbability`: null means structural zero, while a finite value preserves positive mass too small for ordinary numeric representation. The compatibility `posterior` helper rejects such underflows rather than silently losing this distinction.

`priorSensitivity` runs up to 32 supplied alternatives separately and returns ranges. A conflict in any alternative yields `incomplete` with individual runs, not a range that silently excludes it. No weights are invented.

## Budgets and sampling

- At most 128 nodes, 64 states/node, 100,000 CPT cells and 100,000 query outcomes.
- Exact defaults: 100,000 intermediate cells, 2,000,000 counted operations. Configurable operation ceiling: 10,000,000. Validation/ordering work is not counted.
- Exponential total joint spaces are allowed when intermediate factors stay small.
- `inferExact` throws `ExactBudgetExceeded` with attempted-work diagnostics. `inferWithFallback` returns `budget_exceeded` without configured sampling; only that budget exception triggers fallback.
- Direct `inferSampled` is for controlled comparisons. Automatic fallback tries exact first and records why it exceeded budget.
- Sampling limit: 1,000,000 samples and 5,000,000 node visits. Fixed sample count, seed and versioned HMAC counter draws make runs reproducible.
- Low ESS or no positive weights returns `insufficient_data` without a distribution; it does not prove evidence conflict.
- Standard errors are asymptotic diagnostics, not certified bounds. Unobserved outcomes are not proven impossible; standard error at 0/1 is null. Extremely rare events need a reviewed strategy.

## Finite-horizon planning

```ts
import { planFiniteHorizon } from "./planning";
const result = planFiniteHorizon({
  states: ["s0", "s1"], initial: [1, 0],
  terminalUtility: [0, 1], stopUtility: [0, 1], discount: 1,
  actions: [{ id: "synthetic-action", allowed: [true, false],
    reward: [-0.1, 0], transition: [[0.3, 0.7], [0, 1]] }],
}, 2);
```

Fully observed finite Markov decision process: 0–2 steps, up to 256 joint states and 32 actions. At remaining horizon 0, value is terminal utility. Earlier, stop yields stop utility; an action yields immediate reward plus discounted successor value. Stop is always available; disallowed actions are never candidates. Exact ties prefer stop, then lexically first action id.

Policy rows are indexed by remaining steps; columns follow input state order. Null means stop. Terminal distribution combines early stops with states reaching the horizon; stoppedProbability counts early stops only. Latent genotype cannot be treated as an observed policy state. Utilities and permission masks require domain approval. This is not a POMDP solver.

## Runner contracts and provenance

`runResearchAlgorithm(model, request)` uses the existing `InferenceModel` envelope but always returns `researchOnly: true`. Bayesian payload: `{ schemaVersion: 1, nodes }`; planning payload: `{ schemaVersion: 1, planning }`. Supported kinds: `bayesian_prior` and `dp_transition`. Bayesian fallback uses the same joint network. Category and population must match model scope exactly.

Outputs include `phase7-0.2.0`, model id/version, SHA256 of the full model and SHA256 of the request. Optional JSON fields must be omitted rather than undefined; NaN, Infinity, sparse arrays and non-JSON objects are rejected. Hashes identify content, not signatures. Preserve model, request and algorithm version for replay.

`runRegisteredAlgorithm` resolves only the installed registry through the existing gate and requires review provenance. There is no unverified/model override parameter. It currently returns unsupported because the registry is empty. Even a future approved model still returns research-labelled results until release engineering promotes/snapshots the code. Neither runner is wired to pair/target or UI.

Tests: `npx vitest run src/research/genetics`. Benchmark: `npx vitest run --config vitest.benchmark.config.ts tests/benchmarks/phase7.test.ts` (writes `docs/benchmarks/phase7-algorithms.json`). See [handoff](../../../docs/phase-7-research-handoff.md) for evidence and remaining release work.
