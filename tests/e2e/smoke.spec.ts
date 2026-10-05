import { test, expect } from "@playwright/test";

/**
 * Smoke — ยืนยันว่าแอป boot และเส้นทาง public พื้นฐานใช้งานได้ (Phase 4)
 * หมายเหตุ: `/` redirect ไป `/login`; heading "MeowMatch" อยู่ใน hero ที่ซ่อนบนมือถือ
 * จึง assert ด้วยองค์ประกอบในการ์ดฟอร์มที่เห็นได้ทุก viewport แทน
 */
test("หน้าแรกเด้งไปหน้าเข้าสู่ระบบ", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ยินดีต้อนรับกลับ" })).toBeVisible();
});

test("ไปหน้าสมัครสมาชิกจากหน้า login ได้", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "สมัครสมาชิก" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "สร้างบัญชีใหม่" })).toBeVisible();
});

test("กลับจากหน้าสมัครมาหน้า login ได้", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("link", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
