"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CameraIcon, ChevronDownIcon, TrashIcon } from "@/components/ui/icons";
import { createCatAction, updateCatAction } from "@/server/cats/actions";
import type { CatEditData } from "./types";

const COAT = ["ขนสั้น", "ขนยาว", "ไม่มีขน"];
const EYE = ["ตาสีฟ้า", "ตาสีทอง", "ตาสีเขียว", "ตาสีน้ำตาล", "ตาสองสี"];
const EAR = ["หูตั้ง", "หูพับ"];
const SEX = [
  { value: "female", label: "เพศเมีย" },
  { value: "male", label: "เพศผู้" },
  { value: "unknown", label: "ไม่ทราบ" },
] as const;

const ACCEPT = "image/jpeg,image/png,image/webp";

/** dropdown ย่อสำหรับใช้ในฟอร์มนี้ (controlled) */
function Field({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

/**
 * ฟอร์มข้อมูลแมว (CAT-01 + MEDIA-01) — ใช้ร่วมหน้า "เพิ่มแมว" และ "แก้ไขแมว"
 * - mode "create" → createCatAction, "edit" → updateCatAction (ส่งเป็น FormData พร้อมไฟล์รูป)
 * - รูปจริงอัปโหลดขึ้น Supabase Storage ผ่าน server action (server ตรวจชนิด/ขนาดอีกชั้น)
 */
export function CatForm({ mode, initial }: { mode: "create" | "edit"; initial?: CatEditData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [breed, setBreed] = useState(initial?.breed ?? "");
  const [sex, setSex] = useState<string>(initial?.sex ?? "female");
  const [ageYears, setAgeYears] = useState(initial?.ageYears != null ? String(initial.ageYears) : "");
  const [ageMonths, setAgeMonths] = useState(initial?.ageMonths != null ? String(initial.ageMonths) : "");
  const [coat, setCoat] = useState<string | null>(initial?.coat ?? null);
  const [coatColor, setCoatColor] = useState(initial?.coatColor ?? "");
  const [coatPattern, setCoatPattern] = useState(initial?.coatPattern ?? "");
  const [eye, setEye] = useState(initial?.eyeColor ?? "");
  const [ear, setEar] = useState(initial?.earType ?? "");
  const [temperament, setTemperament] = useState(initial?.temperament ?? "");

  // รูป: ไฟล์ใหม่ที่เลือก (preview ผ่าน object URL) / รูปเดิม / สถานะลบรูปเดิม
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const existingPhoto = initial?.photo;
  const shownPhoto = preview ?? (removePhoto ? null : existingPhoto ?? null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview); // กันหน่วยความจำรั่ว
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setRemovePhoto(false);
    } else {
      setFile(null);
      setPreview(null);
    }
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setRemovePhoto(true); // ถ้ามีรูปเดิม สั่งลบตอนบันทึก
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fd = new FormData();
    fd.set("name", name);
    fd.set("breed", breed);
    fd.set("sex", sex);
    fd.set("ageYears", ageYears);
    fd.set("ageMonths", ageMonths);
    fd.set("coat", coat ?? "");
    fd.set("coatColor", coatColor);
    fd.set("coatPattern", coatPattern);
    fd.set("eyeColor", eye);
    fd.set("earType", ear);
    fd.set("temperament", temperament);
    if (file) fd.set("photo", file);
    if (mode === "edit" && initial) {
      fd.set("id", initial.id);
      if (removePhoto) fd.set("removePhoto", "1");
    }

    startTransition(async () => {
      const res = mode === "create" ? await createCatAction(fd) : await updateCatAction(fd);
      if (res.ok) {
        router.push("/my-cats");
        router.refresh();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 rounded-2xl border border-line bg-surface p-5 md:grid-cols-[260px_1fr] md:p-6"
    >
      {/* Upload (MEDIA-01) */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPickFile}
          className="sr-only"
          aria-label="เลือกรูปแมว"
        />
        {shownPhoto ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line bg-slate-100">
            {/* preview ใช้ <img> เพราะรองรับทั้ง blob: และ URL จริง — รูปจริงบนหน้าแสดงผลใช้ next/image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownPhoto} alt="ตัวอย่างรูปแมว" className="h-full w-full object-cover" />
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/70"
              >
                เปลี่ยนรูป
              </button>
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="ลบรูป"
                className="grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white backdrop-blur transition hover:bg-rose-600"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid aspect-square w-full place-items-center gap-2 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/40 text-center text-muted transition hover:border-primary-400 hover:bg-primary-50"
          >
            <CameraIcon className="h-10 w-10 text-primary-400" />
            <span className="text-sm font-medium text-ink">อัปโหลดรูปภาพ</span>
            <span className="px-4 text-xs">JPG, PNG หรือ WebP · ไม่เกิน 5 MB</span>
          </button>
        )}
        {fieldErrors.photo && <p className="text-xs text-rose-500">{fieldErrors.photo}</p>}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="กรอกชื่อแมว"
              className={inputCls}
            />
            {fieldErrors.name && <p className="text-xs text-rose-500">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">อายุ</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                placeholder="ปี"
                className={inputCls}
              />
              <input
                type="number"
                min={0}
                max={11}
                value={ageMonths}
                onChange={(e) => setAgeMonths(e.target.value)}
                placeholder="เดือน"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">สายพันธุ์</label>
            <input
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="เช่น ผสม, เปอร์เซีย, Maine Coon"
              className={inputCls}
            />
          </div>
          <Field
            label="เพศ"
            value={sex}
            onChange={setSex}
            options={SEX.map((s) => ({ value: s.value, label: s.label }))}
            placeholder="เลือกเพศ"
            required
          />
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
          {fieldErrors.coat && <p className="text-xs text-rose-500">{fieldErrors.coat}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="สีตา"
            value={eye}
            onChange={setEye}
            options={EYE.map((v) => ({ value: v, label: v }))}
            placeholder="เลือกสีตา"
          />
          <Field
            label="หู"
            value={ear}
            onChange={setEar}
            options={EAR.map((v) => ({ value: v, label: v }))}
            placeholder="เลือกลักษณะหู"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="coat-color" className="text-sm font-medium text-ink">สีขน</label>
            <input id="coat-color" value={coatColor} onChange={(e) => setCoatColor(e.target.value)} maxLength={80} placeholder="เช่น ดำ, ส้ม, เทา, ขาวดำ" className={inputCls} />
            {fieldErrors.coatColor && <p className="text-xs text-rose-500">{fieldErrors.coatColor}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="coat-pattern" className="text-sm font-medium text-ink">ลวดลายขน</label>
            <input id="coat-pattern" value={coatPattern} onChange={(e) => setCoatPattern(e.target.value)} maxLength={80} placeholder="เช่น สีพื้น, ลายสลิด, แต้มขาว, สามสี" className={inputCls} />
            {fieldErrors.coatPattern && <p className="text-xs text-rose-500">{fieldErrors.coatPattern}</p>}
          </div>
        </div>
        <p className="text-xs text-muted">สีและลายขนใช้ประกอบการวิเคราะห์ลูกแมว หากไม่ทราบให้เว้นว่าง</p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-ink">ลักษณะนิสัย</label>
          <textarea
            rows={3}
            value={temperament}
            onChange={(e) => setTemperament(e.target.value)}
            placeholder="เช่น ขี้อ้อน ชอบเล่น เข้ากับแมวตัวอื่นได้ดี"
            className={inputCls}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/my-cats"
            className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-primary-50"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก…" : mode === "create" ? "บันทึก" : "บันทึกการแก้ไข"}
          </button>
        </div>
      </div>
    </form>
  );
}
