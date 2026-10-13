import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * SAFE-01 (Phase 6) — ทดสอบ moderation/report บน Supabase จริง (A/B/admin/anon)
 * พิสูจน์: กันยกระดับ role, สิทธิ์รายงาน (ห้ามรายงานแมวตัวเอง/กันซ้ำ), สิทธิ์ผู้ดูแล,
 *         การซ่อนตาม RLS, และ audit ที่เห็นเฉพาะผู้ดูแล
 *
 * Explicit opt-in; ไม่รวมใน `npm test`. รันด้วย:
 *   MEOWMATCH_LIVE_DB=qgkajyuoaffydydqbouv npm run test:db
 * ลบเฉพาะ fixture (ผู้ใช้/แมวที่สร้างในเทสต์นี้) เมื่อจบ
 */
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

type Member = { id: string; role: "reporter" | "owner" | "admin"; client: SupabaseClient };
const members: Member[] = [];
const createdUsers: string[] = [];
const catOwned = randomUUID(); // แมวของ owner (เป้าหมายการรายงาน)

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
const byRole = (r: Member["role"]) => members.find((m) => m.role === r)!;

beforeAll(async () => {
  check((await admin.from("reports").select("id").limit(0)).error); // ยืนยันว่า migrate แล้ว
  for (const role of ["reporter", "owner", "admin"] as const) {
    const email = `safe01-${randomUUID()}-${role}@example.invalid`;
    const password = `S1!${randomUUID()}Aa9`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { fixture: "safe01_moderation_live" },
    });
    check(error);
    const id = data.user!.id;
    createdUsers.push(id);
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, options);
    check((await client.auth.signInWithPassword({ email, password })).error);
    members.push({ id, role, client });
  }

  // แต่งตั้ง admin ฝั่งระบบ (service_role ผ่าน guard ได้)
  check(
    (await admin.from("profiles").update({ role: "admin" }).eq("user_id", byRole("admin").id)).error,
  );

  // แมวของ owner — เผยแพร่, active
  check(
    (
      await admin.from("cats").insert({
        id: catOwned,
        owner_id: byRole("owner").id,
        name: "SAFE-01 target",
        sex: "female",
        coat: "ขนสั้น",
        is_public: true,
      })
    ).error,
  );
});

afterAll(async () => {
  const failures: string[] = [];
  await admin.from("cats").delete().eq("id", catOwned);
  for (const m of members) await m.client.auth.signOut();
  for (const id of createdUsers) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) failures.push(`cleanup:${id}:${error.message}`);
  }
  if (failures.length) throw new Error(failures.join("; "));
});

