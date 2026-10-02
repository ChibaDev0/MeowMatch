import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };
import type { Database } from "@/types/database";

/**
 * รีเฟรช Supabase session บนทุก request และคืน response ที่อัปเดต cookie แล้ว
 * เรียกจาก middleware.ts ที่ root — รูปแบบมาตรฐานของ @supabase/ssr
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ยังไม่ตั้งค่า env (เช่น ตอน scaffold/CI เริ่มต้น) — ข้ามการรีเฟรช ไม่ให้แอปล่ม
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // สำคัญ: เรียก getUser() เพื่อรีเฟรช token; อย่าใส่ logic ระหว่างสร้าง client กับบรรทัดนี้
  await supabase.auth.getUser();

  return supabaseResponse;
}
