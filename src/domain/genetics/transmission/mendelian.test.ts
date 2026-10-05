import { describe, expect, it } from "vitest";
import {
  atLeastOneInLitter,
  genotypeKey,
  littersForTargetProbability,
  offspringGenotypes,
  parseGenotypeKey,
} from "./mendelian";

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

  it("parseGenotypeKey คืนค่ากลับเป็นคู่ allele", () => {
    expect(parseGenotypeKey("A/a")).toEqual(["A", "a"]);
  });
});

/** สูตรจำนวนลูก/โอกาสสะสม — MeowMatch/07-genetics-engine §"ต้องผสมกี่ครั้ง" */
describe("atLeastOneInLitter", () => {
  it("p=0.25, n=4 → ~68.36%", () => {
    expect(atLeastOneInLitter(0.25, 4)).toBeCloseTo(0.6836, 4);
  });

  it("n=0 → 0 (ไม่มีลูกก็ไม่มีโอกาสพบ)", () => {
    expect(atLeastOneInLitter(0.25, 0)).toBe(0);
  });

  it("p=1 → 1 เสมอ (n≥1)", () => {
    expect(atLeastOneInLitter(1, 3)).toBe(1);
  });

  it("ปฏิเสธ p นอก [0,1] และ n ที่ไม่ใช่จำนวนเต็ม ≥ 0", () => {
    expect(() => atLeastOneInLitter(1.2, 1)).toThrow(RangeError);
    expect(() => atLeastOneInLitter(0.5, -1)).toThrow(RangeError);
    expect(() => atLeastOneInLitter(0.5, 1.5)).toThrow(RangeError);
  });
});

describe("littersForTargetProbability", () => {
  it("p=0.25, q=0.9 → 9 ตัว (ceil(log0.1/log0.75))", () => {
    expect(littersForTargetProbability(0.25, 0.9)).toBe(9);
  });

  it("p=0 → null (ไม่มีวันถึงเป้าหมาย ห้ามคืน 0 หรือ Infinity เงียบๆ)", () => {
    expect(littersForTargetProbability(0, 0.9)).toBeNull();
  });

  it("p=1 → 1 (ถึงเป้าหมายตั้งแต่ตัวแรกตามสมมติฐาน)", () => {
    expect(littersForTargetProbability(1, 0.9)).toBe(1);
  });

  it("q≥1 ปฏิเสธ (การันตี 100% ไม่ได้)", () => {
    expect(() => littersForTargetProbability(0.25, 1)).toThrow(RangeError);
  });

  it("q≤0 → 0 (ไม่ต้องมีลูกเลยก็ถึงเป้าหมายว่างเปล่า)", () => {
    expect(littersForTargetProbability(0.25, 0)).toBe(0);
    expect(littersForTargetProbability(0.25, -0.1)).toBe(0);
  });
});
