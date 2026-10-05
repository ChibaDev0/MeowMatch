"use client";

import { useState } from "react";
import { SelectableCat } from "@/components/ui/selectable-cat";
import { GatedAnalysisNote } from "@/components/ui/gated-note";
import { HeartIcon } from "@/components/ui/icons";
import type { CatView } from "@/features/cats/types";

/**
 * เลือกแมว 2 ตัวเพื่อวิเคราะห์ (PAIR-01)
 * A = แมวของฉันเท่านั้น; B = แมวของฉันหรือแมวที่กดใจ
 * ปุ่ม "วิเคราะห์ลูกแมว" ยังไม่คำนวณจริง — แสดง gated note (ผลเปิดใน MVP-B)
 */
export function BreedingPicker({ myCats, likedCats }: { myCats: CatView[]; likedCats: CatView[] }) {
  const [a, setA] = useState<string | null>(null);
  const [bTab, setBTab] = useState<"mine" | "liked">("mine");
  const [b, setB] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);

  const bList = bTab === "mine" ? myCats : likedCats;
  const ready = a !== null && b !== null && !(bTab === "mine" && a === b);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* A */}
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">
            เลือกแมวตัวที่ 1 <span className="text-sm font-normal text-muted">(แมวของฉัน)</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {myCats.map((cat, i) => (
              <SelectableCat
                key={cat.id}
                cat={cat}
                seed={i}
                selected={a === cat.id}
                badge="1"
                onSelect={() => {
                  setA(cat.id);
                  setShowNote(false);
                }}
              />
            ))}
          </div>
          {myCats.length === 0 && (
            <p className="text-sm text-muted">ยังไม่มีแมวของฉัน — เพิ่มแมวก่อนเริ่มวิเคราะห์</p>
          )}
        </section>

        {/* B */}
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">
            เลือกแมวตัวที่ 2{" "}
            <span className="text-sm font-normal text-muted">(แมวของฉัน หรือ แมวที่กดใจไว้)</span>
          </h2>
          <div className="inline-flex rounded-xl bg-primary-50 p-1">
            {(["mine", "liked"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setBTab(t);
                  setB(null);
                }}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  bTab === t ? "bg-surface text-primary-700 shadow-sm" : "text-muted"
                }`}
              >
                {t === "mine" ? "แมวของฉัน" : "แมวที่กดใจไว้"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bList.map((cat, i) => (
              <SelectableCat
                key={cat.id}
                cat={cat}
                seed={i + 2}
                selected={b === cat.id}
                badge="2"
                onSelect={() => {
                  setB(cat.id);
                  setShowNote(false);
                }}
              />
            ))}
          </div>
          {bList.length === 0 && (
            <p className="text-sm text-muted">
              {bTab === "mine" ? "ยังไม่มีแมวของฉัน" : "ยังไม่มีแมวที่กดใจไว้"}
            </p>
          )}
        </section>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={() => setShowNote(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 py-3.5 font-medium text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <HeartIcon className="h-5 w-5" />
        วิเคราะห์ลูกแมว
      </button>

      {showNote && <GatedAnalysisNote />}
    </div>
  );
}
