import type { PairGeneResult, Range } from "@/domain/genes/cross";

const pct = (p: number) => `${Math.round(p * 100)}%`;
export const rangeText = (r: Range) => (Math.abs(r.upper - r.lower) < 1e-9 ? pct(r.upper) : `${pct(r.lower)}–${pct(r.upper)}`);
const sexLabel = { female: "เพศเมีย (แม่)", male: "เพศผู้ (พ่อ)", unknown: "ไม่ระบุเพศ" };

function Bar({ range }: { range: Range }) {
  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-primary-100" aria-hidden>
      <div className="absolute inset-y-0 left-0 bg-primary-300" style={{ width: `${range.upper * 100}%` }} />
      <div className="absolute inset-y-0 left-0 bg-primary-600" style={{ width: `${range.lower * 100}%` }} />
    </div>
  );
}

/** ผลจำลองยีน: ยีนพ่อแม่ → ตาราง Punnett → โอกาสลักษณะลูก */
export function GeneCrossResultView({ result }: { result: PairGeneResult }) {
  return (
    <section aria-label="ผลจำลองยีน" className="space-y-5">
      <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5">
        <p className="text-sm font-medium text-primary-700">🧬 จำลองยีน (ตาราง Punnett)</p>
        <h2 className="mt-1 text-xl font-semibold text-ink">
          ลูกของ {result.parents[0].name} × {result.parents[1].name}
        </h2>
        <p className="mt-2 text-sm text-muted">
          ลูกได้ยีนจากแม่ 1 ชิ้น และพ่อ 1 ชิ้น ในแต่ละลักษณะ · ถ้ายังไม่รู้ว่าพ่อแม่ซ่อนยีนไหม จะแสดงเป็นช่วง
          (แถบเข้ม = ขั้นต่ำ, แถบอ่อน = สูงสุด)
        </p>
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {result.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.parents.map((p) => (
          <div key={p.name + p.sex} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">{sexLabel[p.sex]}</p>
            <h3 className="font-semibold text-ink">ยีนของ {p.name}</h3>
            <dl className="mt-2 space-y-1 text-xs">
              {p.loci.map((l) => (
                <div key={l.locus} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">{l.name}</dt>
                  <dd className="text-right text-ink">
                    <span className="font-mono font-semibold text-primary-700">{l.options.join(" / ")}</span>{" "}
                    <span className="text-muted">{l.chosen ? "· เจ้าของระบุ" : ""}</span>
                    <span className="block text-[11px] text-muted">{l.meaning}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.traits.map((t) => (
          <article key={t.key} className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-ink">{t.label}ของลูก</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs ${t.exact ? "bg-emerald-50 text-emerald-700" : "bg-primary-50 text-primary-700"}`}>
                {t.exact ? "รู้ยีนครบ" : "ช่วงโอกาส"}
              </span>
            </div>
            {t.outcomes.length === 0 && t.note && <p className="text-sm text-muted">{t.note}</p>}
            <ul className="space-y-2.5">
              {t.outcomes.map((o) => (
                <li key={o.label} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium text-ink">{o.label}</span>
                    <span className="whitespace-nowrap text-primary-700">{rangeText(o.all)}</span>
                  </div>
                  <Bar range={o.all} />
                  {o.male && o.female && (
                    <p className="text-[11px] text-muted">
                      ลูกตัวผู้ {rangeText(o.male)} · ลูกตัวเมีย {rangeText(o.female)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {t.outcomes.length > 0 && t.note && <p className="text-xs text-muted">{t.note}</p>}
          </article>
        ))}
      </div>

      {result.squares.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-ink">ตาราง Punnett (ยีนที่รู้แน่นอน)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {result.squares.map((sq) => (
              <figure key={sq.locus} className="overflow-x-auto rounded-2xl border border-line bg-surface p-4">
                <figcaption className="mb-2 text-sm font-medium text-ink">{sq.name}</figcaption>
                <table className="w-full border-collapse text-center text-xs">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-left font-normal text-muted">
                        แม่ ↓ · พ่อ →
                      </th>
                      {sq.cols.map((c, i) => (
                        <th key={i} className="border border-line bg-primary-50 p-1.5 font-mono text-primary-700">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sq.rows.map((r, i) => (
                      <tr key={i}>
                        <th className="border border-line bg-primary-50 p-1.5 font-mono text-primary-700">{r}</th>
                        {sq.cells[i]!.map((cell, j) => (
                          <td key={j} className="border border-line p-1.5">
                            <span className="block font-mono font-semibold text-ink">{cell.genotype}</span>
                            <span className="block text-[10px] leading-tight text-muted">{cell.meaning}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-muted">
                  แม่ {sq.motherLabel} · พ่อ {sq.fatherLabel} · แต่ละช่อง = โอกาส {pct(1 / (sq.rows.length * sq.cols.length))}
                </p>
              </figure>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted">
        เป็นการจำลองด้วยยีน 8 ตัวแบบง่าย เพื่อการเรียนรู้ ไม่ใช่ผลตรวจ DNA และไม่รวมยีนอื่นอีกมากที่มีผลจริง
      </p>
    </section>
  );
}
