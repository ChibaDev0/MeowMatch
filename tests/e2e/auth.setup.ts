import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { AUTH_STATE } from "../../playwright.config";

/**
 * OPT-IN setup (Phase 4, authenticated E2E) — สร้างผู้ใช้ทดสอบ + session
 *
 * รันเฉพาะเมื่อ TEST_E2E_AUTH=1 (ดู playwright.config.ts) และต้องตั้ง env:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (มีอยู่แล้วใน .env.local)
 *   SUPABASE_SERVICE_ROLE_KEY — service role เพื่อสร้าง/ยืนยันผู้ใช้ทดสอบ (ข้ามการยืนยันอีเมล)
 * ปรับผู้ใช้ทดสอบได้ด้วย TEST_E2E_EMAIL / TEST_E2E_PASSWORD / TEST_E2E_USERNAME
 *
 * ⚠️ เขียนข้อมูลลง Supabase remote จริง — ผู้ใช้ทดสอบจะถูกลบใน auth.teardown.ts
 */
const EMAIL = process.env.TEST_E2E_EMAIL ?? "e2e-tester@meowmatch.test";
const PASSWORD = process.env.TEST_E2E_PASSWORD ?? "e2e-Passw0rd!";
const USERNAME = process.env.TEST_E2E_USERNAME ?? "e2e_tester";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "authenticated E2E ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** หา id ของผู้ใช้ทดสอบจากอีเมล (เผื่อเคยสร้างไว้แล้ว) */
async function findUserId(admin: ReturnType<typeof adminClient>): Promise<string | undefined> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data?.users.find((u) => u.email === EMAIL)?.id;
}

setup("สร้างผู้ใช้ทดสอบและเก็บ session", async ({ page }) => {
  const admin = adminClient();

  // สร้างผู้ใช้ (ยืนยันอีเมลแล้ว) หรือใช้ซ้ำถ้ามีอยู่แล้ว
  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: USERNAME },
  });

  let userId = created?.user?.id;
  if (error) {
    userId = await findUserId(admin);
    if (!userId) throw error;
    // รีเซ็ตรหัสผ่าน/ยืนยันอีเมลให้แน่ใจว่า login ได้
    await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
  }
  if (!userId) throw new Error("สร้างผู้ใช้ทดสอบไม่สำเร็จ");

  // ให้ onboarding เสร็จ เพื่อให้ requireProfile ผ่าน (ไม่เด้ง /onboarding)
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      { user_id: userId, username: USERNAME, onboarding_status: "complete" },
      { onConflict: "user_id" },
    );
  if (profileErr) throw profileErr;

  // ล็อกอินผ่าน UI เพื่อให้ @supabase/ssr เขียน cookie session ลง context
  await page.goto("/login");
  await page.getByPlaceholder("กรอก Username หรือ Email").fill(EMAIL);
  await page.getByPlaceholder("กรอกรหัสผ่าน").fill(PASSWORD);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();

  await page.waitForURL(/\/home$/);
  await expect(page.getByTestId("sidebar")).toBeVisible();

  await page.context().storageState({ path: AUTH_STATE });
});
