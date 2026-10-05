/**
 * DEMO ruleset — ความยาวขน single-locus autosomal recessive (ตัวอย่างคณิตศาสตร์)
 *
 * ⚠️ verified = false โดยเจตนา: นี่คือ "ตัวอย่างเพื่อทดสอบคณิตศาสตร์เท่านั้น"
 *    (MeowMatch/07-genetics-engine §โหมด A, §ขอบเขตตามลักษณะ) ไม่ใช่กฎ FGF5 ครบทุก variant
 *    และไม่ใช่ผลสำหรับแมวจริงของผู้ใช้ ขนยาวในแมวสัมพันธ์กับ FGF5 หลาย variant
 *    ที่ต้องตรวจทีละชุดและผ่านผู้เชี่ยวชาญ (RES-01) ก่อนตั้ง verified=true
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
    "โมเดลสาธิต single-locus สองอัลลีล (L เด่น/l ด้อย) autosomal แยกเท่าเทียม 50/50",
    "ขนยาวเมื่อ l/l เท่านั้น (ไม่มี penetrance ไม่สมบูรณ์ ไม่มี mutation/selection)",
    "ยังไม่ครอบคลุม FGF5 variant จริงทั้งหมด และยังไม่ผ่านการตรวจรับของผู้เชี่ยวชาญ",
  ],
};
