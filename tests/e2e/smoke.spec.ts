import { test, expect } from "@playwright/test";

/**
 * Smoke test — ยืนยันว่าแอป boot และหน้า landing เชื่อมไปหน้า auth ได้
 * E2E เส้นทางผู้ใช้เต็ม (สมัคร/login/เพิ่มแมว/หาคู่) จะเพิ่มเมื่อฟีเจอร์พร้อม (QA-01)
 */
test("หน้า landing แสดงและมีลิงก์เข้าสู่ระบบ/สมัคร", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /MeowMatch/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "สมัครสมาชิก" })).toBeVisible();
});

test("ไปหน้าเข้าสู่ระบบได้", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
