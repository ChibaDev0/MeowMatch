import type { Metadata } from "next";
import { ChevronDownIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoverCard } from "@/features/discovery/discover-card";
import { DEMO_DISCOVER_CATS } from "@/features/cats/demo";

export const metadata: Metadata = { title: "หาคู่" };

function Select({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <select
          defaultValue=""
          className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="" disabled>
            {placeholder}
          </option>
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const cats = DEMO_DISCOVER_CATS;

  return (
    <div className="space-y-6">
      <PageHeader title="หาคู่" subtitle="ค้นหาแมวจากผู้ใช้คนอื่น ๆ" />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters (DISC-01 — ยังไม่ผูกกับการค้นหาจริง) */}
        <aside className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">ตัวกรอง</h2>
          <Select label="สายพันธุ์" placeholder="เลือกสายพันธุ์" />
          <Select label="สีตา" placeholder="เลือกสีตา" />
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-ink">ลักษณะขน</span>
            <div className="flex flex-wrap gap-2">
              {["ขนสั้น", "ขนยาว", "ไม่มีขน"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition hover:border-primary-400 hover:text-primary-700"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Select label="สีของแมว" placeholder="เลือกสีขน" />
          <Select label="หู" placeholder="เลือกหู" />
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              className="flex-1 rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-800"
            >
              ค้นหา
            </button>
            <button
              type="button"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </aside>

        {/* Results */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cats.map((cat, i) => (
            <DiscoverCard key={cat.id} cat={cat} seed={i + 3} />
          ))}
        </div>
      </div>
    </div>
  );
}
