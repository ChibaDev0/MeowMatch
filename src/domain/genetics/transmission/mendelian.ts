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
