import { test, expect } from "@playwright/test";

/**
 * Auth client validation (Phase 4) — ตรวจ UX validation ฝั่ง client (zodResolver)
 * ไม่ยิง server action จริง (resolver บล็อก submit เมื่อข้อมูลไม่ผ่าน) จึงไม่แตะ Supabase
 * server ยังคงเป็นผู้ตัดสินจริงอีกชั้น (ดู unit tests ของ schema ใน src/lib/validation)
 * หมายเหตุ: fields ไม่ผูก <label> กับ input จึงเลือกด้วย placeholder
 */
test.describe("หน้าเข้าสู่ระบบ", () => {
  test("กด ‘เข้าสู่ระบบ’ ขณะยังไม่กรอก → แสดง error ทั้งสองช่อง", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await expect(page.getByText("กรอก Username หรือ Email")).toBeVisible();
    await expect(page.getByText("กรอกรหัสผ่าน")).toBeVisible();
    // ยังอยู่หน้า login (ไม่ถูก redirect เพราะ submit ถูกบล็อก)
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("หน้าสมัครสมาชิก", () => {
  test("กด ‘สมัครสมาชิก’ ขณะยังไม่กรอก → แสดง error กติกา username", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "สมัครสมาชิก", exact: true }).click();
    await expect(page.getByText("ใช้ a–z, 0–9 และ _ ความยาว 3–30 ตัว")).toBeVisible();
    await expect(page.getByText("อีเมลไม่ถูกต้อง")).toBeVisible();
  });

  test("รหัสผ่านยืนยันไม่ตรงกัน → แสดง error ที่ช่องยืนยัน", async ({ page }) => {
    await page.goto("/register");
    await page.getByPlaceholder("กรอก Username").fill("tofu_01");
    await page.getByPlaceholder("กรอก Email").fill("tofu@example.com");
    await page.getByPlaceholder("กรอกรหัสผ่าน").fill("secret12");
    await page.getByPlaceholder("ยืนยันรหัสผ่าน").fill("different1");
    await page.getByRole("button", { name: "สมัครสมาชิก", exact: true }).click();
    await expect(page.getByText("รหัสผ่านยืนยันไม่ตรงกัน")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });
});
