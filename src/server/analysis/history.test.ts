// @vitest-environment node
import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { analyzePair } from "@/domain/genetics/pair/analyze";
import { analyzeTarget } from "@/domain/genetics/ranking/target";
import {
  canonicalJson,
  executeStored,
  hash,
  makeEnvelope,
  replayEnvelope,
  withHistory,
  readHistory,
  type Envelope,
  type HistoryStore,
  type Run,
  type Snapshot,
} from "./history";
import artifact from "./artifacts/engine-0.2.0.json";
import previousArtifact from "./artifacts/engine-0.1.1.json";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/server/auth/session";
import { analyzePairAction } from "./actions";
import { analyzeTargetAction } from "./target-actions";
import { getMyCats, getLikedCats, getAnalysisCandidates } from "@/server/cats/queries";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ getUser: vi.fn() }));
vi.mock("@/server/cats/queries", () => ({
  getMyCats: vi.fn(),
  getLikedCats: vi.fn(),
  getAnalysisCandidates: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const a = {
  catId: "00000000-0000-4000-8000-000000000001",
  name: "A",
  sex: "female" as const,
  phenotype: { coat_type: "ขนยาว" },
};
const b = {
  catId: "00000000-0000-4000-8000-000000000002",
  name: "B",
  sex: "male" as const,
  phenotype: { coat_type: "ขนยาว" },
};
function pair(): Snapshot & { kind: "pair" } {
  return {
    kind: "pair",
    input: {
      a: structuredClone(a),
      b: structuredClone(b),
      categories: ["coat_type"],
      allowUnverifiedRulesets: true,
    },
  };
}
function draft() {
  const snapshot = pair();
  return {
    snapshot,
    response: { ok: true as const, result: analyzePair(snapshot.input) },
    real: true,
  };
}
// Models the RPC contract only. This does NOT establish PostgreSQL concurrency/RLS correctness.
function memoryStore(): HistoryStore & {
  rows: Map<string, { requestHash: string; run: Run }>;
  revoke(): void;
} {
  const rows = new Map<string, { requestHash: string; run: Run }>();
  let allowed = true;
  const check = () => {
    if (!allowed) throw new Error("access_denied");
  };
  return {
    rows,
    revoke: () => {
      allowed = false;
    },
    async lookup(owner, key, requestHash) {
      check();
      const row = rows.get(`${owner}:${key}`);
      if (row && row.requestHash !== requestHash) throw new Error("idempotency_conflict");
      return row?.run ?? null;
    },
    async save(owner, key, requestHash, envelope) {
      check();
      const existing = rows.get(`${owner}:${key}`);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new Error("idempotency_conflict");
        return existing.run;
      }
      const run = {
        id: `${rows.size + 1}`,
        envelope: structuredClone(envelope),
        created_at: "2026-10-05T00:00:00Z",
      };
      rows.set(`${owner}:${key}`, { requestHash, run });
      return run;
    },
    async read(owner, id) {
      check();
      return (
        [...rows.entries()].find(
          ([key, row]) => key.startsWith(`${owner}:`) && row.run.id === id,
        )?.[1].run ?? null
      );
    },
  };
}

describe("canonical identity and immutable replay", () => {
  it("normalizes object order, preserves array order and rejects lossy non-JSON values", () => {
    expect(hash({ b: 2, a: 1, c: undefined })).toBe(hash({ a: 1, b: 2 }));
    expect(hash([1, 2])).not.toBe(hash([2, 1]));
    for (const value of [NaN, Infinity, new Date(), [undefined]])
      expect(() => canonicalJson(value)).toThrow();
  });
  it("archives all engine/rule source files and detects unversioned source drift", () => {
    const found: string[] = [];
    function walk(dir: string) {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name).replaceAll("\\", "/");
        if (f.isDirectory()) walk(p);
        else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) found.push(p);
      }
    }
    walk("src/domain/genetics");
    found.push("src/lib/validation/common.ts");
    expect(Object.keys(artifact.files).sort()).toEqual(found.sort());
    for (const [path, content] of Object.entries(artifact.files))
      expect(readFileSync(path, "utf8").replaceAll("\r\n", "\n"), path).toBe(content);
  });
  it("replays original pair evidence even after the live input changes", () => {
    const d = draft();
    const envelope = makeEnvelope(d.snapshot, d.response);
    d.snapshot.input.a.phenotype.coat_type = "ขนสั้น";
    expect(replayEnvelope(envelope)).toEqual(d.response.result);
    expect(envelope.provenance.demo).toBe(true);
  });
  it("replays incomplete target pool and retains its coverage/provenance", () => {
    const snapshot: Snapshot = {
      kind: "target_search",
      input: {
        source: a,
        candidates: [b],
        targets: { coat_type: "long" },
        allowUnverifiedRulesets: true,
        poolComplete: false,
      },
    };
    const response = {
      ok: true as const,
      result: analyzeTarget(snapshot.input),
      pool: { complete: false, source: "real" },
    };
    const envelope = makeEnvelope(snapshot, response);
    expect(replayEnvelope(envelope)).toEqual(response.result);
    expect(response.result.searchComplete).toBe(false);
    expect(envelope.response.pool).toEqual(response.pool);
  });
  it("rejects missing old artifact, tampered evidence and mismatched result", () => {
    const d = draft();
    const envelope = makeEnvelope(d.snapshot, d.response);
    expect(() => replayEnvelope({ ...envelope, artifactHash: "old" })).toThrow("เวอร์ชันเดิม");
    expect(hash(previousArtifact)).not.toBe(hash(artifact));
    expect(() => replayEnvelope({ ...envelope, artifactHash: hash(previousArtifact) })).toThrow("เวอร์ชันเดิม");
    expect(() => replayEnvelope({ ...envelope, inputHash: "wrong" })).toThrow("ลายนิ้วมือ");
    envelope.response.result.warnings.push("changed");
    expect(() => replayEnvelope(envelope)).toThrow("ไม่ตรง");
  });
});

