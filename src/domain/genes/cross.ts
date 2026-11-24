/**
 * คำนวณลูกแมวจากยีนของพ่อแม่ (ตาราง Punnett) — ฟังก์ชันบริสุทธิ์
 * ถ้ายังไม่รู้ว่าพ่อแม่ซ่อนยีนไหม จะคิดทุกกรณีแล้วรายงานเป็น "ช่วง" (ต่ำสุด–สูงสุด)
 * ไม่เดาความน่าจะเป็นของการซ่อนยีน (ไม่มี prior) — ช่วงจะแคบลงเมื่อเจ้าของระบุยีน
 */
import {
  LOCUS,
  coatLabel,
  colorLabel,
  describeGenotype,
  earLabel,
  effectiveOptions,
  formatGenotype,
  isAssumed,
  pointLabel,
  type Appearance,
  type Code,
  type GeneMap,
  type GeneSex,
  type Genotypes,
  type LocusId,
} from "./model";

export type Range = { lower: number; upper: number };
export type KitSex = "male" | "female";
export type Dist = Map<Code, number>;

// ---------------------------------------------------------------- single-locus cross

type Gamete = "A" | "a" | "Y";

function gametes(code: Code, xLinkedMale = false): [Gamete, number][] {
  if (xLinkedMale) return [[code as "A" | "a", 0.5], ["Y", 0.5]];
  if (code.length === 1) return [[code as "A" | "a", 1]];
  if (code[0] === code[1]) return [[code[0] as "A" | "a", 1]];
  return [["A", 0.5], ["a", 0.5]];
}

const combine = (x: Gamete, y: Gamete): Code =>
  (x === "A" && y === "A" ? "AA" : x === "a" && y === "a" ? "aa" : "Aa") as Code;

/**
 * ลูกของยีนหนึ่ง แยกตามเพศลูก
 * ยีนบน X: ลูกตัวผู้ได้ X จากแม่อย่างเดียว (Y จากพ่อ) · ลูกตัวเมียได้ X จากทั้งพ่อและแม่
 */
export function crossLocus(locus: LocusId, mother: Code, father: Code): Record<KitSex, Dist> {
  const male: Dist = new Map();
  const female: Dist = new Map();
  const add = (d: Dist, c: Code, p: number) => d.set(c, (d.get(c) ?? 0) + p);
  if (LOCUS[locus].xLinked) {
    for (const [m, pm] of gametes(mother)) {
      add(male, m as Code, pm);
      add(female, combine(m, father as Gamete), pm);
    }
    return { male, female };
  }
  for (const [m, pm] of gametes(mother))
    for (const [f, pf] of gametes(father)) {
      add(male, combine(m, f), pm * pf);
      add(female, combine(m, f), pm * pf);
    }
  return { male, female };
}

// ---------------------------------------------------------------- ranges across unknown scenarios

export type Parent = { name?: string; appearance: Appearance; genes?: GeneMap | null };
export type LabelFn = (sex: KitSex, g: Genotypes) => string;
export type TraitRanges = { all: Map<string, Range>; male: Map<string, Range>; female: Map<string, Range>; exact: boolean };

export function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((x) => [...prefix, x])), [[]]);
}

/** ความน่าจะเป็นของแต่ละป้ายลักษณะ สำหรับพ่อแม่ที่ "รู้ยีนแน่นอน" หนึ่งชุด */
export function exactLabelDist(
  loci: LocusId[],
  mother: Genotypes,
  father: Genotypes,
  label: LabelFn,
): Record<KitSex, Map<string, number>> {
  const out: Record<KitSex, Map<string, number>> = { male: new Map(), female: new Map() };
  for (const sex of ["male", "female"] as const) {
    const perLocus = loci.map((l) => [...crossLocus(l, mother[l]!, father[l]!)[sex].entries()]);
    for (const combo of cartesian(perLocus)) {
      const g: Genotypes = {};
      let p = 1;
      combo.forEach(([code, pc], i) => {
        g[loci[i]!] = code;
        p *= pc;
      });
      if (p === 0) continue;
      const key = label(sex, g);
      out[sex].set(key, (out[sex].get(key) ?? 0) + p);
    }
  }
  return out;
}

