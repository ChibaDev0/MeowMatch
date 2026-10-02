import { CatMarkIcon } from "./logo";

/**
 * ภาพแมวชั่วคราว (placeholder) — ใช้ gradient + ไอคอนแมว แทนรูปจริง
 * ไม่ใช้รูปปลอม; เมื่อมีระบบอัปโหลด (MEDIA-01) จะแทนด้วย <Image> จาก Supabase Storage
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
}: {
  seed?: number;
  className?: string;
  rounded?: string;
}) {
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
