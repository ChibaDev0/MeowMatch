import type { MatePartnerOption, MateSpecResult } from "@/domain/genetics/ranking/mate-spec";

/**
 * แสดง "สเปกแมวคู่ผสมที่ต้องใช้" + แผนผสม (ต่อยอดจากหน้าแมวที่ต้องการ)
 * - บอกว่าต้องใช้คู่ที่มีชุดยีน/ลักษณะแบบไหนถึงจะได้ลูกตามเป้า
 * - ถ้าผสมครั้งเดียวไม่พอ แสดงแผนหลายรุ่นแบบ exact
 * - unsupported/insufficient → บอกเหตุผล ไม่เติมตัวเลข
 */

const pct = (p: number) => `${(p * 100).toFixed(p * 100 < 10 && p > 0 ? 1 : 0)}%`;

function probText(o: MatePartnerOption): string {
  if (o.probability != null) return `${pct(o.probability)} ต่อครอก`;
  if (o.lower != null && o.upper != null) return `${pct(o.lower)} – ${pct(o.upper)} ต่อครอก`;
  return "—";
}

function PartnerCard({ o, tone }: { o: MatePartnerOption; tone: "good" | "maybe" | "no" }) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "maybe"
        ? "border-amber-200 bg-amber-50/60"
        : "border-line bg-surface opacity-80";
  return (
    <li className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-ink">
            ลักษณะ{o.phenotypeLabel}{" "}
            <span className="text-xs font-normal text-muted">(ชุดยีน {o.genotypeKey})</span>
          </p>
          {o.genotypeNeedsDnaConfirmation && (
            <p className="mt-0.5 text-xs text-amber-800">
              ⚠️ ลักษณะภายนอกเหมือนตัวอื่น (พาหะ) — ต้องยืนยันชุดยีนด้วยผล DNA
            </p>
          )}
        </div>
        <p className="shrink-0 text-right text-lg font-semibold text-ink">{probText(o)}</p>
      </div>
      {o.littersFor && o.probability != null && o.probability > 0 && o.probability < 1 && (
        <p className="mt-2 text-xs text-muted">
          ถ้าผสมหลายครอก:{" "}
          {o.littersFor
            .map((t) =>
              t.litters != null ? `~${t.litters} ครอกเพื่อโอกาส ${pct(t.threshold)}` : null,
            )
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </li>
  );
}

export function MateSpecView({ spec }: { spec: MateSpecResult }) {
  if (spec.status === "unsupported" || spec.status === "insufficient_data") {
    return (
      <section className="space-y-2 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-semibold text-ink">สเปกแมวคู่ผสมที่ต้องใช้</h3>
        <p className="rounded-xl border border-line bg-primary-50/40 p-4 text-sm text-muted">
          {spec.status === "unsupported"
            ? "ยังระบุสเปกคู่ผสมสำหรับเป้าหมายนี้ไม่ได้ — หมวดนี้ยังไม่มีชุดกฎที่ผ่านการตรวจรับ (รอ RES-01)"
            : "ข้อมูลลักษณะของแมวตั้งต้นยังไม่พอจะคำนวณ — กรอกลักษณะที่ชัดเจน หรือเพิ่มผล DNA"}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <div>
        <h3 className="font-semibold text-ink">
          สเปกแมวคู่ผสมที่ต้องใช้ — เป้าหมายลูก{spec.targetLabel}
        </h3>
        <p className="text-sm text-muted">
          แมวตั้งต้นชุดยีน {spec.sourceScenario.join(" หรือ ")}
          {spec.sourceGenotypeConfirmed ? " (ยืนยันด้วย DNA)" : " (ประเมินจากลักษณะภายนอก)"}
        </p>
      </div>

      {spec.guaranteed.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-emerald-800">
            ✅ ผสมครั้งเดียวได้ลูกตรงเป้า 100% — ใช้คู่แบบนี้
          </h4>
          <ul className="space-y-2">
            {spec.guaranteed.map((o) => (
              <PartnerCard key={o.genotypeKey} o={o} tone="good" />
            ))}
          </ul>
        </div>
      )}

      {spec.possible.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-900">
            ◐ มีโอกาส แต่ไม่การันตี — อาจต้องหลายครอกหรือหลายรุ่น
          </h4>
          <ul className="space-y-2">
            {spec.possible.map((o) => (
              <PartnerCard key={o.genotypeKey} o={o} tone="maybe" />
            ))}
          </ul>
        </div>
      )}

      {spec.plan.length > 0 && (
        <div className="space-y-2 rounded-xl border border-primary-100 bg-primary-50/40 p-4">
          <h4 className="text-sm font-semibold text-primary-800">แผนการผสม</h4>
          <ol className="space-y-2">
            {spec.plan.map((step) => (
              <li key={step.generation} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white">
                  {step.generation}
                </span>
                <div className="text-sm">
                  <p className="font-medium text-ink">{step.cross}</p>
                  <p className="text-muted">{step.expectation}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {spec.impossible.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">
            คู่ที่ไม่ควรใช้ (โอกาสเป็นศูนย์) — {spec.impossible.length} แบบ
          </summary>
          <ul className="mt-2 space-y-2">
            {spec.impossible.map((o) => (
              <PartnerCard key={o.genotypeKey} o={o} tone="no" />
            ))}
          </ul>
        </details>
      )}

      {spec.warnings.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {spec.warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}

      <div className="space-y-1 border-t border-line pt-3 text-xs text-muted">
        {spec.ruleset.references.length > 0 && (
          <p>อ้างอิง: {spec.ruleset.references.join(" · ")}</p>
        )}
        <p>
          โมเดล {spec.ruleset.id} v{spec.ruleset.version}
          {!spec.ruleset.verified && " (โหมดสาธิต ยังไม่ผ่านตรวจรับ)"} · engine v
          {spec.versions.engineVersion}
        </p>
      </div>
    </section>
  );
}
