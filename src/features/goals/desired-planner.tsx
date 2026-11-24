"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SelectableCat } from "@/components/ui/selectable-cat";
import { DiscoverCard } from "@/features/discovery/discover-card";
import type { CatView } from "@/features/cats/types";
import type { DesiredGoalData } from "@/features/goals/types";
import type { AppearanceResult } from "@/domain/demo/appearance";
import { saveDesiredGoalAction } from "@/server/goals/actions";
import { analyzeAppearanceAction } from "@/server/analysis/appearance-action";
import { AppearanceResultView } from "./appearance-result";
import { GoalTextInput, type GoalTextValues } from "./goal-text-input";
import { COLOR_LABELS } from "@/domain/genes/model";
import type { MatePlan } from "@/domain/genes/plan";
import { planMateGenesAction } from "@/server/genes/actions";
import { MatePlanView } from "@/features/genes/mate-plan-view";

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
 * ตัววางแผนแมวที่ต้องการ (GOAL-01) — เลือกแมวของฉัน + ตั้งเป้าหมายลูกแมว แล้วบันทึก
 * - แสดงเฉพาะแมวของผู้ใช้ให้เลือกเป็นต้นทาง (server ตรวจ ownership ซ้ำอีกชั้น)
 * - แมวต้นทางใช้ข้อมูลที่บันทึกไว้ของแมวตัวนั้น ผู้ใช้กรอกเฉพาะลักษณะลูกที่ต้องการ
 * - กู้ค่าที่เคยบันทึกจาก initialGoal และแนะนำสเปกคู่จากความคล้ายของลักษณะภายนอก
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
  const [ear, setEar] = useState(initialGoal?.targetEarType ?? "");
  const [color, setColor] = useState(initialGoal?.targetColor ?? "");
  const [plan, setPlan] = useState<MatePlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revision = useRef(0);
  const [analyzing, startAnalyze] = useTransition();
  const [result, setResult] = useState<AppearanceResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  function onAnalyze() {
    if (!source) return;
    setAnalyzeError(null);
    setPlanError(null);
    const currentRevision = revision.current;
    setResult(null);
    setPlan(null);
    const hasAppearanceGoal = [breed, eye, coat ?? "", ear].some(Boolean);
    startAnalyze(async () => {
      const [res, genes] = await Promise.all([
        hasAppearanceGoal ? analyzeAppearanceAction(source, { breed, eye, coat: coat ?? "", ear }) : null,
        planMateGenesAction(source, { breed, eye, coat: coat ?? "", ear, color }),
      ]);
      if (currentRevision !== revision.current) return;
      if (genes.ok) setPlan(genes.result);
      else setPlanError(genes.error);
      if (res?.ok) {
        setResult(res.result);
      } else {
        setResult(null);
        if (res) setAnalyzeError(res.error);
      }
    });
  }

  function clearResult() {
    revision.current++;
    setResult(null);
    setAnalyzeError(null);
    setPlan(null);
    setPlanError(null);
    setSaved(false);
  }

  /** ค่าจากช่องพิมพ์ภาษาไทย (NLP) — กรอกเฉพาะช่องที่ตรวจพบ ช่องอื่นคงค่าเดิม */
  function applyGoalText(values: GoalTextValues) {
    clearResult();
    if (values.breed !== undefined) setBreed(values.breed);
    if (values.coat !== undefined) setCoat(values.coat || null);
    if (values.eye !== undefined) setEye(values.eye);
    if (values.ear !== undefined) setEar(values.ear);
    if (values.color !== undefined) setColor(values.color);
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
                    clearResult();
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

          {source && (
            <p className="rounded-lg bg-primary-50/60 px-3 py-2 text-xs text-muted">
              ใช้ข้อมูลลักษณะของแมวที่คุณเลือก (สายพันธุ์ ขน สีตา และหู) เป็นแมวต้นทางโดยอัตโนมัติ
            </p>
          )}

          {/* Step 2 */}
          <div className="space-y-4" onChange={clearResult}>
            <h2 className="font-semibold text-ink">2. ตั้งเป้าหมายลูกแมวที่ต้องการ</h2>
            <GoalTextInput onApply={applyGoalText} />
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
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-ink">ลักษณะขน</span>
              <div className="flex flex-wrap gap-2">
                {COAT.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      clearResult();
                      setCoat((v) => (v === c ? null : c));
                    }}
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
              <Dropdown
                label="สีตา"
                value={eye}
                onChange={setEye}
                options={EYE}
                placeholder="ไม่จำกัด"
              />
              <Dropdown
                label="หู"
                value={ear}
                onChange={setEar}
                options={EAR}
                placeholder="ไม่จำกัด"
              />
              <Dropdown
                label="สีขน (คำนวณจากยีน)"
                value={color}
                onChange={setColor}
                options={[...COLOR_LABELS]}
                placeholder="ไม่จำกัด"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
          {saved && !error && (
            <p
              className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              role="status"
            >
              บันทึกเป้าหมายแล้ว
            </p>
          )}

          <p className="text-xs text-muted">
            คำนวณ 2 แบบ: ยีนจำลอง (ขน หู สีขน ตาสีฟ้า → บอกแมวคู่ที่ต้องหาและโอกาส) และความคล้ายของลักษณะภายนอก
          </p>

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

          {planError && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              คำนวณจากยีนไม่ได้: {planError}
            </p>
          )}
          {plan && <MatePlanView plan={plan} />}
          {result && <AppearanceResultView result={result} />}
        </div>
      )}
    </div>
  );
}
