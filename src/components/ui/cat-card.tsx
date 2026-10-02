import { CatThumb } from "./cat-thumb";
import { DotsIcon, EditIcon } from "./icons";
import type { DemoCat } from "@/features/cats/demo";

/** การ์ดแมวในหน้า "แมวของฉัน" — รูป ชื่อ ปุ่มแก้ไข/เมนู อายุ และรูปลักษณ์ */
export function CatCard({ cat, seed }: { cat: DemoCat; seed: number }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:shadow-md">
      <CatThumb seed={seed} rounded="rounded-none" className="aspect-[4/3] w-full" />
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">{cat.name}</h3>
          <div className="flex items-center gap-1 text-muted">
            <button
              type="button"
              aria-label={`แก้ไข ${cat.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-primary-50 hover:text-primary-700"
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`ตัวเลือกเพิ่มเติมของ ${cat.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-primary-50 hover:text-primary-700"
            >
              <DotsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-muted">{cat.ageLabel}</p>
        <p className="text-sm text-ink">{cat.coat}</p>
        <p className="text-sm text-muted">{cat.eye}</p>
      </div>
    </article>
  );
}
