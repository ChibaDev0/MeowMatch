import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getPublicSupabaseEnv } from "./env";

/**
 * Supabase client สำหรับ Client Components (เบราว์เซอร์)
 * ใช้ anon key + session ของผู้ใช้ จึงยังถูกบังคับด้วย RLS
 */
export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
