import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { DesiredPlanner } from "@/features/goals/desired-planner";

export const metadata: Metadata = { title: "แมวที่ต้องการ" };

export default function DesiredCatsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="แมวที่ต้องการ"
        subtitle="เลือกแมวของคุณ และตั้งเป้าหมายลูกแมวที่ต้องการ หรือดูแมวที่กดใจไว้"
      />
      <DesiredPlanner />
    </div>
  );
}
