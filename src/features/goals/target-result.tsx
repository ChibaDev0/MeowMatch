import type {
  RankedCandidate,
  TargetSearchResult,
  TraitOutcomeStatus,
} from "@/domain/genetics/contracts/types";

/**
 * แสดงผลการค้นหาคู่ตามเป้าหมาย (TARGET-01) — จัดอันดับแบบแยกกลุ่มที่อธิบายได้
 * - computed → แสดง % ลูกตรงเป้าหมายทั้งหมด
 * - scenario_range → แสดงช่วง (ไม่ใช่ค่าเดียว)
 * - unsupported → ยังคำนวณครบเป้าหมายไม่ได้ (บอกเหตุผล ไม่เติมตัวเลข)
 */

const STATUS_META: Record<TraitOutcomeStatus, { label: string; cls: string }> = {
  computed: { label: "คำนวณแล้ว", cls: "bg-green-100 text-green-800" },
  estimated: { label: "ประมาณจาก prior", cls: "bg-blue-100 text-blue-800" },
  scenario_range: { label: "ช่วงที่เป็นไปได้", cls: "bg-blue-100 text-blue-800" },
  insufficient_data: { label: "ข้อมูลไม่พอ", cls: "bg-slate-100 text-slate-700" },
  unsupported: { label: "ยังคำนวณครบไม่ได้", cls: "bg-slate-100 text-slate-700" },
  conflicting_evidence: { label: "หลักฐานขัดกัน", cls: "bg-red-100 text-red-800" },
  blocked: { label: "ระงับ (สวัสดิภาพ)", cls: "bg-red-100 text-red-800" },
  budget_exceeded: { label: "เกิน budget", cls: "bg-amber-100 text-amber-900" },
};

const pct = (p: number) => `${(p * 100).toFixed(p * 100 < 10 ? 1 : 0)}%`;

function scoreText(c: RankedCandidate): string {
  if (c.status === "computed" && c.targetProbability != null) return pct(c.targetProbability);
  if (c.status === "scenario_range") return `${pct(c.lower ?? 0)} – ${pct(c.upper ?? 0)}`;
  return "—";
}

function CandidateRow({ cand, rank }: { cand: RankedCandidate; rank: number }) {
  const meta = STATUS_META[cand.status];
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
          {rank}
        </span>
        <div className="space-y-1">
          <p className="font-medium text-ink">{cand.candidateName}</p>
          <div className="flex flex-wrap gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
              {meta.label}
            </span>
            {cand.sexCompatibility === "unknown" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                เพศยังไม่ยืนยัน
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-ink">{scoreText(cand)}</p>
        <p className="text-xs text-muted">ข้อมูลครบ {pct(cand.completeness)}</p>
      </div>
    </li>
  );
}

export function TargetResultView({ result }: { result: TargetSearchResult }) {
  return (
    <div className="space-y-4">
      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {result.warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}

      {result.candidates.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          ไม่พบคู่ที่ประเมินได้ในแมวที่กดใจไว้ (ประเมิน {result.evaluatedCount} ตัว) — ลองกดใจแมวเพิ่ม
          หรือปรับเป้าหมาย ไม่ได้แปลว่าเป็นไปไม่ได้ทางชีววิทยา
        </p>
      ) : (
        <ol className="space-y-2">
          {result.candidates.map((c, i) => (
            <CandidateRow key={c.candidateCatId} cand={c} rank={i + 1} />
          ))}
        </ol>
      )}

      <p className="text-xs text-muted">
        ประเมิน {result.evaluatedCount} ตัว · ผ่านเงื่อนไข {result.eligibleCount} ตัว
        {result.coverage.omitted.length > 0 &&
          ` · ตัดด้วยเงื่อนไข ${result.coverage.omitted.length} ตัว`}{" "}
        · อันดับนี้หมายถึงเฉพาะรายการที่ประเมินแล้ว · engine v{result.versions.engineVersion}
      </p>
    </div>
  );
}
