"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/fields";
import { Logo } from "@/components/ui/logo";
import { UserIcon } from "@/components/ui/icons";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { requestPasswordResetAction } from "@/server/auth/actions";
import { FormAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    const res = await requestPasswordResetAction(values);
    if (res.ok) setMessage(res.message ?? "ส่งลิงก์แล้ว");
  });

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <Logo className="justify-center" />
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-ink">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-muted">กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
      </div>

      {message && <FormAlert kind="success">{message}</FormAlert>}

      <TextField
        label="Email"
        type="email"
        placeholder="กรอก Email"
        icon={<UserIcon className="h-5 w-5" />}
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary-700 py-3 font-medium text-white transition hover:bg-primary-800 disabled:opacity-60"
      >
        {isSubmitting ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
      </button>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
