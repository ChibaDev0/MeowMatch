"use client";

import { useState } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { CameraIcon } from "@/components/ui/icons";

const COAT = ["ขนสั้น", "ขนยาว", "ไม่มีขน"];

/**
 * ฟอร์มเพิ่มแมว (CAT-02) — โครงหน้าตาตาม reference UI
 * ยังไม่ส่งข้อมูลจริง (จะผูกกับ createCatSchema + server action ในงาน CAT-01/MEDIA-01)
 */
export function AddCatForm() {
  const [coat, setCoat] = useState<string | null>(null);

  return (
    <form className="grid gap-6 rounded-2xl border border-line bg-surface p-5 md:grid-cols-[260px_1fr] md:p-6">
      {/* Upload */}
      <div>
        <button
          type="button"
          className="grid aspect-square w-full place-items-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/40 text-muted transition hover:bg-primary-50"
        >
          <CameraIcon className="h-10 w-10 text-primary-400" />
          <span className="text-sm font-medium text-ink">อัปโหลดรูปภาพ</span>
          <span className="text-xs">JPG, PNG (สูงสุด 5MB)</span>
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">
              ชื่อแมว<span className="ml-0.5 text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="กรอกชื่อแมว"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">อายุ</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                placeholder="ปี"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
              <input
                type="number"
                min={0}
                max={11}
                placeholder="เดือน"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-ink">
            ลักษณะขน<span className="ml-0.5 text-rose-500">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {COAT.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCoat(c)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  coat === c
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-line text-muted hover:border-primary-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="สีตา" placeholder="เลือกสีตา" required />
          <Select label="หู" placeholder="เลือกหู" required />
        </div>
        <Select label="สีของแมว" placeholder="เลือกสีขน" required />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink">ลักษณะนิสัย</label>
          <textarea
            rows={3}
            placeholder="เช่น ขี้อ้อน ชอบเล่น เข้ากับแมวตัวอื่นได้ดี"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/my-cats"
            className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-primary-50"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-primary-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-800"
          >
            บันทึก
          </button>
        </div>
      </div>
    </form>
  );
}
