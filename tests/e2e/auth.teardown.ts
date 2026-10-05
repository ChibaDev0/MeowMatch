import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * OPT-IN teardown (Phase 4, authenticated E2E) — ลบผู้ใช้ทดสอบทิ้ง
 * ลบ auth user แล้ว FK cascade จะลบ profiles/cats/cat_likes/desired_goals ที่ผูกอยู่
 * รันอัตโนมัติหลัง project "setup" (ดู teardown ใน playwright.config.ts)
 */
const EMAIL = process.env.TEST_E2E_EMAIL ?? "e2e-tester@meowmatch.test";

teardown("ลบผู้ใช้ทดสอบ", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email === EMAIL);
  if (user) await admin.auth.admin.deleteUser(user.id);
});
