import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  usernameOnlySchema,
} from "./auth";

/**
 * Phase 4 (ทดสอบ MVP-A) — schema ของ Auth (AUTH-01/02)
 * ตรวจเฉพาะกติกา validation; server เป็นผู้ตัดสินจริงอีกชั้น
 */
describe("registerSchema", () => {
  const valid = {
    username: "tofu_01",
    email: "tofu@example.com",
    password: "secret12",
    confirmPassword: "secret12",
  };

  it("ยอมรับข้อมูลที่ถูกต้องและ normalize email/username เป็น lowercase", () => {
    const parsed = registerSchema.parse({
      ...valid,
      username: "Tofu_01",
      email: "Tofu@Example.com",
    });
    expect(parsed.username).toBe("tofu_01");
    expect(parsed.email).toBe("tofu@example.com");
  });

  it("ปฏิเสธเมื่อรหัสผ่านยืนยันไม่ตรงกัน และชี้ที่ช่อง confirmPassword", () => {
    const res = registerSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true);
    }
  });

  it("ปฏิเสธอีเมลผิดรูปแบบ", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("ปฏิเสธ username ผิดกติกา", () => {
    expect(registerSchema.safeParse({ ...valid, username: "ab" }).success).toBe(false);
  });

  it("ปฏิเสธรหัสผ่านสั้นเกินไป", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("ยอมรับ identifier (username หรือ email) กับรหัสผ่านที่ไม่ว่าง", () => {
    expect(loginSchema.safeParse({ identifier: "tofu_01", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ identifier: "tofu@example.com", password: "x" }).success).toBe(true);
  });

  it("ปฏิเสธเมื่อ identifier หรือรหัสผ่านว่าง", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "tofu", password: "" }).success).toBe(false);
  });
});

describe("usernameOnlySchema (onboarding Google)", () => {
  it("ยอมรับ username ที่ถูกต้อง", () => {
    expect(usernameOnlySchema.parse({ username: "New_User1" }).username).toBe("new_user1");
  });

  it("ปฏิเสธ username ผิดกติกา", () => {
    expect(usernameOnlySchema.safeParse({ username: "a" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("ยอมรับอีเมลที่ถูกต้อง และ normalize เป็น lowercase", () => {
    expect(forgotPasswordSchema.parse({ email: "Tofu@Example.com" }).email).toBe("tofu@example.com");
  });

  it("ปฏิเสธอีเมลผิดรูปแบบ", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("ยอมรับเมื่อรหัสผ่านตรงกันและยาวพอ", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "secret12", confirmPassword: "secret12" }).success,
    ).toBe(true);
  });

  it("ปฏิเสธเมื่อรหัสผ่านยืนยันไม่ตรงกัน", () => {
    const res = resetPasswordSchema.safeParse({ password: "secret12", confirmPassword: "nope123x" });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true);
    }
  });
});
