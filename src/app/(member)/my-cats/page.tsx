import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { CatCard } from "@/components/ui/cat-card";
import { CatMarkIcon } from "@/components/ui/logo";
import { PlusIcon } from "@/components/ui/icons";
import { getMyCats } from "@/server/cats/queries";

export const metadata: Metadata = { title: "แมวของฉัน" };

export default async function MyCatsPage() {
  const cats = await getMyCats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="แมวของฉัน"
        subtitle="จัดการข้อมูลแมวของคุณ"
        action={
          <Link
            href="/my-cats/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-800"
          >
            <PlusIcon className="h-4 w-4" />
            เพิ่มแมว
          </Link>
        }
      />

      {/* Count card */}
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-primary-50/60 p-5">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary-100 text-primary-600">
          <CatMarkIcon className="h-8 w-8" />
        </span>
        <div>
          <p className="text-sm text-muted">จำนวนแมวทั้งหมด</p>
          <p className="text-2xl font-bold text-ink">{cats.length} ตัว</p>
        </div>
      </div>

      {/* Grid */}
      {cats.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((cat, i) => (
            <CatCard key={cat.id} cat={cat} seed={i} />
          ))}
        </div>
      ) : (
        <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-muted">ยังไม่มีแมว — เริ่มต้นด้วยการเพิ่มแมวตัวแรกของคุณ</p>
          <Link
            href="/my-cats/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-800"
          >
            <PlusIcon className="h-4 w-4" />
            เพิ่มแมว
          </Link>
        </div>
      )}
    </div>
  );
}
