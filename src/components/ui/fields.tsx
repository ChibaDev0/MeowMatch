"use client";

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { EyeIcon } from "./icons";

type BaseProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  error?: string;
};

const inputClass = (hasIcon: boolean, extraRight = false) =>
  `w-full rounded-xl border bg-surface py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
    hasIcon ? "pl-10" : "pl-3"
  } ${extraRight ? "pr-10" : "pr-3"}`;

/** ช่องกรอกข้อความพร้อมไอคอนนำหน้า + ข้อความ error (ใช้กับ react-hook-form ได้ผ่าน ref) */
export const TextField = forwardRef<HTMLInputElement, BaseProps>(function TextField(
  { label, icon, error, className, ...rest },
  ref,
) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`${inputClass(Boolean(icon))} ${
            error ? "border-rose-400" : "border-line focus:border-primary-400"
          } ${className ?? ""}`}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});

/** ช่องรหัสผ่านพร้อมปุ่มแสดง/ซ่อน + ข้อความ error */
export const PasswordField = forwardRef<HTMLInputElement, BaseProps>(function PasswordField(
  { label, icon, error, className, placeholder = "กรอกรหัสผ่าน", ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className={`${inputClass(Boolean(icon), true)} ${
            error ? "border-rose-400" : "border-line focus:border-primary-400"
          } ${className ?? ""}`}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-primary-600"
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
});
