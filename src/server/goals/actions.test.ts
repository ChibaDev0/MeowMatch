import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseMock, type QueryResult } from "@/test/supabase-mock";
import { saveDesiredGoalAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mockClient(...args: Parameters<typeof createSupabaseMock>) {
  const mock = createSupabaseMock(...args);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const CAT_ID = "11111111-1111-1111-1111-111111111111";
const OK: QueryResult = { error: null };

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

/**
 * Phase 4 (ทดสอบ MVP-A) — เป้าหมายลูกแมว (GOAL-01)
 * กติกาเด่น: เลือก "แมวต้นทาง" ได้เฉพาะแมวของผู้ใช้เอง และกู้ state ด้วย update-or-insert แถวล่าสุด
 */
describe("saveDesiredGoalAction", () => {
  it("ปฏิเสธเมื่อ sourceCatId ไม่ใช่ uuid", async () => {
    mockClient();
    const res = await saveDesiredGoalAction(form({ sourceCatId: "not-uuid" }));
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อยังไม่ล็อกอิน", async () => {
    mockClient({ user: null });
    const res = await saveDesiredGoalAction(form({ targetBreed: "เปอร์เซีย" }));
    expect(res.ok).toBe(false);
  });

  it("กันเลือกแมวของคนอื่นเป็นแมวต้นทาง", async () => {
    // select cats (owned) → ไม่พบ (แมวไม่ใช่ของผู้ใช้)
    mockClient({ queries: [{ data: null }] });
    const res = await saveDesiredGoalAction(form({ sourceCatId: CAT_ID }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.sourceCatId).toBeTruthy();
  });

  it("ยังไม่มีเป้าหมายเดิม → insert แถวใหม่ผูก owner_id", async () => {
    // ไม่มี sourceCatId → ข้าม ownership check; select existing → null; insert
    const mock = mockClient({ queries: [{ data: null }, OK] });
    const res = await saveDesiredGoalAction(form({ targetBreed: "เปอร์เซีย" }));
    expect(res.ok).toBe(true);
    const insertCap = mock.captureAt(1);
    expect(insertCap.method).toBe("insert");
    expect((insertCap.payload as { owner_id: string }).owner_id).toBe("user-1");
  });

  it("มีเป้าหมายเดิม → update แถวล่าสุด (กู้ state)", async () => {
    const mock = mockClient({ queries: [{ data: { id: "goal-1" } }, OK] });
    const res = await saveDesiredGoalAction(form({ targetCoat: "ขนยาว" }));
    expect(res.ok).toBe(true);
    expect(mock.captureAt(1).method).toBe("update");
  });

  it("แมวต้นทางเป็นของผู้ใช้เอง → บันทึกได้", async () => {
    // select cats (owned) → พบ; select existing goal → null; insert
    const mock = mockClient({ queries: [{ data: { id: CAT_ID } }, { data: null }, OK] });
    const res = await saveDesiredGoalAction(form({ sourceCatId: CAT_ID, targetBreed: "ผสม" }));
    expect(res.ok).toBe(true);
    expect(mock.captureAt(0).table).toBe("cats");
    expect(mock.captureAt(2).method).toBe("insert");
  });
});
