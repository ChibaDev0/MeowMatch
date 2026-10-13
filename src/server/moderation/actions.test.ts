import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseMock, type QueryResult } from "@/test/supabase-mock";
import { reportCatAction, resolveReportAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mockClient(...args: Parameters<typeof createSupabaseMock>) {
  const mock = createSupabaseMock(...args);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

const CAT_ID = "11111111-1111-1111-1111-111111111111";
const REPORT_ID = "22222222-2222-2222-2222-222222222222";
const OK: QueryResult = { error: null };

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

/**
 * SAFE-01 — การรายงาน listing ไม่เหมาะสม + abuse limit + สิทธิ์ผู้ดูแล
 * server เป็นผู้ตัดสิน: ตรวจ input, ต้องล็อกอิน, ห้ามรายงานแมวตัวเอง, กันรายงานซ้ำ
 */
describe("reportCatAction", () => {
  it("ปฏิเสธเมื่อ catId ไม่ใช่ uuid (fieldErrors.catId)", async () => {
    mockClient();
    const res = await reportCatAction({ catId: "bad", reason: "inappropriate" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.catId).toBeTruthy();
  });

  it("ปฏิเสธเมื่อ reason ไม่อยู่ในรายการ", async () => {
    mockClient();
    const res = await reportCatAction({ catId: CAT_ID, reason: "whatever" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.reason).toBeTruthy();
  });

  it("ปฏิเสธเมื่อยังไม่ล็อกอิน", async () => {
    mockClient({ user: null });
    const res = await reportCatAction({ catId: CAT_ID, reason: "spam" });
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อไม่พบแมว", async () => {
    mockClient({ queries: [{ data: null }] });
    const res = await reportCatAction({ catId: CAT_ID, reason: "spam" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/ไม่พบ/);
  });

  it("ห้ามรายงานแมวของตัวเอง", async () => {
    mockClient({ queries: [{ data: { id: CAT_ID, owner_id: "user-1" } }] });
    const res = await reportCatAction({ catId: CAT_ID, reason: "spam" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/ตัวเอง/);
  });

  it("แจ้งเตือนเมื่อยังไม่ migrate (42P01 → 0008)", async () => {
    mockClient({ queries: [{ error: { code: "42P01" } }] });
    const res = await reportCatAction({ catId: CAT_ID, reason: "spam" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/0008/);
  });

  it("abuse limit: รายงานค้างมากเกินไป → ปฏิเสธก่อน insert", async () => {
    const mock = mockClient({
      queries: [{ data: { id: CAT_ID, owner_id: "other" } }, { count: 20 }],
    });
    const res = await reportCatAction({ catId: CAT_ID, reason: "spam" });
    expect(res.ok).toBe(false);
    // ไม่มี query insert (มีแค่ cats select + reports count)
    expect(mock.queryCount).toBe(2);
  });

  it("กันรายงานซ้ำ (unique violation 23505) → ข้อความเป็นมิตร", async () => {
    mockClient({
      queries: [{ data: { id: CAT_ID, owner_id: "other" } }, { count: 0 }, { error: { code: "23505" } }],
    });
    const res = await reportCatAction({ catId: CAT_ID, reason: "fake" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/รายงานแมวตัวนี้ไว้แล้ว/);
  });

  it("รายงานสำเร็จ ผูก reporter_id กับผู้ใช้ปัจจุบันและ cat_id", async () => {
    const mock = mockClient({
      queries: [{ data: { id: CAT_ID, owner_id: "other" } }, { count: 0 }, OK],
    });
    const res = await reportCatAction({ catId: CAT_ID, reason: "inappropriate", detail: "ไม่เหมาะสม" });
    expect(res.ok).toBe(true);
    const insertCap = mock.captureAt(2);
    expect(insertCap).toMatchObject({ table: "reports", method: "insert" });
    const payload = insertCap.payload as { reporter_id: string; cat_id: string; reason: string };
    expect(payload.reporter_id).toBe("user-1");
    expect(payload.cat_id).toBe(CAT_ID);
    expect(payload.reason).toBe("inappropriate");
  });
});

/**
 * SAFE-01 — ผู้ดูแลตัดสินรายงานผ่าน RPC resolve_report (ตรวจ is_admin ภายใน RPC)
 */
describe("resolveReportAction", () => {
  it("ปฏิเสธเมื่อ reportId ไม่ใช่ uuid", async () => {
    mockClient();
    const res = await resolveReportAction({ reportId: "bad", decision: "hide" });
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อ decision ไม่ถูกต้อง", async () => {
    mockClient();
    const res = await resolveReportAction({ reportId: REPORT_ID, decision: "nuke" });
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อยังไม่ล็อกอิน", async () => {
    mockClient({ user: null });
    const res = await resolveReportAction({ reportId: REPORT_ID, decision: "hide" });
    expect(res.ok).toBe(false);
  });

  it("RPC ปฏิเสธผู้ที่ไม่ใช่ผู้ดูแล (42501) → เฉพาะผู้ดูแล", async () => {
    mockClient({ rpc: { error: { code: "42501" } } });
    const res = await resolveReportAction({ reportId: REPORT_ID, decision: "hide" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/ผู้ดูแล/);
  });

  it("RPC แจ้งไม่พบรายงาน (P0002)", async () => {
    mockClient({ rpc: { error: { code: "P0002" } } });
    const res = await resolveReportAction({ reportId: REPORT_ID, decision: "dismiss" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/ไม่พบรายงาน/);
  });

  it("สำเร็จ: เรียก RPC resolve_report ด้วย args ที่ถูกต้อง", async () => {
    const mock = mockClient({ rpc: { data: {}, error: null } });
    const res = await resolveReportAction({ reportId: REPORT_ID, decision: "hide", note: "ผิดกฎ" });
    expect(res.ok).toBe(true);
    expect(mock.rpcCalls).toHaveLength(1);
    expect(mock.rpcCalls[0]).toEqual({
      fn: "resolve_report",
      args: { p_report_id: REPORT_ID, p_decision: "hide", p_note: "ผิดกฎ" },
    });
  });
});
