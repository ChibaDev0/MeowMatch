import { describe, expect, it } from "vitest";
import { analyzeTarget } from "../ranking/target";
import type { AnalysisParent, TargetAnalysisInput } from "../contracts/input";

/**
 * Golden fixtures — ค้นหาคู่ตามเป้าหมาย (TARGET-01)
 * ตรวจ constraint filtering, ไม่กรองพาหะทิ้ง, joint target, และการจัดอันดับแบบกลุ่ม
 */

function cat(id: string, over: Partial<AnalysisParent> = {}): AnalysisParent {
  return {
    catId: id,
    name: over.name ?? id,
    sex: over.sex ?? "unknown",
    phenotype: over.phenotype ?? {},
    genotype: over.genotype,
  };
}

const demo = (over: Partial<TargetAnalysisInput>): TargetAnalysisInput => ({
  source: cat("src"),
  targets: {},
  candidates: [],
  allowUnverifiedRulesets: true,
  ...over,
});

describe("analyzeTarget — hard constraints (ตัดก่อนให้คะแนน)", () => {
  it("ตัดแมวตัวเดียวกับ source และนับไว้ใน coverage.omitted", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("src", { phenotype: { coat_type: "ขนยาว" } })],
      }),
    );
    expect(res.eligibleCount).toBe(0);
    expect(res.coverage.omitted).toContain("src: same_as_source");
  });

  it("ตัดคู่ Fold × Fold (welfare) ไม่ให้ขึ้นอันดับ", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { phenotype: { ear_type: "หูพับ", coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("c1", { phenotype: { ear_type: "หูพับ", coat_type: "ขนยาว" } })],
      }),
    );
    expect(res.eligibleCount).toBe(0);
    expect(res.coverage.omitted.some((o) => o.includes("welfare_blocked"))).toBe(true);
  });

  it("ตัดคู่เพศเดียวกันที่ทราบแน่ (ผสมกันไม่ได้ทางชีววิทยา)", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "male", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("c1", { sex: "male", phenotype: { coat_type: "ขนยาว" } })],
      }),
    );
    expect(res.eligibleCount).toBe(0);
    expect(res.coverage.omitted.some((o) => o.includes("same_sex"))).toBe(true);
  });
});

describe("analyzeTarget — ไม่กรองพาหะทิ้ง + joint target", () => {
  it("เป้าหมายลูกขนยาว: source ขนยาว(l/l) × คู่ขนสั้น → ยังประเมิน (พาหะ L/l มีโอกาส)", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("short", { sex: "male", phenotype: { coat_type: "ขนสั้น" } })],
      }),
    );
    expect(res.eligibleCount).toBe(1);
    const c = res.candidates[0]!;
    // source l/l × {L/L, L/l} → long อยู่ในช่วง 0–50% (ไม่ใช่ 0 แค่เพราะคู่ขนสั้น)
    expect(c.status).toBe("scenario_range");
    expect(c.lower).toBeCloseTo(0);
    expect(c.upper).toBeCloseTo(0.5);
  });

  it("source ขนยาว × คู่ขนยาว(l/l) → computed ขนยาว 100% (ทั้งคู่ determined)", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("long", { sex: "male", phenotype: { coat_type: "ขนยาว" } })],
      }),
    );
    const c = res.candidates[0]!;
    expect(c.status).toBe("computed");
    expect(c.targetProbability).toBeCloseTo(1);
  });
});

describe("analyzeTarget — การจัดอันดับแบบกลุ่ม", () => {
  it("computed มาก่อน scenario_range เสมอ และ computed เรียง p มาก→น้อย", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [
          cat("short", { sex: "male", phenotype: { coat_type: "ขนสั้น" } }), // scenario
          cat("long", { sex: "male", phenotype: { coat_type: "ขนยาว" } }), // computed 100%
          cat("carrier", { sex: "male", genotype: { coat_type: ["L", "l"] } }), // computed 50%
        ],
      }),
    );
    const ids = res.candidates.map((c) => c.candidateCatId);
    expect(ids).toEqual(["long", "carrier", "short"]);
    expect(res.candidates[0]!.status).toBe("computed");
    expect(res.candidates[2]!.status).toBe("scenario_range");
  });
});

