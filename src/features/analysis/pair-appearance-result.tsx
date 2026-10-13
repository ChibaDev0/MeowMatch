import Link from "next/link";
import { PAIR_TRAITS, type PairAppearanceResult } from "@/domain/demo/pair-appearance";

const sexLabel = { female: "เพศเมีย", male: "เพศผู้", unknown: "ยังไม่ระบุเพศ" };
const percent = (p: number) => `${Math.round(p * 100)}%`;

export function PairAppearanceResultView({ result }: { result: PairAppearanceResult }) {
  return (
    <section aria-label="ความเป็นไปได้ของลูกแมว" className="space-y-5" aria-live="polite">
      <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5">
        <p className="text-sm font-medium text-primary-700">ผลวิเคราะห์จากแมวที่คุณเลือก</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">ลูกแมวของ {result.parents[0].name} × {result.parents[1].name} อาจเป็นแบบไหน?</h2>
        <p className="mt-2 text-sm text-muted">ประเมินจากลักษณะที่บันทึกไว้ ลูกแต่ละตัวอาจต่างกัน รายการนี้ไม่ครอบคลุมทุกลักษณะที่อาจเกิดขึ้น</p>
        <p className="mt-2 text-xs text-primary-700">{result.source === "gemini" ? "อธิบายความเป็นไปได้โดย Gemini · ความยาวขนคำนวณด้วยแบบจำลอง" : "แสดงข้อมูลและแบบจำลองพื้นฐาน · คำอธิบาย AI ยังไม่พร้อม"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.parents.map((parent, i) => (
          <div key={parent.id} className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-xs text-muted">แมวตัวที่ {i + 1} · {sexLabel[parent.sex]}</p>
            <h3 className="mt-1 font-semibold text-ink">{parent.name} <span className="font-normal text-muted">· {parent.breed || "ยังไม่ระบุสายพันธุ์"}</span></h3>
            <dl className="mt-3 space-y-1.5 text-sm">
              {PAIR_TRAITS.map(({ key, label }) => <div key={key} className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="text-right text-ink">{parent[key] || "ยังไม่ระบุ"}</dd></div>)}
            </dl>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{result.warnings.map((w) => <p key={w}>{w}</p>)}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.traits.map((trait) => (
          <article key={trait.key} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-ink">{trait.label}ของลูก</h3>
              {trait.status !== "ai" && (
                <span className={`rounded-full px-2.5 py-1 text-xs ${trait.status === "missing" || trait.status === "unavailable" ? "bg-slate-100 text-slate-600" : "bg-primary-50 text-primary-700"}`}>
                  {trait.status === "missing" ? "ข้อมูลยังไม่ครบ" : trait.status === "unavailable" ? "ยังประเมินไม่ได้" : trait.status === "model" ? "โอกาสตามแบบจำลอง" : "แนวทางตามข้อมูลพ่อแม่"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">จาก {trait.parents[0] || "ไม่ระบุ"} × {trait.parents[1] || "ไม่ระบุ"}</p>
            <p className="text-sm leading-relaxed text-ink">{trait.description}</p>
            {trait.possibilities.length > 0 && <ul className="space-y-2">
              {trait.possibilities.map((p, i) => (
                <li key={i} className="rounded-xl bg-primary-50/60 p-3">
                  <div className="flex justify-between gap-2 text-sm font-medium text-ink"><span>{p.label}</span>
                    {p.lower !== undefined && p.upper !== undefined && <span className="whitespace-nowrap text-primary-700">{p.lower === p.upper ? percent(p.upper) : `${percent(p.lower)}–${percent(p.upper)}`}</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{p.condition}</p>
                </li>
              ))}
            </ul>}
            {trait.status === "missing" && <Link href="/my-cats" className="inline-block text-sm font-medium text-primary-700 underline">เพิ่มข้อมูลแมวของฉัน</Link>}
          </article>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted">เปอร์เซ็นต์ที่แสดงใช้เฉพาะแบบจำลองความยาวขน ไม่ใช่ผลรับรองของลูกจริง ส่วนคำอธิบาย AI เป็นข้อเสนอความเป็นไปได้และอาจคลาดเคลื่อนได้</p>
    </section>
  );
}
