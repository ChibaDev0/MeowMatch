import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { CatForm } from "@/features/cats/cat-form";
import { getCatForEdit } from "@/server/cats/queries";

export const metadata: Metadata = { title: "แก้ไขแมว" };

/** หน้าแก้ไขข้อมูลแมว (CAT-01) — โหลดเฉพาะแมวของเจ้าของ ไม่พบ → 404 */
export default async function EditCatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = await getCatForEdit(id);
  if (!cat) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="แก้ไขข้อมูลแมว" subtitle={`ปรับปรุงข้อมูลของ ${cat.name}`} />
      <CatForm mode="edit" initial={cat} />
    </div>
  );
}
