"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { SelectableCat } from "@/components/ui/selectable-cat";
import { GatedAnalysisNote } from "@/components/ui/gated-note";
import { DiscoverCard } from "@/features/discovery/discover-card";
import { DEMO_DISCOVER_CATS, DEMO_MY_CATS } from "@/features/cats/demo";

const STEPS = ["เลือกแมวของฉัน", "ตั้งเป้าหมายลูกแมว", "ผลการวิเคราะห์"];
const LIKED = DEMO_DISCOVER_CATS.filter((c) => c.liked);
const COAT = ["ขนสั้น", "ขนยาว", "ไม่มีขน"];

export function DesiredPlanner() {
  const [tab, setTab] = useState<"goal" | "liked">("goal");
  const [source, setSource] = useState<string | null>(null);
  const [coat, setCoat] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top tabs (ux-flow: เป้าหมายของฉัน / แมวที่กดใจ) */}
      <div className="inline-flex rounded-xl bg-primary-50 p-1">
        {(
          [
            ["goal", "เป้าหมายของฉัน"],
            ["liked", "แมวที่กดใจ"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === k ? "bg-surface text-primary-700 shadow-sm" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "liked" ? (
        LIKED.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LIKED.map((cat, i) => (
              <DiscoverCard key={cat.id} cat={cat} seed={i + 1} />
            ))}
          </div>
        ) : (
          <p className="text-muted">ยังไม่มีแมวที่กดใจ — ไปที่หน้าหาคู่เพื่อกดใจแมวที่สนใจ</p>
        )
      ) : (
        <div className="space-y-6 rounded-2xl border border-line bg-surface p-5 md:p-6">
          {/* Stepper */}
          <ol className="flex items-center justify-between gap-2">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                    i === 0 ? "bg-primary-600 text-white" : "bg-primary-100 text-primary-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`hidden text-sm sm:block ${
                    i === 0 ? "font-medium text-ink" : "text-muted"
                  }`}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-line" />}
              </li>
            ))}
          </ol>

          {/* Step 1 */}
          <div className="space-y-3">
            <h2 className="font-semibold text-ink">1. เลือกแมวของฉัน (1 ตัว)</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DEMO_MY_CATS.map((cat, i) => (
                <SelectableCat
                  key={cat.id}
                  cat={cat}
                  seed={i}
                  selected={source === cat.id}
                  badge="✓"
                  onSelect={() => {
                    setSource(cat.id);
                    setShowNote(false);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">2. ตั้งเป้าหมายลูกแมวที่ต้องการ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="สายพันธุ์" placeholder="ไม่จำกัด" />
              <Select label="สีตา" placeholder="ไม่จำกัด" />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-ink">ลักษณะขน</span>
              <div className="flex flex-wrap gap-2">
                {COAT.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCoat((v) => (v === c ? null : c))}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      coat === c
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-line text-muted hover:border-primary-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="สีของแมว" placeholder="ไม่จำกัด" />
              <Select label="หู" placeholder="ไม่จำกัด" />
            </div>
          </div>

          <button
            type="button"
            disabled={source === null}
            onClick={() => setShowNote(true)}
            className="w-full rounded-xl bg-primary-700 px-5 py-3 font-medium text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            วิเคราะห์ผลลัพธ์
          </button>

          {showNote && <GatedAnalysisNote />}
        </div>
      )}
    </div>
  );
}
