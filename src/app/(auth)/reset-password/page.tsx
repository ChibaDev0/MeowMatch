import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <ResetPasswordForm />
    </div>
  );
}
