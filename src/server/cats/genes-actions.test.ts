import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseMock, type QueryResult } from "@/test/supabase-mock";
import { createCatAction, updateCatAction } from "./actions";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mockClient(...args: Parameters<typeof createSupabaseMock>) {
  const mock = createSupabaseMock(...args);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ sex: "female", name: "มิ้ว", coat: "ขนสั้น", ...fields })) fd.set(k, v);
  return fd;
}
const OK: QueryResult = { error: null };
const CAT_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => vi.mocked(createClient).mockReset());

describe("simulated genes on cat save", () => {
  it("stores hidden genes that fit the appearance", async () => {
    const mock = mockClient({ queries: [OK] });
    const res = await createCatAction(form({ coatColor: "ดำ", genes: JSON.stringify({ L: "Aa", D: "Aa" }) }));
    expect(res).toMatchObject({ ok: true, message: "เพิ่มแมวสำเร็จ" });
    expect(mock.captureAt(0).payload).toMatchObject({ genes: { L: "Aa", D: "Aa" } });
  });

  it("rejects genes that contradict the appearance before touching the database", async () => {
    const res = await createCatAction(form({ coat: "ขนยาว", genes: JSON.stringify({ L: "Aa" }) }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.genes).toContain("ไม่ตรงกับหน้าตา");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects unknown loci, bad codes and broken JSON", async () => {
    for (const genes of [JSON.stringify({ Z: "AA" }), JSON.stringify({ L: "XX" }), "{oops"]) {
      const res = await createCatAction(form({ genes }));
      expect(res.ok).toBe(false);
    }
  });

  it("requires a known sex for the X-linked orange gene", async () => {
    const res = await createCatAction(form({ sex: "unknown", genes: JSON.stringify({ O: "A" }) }));
    expect(res.ok).toBe(false);
  });

  it("still saves the cat when the genes column has not been migrated yet", async () => {
    const mock = mockClient({
      queries: [{ error: { code: "PGRST204", message: "Could not find the 'genes' column of 'cats'" } }, OK],
    });
    const res = await createCatAction(form({ genes: JSON.stringify({ L: "Aa" }) }));
    expect(res).toMatchObject({ ok: true });
    if (res.ok) expect(res.message).toContain("migration");
    expect(mock.captureAt(1).payload).not.toHaveProperty("genes");
  });

  it("updates genes on edit", async () => {
    const mock = mockClient({ queries: [{ data: { photo_path: null }, error: null }, OK] });
    const res = await updateCatAction(form({ id: CAT_ID, genes: JSON.stringify({ L: "AA" }) }));
    expect(res.ok).toBe(true);
    expect(mock.captureAt(1).payload).toMatchObject({ genes: { L: "AA" } });
  });
});
