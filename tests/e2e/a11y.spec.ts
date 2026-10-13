import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * QA-01 — Accessibility audit (axe-core) ของหน้า public
 * ตรวจ WCAG 2.0/2.1 A & AA แล้ว fail เมื่อพบ violation ระดับ serious/critical
 * (ระดับ minor/moderate รายงานไว้ดูแต่ไม่ทำให้ fail — กันเทสต์เปราะเกินไป)
 *
 * รันในชุด public ปกติ (ไม่ต้องมีบัญชี) — เส้นทางที่ต้องล็อกอินตรวจแยกใน authenticated.spec.ts
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const PUBLIC_PAGES: { path: string; name: string }[] = [
  { path: "/login", name: "เข้าสู่ระบบ" },
  { path: "/register", name: "สมัครสมาชิก" },
  { path: "/forgot-password", name: "ลืมรหัสผ่าน" },
];

for (const { path, name } of PUBLIC_PAGES) {
  test(`a11y: ${name} (${path}) ไม่มี violation ระดับ serious/critical`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const severe = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    // พิมพ์สรุปช่วย debug เมื่อ fail
    if (severe.length) {
      console.error(
        `a11y ${path}:`,
        severe.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`).join(", "),
      );
    }
    expect(severe, severe.map((v) => v.id).join(", ")).toEqual([]);
  });
}