describe("analyzeTarget — เป้าหมายที่ไม่รองรับ / honest gating", () => {
  it("ค่าเริ่มต้น (ไม่เปิด demo) → ทุกเป้าหมาย unsupported, candidate คำนวณไม่ได้", () => {
    const res = analyzeTarget({
      source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
      targets: { coat_type: "long" },
      candidates: [cat("c1", { sex: "male", phenotype: { coat_type: "ขนยาว" } })],
    });
    expect(res.unsupportedTargets).toContain("coat_type");
    expect(res.candidates[0]!.status).toBe("unsupported");
    expect(res.candidates[0]!.targetProbability).toBeNull();
  });

  it("เป้าหมายผสม (coat รองรับ + ear ไม่รองรับ) → รวมเป็นคำนวณครบไม่ได้ แม้ coat มีตัวเลข", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว", ear_type: "หูตั้ง" } }),
        targets: { coat_type: "long", ear_type: "หูพับ" },
        candidates: [
          cat("c1", { sex: "male", phenotype: { coat_type: "ขนยาว", ear_type: "หูตั้ง" } }),
        ],
      }),
    );
    expect(res.unsupportedTargets).toContain("ear_type");
    expect(res.candidates[0]!.status).toBe("unsupported");
    expect(res.candidates[0]!.targetProbability).toBeNull();
  });

  it("outcome code ที่ไม่มีใน ruleset (hairless) → unsupported + null (ไม่ใช่ computed 0%)", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "hairless" },
        candidates: [cat("c1", { sex: "male", phenotype: { coat_type: "ขนยาว" } })],
      }),
    );
    expect(res.unsupportedTargets).toContain("coat_type");
    expect(res.candidates[0]!.status).toBe("unsupported");
    expect(res.candidates[0]!.targetProbability).toBeNull();
  });

  it("candidate ไม่มีรูปลักษณ์ → คง insufficient_data (ไม่เหมาเป็น unsupported)", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("c1", { sex: "male", phenotype: {} })],
      }),
    );
    expect(res.candidates[0]!.status).toBe("insufficient_data");
  });

  it("topK จำกัดจำนวนที่แสดง แต่ evaluatedCount ยังนับครบ", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        topK: 1,
        candidates: [
          cat("long", { sex: "male", phenotype: { coat_type: "ขนยาว" } }),
          cat("carrier", { sex: "male", genotype: { coat_type: ["L", "l"] } }),
        ],
      }),
    );
    expect(res.candidates).toHaveLength(1);
    expect(res.evaluatedCount).toBe(2);
    expect(res.searchComplete).toBe(true);
  });

  it("topK ไม่ถูกต้อง (NaN) → แสดงทั้งหมด (ไม่กลายเป็นรายการว่าง) (P5-06)", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        topK: NaN,
        candidates: [
          cat("long", { sex: "male", phenotype: { coat_type: "ขนยาว" } }),
          cat("carrier", { sex: "male", genotype: { coat_type: ["L", "l"] } }),
        ],
      }),
    );
    expect(res.candidates).toHaveLength(2);
  });
});

describe("analyzeTarget — สถานะเพศของผู้สมัคร (P5-02)", () => {
  it("ผู้สมัครเพศไม่ทราบ → ยังจัดอันดับได้ แต่ติดธง sexCompatibility=unknown + warning", () => {
    const res = analyzeTarget(
      demo({
        source: cat("src", { sex: "female", phenotype: { coat_type: "ขนยาว" } }),
        targets: { coat_type: "long" },
        candidates: [cat("u", { sex: "unknown", phenotype: { coat_type: "ขนยาว" } })],
      }),
    );
    expect(res.eligibleCount).toBe(1);
    expect(res.candidates[0]!.sexCompatibility).toBe("unknown");
    expect(res.warnings.some((w) => w.includes("ยังไม่ทราบเพศ"))).toBe(true);
  });
});
