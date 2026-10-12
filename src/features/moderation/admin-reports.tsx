"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CatThumb } from "@/components/ui/cat-thumb";
import {
  MODERATION_DECISION_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type ModerationDecision,
} from "@/lib/validation/moderation";
import { resolveReportAction } from "@/server/moderation/actions";
import type { ReportView } from "@/server/moderation/queries";

/** ป้ายสีของสถานะรายงาน */
const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  reviewing: "bg-sky-100 text-sky-700",
  actioned: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-600",
};

function ReportCard({ report }: { report: ReportView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hidden = report.cat?.moderationStatus === "hidden";

  function act(decision: ModerationDecision) {
    setError(null);
    startTransition(async () => {
      const res = await resolveReportAction({ reportId: report.id, decision });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const resolved = report.status === "actioned" || report.status === "dismissed";

  return (
    <article className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <CatThumb
          seed={0}
          src={report.cat?.photo}
          alt={report.cat ? `รูปแมว ${report.cat.name}` : "แมวถูกลบแล้ว"}
          className="h-16 w-16 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{report.cat?.name ?? "(แมวถูกลบแล้ว)"}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[report.status] ?? ""}`}
            >
              {REPORT_STATUS_LABELS[report.status] ?? report.status}
            </span>
            {hidden && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                ถูกซ่อนอยู่
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            เหตุผล: {REPORT_REASON_LABELS[report.reason] ?? report.reason}
            {report.cat?.breed ? ` · ${report.cat.breed}` : ""}
          </p>
          {report.detail && <p className="mt-1 text-sm text-ink">“{report.detail}”</p>}
          {report.resolution && (
            <p className="mt-1 text-xs text-muted">หมายเหตุผู้ดูแล: {report.resolution}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {report.cat && !hidden && (
          <button
            type="button"
            onClick={() => act("hide")}
            disabled={pending}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {MODERATION_DECISION_LABELS.hide}
          </button>
        )}
        {report.cat && hidden && (
          <button
            type="button"
            onClick={() => act("unhide")}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {MODERATION_DECISION_LABELS.unhide}
          </button>
        )}
        {!resolved && (
          <button
            type="button"
            onClick={() => act("dismiss")}
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-primary-50 disabled:opacity-60"
          >
            {MODERATION_DECISION_LABELS.dismiss}
          </button>
        )}
        {report.status === "open" && (
          <button
            type="button"
            onClick={() => act("reviewing")}
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-primary-50 disabled:opacity-60"
          >
            {MODERATION_DECISION_LABELS.reviewing}
          </button>
        )}
        {resolved && (
          <button
            type="button"
            onClick={() => act("reopen")}
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-primary-50 disabled:opacity-60"
          >
            {MODERATION_DECISION_LABELS.reopen}
          </button>
        )}
      </div>
    </article>
  );
}

export function AdminReports({ reports }: { reports: ReportView[] }) {
  if (reports.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
        ยังไม่มีรายงานเข้ามา
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} />
      ))}
    </div>
  );
}
