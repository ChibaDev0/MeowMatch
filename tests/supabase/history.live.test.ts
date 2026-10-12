import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { analyzePair } from "@/domain/genetics/pair/analyze";
import { analyzeTarget } from "@/domain/genetics/ranking/target";
import {
  makeEnvelope,
  replayEnvelope,
  hash,
  type Snapshot,
  type Envelope,
  type Run,
} from "@/server/analysis/history";
vi.mock("@/server/auth/session", () => ({ getUser: vi.fn() }));

// Explicit opt-in; never included in npm test. Only generated fixture IDs are removed.
if (process.env.MEOWMATCH_LIVE_DB !== "qgkajyuoaffydydqbouv")
  throw new Error("Set MEOWMATCH_LIVE_DB to the reviewed project ref");
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  if (m?.[1] && m[2] !== undefined && !process.env[m[1]])
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (new URL(url).hostname !== "qgkajyuoaffydydqbouv.supabase.co")
  throw new Error("Project mismatch");
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
const members: { id: string; client: SupabaseClient }[] = [];
const createdUsers: string[] = [];
const catA = randomUUID(),
  catB = randomUUID();
const initial = { coat_type: "ขนยาว" };
const a = { catId: catA, name: "P5 QA A", sex: "female" as const, phenotype: initial };
const b = { catId: catB, name: "P5 QA B", sex: "male" as const, phenotype: initial };
function envelope(): Envelope {
  const snapshot: Snapshot = {
    kind: "pair",
    input: { a, b, categories: ["coat_type"], allowUnverifiedRulesets: true },
  };
  return makeEnvelope(snapshot, { ok: true, result: analyzePair(snapshot.input) });
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
async function save(
  payload = envelope(),
  key = randomUUID(),
  owner = members[0]!.id,
  requestHash = hash({ pair: true }),
) {
  const { data, error } = await admin.rpc("analysis_history", {
    p_owner: owner,
    p_key: key,
    p_request_hash: requestHash,
    p_envelope: payload,
  });
  check(error);
  return data as Run;
}
async function read(id: string, owner = members[0]!.id) {
  return admin.rpc("analysis_history", { p_owner: owner, p_id: id });
}
async function like() {
  check(
    (
      await members[0]!.client
        .from("cat_likes")
        .upsert({ user_id: members[0]!.id, cat_id: catB }, { ignoreDuplicates: true })
    ).error,
  );
}
beforeAll(async () => {
  check((await admin.from("analysis_runs").select("id").limit(0)).error);
  for (const suffix of ["a", "b"]) {
    const email = `p5-${randomUUID()}-${suffix}@example.invalid`,
      password = `P5!${randomUUID()}Aa9`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { fixture: "p5_history_live" },
    });
    check(error);
    const id = data.user!.id;
    createdUsers.push(id);
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
    check((await client.auth.signInWithPassword({ email, password })).error);
    members.push({ id, client });
  }
  check(
    (
      await admin.from("cats").insert([
        {
          id: catA,
          owner_id: members[0]!.id,
          name: a.name,
          sex: a.sex,
          coat: "ขนยาว",
          is_public: false,
        },
        {
          id: catB,
          owner_id: members[1]!.id,
          name: b.name,
          sex: b.sex,
          coat: "ขนยาว",
          is_public: true,
        },
      ])
    ).error,
  );
  await like();
});
afterAll(async () => {
  const failures: string[] = [];
  for (const m of members) {
    const { error } = await m.client.auth.signOut();
    if (error) failures.push(`signout:${m.id}`);
  }
  for (const id of createdUsers) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) failures.push(`cleanup:${id}:${error.message}`);
  }
  if (failures.length) throw new Error(failures.join("; "));
});

