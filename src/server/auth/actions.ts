"use server";

import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  usernameOnlySchema,
} from "@/lib/validation/auth";

/**
 * Server Actions สำหรับ Auth (AUTH-01/AUTH-02)
 * - server เป็นผู้ตัดสินเสมอ; client validation เป็นเพียง UX
 * - ข้อความ error ของ login เป็นแบบกลาง ไม่บอกว่ามีบัญชีนั้นหรือไม่ (08-api-security)
 * - ไม่ log password/email/token
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** แปลง ZodError เป็น fieldErrors ที่ฟอร์มใช้ได้ (ข้อความแรกของแต่ละฟิลด์) */
function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) out[key] = issue.message;
  }
  return out;
}

// ===================== สมัครสมาชิก =====================
export async function registerAction(raw: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { username, email, password } = parsed.data;

  const supabase = await createClient();

  // ตรวจ username ว่างก่อน (UX) — ตัวตัดสินจริงคือ unique constraint ตอนสร้าง
  const { data: available } = await supabase.rpc("username_available", {
    p_username: username,
  });
  if (available === false) {
    return { ok: false, error: "Username นี้ถูกใช้แล้ว", fieldErrors: { username: "Username นี้ถูกใช้แล้ว" } };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    // ชน username ที่ระดับ DB (race) → แจ้งที่ช่อง username; อื่น ๆ เป็น error ทั่วไป
    if (/username|duplicate|profiles/i.test(error.message)) {
      return { ok: false, error: "Username นี้ถูกใช้แล้ว", fieldErrors: { username: "Username นี้ถูกใช้แล้ว" } };
    }
    return { ok: false, error: "สมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  return { ok: true, message: "สมัครสำเร็จ! ตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี" };
}

// ===================== เข้าสู่ระบบ =====================
export async function loginAction(raw: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { identifier, password } = parsed.data;

  // resolve Username → email (ฝั่ง server เท่านั้น) ถ้าไม่ใช่อีเมล
  let email = identifier;
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data } = await admin.rpc("auth_email_for_username", {
      p_username: identifier.toLowerCase(),
    });
    if (!data) {
      // ไม่พบ username — ตอบแบบเดียวกับรหัสผิดเพื่อไม่เปิดเผยการมีอยู่ของบัญชี
      return { ok: false, error: "Username/Email หรือรหัสผ่านไม่ถูกต้อง" };
    }
    email = data;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: "Username/Email หรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect("/home");
}

// ===================== Google OAuth =====================
export async function loginWithGoogleAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });
  if (error || !data.url) {
    return { ok: false, error: "เชื่อมต่อ Google ไม่สำเร็จ" };
  }
  redirect(data.url);
}

// ===================== ออกจากระบบ =====================
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ===================== ขอกู้รหัสผ่าน =====================
export async function requestPasswordResetAction(raw: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "อีเมลไม่ถูกต้อง", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // ผ่าน callback เพื่อแลก code เป็น recovery session ก่อนไปหน้า reset
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  // ตอบข้อความกลางเสมอ ไม่ว่ามีอีเมลนั้นหรือไม่ (08-api-security)
  return { ok: true, message: "หากอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว" };
}

// ===================== ตั้งรหัสผ่านใหม่ =====================
export async function updatePasswordAction(raw: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอใหม่อีกครั้ง" };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { ok: false, error: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่" };
  }

  redirect("/home");
}

// ===================== ตั้ง Username (onboarding ของผู้ใช้ Google) =====================
export async function setUsernameAction(raw: unknown): Promise<ActionResult> {
  const parsed = usernameOnlySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Username ไม่ถูกต้อง", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const { username } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: available } = await supabase.rpc("username_available", {
    p_username: username,
  });
  if (available === false) {
    return { ok: false, error: "Username นี้ถูกใช้แล้ว", fieldErrors: { username: "Username นี้ถูกใช้แล้ว" } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username, onboarding_status: "complete" })
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "บันทึก Username ไม่สำเร็จ", fieldErrors: { username: "Username นี้อาจถูกใช้แล้ว" } };
  }

  redirect("/home");
}
