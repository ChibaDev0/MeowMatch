"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/fields";
import { Logo } from "@/components/ui/logo";
import { UserIcon } from "@/components/ui/icons";
import { usernameOnlySchema, type UsernameOnlyInput } from "@/lib/validation/auth";
import { setUsernameAction } from "@/server/auth/actions";
import { FormAlert } from "./form-alert";

/** ตั้ง Username ครั้งแรกสำหรับผู้ใช้ Google (AUTH-02 onboarding) */
export function OnboardingForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UsernameOnlyInput>({ resolver: zodResolver(usernameOnlySchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const res = await setUsernameAction(values);
    if (res && !res.ok) {
      setFormError(res.error);
      if (res.fieldErrors?.username) setError("username", { message: res.fieldErrors.username });
    }
    // สำเร็จ → redirect ไป /home จาก server action
  });

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-surface p-7 shadow-sm"
    >
      <Logo className="justify-center" />
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-ink">ตั้งชื่อผู้ใช้</h1>
        <p className="text-sm text-muted">เลือก Username เพื่อเริ่มใช้งาน MeowMatch</p>
      </div>

      {formError && <FormAlert kind="error">{formError}</FormAlert>}

      <TextField
        label="Username"
        placeholder="กรอก Username (a-z, 0-9, _)"
        icon={<UserIcon className="h-5 w-5" />}
        autoComplete="username"
        error={errors.username?.message}
        {...register("username")}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary-700 py-3 font-medium text-white transition hover:bg-primary-800 disabled:opacity-60"
      >
        {isSubmitting ? "กำลังบันทึก..." : "เริ่มใช้งาน"}
      </button>
    </form>
  );
}
