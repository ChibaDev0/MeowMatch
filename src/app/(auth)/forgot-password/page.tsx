import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <ForgotPasswordForm />
    </div>
  );
}
