import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { DesiredPlanner } from "@/features/goals/desired-planner";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import { getDesiredGoal } from "@/server/goals/queries";

export const metadata: Metadata = { title: "แมวที่ต้องการ" };

export default async function DesiredCatsPage() {
  const [myCats, likedCats, goal] = await Promise.all([getMyCats(), getLikedCats(), getDesiredGoal()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="แมวที่ต้องการ"
        subtitle="เลือกแมวของคุณ และตั้งเป้าหมายลูกแมวที่ต้องการ หรือดูแมวที่กดใจไว้"
      />
      <DesiredPlanner myCats={myCats} likedCats={likedCats} initialGoal={goal} />
    </div>
  );
}
