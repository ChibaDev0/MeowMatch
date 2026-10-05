import { describe, expect, it } from "vitest";
import { passwordSchema, usernameSchema } from "./common";

/**
 * Phase 4 (ทดสอบ MVP-A) — ตรวจกติกา username/password ที่ใช้ร่วม client+server
 * อ้างอิง MeowMatch/06-database (username a-z0-9_ 3–30) และนโยบายรหัสผ่านขั้นต่ำ
 */
describe("usernameSchema", () => {
  it("ยอมรับ username ที่ถูกต้องและ normalize เป็น lowercase", () => {
    expect(usernameSchema.parse("Cat_Lover_99")).toBe("cat_lover_99");
  });

  it("ตัดช่องว่างหัวท้ายก่อนตรวจ", () => {
    expect(usernameSchema.parse("  tofu_01  ")).toBe("tofu_01");
  });

  it.each([
    ["สั้นกว่า 3 ตัว", "ab"],
    ["ยาวเกิน 30 ตัว", "a".repeat(31)],
    ["มีอักขระต้องห้าม (เว้นวรรค)", "cat lover"],
    ["มีอักขระต้องห้าม (ขีด)", "cat-lover"],
    ["มีอักขระที่ไม่ใช่ ascii", "แมวเหมียว"],
    ["ว่างเปล่า", ""],
  ])("ปฏิเสธ username: %s", (_label, value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });

  it("ยอมรับความยาวขอบเขต 3 และ 30 ตัวพอดี", () => {
    expect(usernameSchema.safeParse("abc").success).toBe(true);
    expect(usernameSchema.safeParse("a".repeat(30)).success).toBe(true);
  });
});

describe("passwordSchema", () => {
  it("ยอมรับรหัสผ่านตั้งแต่ 8 ถึง 72 ตัว", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
  });

  it("ปฏิเสธรหัสผ่านสั้นกว่า 8 ตัว", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
  });

  it("ปฏิเสธรหัสผ่านยาวเกิน 72 ตัว", () => {
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });
});
