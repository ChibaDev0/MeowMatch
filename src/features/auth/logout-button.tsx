"use client";

import { useTransition } from "react";
import { LogoutIcon } from "@/components/ui/icons";
import { logoutAction } from "@/server/auth/actions";

/** ปุ่มออกจากระบบ — เรียก server action (เคลียร์ session เครื่องนี้) */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
    >
      <LogoutIcon className="h-4 w-4" />
      {pending ? "กำลังออก..." : "ออกจากระบบ"}
    </button>
  );
}
