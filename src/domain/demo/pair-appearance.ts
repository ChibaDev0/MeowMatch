import type { CatView } from "@/features/cats/types";
import { coatTypeDemoRuleset } from "@/domain/genetics/rules/coat-type.demo";
import { scenarioBounds } from "@/domain/genetics/inference/scenario";

export const PAIR_TRAITS = [
  { key: "coatColor", label: "สีขน" },
  { key: "coatPattern", label: "ลวดลายขน" },
  { key: "coat", label: "ความยาวขน" },
  { key: "eye", label: "สีตา" },
  { key: "ear", label: "ลักษณะหู" },
] as const;
export type PairTraitKey = (typeof PAIR_TRAITS)[number]["key"];
export type PairParent = Pick<CatView, "id" | "name" | "breed" | "sex" | "coat" | "coatColor" | "coatPattern" | "eye" | "ear">;
export type PairAppearanceTrait = {
  key: PairTraitKey;
  label: string;
  parents: [string, string];
  status: "missing" | "model" | "rule" | "unavailable" | "ai";
  description: string;
  possibilities: { label: string; condition: string; lower?: number; upper?: number }[];
};
export type PairAppearanceResult = {
  parents: [PairParent, PairParent];
  traits: PairAppearanceTrait[];
  warnings: string[];
  source: "basic" | "gemini";
};

export function observed(value?: string | null): string {
  const text = value?.trim() ?? "";
  return ["", "—", "-", "ไม่ทราบ", "ไม่ระบุ", "ไม่ทราบสายพันธุ์"].includes(text) ? "" : text;
}

/** Copy only the fields shown to the user; don't serialize photos or ownership metadata. */
export function pairParent(cat: CatView): PairParent {
  return { id: cat.id, name: cat.name, breed: observed(cat.breed), sex: cat.sex,
    coat: observed(cat.coat), coatColor: observed(cat.coatColor), coatPattern: observed(cat.coatPattern),
    eye: observed(cat.eye), ear: observed(cat.ear) };
}

/** Limited sex-linked orange model: only unambiguous black/orange inputs, no numeric prior.
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC12187551/
 * Masking, dilution, spotting, exceptional chromosomes and other colors are outside this rule.
 */
function simpleColorPossibilities(parents: [PairParent, PairParent]): PairAppearanceTrait["possibilities"] | null {
  const mother = parents.find((p) => p.sex === "female");
  const father = parents.find((p) => p.sex === "male");
  if (!mother || !father) return null;
  const orange = (value?: string): boolean | null => ["ส้ม", "สีส้ม", "แดง", "สีแดง"].includes(value ?? "") ? true
    : ["ดำ", "สีดำ"].includes(value ?? "") ? false : null;
  const m = orange(mother.coatColor); const f = orange(father.coatColor);
  if (m === null || f === null) return null;
  // A contradictory tortie/calico label must not be treated as a known solid color.
  if (parents.some((p) => /สามสี|กระดองเต่า|tortie|calico/i.test(p.coatPattern ?? ""))) return null;
  return [
    { label: m ? "ลูกเพศผู้: กลุ่มสีส้ม" : "ลูกเพศผู้: กลุ่มสีดำ",
      condition: "ตามแบบจำลองสีส้ม ลูกเพศผู้รับส่วนกำหนดสีนี้จากแม่ เฉดเข้มหรือจางยังขึ้นกับปัจจัยอื่น" },
    { label: m !== f ? "ลูกเพศเมีย: กลุ่มสีกระดองเต่า" : m ? "ลูกเพศเมีย: กลุ่มสีส้ม" : "ลูกเพศเมีย: กลุ่มสีดำ",
      condition: m !== f ? "ได้รับส่วนกำหนดสีส้มและไม่ส้มจากพ่อแม่คนละฝ่าย อาจเห็นปื้นสองสี; จะเป็นสามสีต้องมีแต้มขาวร่วมด้วย"
        : "ตามแบบจำลองพ่อแม่ส่งส่วนกำหนดสีในกลุ่มเดียวกัน ส่วนเฉดและแต้มขาวยังสรุปไม่ได้" },
  ];
}

