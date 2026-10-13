import type { AppearanceResult } from "@/domain/demo/appearance";
import { basicSelectionGuide } from "@/domain/demo/selection-guide";

export function AppearanceResultView({ result }: { result: AppearanceResult }) {
  return (
    <section
      className="space-y-4 rounded-2xl border border-primary-100 bg-primary-50/40 p-5"
      aria-label="ผลประเมินเบื้องต้น"
    >
      <div>
        <h3 className="font-semibold text-ink">แมวคู่ที่ควรหา</h3>
        <p className="mt-1 text-sm text-primary-700">โอกาสตรงเป้าหมาย: {result.level}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["breed", "สายพันธุ์"],
            ["eye", "สีตา"],
            ["coat", "ขน"],
            ["ear", "หู"],
          ] as const
        ).map(([key, label]) => {
          const trait = result.traits.find((item) => item.key === key);
          const selection = trait ? (trait.selection ?? basicSelectionGuide(trait)) : undefined;
          return (
            <div key={key} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 font-semibold text-ink">{trait?.partner ?? "ไม่จำกัด"}</p>
              {trait && (
                <>
                  <p className="mt-2 text-sm text-primary-700">
                    โอกาส{trait.level === "ข้อมูลไม่พอ" ? ": ข้อมูลไม่พอ" : trait.level}
                  </p>
                  <p className="mt-1 text-xs text-muted">{trait.reason}</p>
                  {selection && (
                    <div className="mt-4 space-y-2 border-t border-line pt-3 text-sm text-ink">
                      <h4 className="font-medium">ลักษณะที่ควรเลือก</h4>
                      <p className="leading-relaxed">{selection.description}</p>
                      <h4 className="pt-1 font-medium">จุดที่ควรสังเกต</h4>
                      <ul className="list-disc space-y-1 pl-4 text-muted">
                        {selection.checks.map((check, index) => (
                          <li key={index}>{check}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              {!trait && (
                <p className="mt-2 text-sm text-muted">
                  เลือกได้ตามความชอบ หากต้องการคำแนะนำเฉพาะ ให้ตั้งเป้าหมาย{label}ก่อน
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">{result.note}</p>
      <p className="text-xs text-muted">
        {result.guidanceSource === "gemini"
          ? "คำอธิบายเพิ่มเติมโดย Gemini Flash"
          : "แสดงคำแนะนำพื้นฐาน"}
      </p>
    </section>
  );
}
