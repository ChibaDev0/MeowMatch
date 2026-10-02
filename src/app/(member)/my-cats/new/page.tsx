import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AddCatForm } from "@/features/cats/add-cat-form";

export const metadata: Metadata = { title: "เพิ่มแมว" };

export default function AddCatPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="เพิ่มแมวตัวใหม่" subtitle="กรอกข้อมูลแมวของคุณ" />
      <AddCatForm />
    </div>
  );
}
