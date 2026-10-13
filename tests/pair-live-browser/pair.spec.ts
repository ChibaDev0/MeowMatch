import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

test("saved colors flow through the selected parents to a real Gemini result", async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const member = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const suffix = randomUUID().slice(0, 8);
  const email = `pair-${suffix}@meowmatch.test`;
  const password = `${randomUUID()}Aa!9`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(error?.message).toBeUndefined();
  const userId = data.user!.id;
  try {
    const profile = await admin.from("profiles").upsert({ user_id: userId, username: `pair_${suffix}`, onboarding_status: "complete" });
    expect(profile.error?.message).toBeUndefined();
    const login = await member.auth.signInWithPassword({ email, password });
    expect(login.error?.message).toBeUndefined();
    const inserted = await member.from("cats").insert([
      { owner_id: userId, name: "แม่ทดสอบ", breed: "ผสม", sex: "female", coat: "ขนสั้น", coat_color: "ดำ", coat_pattern: "สีพื้น", eye_color: "ตาสีทอง", ear_type: "หูตั้ง", is_public: false },
      { owner_id: userId, name: "พ่อทดสอบ", breed: "ผสม", sex: "male", coat: "ขนยาว", coat_color: "ส้ม", coat_pattern: "ลายสลิด", eye_color: "ตาสีทอง", ear_type: "หูตั้ง", is_public: false },
    ]).select("id,name,coat_color,coat_pattern");
    expect(inserted.error?.message).toBeUndefined();
    expect(inserted.data).toHaveLength(2);

    await page.goto("/login");
    await page.getByPlaceholder("กรอก Username หรือ Email").fill(email);
    await page.getByPlaceholder("กรอกรหัสผ่าน").fill(password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });

    const mother = inserted.data!.find((c) => c.name === "แม่ทดสอบ")!;
    await page.goto(`/my-cats/${mother.id}/edit`);
    await expect(page.getByLabel("สีขน", { exact: true })).toHaveValue("ดำ");
    await page.getByLabel("ลวดลายขน", { exact: true }).fill("สีพื้น");
    await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
    await expect(page).toHaveURL(/\/my-cats$/, { timeout: 30_000 });

    await page.goto("/breeding");
    const sections = page.locator("section");
    await sections.filter({ has: page.getByRole("heading", { name: /เลือกแมวตัวที่ 1/ }) }).getByRole("button", { name: /แม่ทดสอบ/ }).click();
    await sections.filter({ has: page.getByRole("heading", { name: /เลือกแมวตัวที่ 2/ }) }).getByRole("button", { name: /พ่อทดสอบ/ }).click();
    await page.getByRole("button", { name: "วิเคราะห์ลูกแมว" }).click();
    const result = page.getByRole("region", { name: "ความเป็นไปได้ของลูกแมว" });
    await expect(result).toBeVisible({ timeout: 60_000 });
    await expect(result.getByText(/อธิบายความเป็นไปได้โดย Gemini/)).toBeVisible();
    await expect(result.getByRole("heading", { name: "สีขนของลูก", exact: true })).toBeVisible();
    await expect(result.getByText("จาก ดำ × ส้ม", { exact: true })).toBeVisible();
    await expect(result.getByText("ลูกเพศผู้: กลุ่มสีดำ", { exact: true })).toBeVisible();
    await expect(result.getByText("ลูกเพศเมีย: กลุ่มสีกระดองเต่า", { exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/pair-live-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(result).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "test-results/pair-live-mobile.png", fullPage: true });
  } finally {
    await member.auth.signOut();
    const cleanup = await admin.auth.admin.deleteUser(userId);
    expect(cleanup.error?.message).toBeUndefined();
  }
});
