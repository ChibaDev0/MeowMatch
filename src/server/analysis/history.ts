import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/server/auth/session";
import type { PairAnalysisInput, TargetAnalysisInput } from "@/domain/genetics/contracts/input";
import type { AnalysisResult } from "@/domain/genetics/contracts/types";
import { analyzePair } from "@/domain/genetics/pair/analyze";
import { analyzeTarget } from "@/domain/genetics/ranking/target";
import artifact from "./artifacts/engine-0.1.1.json";
import type { Json } from "@/types/database";

export type Snapshot =
  | { kind: "pair"; input: PairAnalysisInput }
  | { kind: "target_search"; input: TargetAnalysisInput };
export type HistoryReceipt =
  { status: "saved"; runId: string } | { status: "disabled" | "demo_data" };
type Response = { ok: true; result: AnalysisResult; [key: string]: unknown };
export type Envelope = {
  snapshot: Snapshot;
  inputHash: string;
  artifactHash: string;
  response: Response;
  provenance: {
    source: "real";
    evidence: "owner_reported_phenotype";
    demo: boolean;
    scope: string;
    inference: string;
  };
};
export type Run = { id: string; envelope: Envelope; created_at: string };
export const idempotencyKeySchema = z.string().uuid();

/** JSON keys are sorted; array order remains significant (including ranking ties). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
      .join(",")}}`;
  }
  throw new Error("ข้อมูลประวัติมีรูปแบบไม่ถูกต้อง");
}
export function hash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}
export const ARTIFACT_HASH = hash(artifact);

export function makeEnvelope(snapshot: Snapshot, response: Response): Envelope {
  return JSON.parse(
    canonicalJson({
      snapshot,
      inputHash: hash(snapshot),
      artifactHash: ARTIFACT_HASH,
      response,
      provenance: {
        source: "real",
        evidence: "owner_reported_phenotype",
        demo: snapshot.input.allowUnverifiedRulesets ?? false,
        scope: snapshot.kind === "pair" ? "selected_pair" : "liked_cats",
        inference: "exact_enumeration_or_scenario_bounds_no_prior",
      },
    }),
  );
}

export function replayEnvelope(envelope: Envelope): AnalysisResult {
  if (envelope.artifactHash !== ARTIFACT_HASH)
    throw new Error("ไม่มีเอนจินเวอร์ชันเดิมสำหรับคำนวณซ้ำ");
  if (hash(envelope.snapshot) !== envelope.inputHash)
    throw new Error("ข้อมูลต้นทางของประวัติไม่ตรงกับลายนิ้วมือ");
  const result =
    envelope.snapshot.kind === "pair"
      ? analyzePair(envelope.snapshot.input)
      : analyzeTarget(envelope.snapshot.input);
  if (hash(result) !== hash(envelope.response.result))
    throw new Error("ผลคำนวณซ้ำไม่ตรงกับผลที่บันทึกไว้");
  return result;
}

export interface HistoryStore {
  lookup(owner: string, key: string, requestHash: string): Promise<Run | null>;
  save(owner: string, key: string, requestHash: string, envelope: Envelope): Promise<Run>;
  read(owner: string, id: string): Promise<Run | null>;
}

function databaseStore(): HistoryStore {
  const db = createAdminClient();
  async function rpc(args: {
    p_owner: string;
    p_key?: string;
    p_request_hash?: string;
    p_id?: string;
    p_envelope?: Json;
  }) {
    const { data, error } = await db.rpc("analysis_history", args);
    if (error) {
      if (error.message.includes("idempotency_conflict"))
        throw new Error("รหัสคำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาเริ่มคำขอใหม่");
      if (error.message.includes("access_denied"))
        throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลที่ใช้ในประวัตินี้แล้ว");
      throw new Error("ไม่สามารถบันทึกหรืออ่านประวัติได้ กรุณาลองใหม่");
    }
    return data as unknown as Run | null;
  }
  return {
    lookup: (owner, key, requestHash) =>
      rpc({ p_owner: owner, p_key: key, p_request_hash: requestHash }),
    read: (owner, id) => rpc({ p_owner: owner, p_id: id }),
    save: async (owner, key, requestHash, envelope) => {
      const run = await rpc({
        p_owner: owner,
        p_key: key,
        p_request_hash: requestHash,
        p_envelope: JSON.parse(canonicalJson(envelope)),
      });
      if (!run) throw new Error("ไม่สามารถบันทึกประวัติได้");
      return run;
    },
  };
}

/** Separate request identity from evidence hash: retries return the original snapshot after edits. */
export async function executeStored<T extends Response | { ok: false; error: string }>(
  store: HistoryStore,
  owner: string,
  key: string,
  request: unknown,
  build: () => Promise<{ response: T; snapshot?: Snapshot; real: boolean }>,
): Promise<T & { history?: HistoryReceipt }> {
  const requestHash = hash(request);
  const prior = await store.lookup(owner, key, requestHash);
  if (prior)
    return {
      ...prior.envelope.response,
      history: { status: "saved", runId: prior.id },
    } as unknown as T & { history: HistoryReceipt };
  const draft = await build();
  if (!draft.response.ok || !draft.snapshot) return draft.response;
  if (!draft.real) return { ...draft.response, history: { status: "demo_data" } };
  const run = await store.save(
    owner,
    key,
    requestHash,
    makeEnvelope(draft.snapshot, draft.response),
  );
  // Concurrent callers must all return the winning persisted response, not their own calculation.
  return {
    ...run.envelope.response,
    history: { status: "saved", runId: run.id },
  } as unknown as T & { history: HistoryReceipt };
}

export async function withHistory<T extends Response | { ok: false; error: string }>(
  key: string | undefined,
  request: unknown,
  build: () => Promise<{ response: T; snapshot?: Snapshot; real: boolean }>,
): Promise<T & { history?: HistoryReceipt }> {
  if (process.env.ANALYSIS_HISTORY_ENABLED !== "true") {
    return { ...(await build()).response, history: { status: "disabled" } };
  }
  const user = await getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้ประวัติ");
  return executeStored(databaseStore(), user.id, key ?? randomUUID(), request, build);
}

export async function readHistory(id: string, replay = false) {
  if (process.env.ANALYSIS_HISTORY_ENABLED !== "true") throw new Error("ประวัติยังไม่เปิดใช้งาน");
  const user = await getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้ประวัติ");
  const run = await databaseStore().read(user.id, z.string().uuid().parse(id));
  if (!run) throw new Error("ไม่พบประวัติที่เข้าถึงได้");
  // Never send evidence snapshots to the browser.
  return {
    ...run.envelope.response,
    result: replay ? replayEnvelope(run.envelope) : run.envelope.response.result,
    history: { status: "saved" as const, runId: run.id },
    createdAt: run.created_at,
    provenance: run.envelope.provenance,
  };
}