describe("history service contract", () => {
  it("retries return the first saved snapshot without reloading changed cats", async () => {
    const store = memoryStore();
    const build = vi.fn(async () => draft());
    const first = await executeStored(store, "A", "key", { cat: a.catId }, build);
    const retry = await executeStored(store, "A", "key", { cat: a.catId }, build);
    expect(retry).toEqual(first);
    expect(build).toHaveBeenCalledTimes(1);
    expect(store.rows.size).toBe(1);
  });
  it("same key/different request conflicts, while a different user has a separate namespace", async () => {
    const store = memoryStore();
    const build = async () => draft();
    await executeStored(store, "A", "key", { demo: true }, build);
    await expect(executeStored(store, "A", "key", { demo: false }, build)).rejects.toThrow(
      "conflict",
    );
    await executeStored(store, "B", "key", { demo: false }, build);
    expect(store.rows.size).toBe(2);
    expect(await store.read("B", "1")).toBeNull();
  });
  it("concurrent draft results return the winner chosen by the store", async () => {
    const store = memoryStore();
    let count = 0;
    const build = async () => {
      const d = draft();
      d.response.result.warnings.push(`${++count}`);
      return d;
    };
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => executeStored(store, "A", "key", {}, build)),
    );
    expect(store.rows.size).toBe(1);
    for (const res of responses) expect(res).toEqual(responses[0]);
  });
  it("does not persist demo data or failed analyses", async () => {
    const store = memoryStore();
    const res = await executeStored(store, "A", "key", {}, async () => ({
      ...draft(),
      real: false,
    }));
    expect(res.history?.status).toBe("demo_data");
    await executeStored(store, "A", "key", {}, async () => ({
      response: { ok: false as const, error: "denied" },
      real: false,
    }));
    expect(store.rows.size).toBe(0);
  });
  it("fails closed on revocation at retry or between lookup and save", async () => {
    const store = memoryStore();
    await expect(
      executeStored(store, "A", "key", {}, async () => {
        store.revoke();
        return draft();
      }),
    ).rejects.toThrow("access_denied");
    expect(store.rows.size).toBe(0);
    await expect(executeStored(store, "A", "key", {}, async () => draft())).rejects.toThrow(
      "access_denied",
    );
  });
  it("keeps DB off by default and never reports disabled as saved", async () => {
    vi.stubEnv("ANALYSIS_HISTORY_ENABLED", "false");
    expect((await withHistory(undefined, {}, async () => draft())).history?.status).toBe(
      "disabled",
    );
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("requires a verified session when enabled", async () => {
    vi.stubEnv("ANALYSIS_HISTORY_ENABLED", "true");
    vi.mocked(getUser).mockResolvedValue(null);
    await expect(withHistory(undefined, {}, async () => draft())).rejects.toThrow("เข้าสู่ระบบ");
    expect(createAdminClient).not.toHaveBeenCalled();
  });
  it("reads a saved run using the current user and returns no evidence snapshot", async () => {
    vi.stubEnv("ANALYSIS_HISTORY_ENABLED", "true");
    vi.mocked(getUser).mockResolvedValue({ id: "authenticated-owner" } as NonNullable<
      Awaited<ReturnType<typeof getUser>>
    >);
    const d = draft();
    const envelope: Envelope = makeEnvelope(d.snapshot, d.response);
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { id: a.catId, envelope, created_at: "now" }, error: null });
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as unknown as ReturnType<
      typeof createAdminClient
    >);
    const read = await readHistory(a.catId, true);
    expect(rpc).toHaveBeenCalledWith("analysis_history", {
      p_owner: "authenticated-owner",
      p_id: a.catId,
    });
    expect(read.result).toEqual(d.response.result);
    expect(read).not.toHaveProperty("snapshot");
    expect(read).not.toHaveProperty("envelope");
  });
});

