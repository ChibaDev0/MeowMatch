/**
 * หาว่า "ต้องใช้แมวคู่แบบไหน" เพื่อให้ได้ลูกตามเป้าหมาย — ฟังก์ชันบริสุทธิ์
 * ลองยีนทุกแบบของแมวคู่ในแต่ละกลุ่มลักษณะ แล้วเลือกแบบที่โอกาส (ขั้นต่ำ) สูงสุด
 * กลุ่มลักษณะแยกกันได้ (ยีนคนละตัว) จึงคำนวณทีละกลุ่มแล้วคูณกัน
 */
import { TRAIT_GROUPS, cartesian, rangeLabelDist, type Parent, type Range, type TraitKey } from "./cross";
import {
  LOCUS,
  POINT_LABEL,
  defaultOptions,
  describeGenotype,
  effectiveOptions,
  formatGenotype,
  genotypesFor,
  type Appearance,
  type Code,
  type GeneMap,
  type LocusId,
} from "./model";

export type GeneTarget = { coat?: string; ear?: string; color?: string; eye?: string; breed?: string };

export type HiddenGene = { locus: LocusId; genotype: string; meaning: string };
export type GroupPlan = {
  key: TraitKey;
  label: string;
  target: string;
  probability: Range;
  /** โอกาสเมื่อเจอแมวหน้าตาตามสเปกแต่ไม่รู้ยีน */
  ifGenesUnknown: Range;
  mateGenes: GeneMap;
  matePhenotype: string;
  hidden: HiddenGene[];
  impossible?: string;
};
export type MatePlan = {
  mateSex: "male" | "female";
  groups: GroupPlan[];
  total: Range;
  ifGenesUnknown: Range;
  mateSpec: { coat?: string; ear?: string; color?: string; pattern?: string; breed?: string };
  requiredGenes: GeneMap;
  discoverHref: string;
  notes: string[];
};

const EYE_BLUE = "ตาสีฟ้า";

/** หน้าตาของแมวคู่จากยีนที่เลือก (ใช้แปลงกลับเป็นสเปกสำหรับค้นหา) */
function phenotypeOf(key: TraitKey, sex: "male" | "female", g: GeneMap): string {
  return TRAIT_GROUPS[key].fn(sex, g);
}

function appearanceFor(key: TraitKey, sex: "male" | "female", label: string): Appearance {
  const a: Appearance = { sex };
  if (key === "coat") a.coat = label;
  if (key === "ear") a.ear = label;
  if (key === "color") a.coatColor = label;
  if (key === "point") {
    a.coatPattern = label === "แต้มสี ตาฟ้า" ? POINT_LABEL : "สีพื้น";
  }
  return a;
}

const mul = (a: Range, b: Range): Range => ({ lower: a.lower * b.lower, upper: a.upper * b.upper });
const pct = (p: number) => `${Math.round(p * 100)}%`;

export function encodeGenes(genes: GeneMap): string {
  return (Object.entries(genes) as [LocusId, Code][]).map(([l, c]) => `${l}.${c}`).join(",");
}

export function decodeGenes(text?: string | null): GeneMap {
  const out: GeneMap = {};
  for (const part of (text ?? "").split(",")) {
    const [l, c] = part.split(".") as [LocusId, Code];
    if (l in LOCUS && ["AA", "Aa", "aa", "A", "a"].includes(c)) out[l] = c;
  }
  return out;
}

/**
 * source = แมวของเรา · target = ลักษณะลูกที่อยากได้
 * คืนสเปกแมวคู่ (หน้าตา + ยีนที่ซ่อนอยู่ที่ต้องมี) พร้อมโอกาส และลิงก์ไปหน้าค้นหา
 */
