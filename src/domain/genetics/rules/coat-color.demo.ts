/**
 * ชุดกฎทดลอง — ความเข้มสีขน single-locus autosomal recessive (dilution locus)
 *
 * โปรเจกต์นี้เป็น "การทดลองความน่าจะเป็น" ไม่ใช่เครื่องมือ DNA/พันธุกรรมคลินิก
 * โมเดลนี้จึงเป็นตัวอย่างตำราเพื่อคำนวณโอกาสของลักษณะที่ลูกจะได้ ไม่ใช่ผลตรวจจริงของแมว
 *
 * โมเดล: allele D (เด่น, สีเข้ม) และ d (ด้อย, สีจาง); สีจางเมื่อ d/d เท่านั้น
 *   (ตัวอย่างคลาสสิก: ดำ→น้ำเงิน/เทา, แดง→ครีม เมื่อได้ d/d)
 */
import type { Genotype } from "../transmission/mendelian";
import { genotypeKey } from "../transmission/mendelian";
import type { PhenotypeRuleset } from "./types";

const DENSE = { code: "dense", labelTh: "สีเข้ม" } as const;
const DILUTE = { code: "dilute", labelTh: "สีจาง" } as const;

/**
 * รูปลักษณ์ที่เจ้าของกรอก (ข้อความ) → ชุด genotype ที่สอดคล้อง
 * ใช้ canonical label แบบตรงตัว: ค่ากำกวม (มีทั้ง "เข้ม" และ "จาง") ต้องคืน null
 * เป็น insufficient_data ไม่เดาข้างใดข้างหนึ่ง
 */
function phenotypeToGenotypes(label: string | undefined): Genotype[] | null {
  if (!label) return null;
  const t = label.trim();
  const hasDilute = t.includes("จาง");
  const hasDense = t.includes("เข้ม");
  if (hasDilute && hasDense) return null; // กำกวม → ข้อมูลไม่พอ
  if (t === "สีจาง") return [["d", "d"]]; // สีจาง = d/d แน่นอน
  if (t === "สีเข้ม") return [["D", "D"], ["D", "d"]]; // สีเข้ม = D/D หรือพาหะ D/d
  return null; // ไม่รู้จักค่า → insufficient_data
}

const DILUTE_KEY = genotypeKey(["d", "d"]);

export const coatColorDemoRuleset: PhenotypeRuleset = {
  category: "coat_color",
  id: "coat_color.dilution_recessive_demo",
  version: "0.1.0-demo",
  verified: false,
  alleles: ["D", "d"],
  outcomes: [DENSE, DILUTE],
  phenotypeToGenotypes,
  genotypeToOutcome: (g: Genotype) => (genotypeKey(g) === DILUTE_KEY ? DILUTE : DENSE),
  references: ["UC Davis VGL — Dilute (MLPH): https://vgl.ucdavis.edu/test/dilute-cat"],
  assumptions: [
    "โมเดลทดลอง single-locus สองอัลลีล (D เด่น/d ด้อย) autosomal แยกเท่าเทียม 50/50",
    "สีจางเมื่อ d/d เท่านั้น (ไม่คิด modifier อื่น ไม่มี penetrance ไม่สมบูรณ์)",
    "ดูเฉพาะแกน dilution — ไม่ครอบคลุม locus สีอื่น (B, O, agouti ฯลฯ) ที่ร่วมกำหนดสีจริง",
  ],
};
