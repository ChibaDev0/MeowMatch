import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / email-link callback (AUTH-02)
 * Supabase ส่งผู้ใช้กลับมาที่นี่พร้อม `code` → แลกเป็น session แล้ว redirect เข้าพื้นที่สมาชิก
 * onboarding (เช่น ตั้ง Username สำหรับผู้ใช้ Google) จัดการในงาน AUTH-02
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // แลก code ไม่สำเร็จ → กลับไปหน้า login พร้อมสถานะ error
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
