/** Server-side integration seam. These runners are not connected to pair/target routes. */
import { createHash } from "node:crypto";
import { z } from "zod";
import type { TraitCategory } from "@/lib/validation/common";
import { runGatedInference } from "@/domain/genetics/inference/gated";
import type { InferenceModel } from "@/domain/genetics/models/types";
import { inferWithFallback } from "./sampling";
import { planFiniteHorizon } from "./planning";

export const RESEARCH_ALGORITHM_VERSION = "phase7-0.2.0";
const bayesianPayload = z.object({ schemaVersion: z.literal(1), nodes: z.unknown() }).strict();
const planningPayload = z.object({ schemaVersion: z.literal(1), planning: z.unknown() }).strict();
type BayesianOptions = Parameters<typeof inferWithFallback>[3];
export type AlgorithmRequest =
  | {
      kind: "bayesian_prior";
      category: TraitCategory;
      population: string;
      queries: string[];
      evidence?: Parameters<typeof inferWithFallback>[2];
      options?: BayesianOptions;
    }
  | { kind: "dp_transition"; category: TraitCategory; population: string; horizon: number };

/** Canonical identity rejects non-JSON inputs rather than silently losing NaN/undefined. */
function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, canonical).join(",")}]`;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  throw new Error("Non-JSON replay input");
}
export const researchHash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");

/** Explicit research entrypoint: accepts unapproved models, always labels results researchOnly. */
export function runResearchAlgorithm(model: InferenceModel, request: AlgorithmRequest) {
  const modelHash = researchHash(model);
  const requestHash = researchHash(request);
  if (
    model.kind !== request.kind ||
    !model.coverage.categories.includes(request.category) ||
    !request.population.trim() ||
    model.coverage.population !== request.population
  )
    return {
      status: "unsupported" as const,
      reason: "model_scope_mismatch",
      researchOnly: true as const,
    };
  const result =
    request.kind === "bayesian_prior"
      ? inferWithFallback(
          bayesianPayload.parse(model.payload).nodes,
          request.queries,
          request.evidence,
          request.options,
        )
      : planFiniteHorizon(planningPayload.parse(model.payload).planning, request.horizon);
  return {
    status: "evaluated" as const,
    researchOnly: true as const,
    provenance: {
      algorithmVersion: RESEARCH_ALGORITHM_VERSION,
      modelId: model.id,
      modelVersion: model.version,
      modelHash,
      requestHash,
    },
    result,
  };
}

/** Uses only the installed registry; callers cannot inject models or bypass verification here. */
export function runRegisteredAlgorithm(request: AlgorithmRequest) {
  return runGatedInference(request.kind, request.category, (model) => {
    if (
      !model.provenance.reviewer?.trim() ||
      !model.provenance.reviewedAt ||
      !model.provenance.source.trim()
    )
      return {
        status: "unsupported" as const,
        reason: "missing_review_provenance",
        researchOnly: true as const,
      };
    // Remains a research-labelled seam even if a registry model is later approved.
    // Production release must explicitly promote and snapshot this implementation.
    return runResearchAlgorithm(model, request);
  });
}