describe.sequential("P5 history — real Supabase", () => {
  it("denies anonymous and A/B direct table/RPC/legacy forged writes", async () => {
    for (const client of [anon, ...members.map((m) => m.client)]) {
      expect((await client.from("analysis_runs").select("id").limit(1)).error?.code).toBe("42501");
      expect(
        (await client.from("analysis_runs").insert({ owner_id: members[0]!.id })).error?.code,
      ).toBe("42501");
      expect(
        (await client.rpc("analysis_history", { p_owner: members[0]!.id, p_id: randomUUID() }))
          .error?.code,
      ).toBe("42501");
      expect(
        (
          await client
            .from("breeding_analyses")
            .insert({
              owner_id: members[0]!.id,
              parent_a_id: catA,
              parent_b_id: catB,
              result: { forged: true },
            })
        ).error?.code,
      ).toBe("42501");
    }
  });
  it("persists pair, isolates owners and replays original evidence after cat edit", async () => {
    const run = await save();
    expect((await read(run.id, members[1]!.id)).data).toBeNull();
    check((await members[0]!.client.from("cats").update({ coat: "ขนสั้น" }).eq("id", catA)).error);
    const readBack = await read(run.id);
    check(readBack.error);
    expect(readBack.data.envelope).toEqual(run.envelope);
    expect(replayEnvelope(readBack.data.envelope)).toEqual(run.envelope.response.result);
  });
  it("persists target input and incomplete pool without claiming complete coverage", async () => {
    const snapshot: Snapshot = {
      kind: "target_search",
      input: {
        source: a,
        candidates: [b],
        targets: { coat_type: "long" },
        poolComplete: false,
        allowUnverifiedRulesets: true,
      },
    };
    const payload = makeEnvelope(snapshot, {
      ok: true,
      result: analyzeTarget(snapshot.input),
      pool: { source: "real", complete: false, fetched: 1, expected: 2, error: "fixture timeout" },
    });
    const run = await save(payload);
    expect(run.envelope.response).toEqual(payload.response);
    expect(replayEnvelope(run.envelope)).toEqual(payload.response.result);
  });
  it("20 simultaneous requests yield one row and one winning result", async () => {
    const key = randomUUID();
    const runs = await Promise.all(
      Array.from({ length: 20 }, (_, index) => {
        const payload = envelope();
        payload.response.result.warnings.push(`draft ${index}`);
        return save(payload, key);
      }),
    );
    expect(new Set(runs.map((r) => r.id)).size).toBe(1);
    for (const run of runs) expect(run.envelope).toEqual(runs[0]!.envelope);
    const { count, error } = await admin
      .from("analysis_runs")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", members[0]!.id)
      .eq("idempotency_key", key);
    check(error);
    expect(count).toBe(1);
    await expect(save(envelope(), key, members[0]!.id, hash({ changed: true }))).rejects.toThrow(
      "idempotency_conflict",
    );
    // Different owner can reuse the key for its own source (empty target pool).
    const s: Snapshot = {
      kind: "target_search",
      input: { source: b, candidates: [], targets: { coat_type: "long" } },
    };
    expect(
      (
        await save(
          makeEnvelope(s, { ok: true, result: analyzeTarget(s.input) }),
          key,
          members[1]!.id,
        )
      ).id,
    ).not.toBe(runs[0]!.id);
  });
  it("rejects unauthorized source, unknown/deleted candidates and DNA", async () => {
    await expect(save(envelope(), randomUUID(), members[1]!.id)).rejects.toThrow("access_denied");
    const missing = envelope();
    if (missing.snapshot.kind === "pair") missing.snapshot.input.b.catId = randomUUID();
    await expect(save(missing)).rejects.toThrow("access_denied");
    const dna = envelope();
    if (dna.snapshot.kind === "pair") dna.snapshot.input.a.genotype = { coat_type: ["L", "l"] };
    await expect(save(dna)).rejects.toThrow("dna_not_supported");
  });
  it("unlike redacts payload permanently and denies new saves until reliked", async () => {
    const key = randomUUID();
    const run = await save(envelope(), key);
    check(
      (
        await members[0]!.client
          .from("cat_likes")
          .delete()
          .eq("user_id", members[0]!.id)
          .eq("cat_id", catB)
      ).error,
    );
    expect((await read(run.id)).error?.message).toContain("access_denied");
    await expect(save()).rejects.toThrow("access_denied");
    const tomb = await admin
      .from("analysis_runs")
      .select("envelope,invalidated_at")
      .eq("id", run.id)
      .single();
    check(tomb.error);
    expect(tomb.data?.envelope).toBeNull();
    expect(tomb.data?.invalidated_at).toBeTruthy();
    await like();
    await expect(save(envelope(), key)).rejects.toThrow("access_denied");
  });
  it("hide redacts other-owner history; republishing does not resurrect it", async () => {
    const run = await save();
    check(
      (await members[1]!.client.from("cats").update({ is_public: false }).eq("id", catB)).error,
    );
    expect((await read(run.id)).error?.message).toContain("access_denied");
    await expect(save()).rejects.toThrow("access_denied");
    check((await members[1]!.client.from("cats").update({ is_public: true }).eq("id", catB)).error);
    expect((await read(run.id)).error?.message).toContain("access_denied");
  });
  it("concurrent save/unlike leaves no readable envelope after withdrawal commits", async () => {
    await like();
    const key = randomUUID();
    const responses = await Promise.allSettled([
      save(envelope(), key),
      members[0]!.client
        .from("cat_likes")
        .delete()
        .eq("user_id", members[0]!.id)
        .eq("cat_id", catB),
    ]);
    expect(responses[1].status).toBe("fulfilled");
    if (responses[1].status === "fulfilled") check((responses[1].value as { error: null }).error);
    const rows = await admin
      .from("analysis_runs")
      .select("envelope")
      .eq("owner_id", members[0]!.id)
      .eq("idempotency_key", key);
    check(rows.error);
    expect(rows.data?.every((r) => r.envelope === null)).toBe(true);
    if (responses[0].status === "rejected")
      expect(String(responses[0].reason)).toContain("access_denied");
    await like();
  });
  it("ownership transfer redacts previous snapshots even when the new owner is the analyst", async () => {
    const run = await save();
    check((await admin.from("cats").update({ owner_id: members[0]!.id }).eq("id", catB)).error);
    expect((await read(run.id)).error?.message).toContain("access_denied");
    const row = await admin.from("analysis_runs").select("envelope").eq("id", run.id).single();
    check(row.error);
    expect(row.data?.envelope).toBeNull();
    check((await admin.from("cats").update({ owner_id: members[1]!.id }).eq("id", catB)).error);
  });
  it("delete redacts history and blocks replay access", async () => {
    const run = await save();
    check((await members[1]!.client.from("cats").delete().eq("id", catB)).error);
    expect((await read(run.id)).error?.message).toContain("access_denied");
    const row = await admin.from("analysis_runs").select("envelope").eq("id", run.id).single();
    check(row.error);
    expect(row.data?.envelope).toBeNull();
  });
});
