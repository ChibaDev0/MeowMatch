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
export function DiscoverCard({ cat, seed }: { cat: CatView; seed: number }) {
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
          {cat.coat} · {cat.eye} · {cat.ear}
        </p>
      </div>
    </article>
  );
}
