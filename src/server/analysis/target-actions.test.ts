import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeTargetAction } from "./target-actions";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import type { CatView } from "@/features/cats/types";

/**
 * TARGET-01 — ทดสอบชั้นตรวจสิทธิ์ของ server action (07-genetics-engine §B)
 * source=ของฉัน, candidate pool=แมวที่กดใจ (ตัด source ออก), ต้องตั้งเป้าหมายอย่างน้อยหนึ่ง
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
    breed: "ผสม",
    coat: over.coat ?? "ขนสั้น",
    eye: over.eye ?? "ตาสีฟ้า",
    ear: over.ear ?? "หูตั้ง",
    sex: over.sex ?? "female",
  };
}

const SRC = cat("src", { sex: "female", coat: "ขนยาว" });
const LIKED_MALE = cat("m", { sex: "male", coat: "ขนยาว" });

beforeEach(() => {
  vi.mocked(getMyCats).mockReset();
  vi.mocked(getLikedCats).mockReset();
  vi.mocked(getMyCats).mockResolvedValue([SRC]);
  vi.mocked(getLikedCats).mockResolvedValue([LIKED_MALE]);
});

describe("analyzeTargetAction — runtime validation (P5-06)", () => {
  it("ปฏิเสธ sourceCatId ชนิดผิด (ไม่ใช่ string)", async () => {
    const res = await analyzeTargetAction(123 as unknown as string, { coat: "ขนยาว" });
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธ labels ชนิดผิด", async () => {
    const res = await analyzeTargetAction("src", { coat: 5 as unknown as string });
    expect(res.ok).toBe(false);
  });
});

describe("analyzeTargetAction — ตรวจสิทธิ์/อินพุต", () => {
  it("unsupported hairless selection remains unknown through label mapping", async () => {
    const res = await analyzeTargetAction("src", { coat: "ไม่มีขน" }, { demo: true });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(res.error);
    expect(res.result.candidates[0]?.status).toBe("unsupported");
    expect(res.result.candidates[0]?.targetProbability).toBeNull();
    expect(res.result.coverage.complete).toBe(false);
  });
  it("ปฏิเสธเมื่อไม่ได้เลือกแมวต้นทาง", async () => {
    const res = await analyzeTargetAction("", { coat: "ขนยาว" });
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธเมื่อไม่ตั้งเป้าหมายเลย", async () => {
    const res = await analyzeTargetAction("src", {});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("เป้าหมาย");
  });

  it("ปฏิเสธเมื่อแมวต้นทางไม่ใช่ของผู้ใช้", async () => {
    const res = await analyzeTargetAction("stranger", { coat: "ขนยาว" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("ของคุณ");
  });

  it("source ของฉัน + เป้าหมายขน → ok และจัดอันดับแมวที่กดใจ", async () => {
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.kind).toBe("target_search");
      // ขนยาว(l/l) × ขนยาว(l/l) → computed 100%
      expect(res.result.candidates[0]?.candidateCatId).toBe("m");
      expect(res.result.candidates[0]?.status).toBe("computed");
    }
  });

  it("ค่าเริ่มต้น (ไม่เปิด demo) → เป้าหมายขน unsupported (ไม่เติม %)", async () => {
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.unsupportedTargets).toContain("coat_type");
      expect(res.result.candidates[0]?.targetProbability).toBeNull();
    }
  });

  it("source อยู่ใน likedCats ด้วย → ไม่ถูกจับเป็น candidate ของตัวเอง", async () => {
    vi.mocked(getLikedCats).mockResolvedValue([SRC, LIKED_MALE]);
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.candidates.every((c) => c.candidateCatId !== "src")).toBe(true);
    }
  });
});
