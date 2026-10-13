/**
 * ชุดกฎทดลอง — ความยาวขน single-locus autosomal recessive
 *
 * โปรเจกต์นี้เป็น "การทดลองความน่าจะเป็น" ไม่ใช่เครื่องมือ DNA/พันธุกรรมคลินิก
 * โมเดลนี้จึงเป็นตัวอย่างตำราเพื่อคำนวณโอกาสของลักษณะที่ลูกจะได้ ไม่ใช่ผลตรวจจริงของแมว
 * (ความยาวขนจริงสัมพันธ์กับ FGF5 หลาย variant — ที่นี่ย่อเป็นโมเดลอัลลีลเดียวเพื่อการคำนวณ)
 *
 * โมเดล: allele L (เด่น, ขนสั้น) และ l (ด้อย, ขนยาว); ขนยาวเมื่อ l/l เท่านั้น
 */
import type { Genotype } from "../transmission/mendelian";
import { genotypeKey } from "../transmission/mendelian";
import type { PhenotypeRuleset } from "./types";

const SHORT = { code: "short", labelTh: "ขนสั้น" } as const;
const LONG = { code: "long", labelTh: "ขนยาว" } as const;

/**
 * รูปลักษณ์ที่เจ้าของกรอก (ข้อความ) → ชุด genotype ที่สอดคล้อง
 * ใช้ canonical label แบบตรงตัว (P5-06): ค่ากำกวม เช่น "ไม่ทราบว่าขนสั้นหรือยาว"
 * (มีทั้ง "สั้น" และ "ยาว") ต้องคืน null เป็น insufficient_data ไม่เดาข้างใดข้างหนึ่ง
 */
function phenotypeToGenotypes(label: string | undefined): Genotype[] | null {
  if (!label) return null;
  const t = label.trim();
  const hasLong = t.includes("ยาว");
  const hasShort = t.includes("สั้น");
  if (hasLong && hasShort) return null; // กำกวม → ข้อมูลไม่พอ
  if (t === "ขนยาว") return [["l", "l"]]; // ขนยาว = l/l แน่นอน
  if (t === "ขนสั้น") return [["L", "L"], ["L", "l"]]; // ขนสั้น = L/L หรือพาหะ L/l
  return null; // ไม่รู้จักค่า → insufficient_data
}

const LONG_KEY = genotypeKey(["l", "l"]);

export const coatTypeDemoRuleset: PhenotypeRuleset = {
  category: "coat_type",
  id: "coat_type.fgf5_recessive_demo",
  version: "0.1.0-demo",
  verified: false,
  alleles: ["L", "l"],
  outcomes: [SHORT, LONG],
  phenotypeToGenotypes,
  genotypeToOutcome: (g: Genotype) => (genotypeKey(g) === LONG_KEY ? LONG : SHORT),
  references: ["UC Davis VGL — Long Hair (FGF5): https://vgl.ucdavis.edu/test/long-hair-cat"],
  assumptions: [
    "โมเดลทดลอง single-locus สองอัลลีล (L เด่น/l ด้อย) autosomal แยกเท่าเทียม 50/50",
    "ขนยาวเมื่อ l/l เท่านั้น (ไม่มี penetrance ไม่สมบูรณ์ ไม่มี mutation/selection)",
    "เป็นการประมาณเพื่อคำนวณความน่าจะเป็น ไม่ครอบคลุม FGF5 variant จริงทั้งหมด",
  ],
};
