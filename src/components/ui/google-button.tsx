import { GoogleIcon } from "./icons";

/** ปุ่ม Continue with Google (ยังไม่ผูก OAuth — งาน AUTH-02) */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-ink transition hover:bg-primary-50"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

/** เส้นคั่น "หรือ" */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-line" />
      หรือ
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