describe("actions → history → RPC boundary (mock DB)", () => {
  function setup() {
    vi.stubEnv("ANALYSIS_HISTORY_ENABLED", "true");
    vi.mocked(getUser).mockResolvedValue({ id: "owner" } as NonNullable<
      Awaited<ReturnType<typeof getUser>>
    >);
    vi.mocked(getMyCats).mockResolvedValue([
      {
        id: a.catId,
        name: "A",
        sex: "female",
        ageLabel: "1 ปี",
        breed: "ผสม",
        coat: "ขนยาว",
        eye: "ฟ้า",
        ear: "ตั้ง",
      },
    ]);
    const liked = [
      {
        id: b.catId,
        name: "B",
        sex: "male" as const,
        ageLabel: "1 ปี",
        breed: "ผสม",
        coat: "ขนยาว",
        eye: "ฟ้า",
        ear: "ตั้ง",
      },
    ];
    vi.mocked(getLikedCats).mockResolvedValue(liked);
    vi.mocked(getAnalysisCandidates).mockResolvedValue({
      cats: liked,
      source: "real",
      complete: false,
      fetched: 1,
      expected: 2,
      error: "timeout",
    });
    const store = memoryStore();
    const rpc = vi.fn(
      async (
        _name: string,
        args: { p_owner: string; p_key: string; p_request_hash: string; p_envelope?: Envelope },
      ) => {
        try {
          const data = args.p_envelope
            ? await store.save(args.p_owner, args.p_key, args.p_request_hash, args.p_envelope)
            : await store.lookup(args.p_owner, args.p_key, args.p_request_hash);
          return { data, error: null };
        } catch (error) {
          return { data: null, error: { message: String(error) } };
        }
      },
    );
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as unknown as ReturnType<
      typeof createAdminClient
    >);
    return { store, rpc };
  }
  it("persists server-computed pair and retries without reading current cat values", async () => {
    const { store } = setup();
    const opts = { demo: true, idempotencyKey: a.catId };
    const first = await analyzePairAction(a.catId, b.catId, opts);
    vi.mocked(getMyCats).mockResolvedValue([]);
    const again = await analyzePairAction(a.catId, b.catId, opts);
    expect(first.ok).toBe(true);
    expect(again).toEqual(first);
    expect(store.rows.size).toBe(1);
    expect(getMyCats).toHaveBeenCalledTimes(1);
    const conflict = await analyzePairAction(a.catId, b.catId, { ...opts, demo: false });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error).toContain("ข้อมูลอื่น");
  });
  it("persists target scope and incomplete-pool metadata together with result", async () => {
    const { store } = setup();
    const first = await analyzeTargetAction(
      a.catId,
      { coat: "ขนยาว" },
      { demo: true, idempotencyKey: a.catId },
    );
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    expect(first.history?.status).toBe("saved");
    expect(first.pool.complete).toBe(false);
    const envelope = [...store.rows.values()][0]!.run.envelope;
    expect(envelope.snapshot.kind).toBe("target_search");
    expect(envelope.provenance.scope).toBe("liked_cats");
    expect(replayEnvelope(envelope)).toEqual(first.result);
  });
  it("rejects malformed keys and returns an error when persistence fails", async () => {
    const { rpc } = setup();
    expect((await analyzePairAction(a.catId, b.catId, { idempotencyKey: "bad" })).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: null, error: { message: "connection failed" } });
    const response = await analyzePairAction(a.catId, b.catId, { idempotencyKey: a.catId });
    expect(response.ok).toBe(false);
    expect(getMyCats).not.toHaveBeenCalled();
  });
});
