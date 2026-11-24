import type { DiscoverFilters } from "@/server/cats/queries";
import { decodeGenes, encodeGenes } from "@/domain/genes/plan";
import { COLOR_LABELS, POINT_LABEL } from "@/domain/genes/model";

type Raw = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim().slice(0, 80) : undefined;
}

/** อ่านตัวกรองหน้าหาคู่จาก URL (ค่าที่ไม่รู้จักถูกทิ้ง) */
export function parseDiscoverParams(sp: Raw): DiscoverFilters & { page: number; fromGenes: boolean } {
  const sex = one(sp.sex);
  const color = one(sp.color);
  const genes = decodeGenes(one(sp.genes));
  return {
    breed: one(sp.breed),
    eye: one(sp.eye),
    coat: one(sp.coat),
    ear: one(sp.ear),
    sex: sex === "male" || sex === "female" ? sex : undefined,
    color: color && (COLOR_LABELS as readonly string[]).includes(color) ? color : undefined,
    pattern: one(sp.pattern) === POINT_LABEL ? POINT_LABEL : undefined,
    genes: Object.keys(genes).length ? genes : undefined,
    geneMatch: one(sp.geneMatch) === "1",
    page: Math.max(1, Number(one(sp.page)) || 1),
    fromGenes: one(sp.from) === "genes",
  };
}

/** สร้าง URL หน้าหาคู่จากตัวกรอง (คงพารามิเตอร์จากผลคำนวณยีนไว้) */
export function discoverHref(f: DiscoverFilters & { fromGenes?: boolean }, page = 1): string {
  const p = new URLSearchParams();
  if (f.breed) p.set("breed", f.breed);
  if (f.eye) p.set("eye", f.eye);
  if (f.coat) p.set("coat", f.coat);
  if (f.ear) p.set("ear", f.ear);
  if (f.sex) p.set("sex", f.sex);
  if (f.color) p.set("color", f.color);
  if (f.pattern) p.set("pattern", f.pattern);
  if (f.genes && Object.keys(f.genes).length) p.set("genes", encodeGenes(f.genes));
  if (f.geneMatch) p.set("geneMatch", "1");
  if (f.fromGenes) p.set("from", "genes");
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/discover?${qs}` : "/discover";
}
