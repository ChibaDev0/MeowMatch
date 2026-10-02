"use client";

import { useState } from "react";
import { CatThumb } from "@/components/ui/cat-thumb";
import { HeartIcon } from "@/components/ui/icons";
import type { DemoCat } from "@/features/cats/demo";

/**
 * การ์ดแมวในหน้า "หาคู่" พร้อมปุ่มหัวใจ (optimistic UI ฝั่ง client)
 * ตอนนี้สลับสถานะในหน่วยความจำเท่านั้น — การบันทึก favorites จริงเป็นงาน FAV-01
 * (ต้อง rollback เมื่อ server บันทึกไม่สำเร็จ)
 */
export function DiscoverCard({ cat, seed }: { cat: DemoCat; seed: number }) {
  const [liked, setLiked] = useState(Boolean(cat.liked));

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:shadow-md">
      <div className="relative">
        <CatThumb seed={seed} rounded="rounded-none" className="aspect-square w-full" />
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          aria-pressed={liked}
          aria-label={liked ? `เอา ${cat.name} ออกจากที่กดใจ` : `กดใจ ${cat.name}`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 shadow transition hover:scale-105"
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
          {cat.coat} · {cat.eye} · {cat.ear}
        </p>
      </div>
    </article>
  );
}
