import { NextResponse } from "next/server";

/**
 * Health check — ใช้สำหรับ monitoring/uptime และยืนยันว่า API route ทำงาน
 * ไม่เปิดเผยข้อมูลลับหรือสถานะภายใน
 */
export function GET() {
  return NextResponse.json({ status: "ok", service: "meowmatch", version: "v1" });
}
