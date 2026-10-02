"use client";

import { useTransition } from "react";
import { GoogleIcon } from "@/components/ui/icons";
import { loginWithGoogleAction } from "@/server/auth/actions";

/** ปุ่ม Continue with Google — เรียก server action เพื่อเริ่ม OAuth (AUTH-02) */
export function GoogleAuthButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => loginWithGoogleAction().then(() => undefined))}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-ink transition hover:bg-primary-50 disabled:opacity-60"
    >
      <GoogleIcon />
      {pending ? "กำลังเชื่อมต่อ..." : label}
    </button>
  );
}
