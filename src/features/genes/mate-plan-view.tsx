import Link from "next/link";
import type { MatePlan } from "@/domain/genes/plan";
import { rangeText } from "./gene-cross-result";

const SEX = { male: "เพศผู้", female: "เพศเมีย" };

/** ผลคำนวณ "ต้องหาแมวคู่แบบไหน" จากยีน + ปุ่มส่งสเปกไปค้นหาในหน้าหาคู่ */
export function MatePlanView({ plan }: { plan: MatePlan }) {
  const spec = [
    SEX[plan.mateSex],
    plan.mateSpec.breed,
    plan.mateSpec.coat,
    plan.mateSpec.ear,
    plan.mateSpec.color && `สี${plan.mateSpec.color}`,
    plan.mateSpec.pattern,
  ].filter(Boolean) as string[];
  const hidden = plan.groups.flatMap((g) => g.hidden);
  const impossible = plan.groups.filter((g) => g.impossible);

  return (
    <section aria-label="แมวคู่ที่ต้องหาจากยีน" className="space-y-4 rounded-2xl border border-primary-200 bg-surface p-5">
      <div>
        <p className="text-sm font-medium text-primary-700">🧬 คำนวณจากยีน</p>
        <h3 className="mt-1 text-lg font-semibold text-ink">ต้องหาแมวคู่แบบนี้</h3>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="สเปกแมวคู่">
        {spec.map((s) => (
          <li key={s} className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm text-primary-800">
            {s}
          </li>
        ))}
      </ul>

      {hidden.length > 0 && (
        <div className="rounded-xl border border-line bg-primary-50/40 p-3 text-sm">
          <p className="font-medium text-ink">ยีนที่ซ่อนอยู่ซึ่งควรมี (ดูจากหน้าตาไม่ออก)</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted">
            {hidden.map((h) => (
              <li key={h.locus}>
                <span className="font-mono font-semibold text-primary-700">{h.genotype}</span> — {h.meaning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-primary-50 p-4">
        <p className="text-sm text-muted">โอกาสได้ลูกตรงเป้าหมายครบทุกข้อ (ต่อลูก 1 ตัว)</p>
        <p className="text-2xl font-semibold text-primary-800">{rangeText(plan.total)}</p>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {plan.groups.map((g) => (
            <li key={g.key}>
              {g.label}: {g.target} → คู่ {g.matePhenotype} · โอกาส {rangeText(g.probability)}
            </li>
          ))}
        </ul>
      </div>

      {impossible.map((g) => (
        <p key={g.key} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {g.impossible}
        </p>
      ))}
      {plan.notes.map((n) => (
        <p key={n} className="text-xs text-muted">
          • {n}
        </p>
      ))}

      <Link
        href={plan.discoverHref}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 py-3 font-medium text-white transition hover:bg-primary-800"
      >
        🔍 ค้นหาแมวแบบนี้ในเว็บ
      </Link>
      <p className="text-[11px] text-muted">เป็นการจำลองยีนอย่างง่ายเพื่อการเรียนรู้ ไม่ใช่ผลตรวจ DNA</p>
    </section>
  );
}
