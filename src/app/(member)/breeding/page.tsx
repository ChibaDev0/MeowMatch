import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { BreedingPicker } from "@/features/analysis/breeding-picker";
import { getLikedCats, getMyCats } from "@/server/cats/queries";

export const metadata: Metadata = { title: "ผสมพันธุ์" };

export default async function BreedingPage() {
  const [myCats, likedCats] = await Promise.all([getMyCats(), getLikedCats()]);

  return (
    <div className="space-y-6">
      <PageHeader title="ผสมพันธุ์" subtitle="เลือกแมว 2 ตัว เพื่อดูความเป็นไปได้ของลูกแมว" />
      <BreedingPicker myCats={myCats} likedCats={likedCats} />
    </div>
  );
}
