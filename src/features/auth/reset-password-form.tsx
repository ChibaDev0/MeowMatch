"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordField } from "@/components/ui/fields";
import { Logo } from "@/components/ui/logo";
import { LockIcon } from "@/components/ui/icons";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { updatePasswordAction } from "@/server/auth/actions";
import { FormAlert } from "./form-alert";

export function ResetPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const res = await updatePasswordAction(values);
    if (res && !res.ok) setFormError(res.error);
    // สำเร็จ → redirect ไป /home จาก server action
  });

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <Logo className="justify-center" />
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-ink">ตั้งรหัสผ่านใหม่</h1>
        <p className="text-sm text-muted">กรอกรหัสผ่านใหม่และยืนยันอีกครั้ง</p>
      </div>

      {formError && <FormAlert kind="error">{formError}</FormAlert>}

      <PasswordField
        label="รหัสผ่านใหม่"
        icon={<LockIcon className="h-5 w-5" />}
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="ยืนยันรหัสผ่าน"
        placeholder="ยืนยันรหัสผ่าน"
        icon={<LockIcon className="h-5 w-5" />}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary-700 py-3 font-medium text-white transition hover:bg-primary-800 disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
      </button>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
