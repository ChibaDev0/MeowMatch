import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { BreedingPicker } from "@/features/analysis/breeding-picker";

export const metadata: Metadata = { title: "ผสมพันธุ์" };

export default function BreedingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="ผสมพันธุ์" subtitle="เลือกแมว 2 ตัว เพื่อดูความเป็นไปได้ของลูกแมว" />
      <BreedingPicker />
    </div>
  );
}
