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

test.describe("เป้าหมายจากข้อความภาษาไทย (Thai NLP)", () => {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`พิมพ์ข้อความแล้วกรอกฟอร์มเป้าหมายให้ (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/desired-cats");
      await page
        .getByLabel("พิมพ์บอกลูกแมวที่อยากได้ (ภาษาไทย)")
        .fill("อยากได้ลูกแมวสก็อตติชโฟลด์ขนยาวตาสีฟ้า แต่ไม่เอาหูพับนะครับ");
      await page.getByRole("button", { name: "แปลงข้อความเป็นเป้าหมาย" }).click();

      const result = page.getByRole("region", { name: "ผลวิเคราะห์ข้อความ" });
      await expect(result).toBeVisible();
      await expect(page.getByPlaceholder("ไม่จำกัด")).toHaveValue("สก็อตติชโฟลด์");
      await expect(page.getByRole("combobox").first()).toHaveValue("ตาสีฟ้า");
      await expect(page.getByRole("combobox").nth(1)).toHaveValue("หูตั้ง");
      await page.getByRole("button", { name: /ดูขั้นตอน NLP/ }).click();
      await expect(page.getByRole("list", { name: "คำที่ตัดได้" })).toContainText("สก็อตติชโฟลด์");
      if (process.env.E2E_SCREENSHOT_DIR)
        await page
          .locator("#goal-text")
          .locator("xpath=..")
          .screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/nlp-${viewport.name}.png` });
    });
  }
});

test.describe("แมวตัวอย่าง 100 ตัว + ค้นหาจากผลยีน", () => {
  test("หน้าหาคู่แสดงแมวตัวอย่างพร้อมรูป และกรองตามเพศ/สี/ยีนได้", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/discover");
    await expect(page.getByText(/พบ \d{3,} ตัว/)).toBeVisible();
    await expect(page.locator('img[src*="cats%2Fseed"], img[src*="/cats/seed/"]').first()).toBeVisible();

    await page.goto("/discover?sex=female&color=" + encodeURIComponent("สามสี") + "&from=genes&genes=O.Aa");
    await expect(page.getByText("ค้นหาตามผลคำนวณยีน")).toBeVisible();
    await expect(page.getByText("✓ ยีนตรงตามที่ต้องการ").first()).toBeVisible();
    await expect(page.getByText("เพศผู้ ·")).toHaveCount(0);
    if (process.env.E2E_SCREENSHOT_DIR)
      await page.screenshot({ path: `${process.env.E2E_SCREENSHOT_DIR}/discover-genes.png`, fullPage: true });
  });
});
