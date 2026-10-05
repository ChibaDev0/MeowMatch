import { test, expect } from "@playwright/test";

/**
 * Security (Phase 4) — การป้องกันเส้นทางพื้นที่สมาชิก
 *
 * สำคัญ: middleware (src/middleware.ts) รีเฟรช session เท่านั้น ไม่ได้กัน route
 * ตัวกั้นจริงคือ requireProfile() ใน (member)/layout.tsx:
 *   - ไม่มี session → redirect /login
 *   - มี session แต่ยังไม่ตั้ง username → redirect /onboarding
 * เทสต์นี้ยืนยันว่าผู้ใช้ที่ยังไม่ล็อกอินเข้าถึงหน้า member ไม่ได้ (เด้ง /login)
 * ทดสอบได้โดยไม่ต้องมีบัญชีจริง
 */
const PROTECTED_ROUTES = [
  "/home",
  "/my-cats",
  "/my-cats/new",
  "/desired-cats",
  "/breeding",
  "/discover",
  "/profile",
];

for (const path of PROTECTED_ROUTES) {
  test(`เข้า ${path} โดยไม่ล็อกอิน → เด้งไป /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test("หน้าแก้ไขแมว (id ใด ๆ) โดยไม่ล็อกอิน → เด้งไป /login", async ({ page }) => {
  await page.goto("/my-cats/11111111-1111-1111-1111-111111111111/edit");
  await expect(page).toHaveURL(/\/login$/);
});
