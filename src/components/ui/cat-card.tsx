import { CatThumb } from "./cat-thumb";
import { CatCardActions } from "./cat-card-actions";
import { LockIcon } from "./icons";
import type { DemoCat } from "@/features/cats/demo";

/** การ์ดแมวในหน้า "แมวของฉัน" — รูป ชื่อ ปุ่มแก้ไข/เมนู อายุ และรูปลักษณ์ */
export function CatCard({ cat, seed }: { cat: DemoCat; seed: number }) {
  const hidden = cat.isPublic === false;
  const moderated = cat.moderationStatus === "hidden";
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:shadow-md">
      <div className="relative">
        <CatThumb
          seed={seed}
          src={cat.photo}
          alt={`รูปแมว ${cat.name}`}
          rounded="rounded-none"
          className="aspect-[4/3] w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {moderated ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-2.5 py-1 text-xs font-medium text-white">
            <LockIcon className="h-3.5 w-3.5" />
            ถูกผู้ดูแลระงับ
          </span>
        ) : (
          hidden && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white">
              <LockIcon className="h-3.5 w-3.5" />
              ซ่อนอยู่
            </span>
          )
        )}
      </div>
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">{cat.name}</h3>
          <CatCardActions catId={cat.id} name={cat.name} isPublic={cat.isPublic} />
        </div>
        <p className="text-sm text-muted">{cat.ageLabel}</p>
        <p className="text-sm text-ink">{cat.coat}</p>
        <p className="text-sm text-muted">{cat.eye}</p>
      </div>
    </article>
  );
}
