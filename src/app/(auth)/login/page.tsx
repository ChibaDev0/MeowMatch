import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatIcon, HeartIcon, TargetIcon } from "@/components/ui/icons";
import { LoginForm } from "@/features/auth/login-form";
import { getUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

const FEATURES = [
  { icon: HeartIcon, title: "หาคู่", desc: "ค้นหาแมวที่ใช่" },
  { icon: TargetIcon, title: "วิเคราะห์", desc: "เปอร์เซ็นต์โอกาสลูกแมว" },
  { icon: CatIcon, title: "จัดการ", desc: "เก็บข้อมูลแมวของคุณ" },
];

export default async function LoginPage() {
  if (await getUser()) redirect("/home");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Hero */}
      <section className="relative hidden flex-col justify-end overflow-hidden bg-gradient-to-br from-primary-100 via-primary-50 to-white p-12 lg:flex">
        <div className="space-y-5">
          <h1 className="text-5xl font-extrabold leading-tight">
            <span className="text-primary-900">Meow</span>
            <span className="text-primary-600">Match</span>
          </h1>
          <p className="max-w-md text-lg text-ink">
            หาคู่แมว สร้างอนาคตน้องเหมียวในแบบที่คุณต้องการ
          </p>
          <p className="max-w-md text-muted">
            ค้นหา วิเคราะห์ วางแผนการผสมพันธุ์แมวด้วยข้อมูลสายพันธุ์และผลลัพธ์ที่แม่นยำ
          </p>
          <ul className="flex flex-wrap gap-6 pt-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-600 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="block text-xs text-muted">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form card */}
      <section className="flex items-center justify-center p-6">
        <LoginForm />
      </section>
    </div>
  );
}
