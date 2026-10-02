"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField, PasswordField } from "@/components/ui/fields";
import { OrDivider } from "@/components/ui/google-button";
import { Logo } from "@/components/ui/logo";
import { LockIcon, UserIcon } from "@/components/ui/icons";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "@/server/auth/actions";
import { GoogleAuthButton } from "./google-auth-button";
import { FormAlert } from "./form-alert";

export function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const res = await loginAction(values);
    if (res && !res.ok) setFormError(res.error);
    // สำเร็จ → server action redirect ไป /home เอง
  });

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <div className="space-y-1 text-center">
        <Logo className="justify-center" />
        <h2 className="pt-2 text-2xl font-bold text-ink">ยินดีต้อนรับกลับ</h2>
        <p className="text-sm text-muted">เข้าสู่ระบบเพื่อใช้งาน MeowMatch</p>
      </div>

      <GoogleAuthButton />
      <OrDivider />

      {formError && <FormAlert kind="error">{formError}</FormAlert>}

      <TextField
        label="Username หรือ Email"
        placeholder="กรอก Username หรือ Email"
        icon={<UserIcon className="h-5 w-5" />}
        autoComplete="username"
        error={errors.identifier?.message}
        {...register("identifier")}
      />
      <PasswordField
        label="Password"
        icon={<LockIcon className="h-5 w-5" />}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" className="h-4 w-4 rounded border-line accent-primary-600" />
          จดจำฉัน
        </label>
        <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-700">
          ลืมรหัสผ่าน?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary-700 py-3 font-medium text-white transition hover:bg-primary-800 disabled:opacity-60"
      >
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>

      <p className="text-center text-sm text-muted">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-semibold text-primary-600 hover:text-primary-700">
          สมัครสมาชิก
        </Link>
      </p>
    </form>
  );
}
