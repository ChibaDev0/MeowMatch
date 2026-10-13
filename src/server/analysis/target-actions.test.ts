import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyzeTargetAction } from "./target-actions";
import { getAnalysisCandidates, getMyCats, type CandidatePool } from "@/server/cats/queries";
import type { CatView } from "@/features/cats/types";

/**
 * TARGET-01 — ทดสอบชั้นตรวจสิทธิ์ของ server action (07-genetics-engine §B)
 * source=ของฉัน, candidate pool=แมวที่กดใจ (ดึงผ่าน getAnalysisCandidates ที่ตัด source ออกแล้ว)
 */
vi.mock("@/server/cats/queries", () => ({
  getMyCats: vi.fn(),
  getAnalysisCandidates: vi.fn(),
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

function pool(over: Partial<CandidatePool> = {}): CandidatePool {
  return {
    cats: over.cats ?? [LIKED_MALE],
    source: over.source ?? "real",
    complete: over.complete ?? true,
    error: over.error ?? null,
    fetched: over.fetched ?? 1,
    expected: over.expected ?? 1,
  };
}

beforeEach(() => {
  vi.mocked(getMyCats).mockReset();
  vi.mocked(getAnalysisCandidates).mockReset();
  vi.mocked(getMyCats).mockResolvedValue([SRC]);
  vi.mocked(getAnalysisCandidates).mockResolvedValue(pool());
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
  it("keeps unknown sex pending after server mapping, outside rankings", async () => {
    vi.mocked(getAnalysisCandidates).mockResolvedValue(pool({ cats: [cat("u", { sex: "unknown", coat: "ขนยาว" }), LIKED_MALE], fetched: 2, expected: 2 }));
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    if (!res.ok) throw new Error(res.error);
    expect(res.result.candidates.map((c) => c.candidateCatId)).toEqual(["m"]);
    expect(res.result.pendingCandidates[0]?.candidateCatId).toBe("u");
    expect(res.result.evaluatedCount).toBe(2);
  });
  it("blocks a single reported Fold through server mapping for a coat-only target", async () => {
    vi.mocked(getAnalysisCandidates).mockResolvedValue(pool({ cats: [cat("f", { sex: "male", coat: "ขนยาว", ear: "หูพับ" })] }));
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    if (!res.ok) throw new Error(res.error);
    expect(res.result.candidates).toEqual([]);
    expect(res.result.pendingCandidates).toEqual([]);
    expect(res.result.coverage.omitted.join()).toContain("welfare_blocked");
  });
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

  it("ส่ง excludeCatId = source ให้ชั้น query (กัน candidate เป็นตัวเอง)", async () => {
    await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    expect(vi.mocked(getAnalysisCandidates)).toHaveBeenCalledWith("src");
  });
});

describe("analyzeTargetAction — provenance ของ pool (P5-01)", () => {
  it("คืน pool info (source/complete/fetched) ให้ UI", async () => {
    vi.mocked(getAnalysisCandidates).mockResolvedValue(
      pool({ source: "demo", fetched: 3, expected: 3 }),
    );
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.pool.source).toBe("demo");
      expect(res.pool.fetched).toBe(3);
    }
  });

  it("pool ดึงไม่ครบ → searchComplete=false และ pool.complete=false", async () => {
    vi.mocked(getAnalysisCandidates).mockResolvedValue(
      pool({ complete: false, error: "ดึงไม่ครบ" }),
    );
    const res = await analyzeTargetAction("src", { coat: "ขนยาว" }, { demo: true });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.result.searchComplete).toBe(false);
      expect(res.pool.complete).toBe(false);
    }
  });
});
