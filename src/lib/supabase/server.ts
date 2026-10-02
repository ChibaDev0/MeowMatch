import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import type { Database } from "@/types/database";
import { getPublicSupabaseEnv } from "./env";

/**
 * Supabase client สำหรับ Server Components / Route Handlers
 * ผูกกับ cookie ของผู้ใช้ (JWT) เพื่อให้ RLS บังคับใช้ตามสิทธิ์สมาชิก
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // ถูกเรียกจาก Server Component — ปล่อยให้ middleware รีเฟรช session แทน
        }
      },
    },
  });
}
