import { describe, expect, it } from "vitest";
import { resolveRuleset } from "./registry";
import { coatTypeDemoRuleset } from "./coat-type.demo";
import { coatColorDemoRuleset } from "./coat-color.demo";
import { coatPatternDemoRuleset } from "./coat-pattern.demo";

/**
 * registry: โมเดลทดลองทุกตัวเป็น verified=false → ต้องเปิดโหมดทดลอง (allowUnverified=true)
 * จึงจะนำมาคำนวณ (ค่าเริ่มต้นของหน้าใช้งานคือเปิด) หมวดที่ยังไม่มีโมเดล → null เสมอ
 */
describe("resolveRuleset", () => {
  it("ค่าเริ่มต้น (allowUnverified=false) → null สำหรับโมเดลทดลอง (ยัง verified=false)", () => {
    expect(resolveRuleset("coat_type")).toBeNull();
    expect(resolveRuleset("coat_color", false)).toBeNull();
    expect(resolveRuleset("coat_pattern", false)).toBeNull();
  });

  it("allowUnverified=true → คืนโมเดลทดลองของแต่ละหมวดที่ลงทะเบียนไว้", () => {
    expect(resolveRuleset("coat_type", true)).toBe(coatTypeDemoRuleset);
    expect(resolveRuleset("coat_color", true)).toBe(coatColorDemoRuleset);
    expect(resolveRuleset("coat_pattern", true)).toBe(coatPatternDemoRuleset);
  });

  it("หมวดที่ยังไม่มีโมเดล → null เสมอ (แม้เปิดโหมดทดลอง)", () => {
    expect(resolveRuleset("eye_color", true)).toBeNull();
    expect(resolveRuleset("ear_type", true)).toBeNull();
    expect(resolveRuleset("temperament", true)).toBeNull();
  });

  it("โมเดลทดลองทุกตัวประกาศ verified=false (กันเผลออ้างเป็นผลจริง)", () => {
    expect(coatTypeDemoRuleset.verified).toBe(false);
    expect(coatColorDemoRuleset.verified).toBe(false);
    expect(coatPatternDemoRuleset.verified).toBe(false);
  });
});

describe("coatTypeDemoRuleset.phenotypeToGenotypes", () => {
  const f = coatTypeDemoRuleset.phenotypeToGenotypes;

  it("ขนยาว → l/l เท่านั้น (determined)", () => {
    expect(f("ขนยาว")).toEqual([["l", "l"]]);
  });

  it("ขนสั้น → {L/L, L/l} (scenario สองกรณี)", () => {
    expect(f("ขนสั้น")).toEqual([
      ["L", "L"],
      ["L", "l"],
    ]);
  });

  it("ค่าที่ไม่รู้จัก / ว่าง → null (→ insufficient_data ไม่ใช่ unsupported)", () => {
    expect(f("ขนหยิก")).toBeNull();
    expect(f("—")).toBeNull();
    expect(f(undefined)).toBeNull();
    expect(f("")).toBeNull();
  });
});

describe("coatColorDemoRuleset.phenotypeToGenotypes (dilution D/d)", () => {
  const f = coatColorDemoRuleset.phenotypeToGenotypes;

  it("สีจาง → d/d เท่านั้น (determined)", () => {
    expect(f("สีจาง")).toEqual([["d", "d"]]);
  });

  it("สีเข้ม → {D/D, D/d} (scenario สองกรณี)", () => {
    expect(f("สีเข้ม")).toEqual([
      ["D", "D"],
      ["D", "d"],
    ]);
  });

  it("ค่ากำกวม/ไม่รู้จัก → null", () => {
    expect(f("เข้มหรือจาง")).toBeNull();
    expect(f("สีส้ม")).toBeNull();
    expect(f(undefined)).toBeNull();
  });
});

describe("coatPatternDemoRuleset.phenotypeToGenotypes (agouti A/a)", () => {
  const f = coatPatternDemoRuleset.phenotypeToGenotypes;

  it("สีพื้น → a/a เท่านั้น (determined)", () => {
    expect(f("สีพื้น")).toEqual([["a", "a"]]);
  });

  it("ลาย → {A/A, A/a} (scenario สองกรณี)", () => {
    expect(f("ลาย")).toEqual([
      ["A", "A"],
      ["A", "a"],
    ]);
  });

  it("ค่ากำกวม/ไม่รู้จัก → null", () => {
    expect(f("ลายหรือพื้น")).toBeNull();
    expect(f("จุด")).toBeNull();
    expect(f(undefined)).toBeNull();
  });
});
