import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

/**
 * Helpers ฝั่ง server สำหรับตรวจ session และโปรไฟล์
 * ใช้ getUser() เสมอ (ตรวจกับ Auth server) ไม่เชื่อ session จาก cookie อย่างเดียว
 */

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  return data ?? null;
}

/**
 * บังคับว่าต้องมี session และ onboarding เสร็จ มิฉะนั้น redirect
 * - ไม่มี user (ยังไม่ login) → /login
 * - login แล้วแต่ยังไม่มี profile หรือยังไม่ตั้ง username → /onboarding
 *
 * สำคัญ: แยกเคส "ไม่มี user" ออกจาก "มี user แต่ไม่มี profile" ให้ชัด
 * มิฉะนั้นผู้ใช้ที่ login แล้วแต่ profile หาย จะถูกเด้งไป /login ซึ่งหน้า login
 * เห็น session แล้วเด้งกลับ /home → เกิด redirect loop
 */
export async function requireProfile(): Promise<ProfileRow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.onboarding_status === "needs_username") {
    redirect("/onboarding");
  }
  return profile;
}
