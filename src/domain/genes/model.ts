/**
 * แบบจำลองยีนแมวอย่างง่าย (ระดับเนื้อหา ป.4–6) — ฟังก์ชันบริสุทธิ์ ไม่เรียก DB/LLM
 *
 * แต่ละลักษณะมี "สูตรลับ" (ยีน) 2 ชิ้น ได้จากพ่อ 1 แม่ 1 · ยีนเด่น (ตัวใหญ่) มีชิ้นเดียวก็แสดง
 * ยีนด้อย (ตัวเล็ก) ต้องมีครบ 2 ชิ้นถึงแสดง · ยีนสีส้มอยู่บนโครโมโซม X (ตัวผู้มีชิ้นเดียว)
 *
 * รหัสยีนเก็บแบบนามธรรม: "AA" = เด่นแท้, "Aa" = เด่นแต่ซ่อนด้อย, "aa" = ด้อย,
 * ตัวผู้ของยีนบน X: "A" / "a" — แปลงเป็นตัวอักษรจริงตอนแสดงผลด้วย formatGenotype
 * นี่คือ "การจำลอง" เพื่อการเรียนรู้ ไม่ใช่ผลตรวจ DNA จริง
 */

export type GeneSex = "male" | "female" | "unknown";
export type Code = "AA" | "Aa" | "aa" | "A" | "a";
export type LocusId = "L" | "hr" | "Fd" | "W" | "S" | "O" | "D" | "C";
export type GeneMap = Partial<Record<LocusId, Code>>;

export type LocusDef = {
  id: LocusId;
  name: string;
  trait: string;
  big: string;
  small: string;
  bigMeans: string;
  smallMeans: string;
  xLinked?: boolean;
  note: string;
};

export const LOCI: readonly LocusDef[] = [
  {
    id: "L", name: "ยีนความยาวขน", trait: "ความยาวขน", big: "L", small: "l",
    bigMeans: "ขนสั้น", smallMeans: "ขนยาว",
    note: "ขนสั้นเป็นยีนเด่น ขนยาวเป็นยีนด้อย ต้องได้ l จากทั้งพ่อและแม่ถึงจะขนยาว",
  },
  {
    id: "hr", name: "ยีนไม่มีขน", trait: "มีขน / ไม่มีขน", big: "Hr", small: "hr",
    bigMeans: "มีขน", smallMeans: "ไม่มีขน",
    note: "ไม่มีขน (แบบสฟิงซ์) เป็นยีนด้อย",
  },
  {
    id: "Fd", name: "ยีนหูพับ", trait: "หู", big: "Fd", small: "fd",
    bigMeans: "หูพับ", smallMeans: "หูตั้ง",
    note: "หูพับเป็นยีนเด่น มีชิ้นเดียวก็หูพับ — ไม่ควรผสมหูพับกับหูพับ เพราะลูกเสี่ยงโรคกระดูก",
  },
  {
    id: "W", name: "ยีนขาวทั้งตัว", trait: "ขาวทั้งตัว", big: "W", small: "w",
    bigMeans: "ขาวทั้งตัว", smallMeans: "มีสี",
    note: "W เป็นยีนเด่นที่เหมือน 'ทาสีขาวทับ' สีอื่นทั้งหมด",
  },
  {
    id: "S", name: "ยีนแต้มขาว", trait: "แต้มขาว", big: "S", small: "s",
    bigMeans: "มีแต้มขาว", smallMeans: "ไม่มีแต้มขาว",
    note: "ทำให้มีปื้นขาว เช่น ขาวดำ ขาวส้ม หรือสามสี",
  },
  {
    id: "O", name: "ยีนสีส้ม", trait: "ส้ม / ดำ", big: "O", small: "o",
    bigMeans: "ส้ม", smallMeans: "ดำ", xLinked: true,
    note: "อยู่บนโครโมโซม X — ตัวผู้มีชิ้นเดียว ตัวเมียมีสองชิ้น ถ้าได้ทั้ง O และ o จะเป็นกระดองเต่า",
  },
  {
    id: "D", name: "ยีนสีเข้ม/จาง", trait: "ความเข้มของสี", big: "D", small: "d",
    bigMeans: "สีเข้ม", smallMeans: "สีจาง",
    note: "สีจางเป็นยีนด้อย ทำให้ ดำ → เทา และ ส้ม → ครีม",
  },
  {
    id: "C", name: "ยีนแต้มสี", trait: "แต้มสี (ตาฟ้า)", big: "C", small: "cs",
    bigMeans: "สีเต็มตัว", smallMeans: "แต้มสี ตาฟ้า",
    note: "แต้มสีแบบวิเชียรมาศเป็นยีนด้อย สีเข้มเฉพาะหน้า หู ขา หาง และทำให้ตาสีฟ้า",
  },
];