describe.sequential("SAFE-01 moderation — real Supabase", () => {
  it("กันยกระดับสิทธิ์: สมาชิกตั้ง role=admin ให้ตัวเองไม่ได้ (trigger คงค่าเดิม)", async () => {
    const reporter = byRole("reporter");
    // update ไม่ error (policy ยอมให้แก้แถวตัวเอง) แต่ trigger ต้องคง role เดิม
    await reporter.client.from("profiles").update({ role: "admin" }).eq("user_id", reporter.id);
    const { data } = await admin.from("profiles").select("role").eq("user_id", reporter.id).single();
    expect(data?.role).toBe("member");
  });

  it("is_admin(): สมาชิก=false, ผู้ดูแล=true", async () => {
    expect((await byRole("reporter").client.rpc("is_admin")).data).toBe(false);
    expect((await byRole("admin").client.rpc("is_admin")).data).toBe(true);
  });

  let reportId = "";
  it("รายงานแมวคนอื่นได้ (reporter → แมวของ owner)", async () => {
    const { data, error } = await byRole("reporter")
      .client.from("reports")
      .insert({ reporter_id: byRole("reporter").id, cat_id: catOwned, reason: "inappropriate" })
      .select("id")
      .single();
    check(error);
    reportId = data!.id;
    expect(reportId).toBeTruthy();
  });

  it("ห้ามรายงานแมวของตัวเอง (RLS with check ปฏิเสธ)", async () => {
    const { error } = await byRole("owner")
      .client.from("reports")
      .insert({ reporter_id: byRole("owner").id, cat_id: catOwned, reason: "spam" });
    expect(error?.code).toBe("42501");
  });

  it("ห้ามสวมสิทธิ์ reporter_id เป็นคนอื่น", async () => {
    const { error } = await byRole("reporter")
      .client.from("reports")
      .insert({ reporter_id: byRole("owner").id, cat_id: catOwned, reason: "spam" });
    expect(error?.code).toBe("42501");
  });

  it("กันรายงานซ้ำขณะยังเปิดอยู่ (unique index → 23505)", async () => {
    const { error } = await byRole("reporter")
      .client.from("reports")
      .insert({ reporter_id: byRole("reporter").id, cat_id: catOwned, reason: "fake" });
    expect(error?.code).toBe("23505");
  });

  it("สมาชิกเห็นเฉพาะรายงานของตัวเอง (owner ไม่เห็นของ reporter)", async () => {
    const asReporter = await byRole("reporter").client.from("reports").select("id");
    expect((asReporter.data ?? []).some((r) => r.id === reportId)).toBe(true);
    const asOwner = await byRole("owner").client.from("reports").select("id");
    expect((asOwner.data ?? []).some((r) => r.id === reportId)).toBe(false);
  });

  it("สมาชิกเรียก resolve_report ไม่ได้ (42501) และแก้สถานะตรงไม่ได้", async () => {
    const rpc = await byRole("reporter").client.rpc("resolve_report", {
      p_report_id: reportId,
      p_decision: "dismiss",
    });
    expect(rpc.error?.code).toBe("42501");
    // ไม่มี update policy ให้ client → แก้ตรงไม่ได้ (0 rows / RLS)
    const direct = await byRole("owner")
      .client.from("reports")
      .update({ status: "dismissed" })
      .eq("id", reportId)
      .select("id");
    expect((direct.data ?? []).length).toBe(0);
  });

  it("ผู้ดูแล resolve (hide): รายงาน=actioned, แมว=hidden, มี audit", async () => {
    const rpc = await byRole("admin").client.rpc("resolve_report", {
      p_report_id: reportId,
      p_decision: "hide",
      p_note: "เนื้อหาไม่เหมาะสม",
    });
    check(rpc.error);
    const report = await admin.from("reports").select("status, resolution").eq("id", reportId).single();
    expect(report.data?.status).toBe("actioned");
    const cat = await admin.from("cats").select("moderation_status").eq("id", catOwned).single();
    expect(cat.data?.moderation_status).toBe("hidden");
    const audit = await admin
      .from("moderation_actions")
      .select("action, actor_id")
      .eq("report_id", reportId);
    expect((audit.data ?? []).some((a) => a.action === "hide" && a.actor_id === byRole("admin").id)).toBe(
      true,
    );
  });

  it("แมวที่ถูกระงับ: สมาชิกคนอื่น/anon มองไม่เห็น แต่เจ้าของและผู้ดูแลเห็น", async () => {
    const asReporter = await byRole("reporter").client.from("cats").select("id").eq("id", catOwned);
    expect((asReporter.data ?? []).length).toBe(0);
    const asAnon = await anon.from("cats").select("id").eq("id", catOwned);
    expect((asAnon.data ?? []).length).toBe(0);
    const asOwner = await byRole("owner").client.from("cats").select("id").eq("id", catOwned);
    expect((asOwner.data ?? []).length).toBe(1);
    const asAdmin = await byRole("admin").client.from("cats").select("id").eq("id", catOwned);
    expect((asAdmin.data ?? []).length).toBe(1);
  });

  it("audit เห็นเฉพาะผู้ดูแล (สมาชิกอ่าน moderation_actions ไม่ได้)", async () => {
    const asMember = await byRole("reporter").client.from("moderation_actions").select("id");
    expect((asMember.data ?? []).length).toBe(0);
    const asAdmin = await byRole("admin").client.from("moderation_actions").select("id");
    expect((asAdmin.data ?? []).length).toBeGreaterThan(0);
  });

  it("ผู้ดูแล unhide: คืนการแสดงของแมว", async () => {
    const rpc = await byRole("admin").client.rpc("resolve_report", {
      p_report_id: reportId,
      p_decision: "unhide",
    });
    check(rpc.error);
    const cat = await admin.from("cats").select("moderation_status").eq("id", catOwned).single();
    expect(cat.data?.moderation_status).toBe("active");
  });
});
