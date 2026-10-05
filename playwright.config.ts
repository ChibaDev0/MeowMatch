import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests (Playwright) — เส้นทางผู้ใช้จริง
 * ทดสอบบน desktop และ mobile viewport ตามข้อกำหนด responsive
 *
 * ค่าเริ่มต้น (Phase 4): รันเฉพาะเส้นทาง public + route-protection + responsive
 * ที่ไม่ต้องมีบัญชีจริง จึงไม่แตะ Supabase remote
 *
 * เส้นทางที่ต้องล็อกอิน (authenticated.spec.ts) เป็น OPT-IN:
 *   เปิดด้วย TEST_E2E_AUTH=1 พร้อมตั้ง SUPABASE_SERVICE_ROLE_KEY (ดู auth.setup.ts)
 *   เมื่อเปิด: project "setup" สร้างผู้ใช้ทดสอบ + session, "authenticated" ใช้ session นั้น,
 *   "cleanup" ลบผู้ใช้ทดสอบทิ้งหลังรันเสร็จ
 */
const AUTH_ENABLED = !!process.env.TEST_E2E_AUTH;
export const AUTH_STATE = "tests/e2e/.auth/user.json";

const SETUP_FILE = /auth\.setup\.ts/;
const TEARDOWN_FILE = /auth\.teardown\.ts/;
const AUTHENTICATED_FILES = /authenticated\.spec\.ts/;
const AUTH_ONLY = [SETUP_FILE, TEARDOWN_FILE, AUTHENTICATED_FILES];

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // public + security + responsive — ไม่ต้องมีบัญชี (ข้าม authenticated/setup/teardown)
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: AUTH_ONLY },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] }, testIgnore: AUTH_ONLY },

    // OPT-IN (เมื่อ TEST_E2E_AUTH): สร้าง session → รันเส้นทาง authenticated → ลบผู้ใช้ทดสอบ
    ...(AUTH_ENABLED
      ? [
          { name: "setup", testMatch: SETUP_FILE, teardown: "cleanup" },
          { name: "cleanup", testMatch: TEARDOWN_FILE },
          {
            name: "authenticated",
            testMatch: AUTHENTICATED_FILES,
            use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE },
            dependencies: ["setup"],
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
