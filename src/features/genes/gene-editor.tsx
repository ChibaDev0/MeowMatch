"use client";

import {
  LOCI,
  defaultOptions,
  describeGenotype,
  formatGenotype,
  possibleFromAppearance,
  type Appearance,
  type Code,
  type GeneMap,
  type LocusId,
} from "@/domain/genes/model";

/**
 * ส่วน "ยีนจำลอง" ในฟอร์มแมว
 * ระบบเดายีนจากหน้าตาให้ก่อน — ผู้ใช้เลือกเพิ่มเฉพาะยีนที่ "ซ่อนอยู่" ถ้ารู้ (เช่น เคยมีลูกขนยาว)
 */
export function GeneEditor({
  appearance,
  genes,
  onChange,
  error,
}: {
  appearance: Appearance;
  genes: GeneMap;
  onChange: (genes: GeneMap) => void;
  error?: string;
}) {
  const known = LOCI.filter((l) => possibleFromAppearance(l.id, appearance).length === 1).length;
  const chosen = Object.keys(genes).length;

  function set(locus: LocusId, code: Code | "") {
    const next = { ...genes };
    if (code) next[locus] = code;
    else delete next[locus];
    onChange(next);
  }

  return (
    <details className="group rounded-xl border border-primary-100 bg-primary-50/40 p-4" open={chosen > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span>
          <span className="text-sm font-semibold text-ink">🧬 ยีนจำลอง</span>
          <span className="ml-2 text-xs text-muted">ไม่บังคับ · รู้จากหน้าตา {known} ยีน · ระบุเพิ่ม {chosen} ยีน</span>
        </span>
        <span className="text-xs text-primary-700 group-open:hidden">เปิดดู</span>
        <span className="hidden text-xs text-primary-700 group-open:inline">ซ่อน</span>
      </summary>

      <div className="mt-3 space-y-3">
        <p className="rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
          ยีนเหมือน <b className="text-ink">สูตรลับ 2 ชิ้น</b> ได้จากพ่อ 1 แม่ 1 · ตัวใหญ่ = ยีนเด่น (มีชิ้นเดียวก็แสดง) ·
          ตัวเล็ก = ยีนด้อย (ต้องมีครบ 2 ชิ้น) · ระบบเดาจากหน้าตาให้แล้ว เลือกเพิ่มเฉพาะยีนที่ <b className="text-ink">ซ่อนอยู่</b>{" "}
          ถ้ารู้ เช่น แมวขนสั้นที่เคยมีลูกขนยาว = ซ่อนยีนขนยาว (Ll) · นี่คือการจำลอง ไม่ใช่ผลตรวจ DNA
        </p>

        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {LOCI.map((locus) => {
            const possible = possibleFromAppearance(locus.id, appearance);
            const defaults = defaultOptions(locus.id, appearance);
            const value = genes[locus.id] && possible.includes(genes[locus.id]!) ? genes[locus.id]! : "";
            return (
              <li key={locus.id} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {locus.name}{" "}
                    <span className="rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[11px] text-primary-700">
                      {locus.big} / {locus.small}
                    </span>
                  </p>
                  <p className="text-[11px] leading-snug text-muted">{locus.note}</p>
                </div>
                {possible.length === 0 ? (
                  <p className="text-xs text-muted">ระบุเพศก่อน (ยีนนี้อยู่บนโครโมโซม X)</p>
                ) : possible.length === 1 ? (
                  <p className="text-xs text-ink">
                    <span className="font-mono font-semibold text-primary-700">{formatGenotype(locus.id, possible[0]!)}</span>{" "}
                    — {describeGenotype(locus.id, possible[0]!)}{" "}
                    <span className="text-muted">(รู้จากหน้าตา)</span>
                  </p>
                ) : (
                  <select
                    aria-label={locus.name}
                    value={value}
                    onChange={(e) => set(locus.id, e.target.value as Code | "")}
                    className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-base text-ink outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:text-sm"
                  >
                    <option value="">
                      {defaults.length === 1
                        ? `ไม่ทราบ — สมมติ ${formatGenotype(locus.id, defaults[0]!)} (ยีนหายาก)`
                        : `ไม่ทราบ — คิดทุกแบบ (${possible.map((c) => formatGenotype(locus.id, c)).join(" หรือ ")})`}
                    </option>
                    {possible.map((c) => (
                      <option key={c} value={c}>
                        {formatGenotype(locus.id, c)} — {describeGenotype(locus.id, c)}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    </details>
  );
}
