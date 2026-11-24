"use client";

import { useState, useTransition } from "react";
import { CatThumb } from "@/components/ui/cat-thumb";
import { HeartIcon } from "@/components/ui/icons";
import type { CatView } from "@/features/cats/types";
import { ReportButton } from "@/features/moderation/report-button";
import { toggleLikeAction } from "@/server/cats/actions";

/**
 * การ์ดแมวในหน้า "หาคู่" พร้อมปุ่มหัวใจ (optimistic UI + rollback)
 * บันทึกการกดใจจริงผ่าน server action toggleLikeAction (ตาราง cat_likes)
 */
export function DiscoverCard({
  cat,
  seed,
  geneMatch = null,
}: {
  cat: CatView;
  seed: number;
  /** ผลเทียบยีนกับที่ต้องการ (หน้าหาคู่จากผลคำนวณยีน): true ตรง · false ไม่ตรง · null ไม่รู้/ไม่ได้ขอ */
  geneMatch?: boolean | null;
}) {
  const geneCount = Object.keys(cat.genes ?? {}).length;
  const [liked, setLiked] = useState(Boolean(cat.liked));
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !liked;
    setLiked(next); // optimistic
    startTransition(async () => {
      const res = await toggleLikeAction(cat.id);
      if (!res.ok) {
        setLiked(!next); // rollback เมื่อ server ไม่สำเร็จ
      } else {
        setLiked(res.liked);
      }
    });
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:shadow-md">
      <div className="relative">
        <CatThumb
          seed={seed}
          src={cat.photo}
          alt={`รูปแมว ${cat.name}`}
          rounded="rounded-none"
          className="aspect-square w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <ReportButton catId={cat.id} catName={cat.name} />
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          aria-pressed={liked}
          aria-label={liked ? `เอา ${cat.name} ออกจากที่กดใจ` : `กดใจ ${cat.name}`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow transition hover:scale-105 disabled:opacity-60"
        >
          <HeartIcon
            className={`h-5 w-5 ${liked ? "fill-pink-500 text-pink-500" : "text-muted"}`}
          />
        </button>
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-semibold text-ink">{cat.name}</h3>
        <p className="text-sm text-muted">
          {cat.breed} · {cat.ageLabel}
        </p>
        <p className="text-xs text-muted">
          {cat.sex === "male" ? "เพศผู้" : cat.sex === "female" ? "เพศเมีย" : "ไม่ระบุเพศ"} · {cat.coat} · {cat.eye} · {cat.ear}
          {cat.coatColor ? ` · สี${cat.coatColor}` : ""}
        </p>
        {(geneMatch !== null || geneCount > 0) && (
          <p className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
            {geneMatch === true && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">✓ ยีนตรงตามที่ต้องการ</span>
            )}
            {geneMatch === false && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">ยีนที่บันทึกไม่ตรง</span>
            )}
            {geneCount > 0 && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-primary-700">🧬 บันทึกยีน {geneCount} ตัว</span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
