import { CatThumb } from "./cat-thumb";
import type { DemoCat } from "@/features/cats/demo";

/** การ์ดแมวแบบเลือกได้ — มีกรอบ/ติ๊กเมื่อเลือก (ใช้ในหน้าผสมพันธุ์และแมวที่ต้องการ) */
export function SelectableCat({
  cat,
  seed,
  selected,
  badge,
  onSelect,
}: {
  cat: DemoCat;
  seed: number;
  selected: boolean;
  badge?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative rounded-2xl border bg-surface p-2 text-center transition ${
        selected
          ? "border-primary-500 ring-2 ring-primary-200"
          : "border-line hover:border-primary-300"
      }`}
    >
      {selected && badge && (
        <span className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-primary-600 text-xs font-bold text-white">
          {badge}
        </span>
      )}
      <CatThumb
        seed={seed}
        src={cat.photo}
        alt={`รูปแมว ${cat.name}`}
        className="aspect-[4/3] w-full"
        sizes="(max-width: 640px) 50vw, 25vw"
      />
      <p className="mt-2 text-sm font-semibold text-ink">{cat.name}</p>
      <p className="text-xs text-muted">{cat.ageLabel}</p>
    </button>
  );
}