export const LOCUS: Record<LocusId, LocusDef> = Object.fromEntries(LOCI.map((l) => [l.id, l])) as Record<
  LocusId,
  LocusDef
>;
export const LOCUS_IDS = LOCI.map((l) => l.id);

/** สีขนมาตรฐานที่แบบจำลองเข้าใจ (ใช้ในฟอร์มแมว ตัวกรอง และเป้าหมาย) */
export const COLOR_LABELS = [
  "ดำ", "เทา", "ส้ม", "ครีม", "กระดองเต่า", "กระดองเต่าจาง",
  "ขาวดำ", "ขาวเทา", "ขาวส้ม", "ขาวครีม", "สามสี", "สามสีจาง", "ขาว",
] as const;
export type ColorLabel = (typeof COLOR_LABELS)[number];
export const POINT_LABEL = "แต้มสี (colorpoint)";

/** genotype ที่เป็นไปได้ของยีนหนึ่งตามเพศ (หูพับแบบยีนคู่ FdFd ไม่อยู่ในแบบจำลองเพราะเป็นอันตราย) */
export function genotypesFor(locus: LocusId, sex: GeneSex): Code[] {
  if (LOCUS[locus].xLinked) return sex === "male" ? ["A", "a"] : sex === "female" ? ["AA", "Aa", "aa"] : [];
  if (locus === "Fd") return ["Aa", "aa"];
  return ["AA", "Aa", "aa"];
}

/** แสดงเป็นตัวอักษรจริง เช่น ("L","Aa") → "Ll", ("C","Aa") → "C/cs", ตัวผู้ ("O","A") → "O" */
export function formatGenotype(locus: LocusId, code: Code): string {
  const { big, small } = LOCUS[locus];
  const alleles = [...code].map((c) => (c === "A" ? big : small));
  if (alleles.length === 1) return alleles[0]!;
  return big.length > 1 || small.length > 1 ? alleles.join("/") : alleles.join("");
}

/** คำอธิบายภาษาง่าย เช่น "ขนสั้น แต่ซ่อนยีนขนยาว" */
export function describeGenotype(locus: LocusId, code: Code): string {
  const d = LOCUS[locus];
  if (locus === "O") {
    if (code === "A" || code === "AA") return "ส้ม (ถ้าสีจางเป็นครีม)";
    if (code === "a" || code === "aa") return "ดำ (ถ้าสีจางเป็นเทา)";
    return "กระดองเต่า (ส้มปนดำ)";
  }
  if (locus === "Fd" && code === "Aa") return "หูพับ (มียีนหูพับ 1 ชิ้น)";
  if (locus === "Fd" && code === "AA") return "หูพับยีนคู่ — เสี่ยงโรคกระดูกและข้อ";
  if (code === "AA") return `${d.bigMeans}แท้ (ไม่ซ่อนยีน${d.smallMeans})`;
  if (code === "Aa") return `${d.bigMeans} แต่ซ่อนยีน${d.smallMeans} 1 ชิ้น`;
  return d.smallMeans;
}

export const isRecessive = (code: Code) => code === "aa" || code === "a";

// ---------------------------------------------------------------- phenotype → genotype

export type Appearance = {
  sex: GeneSex;
  coat?: string | null;
  ear?: string | null;
  eye?: string | null;
  coatColor?: string | null;
  coatPattern?: string | null;
};

export type ColorInfo = {
  white?: boolean;
  spots?: boolean;
  orange?: "O" | "o" | "tortie";
  dilute?: boolean;
};

const clean = (v?: string | null) => {
  const t = (v ?? "").trim().toLocaleLowerCase();
  return ["", "—", "-", "ไม่ทราบ", "ไม่ระบุ"].includes(t) ? "" : t;
};

