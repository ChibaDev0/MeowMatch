import { describe, it, expect } from "vitest";
import { requiredMateProfile } from "./mate-spec";
import type { AnalysisParent } from "../contracts/input";

function src(partial: Partial<AnalysisParent>): AnalysisParent {
  return {
    catId: "src",
    name: "แมวตั้งต้น",
    sex: "female",
    phenotype: {},
    ...partial,
  };
}

const demo = { allowUnverifiedRulesets: true } as const;

describe("requiredMateProfile — coat_type (demo)", () => {
  it("หมวดที่ยังไม่มี ruleset → unsupported (รอ RES-01) ไม่แต่งตัวเลข", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { eye_color: "ฟ้า" } }),
      category: "eye_color",
      targetCode: "blue",
      ...demo,
    });
    expect(r.status).toBe("unsupported");
    expect(r.guaranteed).toHaveLength(0);
    expect(r.possible).toHaveLength(0);
  });

  it("ปิดโหมดสาธิต → แม้ coat_type ก็ unsupported (ไม่เปิดกฎที่ยังไม่ verified)", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ขนยาว" } }),
      category: "coat_type",
      targetCode: "long",
    });
    expect(r.status).toBe("unsupported");
  });

  it("source ขนยาว (l/l) + เป้าขนยาว → คู่ขนยาว (l/l) การันตี 100% ผสมครั้งเดียว", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ขนยาว" } }),
      category: "coat_type",
      targetCode: "long",
      ...demo,
    });
    expect(r.status).toBe("computed");
    expect(r.sourceScenario).toEqual(["l/l"]);
    expect(r.guaranteed.map((o) => o.genotypeKey)).toEqual(["l/l"]);
    expect(r.guaranteed[0]!.phenotypeLabel).toBe("ขนยาว");
    expect(r.guaranteed[0]!.probability).toBe(1);
    expect(r.possible.map((o) => o.genotypeKey)).toContain("L/l");
    expect(r.impossible.map((o) => o.genotypeKey)).toEqual(["L/L"]);
    expect(r.plan).toHaveLength(1);
    expect(r.plan[0]!.generation).toBe(1);
  });

  it("source พาหะ L/l (ยืนยัน DNA) + เป้าขนยาว → คู่ l/l โอกาส 50%/ครอก + จำนวนครอก", () => {
    const r = requiredMateProfile({
      source: src({ genotype: { coat_type: ["L", "l"] }, phenotype: { coat_type: "ขนสั้น" } }),
      category: "coat_type",
      targetCode: "long",
      ...demo,
    });
    expect(r.status).toBe("computed");
    expect(r.sourceGenotypeConfirmed).toBe(true);
    expect(r.guaranteed).toHaveLength(0);
    const best = r.possible[0]!;
    expect(best.genotypeKey).toBe("l/l");
    expect(best.probability).toBeCloseTo(0.5, 10);
    const t90 = best.littersFor!.find((x) => x.threshold === 0.9)!;
    expect(t90.litters).toBe(4); // ceil(log0.1/log0.5)
    const t99 = best.littersFor!.find((x) => x.threshold === 0.99)!;
    expect(t99.litters).toBe(7);
    // เป้าแบบด้อย-โฮโมไซกัส → แผน 2 รุ่น
    expect(r.plan).toHaveLength(2);
    expect(r.plan[1]!.generation).toBe(2);
  });

  it("source ขนสั้น (ไม่ทราบ genotype) + เป้าขนยาว → scenario_range ช่วง 0–50% + แผน 2 รุ่น", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ขนสั้น" } }),
      category: "coat_type",
      targetCode: "long",
      ...demo,
    });
    expect(r.status).toBe("scenario_range");
    expect(r.sourceScenario.sort()).toEqual(["L/L", "L/l"]);
    const best = r.possible[0]!;
    expect(best.genotypeKey).toBe("l/l");
    expect(best.probability).toBeNull();
    expect(best.lower).toBeCloseTo(0, 10);
    expect(best.upper).toBeCloseTo(0.5, 10);
    expect(r.plan.length).toBeGreaterThanOrEqual(2);
    expect(r.warnings.some((w) => w.includes("ยืนยันด้วยผล DNA"))).toBe(true);
  });

  it("เป้าขนสั้น (เด่น) + source ขนยาว (l/l) → คู่ L/L การันตีขนสั้น 100%", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ขนยาว" } }),
      category: "coat_type",
      targetCode: "short",
      ...demo,
    });
    expect(r.status).toBe("computed");
    expect(r.guaranteed.map((o) => o.genotypeKey)).toEqual(["L/L"]);
    expect(r.guaranteed[0]!.probability).toBe(1);
    expect(r.possible.map((o) => o.genotypeKey)).toContain("L/l");
    expect(r.impossible.map((o) => o.genotypeKey)).toEqual(["l/l"]);
    // เป้าขนสั้นมีได้หลาย genotype → ไม่ใช่ recessive-homozygous → แผนขั้นเดียว (มี guaranteed)
    expect(r.plan).toHaveLength(1);
  });

  it("ลักษณะกำกวม → insufficient_data ไม่เดา", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ไม่ทราบว่าขนสั้นหรือยาว" } }),
      category: "coat_type",
      targetCode: "long",
      ...demo,
    });
    expect(r.status).toBe("insufficient_data");
  });

  it("เป้าหมายที่ไม่อยู่ในชุดผล → unsupported", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ขนยาว" } }),
      category: "coat_type",
      targetCode: "curly",
      ...demo,
    });
    expect(r.status).toBe("unsupported");
  });

  it("คู่ที่ต้องยืนยัน DNA (พาหะ) ถูกติดธง genotypeNeedsDnaConfirmation", () => {
    const r = requiredMateProfile({
      source: src({ phenotype: { coat_type: "ขนยาว" } }),
      category: "coat_type",
      targetCode: "long",
      ...demo,
    });
    // L/l แสดงออกเป็นขนสั้นเหมือน L/L → ต้อง DNA
    const carrier = [...r.possible, ...r.impossible].find((o) => o.genotypeKey === "L/l")!;
    expect(carrier.genotypeNeedsDnaConfirmation).toBe(true);
    // l/l แสดงออกเป็นขนยาวเท่านั้น → ไม่ต้อง DNA
    const ll = r.guaranteed.find((o) => o.genotypeKey === "l/l")!;
    expect(ll.genotypeNeedsDnaConfirmation).toBe(false);
  });
});
