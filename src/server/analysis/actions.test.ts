import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePairAction } from "./actions";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import type { CatView } from "@/features/cats/types";

/**
 * PAIR-01 — ทดสอบ "ชั้นตรวจสิทธิ์" ของ server action (07-genetics-engine §A)
 * mock ที่ชั้น queries (มีเทสต์แยกแล้ว) เพื่อโฟกัสกติกา: A=ของฉัน, B=ของฉัน/กดใจ, a≠b
 * ตรรกะคำนวณของ engine เป็นฟังก์ชันบริสุทธิ์ที่ทดสอบไว้ใน domain/genetics แล้ว
 */
vi.mock("@/server/cats/queries", () => ({
  getMyCats: vi.fn(),
  getLikedCats: vi.fn(),
}));

function cat(id: string, over: Partial<CatView> = {}): CatView {
  return {
    id,
    name: over.name ?? id,
    ageLabel: "1 ปี",
    breed: over.breed ?? "ผสม",
    coat: over.coat ?? "ขนสั้น",
    eye: over.eye ?? "ตาสีฟ้า",
    ear: over.ear ?? "หูตั้ง",
    sex: over.sex ?? "female",
  };
}

const MINE_A = cat("a", { coat: "ขนสั้น" });
const MINE_B = cat("b", { coat: "ขนยาว" });
const LIKED = cat("liked", { coat: "ขนยาว" });

beforeEach(() => {
  vi.mocked(getMyCats).mockReset();
  vi.mocked(getLikedCats).mockReset();
  vi.mocked(getMyCats).mockResolvedValue([MINE_A, MINE_B]);
  vi.mocked(getLikedCats).mockResolvedValue([LIKED]);
});

describe("analyzePairAction — ตรวจสิทธิ์/อินพุต", () => {
  it("ปฏิเสธเมื่อ id ว่าง", async () => {
    const res = await analyzePairAction("", "b");
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อเลือกแมวตัวเดียวกัน", async () => {
    const res = await analyzePairAction("a", "a");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("ตัวเดียวกัน");
  });

  it("ปฏิเสธเมื่อแมวตัวที่ 1 ไม่ใช่ของผู้ใช้ (เช่นส่ง id ของแมวที่กดใจมาเป็น A)", async () => {
    const res = await analyzePairAction("liked", "b");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("ตัวที่ 1");
  });

  it("ปฏิเสธเมื่อแมวตัวที่ 2 ไม่ใช่ของฉันและไม่ได้กดใจ", async () => {
    const res = await analyzePairAction("a", "stranger");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("ตัวที่ 2");
  });

  it("A=ของฉัน + B=แมวที่กดใจ → ok", async () => {
    const res = await analyzePairAction("a", "liked");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.kind).toBe("pair");
  });

  it("A และ B เป็นแมวของฉันทั้งคู่ → ok", async () => {
    const res = await analyzePairAction("a", "b");
    expect(res.ok).toBe(true);
  });
});

describe("analyzePairAction — ส่งค่า demo ไปยัง engine ถูกต้อง", () => {
  it("ค่าเริ่มต้น (ไม่เปิด demo) → coat_type เป็น unsupported (ไม่เติม %)", async () => {
    const res = await analyzePairAction("a", "b");
    expect(res.ok).toBe(true);
    if (res.ok) {
      const coat = res.result.traits.find((t) => t.category === "coat_type")!;
      expect(coat.status).toBe("unsupported");
    }
  });

  it("เปิด demo → coat_type คำนวณได้ (ขนสั้น × ขนยาว = scenario_range)", async () => {
    const res = await analyzePairAction("a", "b", { demo: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const coat = res.result.traits.find((t) => t.category === "coat_type")!;
      expect(coat.status).toBe("scenario_range");
    }
  });

  it("ไม่วิเคราะห์หมวด temperament (ไม่คำนวณพันธุกรรมเป็น %)", async () => {
    const res = await analyzePairAction("a", "b", { demo: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.traits.some((t) => t.category === "temperament")).toBe(false);
    }
  });
});
