import type { TraitCategory } from "@/lib/validation/common";
import type {
  PairAnalysisResult,
  TraitOutcomeStatus,
  TraitResult,
} from "@/domain/genetics/contracts/types";

/**
 * แสดงผลการวิเคราะห์คู่ (PAIR-01) ตามสถานะจริงรายลักษณะ
 * - computed → แสดงเปอร์เซ็นต์ (ผลรวม 100%)
 * - scenario_range → แสดงช่วง X–Y% (ไม่ใช่ค่าเดียว ไม่ใช่ CI)
 * - unsupported/insufficient_data/blocked → อธิบายเหตุผล ไม่เติมตัวเลข
 */

const CATEGORY_LABEL: Record<TraitCategory, string> = {
  coat_type: "ความยาวขน",
  coat_color: "สีขน",
  coat_pattern: "ลวดลายขน",
  eye_color: "สีตา",
  ear_type: "ลักษณะหู",
  temperament: "นิสัย",
};

const STATUS_META: Record<TraitOutcomeStatus, { label: string; cls: string }> = {
  computed: { label: "คำนวณแล้ว", cls: "bg-green-100 text-green-800" },
  estimated: { label: "ประมาณจาก prior", cls: "bg-blue-100 text-blue-800" },
  scenario_range: { label: "ช่วงที่เป็นไปได้", cls: "bg-blue-100 text-blue-800" },
  insufficient_data: { label: "ข้อมูลไม่พอ", cls: "bg-slate-100 text-slate-700" },
  unsupported: { label: "ยังไม่รองรับ", cls: "bg-slate-100 text-slate-700" },
  conflicting_evidence: { label: "หลักฐานขัดกัน", cls: "bg-red-100 text-red-800" },
  blocked: { label: "ระงับคำแนะนำ", cls: "bg-red-100 text-red-800" },
  budget_exceeded: { label: "เกิน budget", cls: "bg-amber-100 text-amber-900" },
};

const pct = (p: number) => `${(p * 100).toFixed(p * 100 < 10 ? 1 : 0)}%`;

function TraitCard({ trait }: { trait: TraitResult }) {
  const meta = STATUS_META[trait.status];
  const showBars = trait.status === "computed";
  const showRange = trait.status === "scenario_range";

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">
          {CATEGORY_LABEL[trait.category as TraitCategory] ?? trait.category}
        </h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      {showBars && (
        <ul className="space-y-2">
          {trait.distribution.map((d) => (
            <li key={d.outcomeCode} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-ink">{d.labelTh ?? d.outcomeCode}</span>
                <span className="font-medium text-ink">{pct(d.probability ?? 0)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-primary-50">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: `${(d.probability ?? 0) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {showRange && (
        <ul className="space-y-1.5 text-sm">
          {trait.distribution.map((d) => (
            <li key={d.outcomeCode} className="flex justify-between">
              <span className="text-ink">{d.labelTh ?? d.outcomeCode}</span>
              <span className="font-medium text-ink">
                {pct(d.lower ?? 0)} – {pct(d.upper ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {trait.assumptions.length > 0 && (
        <ul className="space-y-1 text-xs text-muted">
          {trait.assumptions.map((a, i) => (
            <li key={i}>• {a}</li>
          ))}
        </ul>
      )}

      {trait.references.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted">
          {trait.references.map((r, i) => (
            <li key={i} className="break-words">
              อ้างอิง: {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PairResultView({ result }: { result: PairAnalysisResult }) {
  return (
    <div className="space-y-4">
      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {result.warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.traits.map((t) => (
          <TraitCard key={t.category} trait={t} />
        ))}
      </div>

      <p className="text-xs text-muted">
        engine v{result.versions.engineVersion} · ruleset v{result.versions.rulesetVersion}
        {!result.coverage.complete &&
          ` · มีลักษณะที่ยังคำนวณไม่ได้ ${result.coverage.omitted.length} รายการ`}
      </p>
    </div>
  );
}
