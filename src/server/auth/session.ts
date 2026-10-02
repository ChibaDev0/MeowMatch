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
 * - ไม่มี user → /login
 * - ยังไม่ตั้ง username → /onboarding
 */
export async function requireProfile(): Promise<ProfileRow> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.onboarding_status === "needs_username") redirect("/onboarding");
  return profile;
}
