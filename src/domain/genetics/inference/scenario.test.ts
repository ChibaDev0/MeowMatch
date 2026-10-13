import { describe, expect, it } from "vitest";
import { outcomeDistribution, scenarioBounds } from "./scenario";
import { coatTypeDemoRuleset as rs } from "../rules/coat-type.demo";

/**
 * ทดสอบ scenario manager ตรงๆ (ไม่ผ่าน analyzePair)
 * ใช้ demo ruleset ความยาวขน: L เด่น (ขนสั้น), l ด้อย (ขนยาว); ขนยาว = l/l
 */
describe("outcomeDistribution (ทราบ genotype แน่นอน)", () => {
  it("L/l × L/l → ขนสั้น 75%, ขนยาว 25% และผลรวม = 1", () => {
    const d = outcomeDistribution(["L", "l"], ["L", "l"], rs);
    expect(d.get("short")).toBeCloseTo(0.75);
    expect(d.get("long")).toBeCloseTo(0.25);
    const total = [...d.values()].reduce((s, p) => s + p, 0);
    expect(total).toBeCloseTo(1);
  });

  it("l/l × l/l → ขนยาว 100% (ไม่มีขนสั้น)", () => {
    const d = outcomeDistribution(["l", "l"], ["l", "l"], rs);
    expect(d.get("long")).toBeCloseTo(1);
    expect(d.get("short")).toBeUndefined();
  });
});

describe("scenarioBounds (genotype เป็นชุด scenario)", () => {
  it("ขนสั้น{L/L,L/l} × ขนยาว{l/l} → long 0–50%, short 50–100%", () => {
    const b = scenarioBounds([["L", "L"], ["L", "l"]], [["l", "l"]], rs);
    expect(b.get("long")).toEqual({ lower: 0, upper: 0.5 });
    expect(b.get("short")).toEqual({ lower: 0.5, upper: 1 });
  });

  it("ครอบ outcome ทุกค่าของ ruleset แม้บางกรณีความน่าจะเป็น 0 (lower=0)", () => {
    // L/L × L/L → ขนสั้น 100% เสมอ; long ต้องมี bound {0,0} ไม่ใช่ขาดหาย
    const b = scenarioBounds([["L", "L"]], [["L", "L"]], rs);
    expect(b.get("long")).toEqual({ lower: 0, upper: 0 });
    expect(b.get("short")).toEqual({ lower: 1, upper: 1 });
  });

  it("lower ≤ upper เสมอ และอยู่ใน [0,1]", () => {
    const b = scenarioBounds([["L", "L"], ["L", "l"], ["l", "l"]], [["L", "l"]], rs);
    for (const { lower, upper } of b.values()) {
      expect(lower).toBeLessThanOrEqual(upper);
      expect(lower).toBeGreaterThanOrEqual(0);
      expect(upper).toBeLessThanOrEqual(1);
    }
  });
});
