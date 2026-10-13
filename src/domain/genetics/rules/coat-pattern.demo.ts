/**
 * ชุดกฎทดลอง — ลายขน single-locus autosomal recessive (agouti locus)
 *
 * โปรเจกต์นี้เป็น "การทดลองความน่าจะเป็น" ไม่ใช่เครื่องมือ DNA/พันธุกรรมคลินิก
 * โมเดลนี้จึงเป็นตัวอย่างตำราเพื่อคำนวณโอกาสของลักษณะที่ลูกจะได้ ไม่ใช่ผลตรวจจริงของแมว
 *
 * โมเดล: allele A (เด่น, แสดงลายแท็บบี้) และ a (ด้อย, สีพื้น/non-agouti); สีพื้นเมื่อ a/a เท่านั้น
 */
import type { Genotype } from "../transmission/mendelian";
import { genotypeKey } from "../transmission/mendelian";
import type { PhenotypeRuleset } from "./types";

const TABBY = { code: "tabby", labelTh: "ลายแท็บบี้" } as const;
const SOLID = { code: "solid", labelTh: "สีพื้น" } as const;

/**
 * รูปลักษณ์ที่เจ้าของกรอก (ข้อความ) → ชุด genotype ที่สอดคล้อง
 * ใช้ canonical label แบบตรงตัว: ค่ากำกวม (มีทั้ง "ลาย" และ "พื้น") ต้องคืน null
 * เป็น insufficient_data ไม่เดาข้างใดข้างหนึ่ง
 */
function phenotypeToGenotypes(label: string | undefined): Genotype[] | null {
  if (!label) return null;
  const t = label.trim();
  const hasTabby = t.includes("ลาย");
  const hasSolid = t.includes("พื้น");
  if (hasTabby && hasSolid) return null; // กำกวม → ข้อมูลไม่พอ
  if (t === "สีพื้น") return [["a", "a"]]; // สีพื้น = a/a แน่นอน
  if (t === "ลาย") return [["A", "A"], ["A", "a"]]; // ลาย = A/A หรือพาหะ A/a
  return null; // ไม่รู้จักค่า → insufficient_data
}

const SOLID_KEY = genotypeKey(["a", "a"]);

export const coatPatternDemoRuleset: PhenotypeRuleset = {
  category: "coat_pattern",
  id: "coat_pattern.agouti_recessive_demo",
  version: "0.1.0-demo",
  verified: false,
  alleles: ["A", "a"],
  outcomes: [TABBY, SOLID],
  phenotypeToGenotypes,
  genotypeToOutcome: (g: Genotype) => (genotypeKey(g) === SOLID_KEY ? SOLID : TABBY),
  references: ["UC Davis VGL — Agouti (ASIP): https://vgl.ucdavis.edu/test/agouti-cat"],
  assumptions: [
    "โมเดลทดลอง single-locus สองอัลลีล (A เด่น/a ด้อย) autosomal แยกเท่าเทียม 50/50",
    "สีพื้น (non-agouti) เมื่อ a/a เท่านั้น; A/* แสดงลายแท็บบี้ (ไม่แยกชนิดลายย่อย)",
    "ไม่รวม epistasis จาก locus อื่น (เช่น white spotting/colorpoint) ที่อาจบังลายจริง",
  ],
};
