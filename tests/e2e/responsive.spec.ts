import { test, expect } from "@playwright/test";

/**
 * Mobile / responsive (Phase 4) — ทดสอบบนหน้า public (login) ที่ไม่ต้องล็อกอิน
 * หน้า login ใช้ layout สองคอลัมน์: hero (รูป + ข้อความ) ซ่อนบนจอเล็ก (class `hidden lg:flex`)
 * ส่วน nav แบบ responsive (sidebar เดสก์ท็อป ↔ bottom-nav มือถือ) อยู่ในพื้นที่สมาชิก
 * จึงทดสอบใน authenticated scaffold (tests/e2e/authenticated.spec.ts, opt-in)
 *
 * ตั้ง viewport ภายในเทสต์เองเพื่อคุมผลให้คงที่ทุก project (chromium/mobile-chrome)
 */
const HERO_IMAGE = "ลูกแมวสองตัวนอนเคียงกัน";

test("เดสก์ท็อป (กว้าง ≥ lg): หน้า login แสดง hero พร้อมรูปลูกแมว", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  await expect(page.getByRole("img", { name: HERO_IMAGE })).toBeVisible();
});

test("มือถือ (จอแคบ): หน้า login ซ่อน hero เหลือเฉพาะการ์ดฟอร์ม", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("img", { name: HERO_IMAGE })).toBeHidden();
  // การ์ดฟอร์มยังต้องใช้งานได้บนมือถือ
  await expect(page.getByRole("heading", { name: "ยินดีต้อนรับกลับ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true })).toBeVisible();
});
