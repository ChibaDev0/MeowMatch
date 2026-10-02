import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * ครอบทุกเส้นทาง ยกเว้นไฟล์ static และ image optimization
     * ปรับ matcher เพิ่มการป้องกันเส้นทาง (member area) ได้ภายหลัง
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
