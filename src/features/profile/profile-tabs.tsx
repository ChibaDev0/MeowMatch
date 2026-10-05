"use client";

import { useState } from "react";
import Link from "next/link";
import { CatThumb } from "@/components/ui/cat-thumb";
import { PlusIcon } from "@/components/ui/icons";
import type { CatView } from "@/features/cats/types";

const TABS = [
  { key: "mine", label: "แมวของฉัน" },
  { key: "liked", label: "แมวที่กดใจไว้" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProfileTabs({ myCats, likedCats }: { myCats: CatView[]; likedCats: CatView[] }) {
  const [tab, setTab] = useState<TabKey>("mine");
  const cats = tab === "mine" ? myCats : likedCats;
  const emptyText =
    tab === "mine" ? "ยังไม่มีแมว — กด “เพิ่มแมว” เพื่อเริ่มต้น" : "ยังไม่มีแมวที่กดใจ — ไปที่หน้าหาคู่เพื่อกดใจแมวที่สนใจ";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="inline-flex rounded-xl bg-primary-50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-surface text-primary-700 shadow-sm" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cats.map((cat, i) => (
          <div key={cat.id} className="space-y-2">
            <CatThumb
              seed={i}
              src={cat.photo}
              alt={`รูปแมว ${cat.name}`}
              className="aspect-[4/3] w-full"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
            <p className="text-center text-sm font-medium text-ink">{cat.name}</p>
          </div>
        ))}
        {tab === "mine" && (
          <Link
            href="/my-cats/new"
            className="grid aspect-[4/3] place-items-center rounded-xl border-2 border-dashed border-primary-200 text-primary-600 transition hover:bg-primary-50"
          >
            <span className="flex flex-col items-center gap-1 text-sm font-medium">
              <PlusIcon className="h-6 w-6" />
              เพิ่มแมว
            </span>
          </Link>
        )}
      </div>

      {cats.length === 0 && tab === "liked" && <p className="text-sm text-muted">{emptyText}</p>}
      {cats.length === 0 && tab === "mine" && <p className="text-sm text-muted">{emptyText}</p>}
    </div>
  );
}
