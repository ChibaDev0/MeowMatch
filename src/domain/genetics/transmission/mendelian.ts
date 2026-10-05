/**
 * Mendelian Exact Enumeration — single autosomal locus (ฟังก์ชันบริสุทธิ์)
 *
 * นี่คือ "คณิตศาสตร์ของการถ่ายทอด" ตามเอกสาร MeowMatch/10-algorithm-design §1
 * แจกแจง gamete ของแต่ละฝ่าย จับคู่ทุกแบบ คูณน้ำหนัก แล้วรวม genotype ที่เทียบเท่ากัน
 *
 * ⚠️ ขอบเขต: รองรับ "หนึ่ง locus, สอง allele, autosomal, แยกเท่าเทียม 50/50" เท่านั้น
 * การแปลง genotype → phenotype (เช่นกฎ FGF5 ของขนยาว) เป็นคนละชั้นและต้องผ่าน
 * การตรวจรับของผู้เชี่ยวชาญก่อนเปิดใช้ (GEN-02/RES-01) — ไฟล์นี้ไม่ตัดสินลักษณะที่แสดงออก
 */

/** allele แทนด้วย string สั้น เช่น "A"/"a" — ความหมายทางชีววิทยากำหนดในชั้น ruleset */
export type Allele = string;

/** genotype หนึ่ง locus = คู่ allele (ไม่สนลำดับ) */
export type Genotype = readonly [Allele, Allele];

/** การกระจาย genotype พร้อมน้ำหนักความน่าจะเป็น (คีย์คือ genotype แบบ normalize) */
export type GenotypeDistribution = ReadonlyMap<string, number>;

/** normalize genotype ให้ไม่ขึ้นกับลำดับ allele: ["a","A"] → "A/a" */
export function genotypeKey([x, y]: Genotype): string {
  return [x, y].sort().join("/");
}

/** gamete distribution ของพ่อแม่หนึ่งฝ่าย: ส่ง allele แต่ละตัวด้วยโอกาส 1/2 */
function gametes([x, y]: Genotype): ReadonlyMap<Allele, number> {
  const g = new Map<Allele, number>();
  g.set(x, (g.get(x) ?? 0) + 0.5);
  g.set(y, (g.get(y) ?? 0) + 0.5);
  return g;
}

/**
 * คืนการกระจาย genotype ของลูกจากพ่อแม่สองฝ่าย (single locus)
 * ผลรวมของความน่าจะเป็นเท่ากับ 1 เสมอ (ตรวจใน test)
 */
export function offspringGenotypes(
  mother: Genotype,
  father: Genotype,
): GenotypeDistribution {
  const out = new Map<string, number>();
  for (const [mAllele, mProb] of gametes(mother)) {
    for (const [fAllele, fProb] of gametes(father)) {
      const key = genotypeKey([mAllele, fAllele]);
      out.set(key, (out.get(key) ?? 0) + mProb * fProb);
    }
  }
  return out;
}

/** แยก genotype key (เช่น "A/a") กลับเป็นคู่ allele — ใช้เมื่อแปลงผ่าน phenotype rules */
export function parseGenotypeKey(key: string): Genotype {
  const parts = key.split("/");
  return [parts[0] ?? "", parts[1] ?? ""] as const;
}

/**
 * โอกาสพบลักษณะเป้าหมายอย่างน้อยหนึ่งตัวในลูก n ตัว เมื่อโอกาสต่อลูกหนึ่งตัว = p
 * สูตร 1 − (1 − p)^n (MeowMatch/07-genetics-engine §"ต้องผสมกี่ครั้ง")
 * ⚠️ สมมติผลลูกแต่ละตัวเป็นอิสระและ p คงที่ — ใช้เฉพาะเมื่อ "ทราบ genotype พ่อแม่แน่นอน"
 *    กรณี genotype พ่อแม่ไม่ทราบต้องรวมผ่าน joint posterior ไม่เอา marginal p มาแทนตรงๆ
 */
export function atLeastOneInLitter(p: number, n: number): number {
  if (p < 0 || p > 1) throw new RangeError("p ต้องอยู่ใน [0,1]");
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n ต้องเป็นจำนวนเต็ม ≥ 0");
  return 1 - Math.pow(1 - p, n);
}

/**
 * จำนวนลูกเชิงคณิตศาสตร์ที่ทำให้โอกาสพบเป้าหมายอย่างน้อยหนึ่งตัว ≥ q
 * สูตร ceil(log(1−q) / log(1−p)) เฉพาะ 0 < p < 1 และ 0 < q < 1
 * (MeowMatch/07-genetics-engine) — เป็นคำอธิบายเชิงคณิต ไม่ใช่คำสั่งให้ผสมจริง
 *   p = 0 → ไม่มีวันถึงเป้าหมาย (คืน null); p ≥ 1 → ถึงแล้วตั้งแต่ตัวแรก (คืน 1)
 */
export function littersForTargetProbability(p: number, q: number): number | null {
  if (q <= 0) return 0;
  if (q >= 1) throw new RangeError("q ต้องน้อยกว่า 1 (ความแน่นอน 100% ไม่การันตีได้)");
  if (p <= 0) return null;
  if (p >= 1) return 1;
  return Math.ceil(Math.log(1 - q) / Math.log(1 - p));
}