/** min/max ของแต่ละป้ายลักษณะ เมื่อคิดทุกกรณีที่ยีนพ่อแม่เป็นไปได้ */
export function rangeLabelDist(
  loci: LocusId[],
  motherOpts: Code[][],
  fatherOpts: Code[][],
  label: LabelFn,
): TraitRanges {
  const scenarios = cartesian(loci.map((_, i) => cartesian([motherOpts[i]!, fatherOpts[i]!])));
  const acc = { all: new Map<string, Range>(), male: new Map<string, Range>(), female: new Map<string, Range>() };
  const seen = { all: new Map<string, number>(), male: new Map<string, number>(), female: new Map<string, number>() };
  for (const scen of scenarios) {
    const mother: Genotypes = {};
    const father: Genotypes = {};
    scen.forEach(([m, f], i) => {
      mother[loci[i]!] = m;
      father[loci[i]!] = f;
    });
    const d = exactLabelDist(loci, mother, father, label);
    const all = new Map<string, number>();
    for (const sex of ["male", "female"] as const)
      for (const [k, p] of d[sex]) all.set(k, (all.get(k) ?? 0) + p / 2);
    for (const [bucket, dist] of [["all", all], ["male", d.male], ["female", d.female]] as const) {
      for (const [k, p] of dist) {
        const r = acc[bucket].get(k);
        acc[bucket].set(k, r ? { lower: Math.min(r.lower, p), upper: Math.max(r.upper, p) } : { lower: p, upper: p });
        seen[bucket].set(k, (seen[bucket].get(k) ?? 0) + 1);
      }
    }
  }
  // ป้ายที่ไม่เกิดในบางกรณี → ขั้นต่ำเป็น 0
  for (const bucket of ["all", "male", "female"] as const)
    for (const [k, r] of acc[bucket]) if ((seen[bucket].get(k) ?? 0) < scenarios.length) r.lower = 0;
  return { ...acc, exact: scenarios.length === 1 };
}

// ---------------------------------------------------------------- trait groups

export type TraitKey = "coat" | "ear" | "color" | "point";
export const TRAIT_GROUPS: Record<TraitKey, { label: string; loci: LocusId[]; fn: LabelFn; sexLinked?: boolean }> = {
  coat: { label: "ความยาวขน", loci: ["hr", "L"], fn: (_s, g) => coatLabel(g) },
  ear: { label: "หู", loci: ["Fd"], fn: (_s, g) => earLabel(g) },
  color: { label: "สีขน", loci: ["W", "S", "O", "D"], fn: (s, g) => colorLabel(s, g), sexLinked: true },
  point: { label: "แต้มสี / ตาฟ้า", loci: ["C"], fn: (_s, g) => pointLabel(g) },
};

// ---------------------------------------------------------------- pair simulation

export type Outcome = { label: string; all: Range; male?: Range; female?: Range };
export type TraitResult = { key: TraitKey; label: string; exact: boolean; outcomes: Outcome[]; note?: string };
export type PunnettSquare = {
  locus: LocusId;
  name: string;
  motherLabel: string;
  fatherLabel: string;
  rows: string[];
  cols: string[];
  cells: { genotype: string; meaning: string }[][];
};
export type ParentGenes = {
  name: string;
  sex: GeneSex;
  loci: { locus: LocusId; name: string; options: string[]; chosen: boolean; meaning: string }[];
};
export type PairGeneResult = {
  parents: [ParentGenes, ParentGenes];
  traits: TraitResult[];
  squares: PunnettSquare[];
  warnings: string[];
};

const sortOutcomes = (o: Outcome[]) => o.sort((a, b) => b.all.upper - a.all.upper || b.all.lower - a.all.lower || a.label.localeCompare(b.label, "th"));

function parentGenes(p: Parent): ParentGenes {
  return {
    name: p.name ?? "",
    sex: p.appearance.sex,
    loci: (Object.keys(LOCUS) as LocusId[]).flatMap((locus) => {
      const options = effectiveOptions(locus, p.appearance, p.genes);
      if (!options.length) return [];
      return [
        {
          locus,
          name: LOCUS[locus].name,
          options: options.map((c) => formatGenotype(locus, c)),
          chosen: !!p.genes?.[locus] && options.length === 1,
          meaning: isAssumed(locus, p.appearance, p.genes)
            ? `${describeGenotype(locus, options[0]!)} (สมมติ เพราะยีนนี้หายาก)`
            : options.length === 1
              ? describeGenotype(locus, options[0]!)
              : "ยังไม่รู้ว่าซ่อนยีนไหม (คิดทุกแบบ)",
        },
      ];
    }),
  };
}

