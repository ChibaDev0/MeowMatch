import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/auth/onboarding-form";
import { getProfile, getUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "ตั้งชื่อผู้ใช้" };

export default async function OnboardingPage() {
  // แยกเคสให้ชัด: ไม่มี user → /login, มี user แต่ profile ยังไม่เสร็จ → แสดงฟอร์ม
  // ห้ามเด้งไป /login เมื่อยังมี session อยู่ มิฉะนั้นจะเกิด redirect loop กับ /home
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (profile?.onboarding_status === "complete") redirect("/home");

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <OnboardingForm />
    </div>
  );
}
