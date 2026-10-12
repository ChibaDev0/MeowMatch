"use client";

import { useState, useTransition } from "react";
import { SelectableCat } from "@/components/ui/selectable-cat";
import { HeartIcon } from "@/components/ui/icons";
import type { CatView } from "@/features/cats/types";
import type { PairAnalysisResult } from "@/domain/genetics/contracts/types";
import { analyzePairAction } from "@/server/analysis/actions";
import { PairResultView } from "./pair-result";

/**
 * เลือกแมว 2 ตัวเพื่อวิเคราะห์ (PAIR-01)
 * A = แมวของฉันเท่านั้น; B = แมวของฉันหรือแมวที่กดใจ
 * ปุ่ม "วิเคราะห์ลูกแมว" เรียก engine จริงผ่าน server action แล้วแสดงผลรายลักษณะตามสถานะจริง
 * รุ่น demo: เปิดโหมดคำนวณด้วย algorithm เป็นค่าเริ่มต้น เพื่อให้กดแล้วเห็นผล + อ้างอิงที่มาได้
 * (ยังไม่ใช่ผลที่ผ่านผู้เชี่ยวชาญ — ติดป้าย "โหมดสาธิต" กำกับเสมอ; ปิด checkbox เพื่อดูสถานะจริง)
 */
export function BreedingPicker({ myCats, likedCats }: { myCats: CatView[]; likedCats: CatView[] }) {
  const [a, setA] = useState<string | null>(null);
  const [bTab, setBTab] = useState<"mine" | "liked">("mine");
  const [b, setB] = useState<string | null>(null);
  const [demo, setDemo] = useState(true);
  const [result, setResult] = useState<PairAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const bList = bTab === "mine" ? myCats : likedCats;
  const ready = a !== null && b !== null && !(bTab === "mine" && a === b);

  const reset = () => {
    setResult(null);
    setError(null);
  };

  const runAnalysis = () => {
    if (!a || !b) return;
    startTransition(async () => {
      setError(null);
      const res = await analyzePairAction(a, b, { demo });
      if (res.ok) setResult(res.result);
      else {
        setResult(null);
        setError(res.error);
      }
    });
  };

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
                  reset();
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
                  reset();
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
                  reset();
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

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => {
              setDemo(e.target.checked);
              reset();
            }}
            className="h-4 w-4 rounded border-line accent-primary-600"
          />
          โหมดสาธิตคณิตศาสตร์ (ใช้ชุดกฎที่ยังไม่ผ่านการตรวจรับ — ไม่ใช่ผลจริง)
        </label>

        <button
          type="button"
          disabled={!ready || isPending}
          onClick={runAnalysis}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 py-3.5 font-medium text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <HeartIcon className="h-5 w-5" />
          {isPending ? "กำลังวิเคราะห์…" : "วิเคราะห์ลูกแมว"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && <PairResultView result={result} />}
    </div>
  );
}