function punnett(locus: LocusId, mother: Code, father: Code, motherName: string, fatherName: string): PunnettSquare {
  const xl = !!LOCUS[locus].xLinked;
  const g = (c: Code, male: boolean) =>
    xl && male ? [c as Gamete, "Y" as Gamete] : c.length === 1 ? [c as Gamete] : ([c[0], c[1]] as Gamete[]);
  const rowsG = g(mother, false);
  const colsG = g(father, xl);
  const show = (x: Gamete) => (x === "Y" ? "Y" : x === "A" ? LOCUS[locus].big : LOCUS[locus].small);
  return {
    locus,
    name: LOCUS[locus].name,
    motherLabel: `${motherName} (${formatGenotype(locus, mother)})`,
    fatherLabel: `${fatherName} (${formatGenotype(locus, father)})`,
    rows: rowsG.map(show),
    cols: colsG.map(show),
    cells: rowsG.map((r) =>
      colsG.map((c) => {
        if (c === "Y") return { genotype: `${show(r)}Y`, meaning: `ลูกตัวผู้: ${describeGenotype(locus, r as Code)}` };
        const code = combine(r, c);
        const meaning = xl ? `ลูกตัวเมีย: ${describeGenotype(locus, code)}` : describeGenotype(locus, code);
        return { genotype: formatGenotype(locus, code), meaning };
      }),
    ),
  };
}

/**
 * จำลองลูกของแมว 2 ตัว
 * - ยีนทั่วไปไม่สนเพศพ่อแม่ · ยีนสีส้ม (บน X) ต้องรู้ว่าตัวไหนเป็นแม่/พ่อ
 */
export function simulatePair(a: Parent, b: Parent): PairGeneResult {
  const warnings: string[] = [];
  const sexKnown = a.appearance.sex !== "unknown" && b.appearance.sex !== "unknown" && a.appearance.sex !== b.appearance.sex;
  const [mother, father] = a.appearance.sex === "male" ? [b, a] : [a, b];
  const opts = (p: Parent, l: LocusId) => effectiveOptions(l, p.appearance, p.genes);

  const traits: TraitResult[] = [];
  for (const key of Object.keys(TRAIT_GROUPS) as TraitKey[]) {
    const group = TRAIT_GROUPS[key];
    if (group.sexLinked && !sexKnown) {
      traits.push({ key, label: group.label, exact: false, outcomes: [], note: "ต้องรู้เพศของพ่อและแม่ก่อน เพราะยีนสีส้มอยู่บนโครโมโซม X" });
      continue;
    }
    const r = rangeLabelDist(group.loci, group.loci.map((l) => opts(mother, l)), group.loci.map((l) => opts(father, l)), group.fn);
    const outcomes = [...r.all.entries()]
      .filter(([, range]) => range.upper > 0)
      .map(([label, all]) => ({
        label,
        all,
        ...(group.sexLinked ? { male: r.male.get(label) ?? { lower: 0, upper: 0 }, female: r.female.get(label) ?? { lower: 0, upper: 0 } } : {}),
      }));
    traits.push({
      key,
      label: group.label,
      exact: r.exact,
      outcomes: sortOutcomes(outcomes),
      note: r.exact ? undefined : "ตัวเลขเป็นช่วง เพราะยังไม่รู้ว่าพ่อแม่ซ่อนยีนบางตัวไหม — ระบุยีนในหน้าแก้ไขแมวเพื่อให้แม่นขึ้น",
    });
  }

  const squares: PunnettSquare[] = [];
  for (const locus of Object.keys(LOCUS) as LocusId[]) {
    if (LOCUS[locus].xLinked && !sexKnown) continue;
    const m = opts(mother, locus);
    const f = opts(father, locus);
    if (m.length !== 1 || f.length !== 1) continue;
    if (m[0] === f[0] && m[0]!.length === 2 && m[0]![0] === m[0]![1] && !LOCUS[locus].xLinked) continue; // แท้×แท้ เหมือนกัน ไม่น่าสนใจ
    squares.push(punnett(locus, m[0]!, f[0]!, mother.name ?? "แม่", father.name ?? "พ่อ"));
  }

  if (a.appearance.ear === "หูพับ" && b.appearance.ear === "หูพับ")
    warnings.push("ทั้งคู่หูพับ — ลูกมีโอกาสได้ยีนหูพับ 2 ชิ้น ซึ่งเสี่ยงโรคกระดูกและข้อ ไม่ควรผสมคู่นี้");
  if (!sexKnown) warnings.push("ยังไม่รู้เพศพ่อแม่ครบ หรือเป็นเพศเดียวกัน จึงไม่คำนวณสีขน (ยีนสีส้มอยู่บน X)");

  return { parents: [parentGenes(mother), parentGenes(father)], traits, squares, warnings };
}
