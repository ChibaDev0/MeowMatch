import Image from "next/image";
import { CatMarkIcon } from "./logo";

/**
 * ภาพแมวในการ์ด — ถ้ามี `src` จะแสดงรูปจริง (ตอนนี้ใช้รูปตัวอย่างใน public/)
 * ถ้าไม่มีรูป จะ fallback เป็น placeholder (gradient + ไอคอนแมว) ตามเดิม
 * เมื่อมีระบบอัปโหลด (MEDIA-01) จะส่ง src เป็น URL จาก Supabase Storage
 */
const GRADIENTS = [
  "from-amber-100 to-orange-200 text-orange-400",
  "from-slate-100 to-slate-300 text-slate-400",
  "from-primary-100 to-primary-200 text-primary-400",
  "from-rose-100 to-pink-200 text-pink-400",
  "from-emerald-100 to-teal-200 text-teal-400",
];

export function CatThumb({
  seed = 0,
  className = "",
  rounded = "rounded-xl",
  src,
  alt = "",
  sizes = "(max-width: 768px) 50vw, 33vw",
}: {
  seed?: number;
  className?: string;
  rounded?: string;
  src?: string;
  alt?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 ${rounded} ${className}`}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }

  const g = GRADIENTS[Math.abs(seed) % GRADIENTS.length];
  return (
    <div
      className={`grid place-items-center bg-gradient-to-br ${g} ${rounded} ${className}`}
      aria-hidden="true"
    >
      <CatMarkIcon className="h-1/3 w-1/3 opacity-70" />
    </div>
  );
}
