import { describe, expect, it } from "vitest";
import { genotypeKey, offspringGenotypes } from "./mendelian";

/**
 * ตรวจตามตารางตัวอย่างใน MeowMatch/10-algorithm-design §1
 * (Aa×Aa = 25/50/25, Aa×aa = 0/50/50, AA×aa = 0/100/0)
 */
describe("offspringGenotypes (single locus)", () => {
  it("Aa × Aa → AA 25%, A/a 50%, aa 25%", () => {
    const d = offspringGenotypes(["A", "a"], ["A", "a"]);
    expect(d.get("A/A")).toBeCloseTo(0.25);
    expect(d.get("A/a")).toBeCloseTo(0.5);
    expect(d.get("a/a")).toBeCloseTo(0.25);
  });

  it("Aa × aa → A/a 50%, aa 50% (ไม่มี AA)", () => {
    const d = offspringGenotypes(["A", "a"], ["a", "a"]);
    expect(d.get("A/A")).toBeUndefined();
    expect(d.get("A/a")).toBeCloseTo(0.5);
    expect(d.get("a/a")).toBeCloseTo(0.5);
  });

  it("AA × aa → A/a 100%", () => {
    const d = offspringGenotypes(["A", "A"], ["a", "a"]);
    expect(d.get("A/a")).toBeCloseTo(1);
    expect(d.size).toBe(1);
  });

  it("ผลรวมความน่าจะเป็นเท่ากับ 1 เสมอ", () => {
    const d = offspringGenotypes(["A", "a"], ["A", "a"]);
    const total = [...d.values()].reduce((s, p) => s + p, 0);
    expect(total).toBeCloseTo(1);
  });

  it("genotypeKey ไม่ขึ้นกับลำดับ allele", () => {
    expect(genotypeKey(["a", "A"])).toBe(genotypeKey(["A", "a"]));
  });
});
