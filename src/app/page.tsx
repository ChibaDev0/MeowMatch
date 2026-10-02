import { redirect } from "next/navigation";

/**
 * หน้าแรกสุด — เด้งไปหน้าเข้าสู่ระบบ
 * ภายหลังเพิ่มการตรวจ session: ถ้า login แล้วให้ไป /home (งาน AUTH)
 */
export default function RootPage() {
  redirect("/login");
}
