import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/features/auth/register-form";
import { getUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/home");

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <RegisterForm />
    </div>
  );
}
