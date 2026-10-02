"use client";

import { useState } from "react";
import Link from "next/link";
import { CatThumb } from "@/components/ui/cat-thumb";
import { PlusIcon } from "@/components/ui/icons";
import { DEMO_DISCOVER_CATS, DEMO_MY_CATS, type DemoCat } from "@/features/cats/demo";

const TABS = [
  { key: "mine", label: "แมวของฉัน" },
  { key: "liked", label: "แมวที่กดใจไว้" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProfileTabs() {
  const [tab, setTab] = useState<TabKey>("mine");
  const cats: DemoCat[] = tab === "mine" ? DEMO_MY_CATS : DEMO_DISCOVER_CATS.slice(0, 4);

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
            <CatThumb seed={i} className="aspect-[4/3] w-full" />
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
    </div>
  );
}
