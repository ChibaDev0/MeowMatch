import { describe, expect, it } from "vitest";
import { resolveRuleset } from "./registry";
import { coatTypeDemoRuleset } from "./coat-type.demo";

/**
 * registry ต้อง gate ruleset ที่ยังไม่ผ่านตรวจรับ (verified=false) ออกจากผลจริงเสมอ
 * — เปิดได้เฉพาะเมื่อ allowUnverified=true (โหมดสาธิต/ทดสอบ)
 */
describe("resolveRuleset", () => {
  it("ค่าเริ่มต้น (allowUnverified=false) → null สำหรับ ruleset ที่ยังไม่ verified", () => {
    expect(resolveRuleset("coat_type")).toBeNull();
    expect(resolveRuleset("coat_type", false)).toBeNull();
  });

  it("allowUnverified=true → คืน demo ruleset ของ coat_type", () => {
    expect(resolveRuleset("coat_type", true)).toBe(coatTypeDemoRuleset);
  });

  it("หมวดที่ไม่มี ruleset → null เสมอ (แม้เปิดโหมดสาธิต)", () => {
    expect(resolveRuleset("eye_color", true)).toBeNull();
    expect(resolveRuleset("coat_color", true)).toBeNull();
    expect(resolveRuleset("ear_type", true)).toBeNull();
  });

  it("demo ruleset ประกาศ verified=false (กันเผลอเปิดผลจริง)", () => {
    expect(coatTypeDemoRuleset.verified).toBe(false);
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
