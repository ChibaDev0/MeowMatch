"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, PasswordField } from "@/components/ui/fields";
import { OrDivider } from "@/components/ui/google-button";
import { Logo } from "@/components/ui/logo";
import { LockIcon, UserIcon } from "@/components/ui/icons";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { registerAction } from "@/server/auth/actions";
import { GoogleAuthButton } from "./google-auth-button";
import { FormAlert } from "./form-alert";

export function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(null);
    const res = await registerAction(values);
    if (res.ok) {
      setSuccess(res.message ?? "สมัครสำเร็จ");
      return;
    }
    setFormError(res.error);
    if (res.fieldErrors?.username) setError("username", { message: res.fieldErrors.username });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <Logo className="justify-center" />
      <Link href="/login" className="block text-sm text-muted hover:text-primary-700">
        ← กลับไปหน้าเข้าสู่ระบบ
      </Link>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-ink">สร้างบัญชีใหม่</h1>
        <p className="text-sm text-muted">สมัครสมาชิกเพื่อเริ่มใช้งาน MeowMatch</p>
      </div>

      {formError && <FormAlert kind="error">{formError}</FormAlert>}
      {success && <FormAlert kind="success">{success}</FormAlert>}

      <TextField
        label="Username"
        placeholder="กรอก Username"
        icon={<UserIcon className="h-5 w-5" />}
        autoComplete="username"
        error={errors.username?.message}
        {...register("username")}
      />
      <TextField
        label="Email"
        type="email"
        placeholder="กรอก Email"
        icon={<UserIcon className="h-5 w-5" />}
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        label="Password"
        icon={<LockIcon className="h-5 w-5" />}
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirm Password"
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
        {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
      </button>

      <OrDivider />
      <GoogleAuthButton />

      <p className="text-center text-sm text-muted">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
