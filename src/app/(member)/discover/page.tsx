import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DiscoverFilterPanel } from "@/features/discovery/discover-filters";
import { DiscoverCard } from "@/features/discovery/discover-card";
import { geneMatchStatus, getDiscoverBreeds, getDiscoverCats } from "@/server/cats/queries";
import { discoverHref, parseDiscoverParams } from "@/features/discovery/params";
import { describeGenotype, formatGenotype, type Code, type LocusId } from "@/domain/genes/model";

export const metadata: Metadata = { title: "หาคู่" };


export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page, fromGenes, ...filters } = parseDiscoverParams(await searchParams);
  const pageHref = (f: typeof filters, p: number) => discoverHref({ ...f, fromGenes }, p);
  const wantedGenes = Object.entries(filters.genes ?? {}) as [LocusId, Code][];
  const specText = [
    filters.sex === "male" ? "เพศผู้" : filters.sex === "female" ? "เพศเมีย" : "",
    filters.breed,
    filters.coat,
    filters.ear,
    filters.color && `สี${filters.color}`,
    filters.pattern,
  ]
    .filter(Boolean)
    .join(" · ");

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
        <DiscoverFilterPanel breeds={breeds} initial={filters} fromGenes={fromGenes} />

        <section className="space-y-4">
          {fromGenes && (
            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm" role="status">
              <p className="font-medium text-primary-800">🧬 ค้นหาตามผลคำนวณยีน</p>
              {specText && <p className="mt-1 text-ink">{specText}</p>}
              {wantedGenes.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  ยีนที่ซ่อนอยู่ซึ่งควรมี:{" "}
                  {wantedGenes.map(([l, c]) => `${formatGenotype(l, c)} (${describeGenotype(l, c)})`).join(", ")}
                  {filters.geneMatch ? " · แสดงเฉพาะแมวที่เจ้าของบันทึกยีนตรง" : " · แมวที่บันทึกยีนตรงจะมีป้าย ✓"}
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-muted">
            {result.total > 0
              ? `พบ ${result.total} ตัว · แสดง ${rangeStart}–${rangeEnd}`
              : "ไม่พบแมวที่ตรงกับตัวกรอง"}
          </p>

          {result.cats.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.cats.map((cat, i) => (
                <DiscoverCard key={cat.id} cat={cat} seed={i} geneMatch={geneMatchStatus(cat, filters.genes)} />
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