export function planMate(source: Parent, target: GeneTarget): MatePlan | { error: string } {
  const sex = source.appearance.sex;
  if (sex === "unknown") return { error: "ระบุเพศของแมวคุณก่อน เพื่อหาคู่ต่างเพศและคำนวณยีนสีส้ม (บน X)" };
  const mateSex = sex === "male" ? "female" : "male";
  const notes: string[] = [];
  const targets: [TraitKey, string][] = [];
  if (target.coat) targets.push(["coat", target.coat]);
  if (target.ear) targets.push(["ear", target.ear]);
  if (target.color) targets.push(["color", target.color]);
  if (target.eye === EYE_BLUE) {
    targets.push(["point", "แต้มสี ตาฟ้า"]);
    notes.push("แบบจำลองนี้ทำให้ตาสีฟ้าได้ทางเดียวคือยีนแต้มสี (แบบวิเชียรมาศ)");
  } else if (target.eye) {
    notes.push(`${target.eye}: สีตามีหลายยีนผสมกัน แบบจำลองนี้ยังไม่คำนวณ`);
  }

  const sourceFoldPossible = effectiveOptions("Fd", source.appearance, source.genes).includes("Aa");
  if (sourceFoldPossible) notes.push("แมวของคุณหูพับ (หรืออาจหูพับ) — คู่ต้องหูตั้งเสมอ ไม่ผสมหูพับกับหูพับ");
  if (!targets.length && !sourceFoldPossible)
    return { error: "เลือกเป้าหมายที่คำนวณด้วยยีนได้อย่างน้อยหนึ่งอย่าง: ขน หู สีขน หรือ ตาสีฟ้า" };
  if (sourceFoldPossible && !target.ear) targets.push(["ear", "หูตั้ง"]);

  const sourceIsMother = sex === "female";
  const groups: GroupPlan[] = [];
  for (const [key, wanted] of targets) {
    const group = TRAIT_GROUPS[key];
    const srcOpts = group.loci.map((l) => effectiveOptions(l, source.appearance, source.genes));
    const mateChoices = group.loci.map((l) => {
      const all = genotypesFor(l, mateSex);
      return l === "Fd" && sourceFoldPossible ? all.filter((c) => c === "aa") : all;
    });
    const memo = new Map<string, Range>();
    const evaluate = (mateOpts: Code[][]): Range => {
      const k = mateOpts.map((o) => o.join("|")).join("/");
      const hit = memo.get(k);
      if (hit) return hit;
      const r = evaluateRaw(mateOpts);
      memo.set(k, r);
      return r;
    };
    const evaluateRaw = (mateOpts: Code[][]): Range => {
      const [m, f] = sourceIsMother ? [srcOpts, mateOpts] : [mateOpts, srcOpts];
      const r = rangeLabelDist(group.loci, m, f, group.fn);
      return r.all.get(wanted) ?? { lower: 0, upper: 0 };
    };

    const lookOf = (genes: GeneMap) => appearanceFor(key, mateSex, phenotypeOf(key, mateSex, genes));
    const lookOptsOf = (genes: GeneMap) =>
      group.loci.map((l, i) => defaultOptions(l, lookOf(genes)).filter((c) => mateChoices[i]!.includes(c)));
    /** ยีนซ่อนที่ "ต้องมีจริง": ถ้าปล่อยเป็นแค่หน้าตา โอกาสจะลดลง */
    const requiredLoci = (genes: GeneMap, range: Range): LocusId[] => {
      const look = lookOptsOf(genes);
      return group.loci.filter((l, i) => {
        if (look[i]!.length < 2) return false;
        const relaxed = group.loci.map((ll, j) => (j === i ? look[j]! : [genes[ll]!]));
        return evaluate(relaxed).lower < range.lower - 1e-9;
      });
    };
    // ยีนเด่น = หน้าตาที่พบบ่อยกว่า (เช่น สีเข้ม) — ใช้ตัดสินเมื่อโอกาสเท่ากัน
    const commonness = (genes: GeneMap) => Object.values(genes).filter((c) => c === "AA" || c === "A").length;

    type Cand = { genes: GeneMap; range: Range; unknown: Range; required: number; common: number };
    let best: Cand | null = null;
    const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    for (const combo of cartesian(mateChoices)) {
      const genes: GeneMap = {};
      combo.forEach((c, i) => (genes[group.loci[i]!] = c));
      const range = evaluate(combo.map((c) => [c]));
      const cand: Cand = {
        genes,
        range,
        unknown: evaluate(lookOptsOf(genes)),
        required: requiredLoci(genes, range).length,
        common: commonness(genes),
      };
      const keys = (c: Cand) => [c.range.lower, c.range.upper, c.unknown.lower, -c.required, c.common];
      const better =
        !best ||
        (() => {
          const a = keys(cand);
          const b = keys(best!);
          for (let i = 0; i < a.length; i++) if (!eq(a[i]!, b[i]!)) return a[i]! > b[i]!;
          return false;
        })();
      if (better) best = cand;
    }
    if (!best) continue;

    const matePhenotype = phenotypeOf(key, mateSex, best.genes);
    const ifGenesUnknown = best.unknown;
    const hidden: HiddenGene[] = requiredLoci(best.genes, best.range).map((l) => ({
      locus: l,
      genotype: formatGenotype(l, best!.genes[l]!),
      meaning: describeGenotype(l, best!.genes[l]!),
    }));

    const plan: GroupPlan = {
      key,
      label: group.label,
      target: wanted,
      probability: best.range,
      ifGenesUnknown,
      mateGenes: best.genes,
      matePhenotype,
      hidden,
    };
    if (best.range.upper === 0) {
      plan.impossible = `แมวของคุณไม่มียีนที่ต้องใช้สำหรับ "${wanted}" ลูกรุ่นแรกจึงยังเป็นไม่ได้ — ลูกรุ่นแรกจะซ่อนยีนไว้ แล้วค่อยผสมต่ออีกรุ่น`;
    } else if (key === "color" && ["กระดองเต่า", "กระดองเต่าจาง", "สามสี", "สามสีจาง"].includes(wanted)) {
      notes.push(`${wanted} เกิดได้แทบเฉพาะลูกตัวเมีย เพราะต้องมียีนบน X 2 ชิ้น (ส้ม + ดำ)`);
    }
    groups.push(plan);
  }

  const total = groups.reduce((acc, g) => mul(acc, g.probability), { lower: 1, upper: 1 });
  const ifGenesUnknown = groups.reduce((acc, g) => mul(acc, g.ifGenesUnknown), { lower: 1, upper: 1 });
  const mateSpec: MatePlan["mateSpec"] = {};
  const requiredGenes: GeneMap = {};
  for (const g of groups) {
    if (g.key === "coat") mateSpec.coat = g.matePhenotype;
    if (g.key === "ear") mateSpec.ear = g.matePhenotype;
    if (g.key === "color") mateSpec.color = g.matePhenotype;
    if (g.key === "point" && g.matePhenotype === "แต้มสี ตาฟ้า") mateSpec.pattern = POINT_LABEL;
    for (const h of g.hidden) requiredGenes[h.locus] = g.mateGenes[h.locus];
  }
  if (target.breed) mateSpec.breed = target.breed;
  if (Object.keys(requiredGenes).length)
    notes.push(
      `ถ้าเจอแมวหน้าตาตามสเปกแต่ไม่รู้ยีน โอกาสจะเป็น ${pct(ifGenesUnknown.lower)}–${pct(ifGenesUnknown.upper)} แทน ${pct(total.lower)}–${pct(total.upper)}`,
    );

  const params = new URLSearchParams({ sex: mateSex, from: "genes" });
  if (mateSpec.breed) params.set("breed", mateSpec.breed);
  if (mateSpec.coat) params.set("coat", mateSpec.coat);
  if (mateSpec.ear) params.set("ear", mateSpec.ear);
  if (mateSpec.color) params.set("color", mateSpec.color);
  if (mateSpec.pattern) params.set("pattern", mateSpec.pattern);
  if (Object.keys(requiredGenes).length) params.set("genes", encodeGenes(requiredGenes));

  return {
    mateSex,
    groups,
    total,
    ifGenesUnknown,
    mateSpec,
    requiredGenes,
    discoverHref: `/discover?${params.toString()}`,
    notes,
  };
}
