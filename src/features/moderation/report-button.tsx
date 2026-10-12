"use client";

import { useState, useTransition } from "react";
import { FlagIcon } from "@/components/ui/icons";
import { REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/validation/moderation";
import { reportCatAction } from "@/server/moderation/actions";

/**
 * ปุ่ม "รายงาน" บนการ์ดแมวในหน้าหาคู่ (SAFE-01)
 * เปิด modal เลือกเหตุผล + รายละเอียด แล้วส่ง reportCatAction
 * แสดงเฉพาะแมวที่ไม่ใช่ของตัวเอง (หน้าหาคู่กันแมวตัวเองออกอยู่แล้ว)
 */
export function ReportButton({ catId, catName }: { catId: string; catName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setReason("");
    setDetail("");
    setError(null);
    setDone(false);
  }

  function onSubmit() {
    setError(null);
    if (!reason) {
      setError("เลือกเหตุผลการรายงาน");
      return;
    }
    startTransition(async () => {
      const res = await reportCatAction({ catId, reason, detail });
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        aria-label={`รายงาน ${catName}`}
        className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-muted shadow transition hover:scale-105 hover:text-rose-600"
      >
        <FlagIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`รายงานแมว ${catName}`}
        >
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl">
            {done ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-ink">ส่งรายงานแล้ว</h2>
                  <p className="text-sm text-muted">
                    ขอบคุณที่ช่วยดูแลชุมชน ผู้ดูแลจะตรวจสอบรายงานนี้
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-primary-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-800"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-ink">รายงาน “{catName}”</h2>
                  <p className="text-sm text-muted">
                    ช่วยบอกเหตุผลเพื่อให้ผู้ดูแลตรวจสอบได้ตรงประเด็น
                  </p>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-ink">เหตุผล</legend>
                  {REPORT_REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="h-4 w-4 accent-primary-700"
                      />
                      {REPORT_REASON_LABELS[r]}
                    </label>
                  ))}
                </fieldset>

                <div className="space-y-1">
                  <label htmlFor="report-detail" className="text-sm font-medium text-ink">
                    รายละเอียดเพิ่มเติม (ไม่บังคับ)
                  </label>
                  <textarea
                    id="report-detail"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="w-full rounded-xl border border-line bg-page px-3 py-2 text-sm text-ink outline-none focus:border-primary-400"
                    placeholder="เช่น ข้อมูลไม่ตรงกับความจริง หรือเนื้อหาไม่เหมาะสมตรงไหน"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-primary-50 disabled:opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={pending}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "กำลังส่ง…" : "ส่งรายงาน"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
