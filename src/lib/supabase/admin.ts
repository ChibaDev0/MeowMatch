import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import "server-only";

/**
 * Supabase admin client (service role) — ข้าม RLS
 *
 * ⚠️ ใช้เฉพาะงานที่กำหนดชัดเจนและตรวจสิทธิ์ด้วยตนเองแล้วเท่านั้น เช่น
 *   - resolve Username → email ก่อน login
 *   - ลบบัญชีผู้ใช้
 * ห้าม import ไฟล์นี้ใน Client Components และห้ามใช้เป็น client เริ่มต้นของ API
 * อ้างอิง: MeowMatch/01-architecture, MeowMatch/08-api-security
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนใช้ admin client",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
