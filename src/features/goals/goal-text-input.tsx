"use client";

import { useState, useTransition } from "react";
import type { GoalTextResult } from "@/domain/nlp/goal-parser";
import { SLOT_LABELS, type EntityKind, type GoalSlot } from "@/domain/nlp/lexicon";
import { parseGoalTextAction } from "@/server/nlp/goal-text-action";

export type GoalTextValues = Partial<Record<GoalSlot, string>>;

const EXAMPLES = [
  "อยากได้ลูกแมวสก็อตติชโฟลด์ขนยาวตาสีฟ้า แต่ไม่เอาหูพับ",
  "หาลูกแมวเปอร์เซีย ขนฟูๆ ตาสีทอง",
  "สายพันธุ์อะไรก็ได้ ขอแค่ขนสั้นและตาสองสี",
];

const ENTITY_STYLE: Record<EntityKind, string> = {
  breed: "border-primary-300 bg-primary-50 text-primary-800",
  coat: "border-amber-300 bg-amber-50 text-amber-800",
  eye: "border-sky-300 bg-sky-50 text-sky-800",
  ear: "border-emerald-300 bg-emerald-50 text-emerald-800",
  color: "border-line bg-surface text-muted",
};

const STATUS_TEXT: Record<string, string> = {
  set: "กรอกแล้ว",
  inferred: "อนุมาน",
  any: "ไม่จำกัด",
  conflict: "ต้องเลือกเอง",
  excluded: "ต้องเลือกเอง",
};

/**
 * ช่องพิมพ์ภาษาธรรมชาติ (NLP input) — แปลงข้อความไทยเป็นค่าในฟอร์มเป้าหมาย
 * แสดงขั้นตอน NLP ให้เห็น: ประโยค → คำ (POS) → entity → ค่าที่กรอก
 * ค่าที่ได้เป็นแค่การกรอกฟอร์มให้ ผู้ใช้ตรวจ/แก้แล้วกดวิเคราะห์เองตามเดิม
 */
export function GoalTextInput({
  onApply,
  parse = parseGoalTextAction,
}: {
  onApply: (values: GoalTextValues) => void;
  /** แทนที่ได้ในเทสต์/พรีวิว — ค่าเริ่มต้นคือ server action */
  parse?: typeof parseGoalTextAction;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<GoalTextResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  function onParse() {
    setError(null);
    startTransition(async () => {
      const res = await parse(text);
      if (!res.ok) {
        setResult(null);
        setError(res.error);
        return;
      }
      setResult(res.result);
      const values: GoalTextValues = {};
      for (const slot of Object.keys(res.result.slots) as GoalSlot[]) {
        const value = res.result.slots[slot].value;
        if (value !== null) values[slot] = value;
      }
      if (Object.keys(values).length) onApply(values);
    });
  }

  const applied = result
    ? (Object.entries(result.slots) as [GoalSlot, GoalTextResult["slots"][GoalSlot]][]).filter(
        ([, s]) => s.status !== "none",
      )
    : [];

  return (
    <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50/40 p-4" onChange={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="goal-text" className="text-sm font-medium text-ink">
          พิมพ์บอกลูกแมวที่อยากได้ (ภาษาไทย)
        </label>
        <span className="rounded-full border border-primary-200 px-2 py-0.5 text-[11px] text-primary-700">Thai NLP</span>
      </div>
      <textarea
        id="goal-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="เช่น อยากได้ลูกแมวเปอร์เซีย ขนยาว ตาสีฟ้า ไม่เอาหูพับ"
        className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-base outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setText(ex)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted transition hover:border-primary-300 hover:text-primary-700"
          >
            {ex}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onParse}
        disabled={pending || !text.trim()}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "กำลังวิเคราะห์ข้อความ…" : "แปลงข้อความเป็นเป้าหมาย"}
      </button>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section aria-label="ผลวิเคราะห์ข้อความ" className="space-y-3 border-t border-primary-100 pt-3">
          {applied.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {applied.map(([slot, s]) => (
                <li key={slot} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                  <span className="text-muted">{SLOT_LABELS[slot]}: </span>
                  <span className="font-medium text-ink">{s.value === "" ? "ไม่จำกัด" : (s.value ?? "—")}</span>
                  <span className="ml-2 text-xs text-primary-700">{STATUS_TEXT[s.status]}</span>
                  {s.note && <p className="mt-0.5 text-xs text-muted">{s.note}</p>}
                </li>
              ))}
            </ul>
          )}
          {result.warnings.map((w) => (
            <p key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {w}
            </p>
          ))}
          {result.ignored.length > 0 && (
            <p className="text-xs text-muted">ตรวจพบแต่หน้านี้ยังไม่ใช้: {result.ignored.join(", ")}</p>
          )}

          <button
            type="button"
            onClick={() => setShowTokens((v) => !v)}
            aria-expanded={showTokens}
            className="text-xs font-medium text-primary-700 underline-offset-2 hover:underline"
          >
            {showTokens ? "ซ่อนขั้นตอน NLP" : "ดูขั้นตอน NLP (ตัดคำ / POS / entity)"}
          </button>
          {showTokens && (
            <div className="space-y-2 text-xs">
              <p className="text-muted">
                เครื่องมือ:{" "}
                {result.engine === "pythainlp"
                  ? `PyThaiNLP ${result.engineVersion ?? ""} (newmm + custom dict, perceptron POS, crfcut)`
                  : "ตัวตัดคำในแอป (Intl.Segmenter + พจนานุกรมโดเมน, lexicon POS)"}
              </p>
              <p className="text-muted">ประโยค/วลี ({result.sentences.length}): {result.sentences.join(" | ")}</p>
              <ol className="flex flex-wrap gap-1.5" aria-label="คำที่ตัดได้">
                {result.tokens
                  .filter((t) => t.kind !== "space")
                  .map((t) => (
                    <li
                      key={`${t.start}-${t.text}`}
                      className={`rounded-md border px-1.5 py-0.5 ${
                        t.entity ? ENTITY_STYLE[t.entity] : "border-line bg-surface text-ink"
                      } ${t.negated ? "line-through" : ""}`}
                      title={t.entity ? `${t.entity}${t.negated ? " (ปฏิเสธ)" : ""}` : undefined}
                    >
                      {t.text}
                      <sub className="ml-0.5 text-[10px] opacity-60">{t.pos}</sub>
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
