import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoverFilterPanel } from "@/features/discovery/discover-filters";
import { DiscoverCard } from "@/features/discovery/discover-card";
import { getDiscoverBreeds, getDiscoverCats, type DiscoverFilters } from "@/server/cats/queries";

export const metadata: Metadata = { title: "หาคู่" };

/** รับค่าตัวกรองจาก searchParams (string | string[] | undefined → string | undefined) */
function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s : undefined;
}

/** สร้าง querystring สำหรับลิงก์แบ่งหน้า โดยคงตัวกรองเดิมไว้ */
function pageHref(filters: DiscoverFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.breed) params.set("breed", filters.breed);
  if (filters.eye) params.set("eye", filters.eye);
  if (filters.coat) params.set("coat", filters.coat);
  if (filters.ear) params.set("ear", filters.ear);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters: DiscoverFilters = {
    breed: one(sp.breed),
    eye: one(sp.eye),
    coat: one(sp.coat),
    ear: one(sp.ear),
  };
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [result, breeds] = await Promise.all([
    getDiscoverCats({ filters, page }),
    getDiscoverBreeds(),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const hasPrev = result.page > 1;
  const hasNext = result.page < totalPages;
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <PageHeader title="หาคู่" subtitle="ค้นหาแมวจากผู้ใช้คนอื่น ๆ" />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <DiscoverFilterPanel breeds={breeds} initial={filters} />

        <section className="space-y-4">
          <p className="text-sm text-muted">
            {result.total > 0
              ? `พบ ${result.total} ตัว · แสดง ${rangeStart}–${rangeEnd}`
              : "ไม่พบแมวที่ตรงกับตัวกรอง"}
          </p>

          {result.cats.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.cats.map((cat, i) => (
                <DiscoverCard key={cat.id} cat={cat} seed={i} />
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
              ลองปรับหรือล้างตัวกรองเพื่อดูแมวตัวอื่น ๆ
            </div>
          )}

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3 pt-2" aria-label="แบ่งหน้า">
              {hasPrev ? (
                <Link
                  href={pageHref(filters, result.page - 1)}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-50"
                >
                  ก่อนหน้า
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted opacity-50">
                  ก่อนหน้า
                </span>
              )}
              <span className="text-sm text-muted">
                หน้า {result.page} / {totalPages}
              </span>
              {hasNext ? (
                <Link
                  href={pageHref(filters, result.page + 1)}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-50"
                >
                  ถัดไป
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted opacity-50">
                  ถัดไป
                </span>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
