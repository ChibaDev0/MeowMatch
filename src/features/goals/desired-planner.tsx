"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SelectableCat } from "@/components/ui/selectable-cat";
import { DiscoverCard } from "@/features/discovery/discover-card";
import type { CatView } from "@/features/cats/types";
import type { DesiredGoalData } from "@/features/goals/types";
import type { TargetSearchResult } from "@/domain/genetics/contracts/types";
import { saveDesiredGoalAction } from "@/server/goals/actions";
import { analyzeTargetAction } from "@/server/analysis/target-actions";
import { TargetResultView } from "./target-result";

const STEPS = ["เลือกแมวของฉัน", "ตั้งเป้าหมายลูกแมว", "ผลการวิเคราะห์"];
const COAT = ["ขนสั้น", "ขนยาว", "ไม่มีขน"];
const EYE = ["ตาสีฟ้า", "ตาสีทอง", "ตาสีเขียว", "ตาสีน้ำตาล", "ตาสองสี"];
const EAR = ["หูตั้ง", "หูพับ"];

function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

/**
 * ตัววางแผนแมวที่ต้องการ (GOAL-01) — เลือกแมวต้นทาง + ตั้งเป้าหมาย แล้วบันทึกจริง
 * - แสดงเฉพาะแมวของผู้ใช้ให้เลือกเป็นต้นทาง (server ตรวจ ownership ซ้ำอีกชั้น)
 * - กู้ค่าที่เคยบันทึกจาก initialGoal
 * - "วิเคราะห์ผลลัพธ์" ยังถูกกั้นไว้จนกว่า engine ผ่านตรวจรับ (MVP-B) — ไม่แสดงเปอร์เซ็นต์
 */
export function DesiredPlanner({
  myCats,
  likedCats,
  initialGoal,
}: {
  myCats: CatView[];
  likedCats: CatView[];
  initialGoal: DesiredGoalData | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"goal" | "liked">("goal");

  const [source, setSource] = useState<string | null>(initialGoal?.sourceCatId ?? null);
  const [breed, setBreed] = useState(initialGoal?.targetBreed ?? "");
  const [eye, setEye] = useState(initialGoal?.targetEyeColor ?? "");
  const [coat, setCoat] = useState<string | null>(initialGoal?.targetCoat ?? null);
  const [color, setColor] = useState(initialGoal?.targetColor ?? "");
  const [ear, setEar] = useState(initialGoal?.targetEarType ?? "");

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [demo, setDemo] = useState(false);
  const [analyzing, startAnalyze] = useTransition();
  const [result, setResult] = useState<TargetSearchResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  function onAnalyze() {
    if (!source) return;
    setAnalyzeError(null);
    startAnalyze(async () => {
      const res = await analyzeTargetAction(
        source,
        { coat: coat ?? "", eye, ear },
        { demo },
      );
      if (res.ok) setResult(res.result);
      else {
        setResult(null);
        setAnalyzeError(res.error);
      }
    });
  }

  function onSave() {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    if (source) fd.set("sourceCatId", source);
    fd.set("targetBreed", breed);
    fd.set("targetEyeColor", eye);
    fd.set("targetCoat", coat ?? "");
    fd.set("targetColor", color);
    fd.set("targetEarType", ear);

    startTransition(async () => {
      const res = await saveDesiredGoalAction(fd);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

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
        likedCats.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {likedCats.map((cat, i) => (
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
              {myCats.map((cat, i) => (
                <SelectableCat
                  key={cat.id}
                  cat={cat}
                  seed={i}
                  selected={source === cat.id}
                  badge="✓"
                  onSelect={() => {
                    setSource((v) => (v === cat.id ? null : cat.id));
                    setSaved(false);
                    setResult(null);
                    setAnalyzeError(null);
                  }}
                />
              ))}
            </div>
            {myCats.length === 0 && (
              <p className="text-sm text-muted">ยังไม่มีแมวของฉัน — เพิ่มแมวก่อนตั้งเป้าหมาย</p>
            )}
          </div>

          {/* Step 2 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">2. ตั้งเป้าหมายลูกแมวที่ต้องการ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">สายพันธุ์</label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="ไม่จำกัด"
                  className={inputCls}
                />
              </div>
              <Dropdown label="สีตา" value={eye} onChange={setEye} options={EYE} placeholder="ไม่จำกัด" />
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-ink">สีของแมว</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="ไม่จำกัด เช่น ส้ม ขาว ดำ"
                  className={inputCls}
                />
              </div>
              <Dropdown label="หู" value={ear} onChange={setEar} options={EAR} placeholder="ไม่จำกัด" />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
              บันทึกเป้าหมายแล้ว
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => {
                setDemo(e.target.checked);
                setResult(null);
              }}
              className="h-4 w-4 rounded border-line accent-primary-600"
            />
            โหมดสาธิตคณิตศาสตร์ (ใช้ชุดกฎที่ยังไม่ผ่านการตรวจรับ — ไม่ใช่ผลจริง)
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSave}
              disabled={pending}
              className="flex-1 rounded-xl bg-primary-700 px-5 py-3 font-medium text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก…" : "บันทึกเป้าหมาย"}
            </button>
            <button
              type="button"
              disabled={source === null || analyzing}
              onClick={onAnalyze}
              className="flex-1 rounded-xl border border-primary-200 px-5 py-3 font-medium text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? "กำลังวิเคราะห์…" : "วิเคราะห์ผลลัพธ์"}
            </button>
          </div>

          {analyzeError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
              {analyzeError}
            </p>
          )}

          {result && <TargetResultView result={result} />}
        </div>
      )}
    </div>
  );
}