export function describePair(a: CatView, b: CatView): PairAppearanceResult {
  const parents: [PairParent, PairParent] = [pairParent(a), pairParent(b)];
  const warnings: string[] = [];
  if (a.sex === "unknown" || b.sex === "unknown") warnings.push("ยังไม่ทราบเพศของแมวครบทั้งคู่ ผลนี้เป็นเพียงสถานการณ์สมมติ");
  if (a.ear === "หูพับ" || b.ear === "หูพับ") warnings.push("คู่นี้มีแมวหูพับ: ผลด้านล่างอธิบายรูปลักษณ์ที่อาจพบ ไม่ใช่คำแนะนำให้ผสมพันธุ์ ควรปรึกษาสัตวแพทย์เรื่องสุขภาพก่อนตัดสินใจ");
  const traits = PAIR_TRAITS.map(({ key, label }): PairAppearanceTrait => {
    const values: [string, string] = [observed(a[key]), observed(b[key])];
    const missing = values.map((v, i) => v ? "" : parents[i]!.name).filter(Boolean);
    const trait: PairAppearanceTrait = {
      key, label, parents: values, status: missing.length ? "missing" : "unavailable",
      description: missing.length
        ? `ยังไม่มีข้อมูล${label}ของ ${missing.join(" และ ")} จึงยังระบุลักษณะลูกในหมวดนี้ไม่ได้`
        : "มีข้อมูลของทั้งคู่แล้ว แต่ยังสร้างคำอธิบายความเป็นไปได้ไม่ได้ กรุณาลองวิเคราะห์อีกครั้ง",
      possibilities: [],
    };
    if (key === "coatColor") {
      const possibilities = simpleColorPossibilities(parents);
      if (possibilities) {
        trait.status = "rule";
        trait.description = "แยกกลุ่มสีตามเพศลูกจากข้อมูลสีดำ–สีส้มของพ่อแม่ ภายใต้แบบจำลองอย่างง่าย ไม่รวมสีที่ถูกบัง เฉดสีจาง และกรณีพิเศษ จึงยังไม่ให้เปอร์เซ็นต์";
        trait.possibilities = possibilities;
      }
    }
    if (key === "ear" && values.every((v) => ["หูตั้ง", "หูพับ"].includes(v))) {
      trait.status = "rule";
      trait.description = "อธิบายลักษณะหูจากข้อมูลที่บันทึก ไม่สามารถระบุโอกาสเป็นตัวเลขหรือสรุปสุขภาพจากรูปหูได้";
      trait.possibilities = [{ label: "หูตั้ง", condition: "เป็นลักษณะที่อาจพบได้ แต่รูปร่างหูของพ่อแม่อย่างเดียวไม่รับรองรูปหูของลูก" }];
      if (values.includes("หูพับ")) trait.possibilities.push({ label: "หูพับ", condition: "อาจได้รับลักษณะหูพับจากฝ่ายที่หูพับ การแสดงความเป็นไปได้นี้ไม่ใช่คำแนะนำให้ผสมพันธุ์" });
    }
    if (key === "coat") {
      const rule = coatTypeDemoRuleset;
      const aa = rule.phenotypeToGenotypes(values[0]);
      const bb = rule.phenotypeToGenotypes(values[1]);
      if (aa?.length && bb?.length) {
        const bounds = scenarioBounds(aa, bb, rule);
        trait.status = "model";
        trait.description = "ช่วงโอกาสจากแบบจำลองขนสั้น–ขนยาวอย่างง่าย แต่ละช่วงแทนหลายกรณีที่เป็นไปได้ ไม่ใช่เปอร์เซ็นต์ที่ยืนยันสำหรับลูกจริง";
        trait.possibilities = rule.outcomes.flatMap((o) => {
          const range = bounds.get(o.code)!;
          return range.upper > 0 ? [{ label: o.labelTh ?? o.code, condition: "ภายใต้สมมติฐานของแบบจำลองความยาวขน", ...range }] : [];
        });
      }
    }
    return trait;
  });
  return { parents, traits, warnings, source: "basic" };
}