/** อ่านสีขน (รองรับทั้งชื่อมาตรฐานและข้อความอิสระแบบเดิม) */
export function parseColor(text?: string | null): ColorInfo {
  const t = clean(text).replace(/\s+/g, "");
  if (!t) return {};
  if (/^(ขาว|ขาวล้วน|ขาวทั้งตัว|white|สีขาว)$/.test(t)) return { white: true };
  const info: ColorInfo = { white: false };
  const dilute = /จาง|dilute/.test(t);
  if (/สามสี|calico/.test(t)) return { ...info, orange: "tortie", spots: true, dilute };
  if (/กระดองเต่า|tortie/.test(t)) return { ...info, orange: "tortie", spots: /ขาว/.test(t), dilute };
  const withoutWhite = t.replace(/ขาว|white/g, "");
  const spots = withoutWhite.length < t.length && withoutWhite.length > 0;
  if (/ครีม|cream/.test(t)) return { ...info, orange: "O", dilute: true, spots };
  if (/ส้ม|แดง|orange|red/.test(t)) return { ...info, orange: "O", dilute: false, spots };
  if (/เทา|บลู|blue|grey|gray|สีสวาด/.test(t)) return { ...info, orange: "o", dilute: true, spots };
  if (/ดำ|black/.test(t)) return { ...info, orange: "o", dilute: false, spots };
  // น้ำตาล (เช่น ลายสลิดน้ำตาล, แต้มน้ำตาลเข้ม) = กลุ่มสีดำที่มีลาย/แต้ม ในแบบจำลองอย่างง่ายนี้
  if (/น้ำตาล|brown|seal|ช็อกโกแลต/.test(t)) return { ...info, orange: "o", dilute: false, spots };
  return {};
}

const isPointed = (a: Appearance) => /แต้มสี|พอยท์|point|colorpoint|ไซมีส|วิเชียรมาศ/.test(clean(a.coatPattern));

/** genotype ที่ "หน้าตา" นี้เป็นไปได้ (ยังไม่รวมยีนที่เจ้าของระบุเอง) */
export function possibleFromAppearance(locus: LocusId, a: Appearance): Code[] {
  const all = genotypesFor(locus, a.sex);
  const dom = all.filter((c) => !isRecessive(c));
  const rec = all.filter(isRecessive);
  const coat = clean(a.coat);
  const ear = clean(a.ear);
  const color = parseColor(a.coatColor);
  switch (locus) {
    case "hr":
      return coat === "ไม่มีขน" ? rec : coat === "ขนสั้น" || coat === "ขนยาว" ? dom : all;
    case "L":
      return coat === "ขนสั้น" ? dom : coat === "ขนยาว" ? rec : all;
    case "Fd":
      return ear === "หูพับ" ? ["Aa"] : ear === "หูตั้ง" ? ["aa"] : all;
    case "W":
      return color.white === true ? dom : color.white === false ? rec : all;
    case "S":
      return color.spots === true ? dom : color.spots === false ? rec : all;
    case "D":
      return color.dilute === true ? rec : color.dilute === false ? dom : all;
    case "O": {
      if (!color.orange) return all;
      if (a.sex === "male") return color.orange === "O" ? ["A"] : color.orange === "o" ? ["a"] : all;
      return color.orange === "O" ? ["AA"] : color.orange === "o" ? ["aa"] : ["Aa"];
    }
    case "C": {
      if (isPointed(a)) return rec;
      const eye = clean(a.eye);
      if (eye && eye !== "ตาสีฟ้า") return dom; // แมวแต้มสีตาฟ้าเสมอ → ตาสีอื่น = ไม่ใช่แต้มสี
      if (clean(a.coatPattern)) return dom;
      return all;
    }
  }
}

/**
 * ยีนหายาก: ถ้าเจ้าของไม่ได้ระบุ ให้ "สมมติว่าไม่ซ่อน" (แสดงให้ผู้ใช้เห็นและแก้ได้)
 * มิฉะนั้นทุกคู่จะมีโอกาส "ไม่มีขน" 0–25% ซึ่งไม่สมจริงและทำให้สับสน
 */
export const ASSUMED: Partial<Record<LocusId, Code>> = { hr: "AA" };

/** genotype เมื่อไม่ได้ระบุยีน: ทุกแบบที่หน้าตาเป็นไปได้ (ยกเว้นยีนหายากที่สมมติว่าไม่ซ่อน) */
export function defaultOptions(locus: LocusId, a: Appearance): Code[] {
  const possible = possibleFromAppearance(locus, a);
  const assumed = ASSUMED[locus];
  return assumed && possible.length > 1 && possible.includes(assumed) ? [assumed] : possible;
}

