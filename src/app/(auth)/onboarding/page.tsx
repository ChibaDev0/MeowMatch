import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/auth/onboarding-form";
import { getProfile } from "@/server/auth/session";

export const metadata: Metadata = { title: "ตั้งชื่อผู้ใช้" };

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.onboarding_status === "complete") redirect("/home");

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <OnboardingForm />
    </div>
  );
}
