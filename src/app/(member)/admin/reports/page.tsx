import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AdminReports } from "@/features/moderation/admin-reports";
import { requireAdmin } from "@/server/auth/session";
import { getReportQueue } from "@/server/moderation/queries";

export const metadata: Metadata = { title: "ศูนย์ดูแลชุมชน" };

// รายงานเปลี่ยนบ่อย — ไม่ cache หน้านี้
export const dynamic = "force-dynamic";

/**
 * หน้าผู้ดูแล: คิวรายงาน listing ที่ไม่เหมาะสม (SAFE-01)
 * requireAdmin กันผู้ที่ไม่ใช่ admin (redirect /home) — RLS คุมข้อมูลอีกชั้น
 */
export default async function AdminReportsPage() {
  await requireAdmin();
  const queue = await getReportQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="ศูนย์ดูแลชุมชน"
        subtitle={
          queue.available
            ? `มีรายงานรอตรวจ ${queue.openCount} รายการ`
            : "ยังไม่ได้ติดตั้งฐานข้อมูลการรายงาน (apply migration 0008)"
        }
      />
      {queue.available ? (
        <AdminReports reports={queue.reports} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
          ระบบรายงานจะพร้อมใช้งานหลัง apply migration <code>0008_moderation.sql</code>
        </p>
      )}
    </div>
  );
}