export function isAssumed(locus: LocusId, a: Appearance, genes?: GeneMap | null): boolean {
  return !genes?.[locus] && possibleFromAppearance(locus, a).length > 1 && defaultOptions(locus, a).length === 1;
}

/** genotype ที่ใช้คำนวณจริง: ยีนที่เจ้าของระบุ (ถ้าเข้ากับหน้าตา) หรือค่าเริ่มต้นจากหน้าตา */
export function effectiveOptions(locus: LocusId, a: Appearance, genes?: GeneMap | null): Code[] {
  const possible = possibleFromAppearance(locus, a);
  const chosen = genes?.[locus];
  return chosen && possible.includes(chosen) ? [chosen] : defaultOptions(locus, a);
}

/** ตรวจยีนที่ระบุว่าเข้ากับหน้าตาและเพศ — คืนรายการข้อความผิดพลาด */
export function validateGenes(a: Appearance, genes: GeneMap): string[] {
  const errors: string[] = [];
  for (const [locus, code] of Object.entries(genes) as [LocusId, Code][]) {
    if (!LOCUS[locus]) continue;
    if (!genotypesFor(locus, a.sex).includes(code)) {
      errors.push(LOCUS[locus].xLinked ? `${LOCUS[locus].name}: ต้องระบุเพศก่อน หรือรหัสไม่ตรงกับเพศ` : `${LOCUS[locus].name}: รหัสยีนไม่ถูกต้อง`);
    } else if (!possibleFromAppearance(locus, a).includes(code)) {
      errors.push(`${LOCUS[locus].name}: ${formatGenotype(locus, code)} ไม่ตรงกับหน้าตาที่บันทึกไว้`);
    }
  }
  return errors;
}

const CODES: readonly Code[] = ["AA", "Aa", "aa", "A", "a"];

/** อ่านค่ายีนจาก DB/ฟอร์มอย่างปลอดภัย — เก็บเฉพาะ key/value ที่รู้จัก */
export function sanitizeGenes(raw: unknown): GeneMap {
  const out: GeneMap = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k in LOCUS && typeof v === "string" && (CODES as string[]).includes(v)) out[k as LocusId] = v as Code;
  }
  return out;
}

/** ตัดยีนที่ไม่เข้ากับหน้าตาออก (ใช้ตอนผู้ใช้แก้หน้าตาหลังเลือกยีนแล้ว) */
export function pruneGenes(a: Appearance, genes: GeneMap): GeneMap {
  const out: GeneMap = {};
  for (const [locus, code] of Object.entries(genes) as [LocusId, Code][]) {
    if (LOCUS[locus] && possibleFromAppearance(locus, a).includes(code)) out[locus] = code;
  }
  return out;
}

// ---------------------------------------------------------------- genotype → phenotype

export type Genotypes = Partial<Record<LocusId, Code>>;

export function coatLabel(g: Genotypes): string {
  if (g.hr === "aa") return "ไม่มีขน";
  return g.L === "aa" ? "ขนยาว" : "ขนสั้น";
}

export function earLabel(g: Genotypes): string {
  if (g.Fd === "AA") return "หูพับยีนคู่ (เสี่ยงสุขภาพ)";
  return g.Fd === "Aa" ? "หูพับ" : "หูตั้ง";
}

export function pointLabel(g: Genotypes): string {
  return g.C === "aa" ? "แต้มสี ตาฟ้า" : "สีเต็มตัว";
}

export function colorLabel(sex: "male" | "female", g: Genotypes): ColorLabel {
  if (g.W && g.W !== "aa") return "ขาว";
  const o = g.O ?? "a";
  const status = sex === "male" || o.length === 1 ? (o[0] === "A" ? "O" : "o") : o === "AA" ? "O" : o === "aa" ? "o" : "tortie";
  const dilute = g.D === "aa";
  const spots = !!g.S && g.S !== "aa";
  const base = status === "O" ? (dilute ? "ครีม" : "ส้ม") : status === "o" ? (dilute ? "เทา" : "ดำ") : dilute ? "กระดองเต่าจาง" : "กระดองเต่า";
  if (!spots) return base;
  const spotted: Record<string, ColorLabel> = {
    ดำ: "ขาวดำ", เทา: "ขาวเทา", ส้ม: "ขาวส้ม", ครีม: "ขาวครีม", กระดองเต่า: "สามสี", กระดองเต่าจาง: "สามสีจาง",
  };
  return spotted[base]!;
}
