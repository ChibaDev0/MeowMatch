import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseMock, hasEq, type QueryResult } from "@/test/supabase-mock";
import {
  createCatAction,
  deleteCatAction,
  setCatVisibilityAction,
  toggleLikeAction,
  updateCatAction,
} from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mockClient(...args: Parameters<typeof createSupabaseMock>) {
  const mock = createSupabaseMock(...args);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

/**
 * สร้าง FormData จาก object (ค่าทั้งหมดเป็น string เหมือนฟอร์มจริง)
 * ฟอร์มแมวจริงส่ง sex เสมอ (เป็น <select> ที่มีค่าเริ่มต้น) จึงเติมให้ถ้าไม่ระบุ
 * — ดูข้อสังเกต SEC/ชั้น D: readCatFields ส่ง null เมื่อ field หาย และ z.enum().default()
 *   ไม่ครอบ null จึงควรคง invariant นี้ไว้ในฟอร์ม
 */
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  if (!("sex" in fields)) fd.set("sex", "unknown");
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const CAT_ID = "11111111-1111-1111-1111-111111111111";
const MISSING: QueryResult = { error: { code: "42P01" } };
const OK: QueryResult = { error: null };

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

/**
 * Phase 4 (ทดสอบ MVP-A) — Server Actions ของแมว (CAT-01/MEDIA-01/FAV-01)
 * server เป็นผู้ตัดสินเสมอ: ตรวจ input, ต้องล็อกอิน, และ scope ด้วย owner_id (RLS อีกชั้น)
 */
describe("createCatAction", () => {
  it("ปฏิเสธเมื่อไม่กรอกชื่อ (fieldErrors.name)", async () => {
    mockClient();
    const res = await createCatAction(form({ coat: "ขนสั้น" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.name).toBeTruthy();
  });

  it("ปฏิเสธเมื่อไม่เลือกลักษณะขน (coat)", async () => {
    mockClient();
    const res = await createCatAction(form({ name: "โทฟุ" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.coat).toBeTruthy();
  });

  it("ปฏิเสธเมื่อยังไม่ล็อกอิน", async () => {
    mockClient({ user: null });
    const res = await createCatAction(form({ name: "โทฟุ", coat: "ขนสั้น" }));
    expect(res.ok).toBe(false);
  });

  it("บันทึกสำเร็จและผูก owner_id กับผู้ใช้ปัจจุบัน", async () => {
    const mock = mockClient({ queries: [OK] });
    const res = await createCatAction(form({ name: "โทฟุ", coat: "ขนสั้น", sex: "male" }));
    expect(res.ok).toBe(true);
    expect(mock.captureAt(0)).toMatchObject({ table: "cats", method: "insert" });
    expect((mock.captureAt(0).payload as { owner_id: string }).owner_id).toBe("user-1");
  });

  it("แจ้งเตือนเมื่อยังไม่ migrate (42P01)", async () => {
    mockClient({ queries: [MISSING] });
    const res = await createCatAction(form({ name: "โทฟุ", coat: "ขนสั้น" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/0003/);
  });
});

describe("updateCatAction (ownership guard)", () => {
  it("ปฏิเสธเมื่อ id ไม่ใช่ uuid", async () => {
    mockClient();
    const res = await updateCatAction(form({ id: "not-uuid", name: "x", coat: "ขนสั้น" }));
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อไม่พบแมวของผู้ใช้ (แก้แมวคนอื่นไม่ได้)", async () => {
    mockClient({ queries: [{ data: null }] }); // select existing → ไม่พบ
    const res = await updateCatAction(form({ id: CAT_ID, name: "x", coat: "ขนสั้น" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/ไม่มีสิทธิ์|ไม่พบ/);
  });

  it("แก้ไขสำเร็จและ scope update ด้วย owner_id", async () => {
    const mock = mockClient({
      queries: [{ data: { photo_path: null } }, OK], // select existing → update
    });
    const res = await updateCatAction(form({ id: CAT_ID, name: "โมจิ", coat: "ขนยาว" }));
    expect(res.ok).toBe(true);
    const updateCap = mock.captureAt(1);
    expect(updateCap.method).toBe("update");
    expect(hasEq(updateCap, "owner_id", "user-1")).toBe(true);
    expect(hasEq(updateCap, "id", CAT_ID)).toBe(true);
  });
});

describe("deleteCatAction (ownership guard)", () => {
  it("ปฏิเสธเมื่อ id ไม่ใช่ uuid", async () => {
    mockClient();
    expect((await deleteCatAction("bad-id")).ok).toBe(false);
  });

  it("ปฏิเสธเมื่อยังไม่ล็อกอิน", async () => {
    mockClient({ user: null });
    expect((await deleteCatAction(CAT_ID)).ok).toBe(false);
  });

  it("ปฏิเสธเมื่อไม่พบแมวของผู้ใช้ (ลบแมวคนอื่นไม่ได้)", async () => {
    mockClient({ queries: [{ data: null }] });
    expect((await deleteCatAction(CAT_ID)).ok).toBe(false);
  });

  it("ลบสำเร็จและ scope delete ด้วย owner_id", async () => {
    const mock = mockClient({ queries: [{ data: { photo_path: null } }, OK] });
    const res = await deleteCatAction(CAT_ID);
    expect(res.ok).toBe(true);
    expect(hasEq(mock.captureAt(1), "owner_id", "user-1")).toBe(true);
  });
});

describe("setCatVisibilityAction (DISC-01 ถอน/เผยแพร่)", () => {
  it("ปฏิเสธเมื่อ id ไม่ใช่ uuid", async () => {
    mockClient();
    expect((await setCatVisibilityAction("bad", false)).ok).toBe(false);
  });

  it("ปฏิเสธเมื่อไม่พบแมวของผู้ใช้", async () => {
    mockClient({ queries: [{ data: null }] });
    expect((await setCatVisibilityAction(CAT_ID, false)).ok).toBe(false);
  });

  it("ถอนเผยแพร่สำเร็จและ scope ด้วย owner_id", async () => {
    const mock = mockClient({ queries: [{ data: { id: CAT_ID } }] });
    const res = await setCatVisibilityAction(CAT_ID, false);
    expect(res).toEqual({ ok: true, isPublic: false });
    expect(hasEq(mock.captureAt(0), "owner_id", "user-1")).toBe(true);
  });
});

describe("toggleLikeAction (FAV-01)", () => {
  it("ปฏิเสธเมื่อ id ไม่ใช่ uuid", async () => {
    mockClient();
    expect((await toggleLikeAction("bad")).ok).toBe(false);
  });

  it("ยังไม่เคยกดใจ → insert และคืน liked=true", async () => {
    const mock = mockClient({ queries: [{ data: null }, OK] }); // select → insert
    const res = await toggleLikeAction(CAT_ID);
    expect(res).toEqual({ ok: true, liked: true });
    expect(mock.captureAt(1).method).toBe("insert");
  });

  it("กดใจอยู่แล้ว → delete และคืน liked=false (unlike)", async () => {
    const mock = mockClient({ queries: [{ data: { cat_id: CAT_ID } }, OK] });
    const res = await toggleLikeAction(CAT_ID);
    expect(res).toEqual({ ok: true, liked: false });
    expect(mock.captureAt(1).method).toBe("delete");
  });
});
