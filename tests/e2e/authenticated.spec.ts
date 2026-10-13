import { test, expect } from "@playwright/test";

/**
 * OPT-IN authenticated journeys (Phase 4) — ใช้ session จาก auth.setup.ts
 * รันเฉพาะ project "authenticated" เมื่อ TEST_E2E_AUTH=1 (ดู playwright.config.ts)
 *
 * ครอบคลุม:
 *  - เข้าถึงพื้นที่สมาชิกได้จริงหลังล็อกอิน (ไม่เด้ง /login หรือ /onboarding)
 *  - nav แบบ responsive: sidebar (เดสก์ท็อป) ↔ bottom-nav (มือถือ) — ปิดช่องว่าง mobile ของชั้น C
 *  - เพิ่มแมว (CAT-01) แล้วเห็นในหน้า "แมวของฉัน"
 */
test.describe("พื้นที่สมาชิก (authenticated)", () => {
  test("เข้าถึง /home ได้หลังล็อกอิน (ไม่ถูกเด้ง)", async ({ page }) => {
    await page.goto("/home");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("nav responsive — เดสก์ท็อปแสดง sidebar, ซ่อน bottom-nav", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/home");
    await expect(page.getByTestId("sidebar")).toBeVisible();
    await expect(page.getByTestId("bottom-nav")).toBeHidden();
  });

  test("nav responsive — มือถือแสดง bottom-nav, ซ่อน sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/home");
    await expect(page.getByTestId("bottom-nav")).toBeVisible();
    await expect(page.getByTestId("sidebar")).toBeHidden();
  });

  test("เพิ่มแมวแล้วเห็นในหน้า ‘แมวของฉัน’ (CAT-01)", async ({ page }) => {
    const name = `ทดสอบ-${Date.now()}`;
    await page.goto("/my-cats/new");
    await page.getByPlaceholder("กรอกชื่อแมว").fill(name);
    await page.getByRole("button", { name: "ขนสั้น", exact: true }).click(); // ลักษณะขน (required)
    await page.getByRole("button", { name: "บันทึก", exact: true }).click();

    await expect(page).toHaveURL(/\/my-cats$/);
    await expect(page.getByText(name)).toBeVisible();
  });

  // ===== SAFE-01: รายงาน + สิทธิ์ผู้ดูแล =====
  test("รายงานแมวในหน้าหาคู่ได้ (SAFE-01)", async ({ page }) => {
    await page.goto("/discover");
    const reportBtn = page.getByRole("button", { name: /^รายงาน/ }).first();
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    const dialog = page.getByRole("dialog", { name: /รายงานแมว/ });
    await expect(dialog).toBeVisible();
    await dialog.getByText("เนื้อหาไม่เหมาะสม").click();
    await dialog.getByRole("button", { name: "ส่งรายงาน" }).click();

    await expect(page.getByText("ส่งรายงานแล้ว")).toBeVisible();
  });

  test("สมาชิกทั่วไปเข้าหน้าผู้ดูแลไม่ได้ (เด้ง /home)", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("สมาชิกทั่วไปไม่เห็นลิงก์ศูนย์ดูแลชุมชนใน sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/home");
    await expect(page.getByTestId("sidebar").getByText("ศูนย์ดูแลชุมชน")).toHaveCount(0);
  });
});
