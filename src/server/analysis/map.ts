import { z } from "zod";
import type { TraitCategory } from "@/lib/validation/common";
import type { AnalysisParent } from "@/domain/genetics/contracts/input";
import type { CatView } from "@/features/cats/types";

/**
 * Schema ตรวจ payload ที่ขอบ server action (P5-06) — ไม่เชื่อ TypeScript อย่างเดียว
 * cat id รองรับทั้ง uuid จริงและ id สาธิต (c1/d1) จึงตรวจเป็น string ปลอดภัยความยาวจำกัด
 */
export const analysisCatIdSchema = z.string().trim().min(1).max(64);
export const targetLabelsSchema = z.object({
  coat: z.string().trim().max(64).optional(),
  eye: z.string().trim().max(64).optional(),
  ear: z.string().trim().max(64).optional(),
});
export const analysisOptsSchema = z.object({ demo: z.boolean().optional() }).optional();

/**
 * ตัวช่วยแปลงข้อมูลสำหรับชั้นวิเคราะห์ (ใช้ร่วมกันระหว่าง pair/target action)
 * แยกออกจากไฟล์ "use server" เพราะ export ที่ไม่ใช่ async action ต้องไม่อยู่ในนั้น
 */

/** map รูปลักษณ์ข้อความใน CatView → phenotype ต่อหมวดที่ engine รับ */
export function catToParent(cat: CatView): AnalysisParent {
  return {
    catId: cat.id,
    name: cat.name,
    sex: cat.sex,
    phenotype: {
      coat_type: cat.coat,
      eye_color: cat.eye,
      ear_type: cat.ear,
    },
  };
}

/** หมวดที่วิเคราะห์ (ตัด temperament — ไม่คำนวณพันธุกรรมเป็นเปอร์เซ็นต์) */
export const ANALYZED_CATEGORIES: readonly TraitCategory[] = [
  "coat_type",
  "coat_color",
  "coat_pattern",
  "eye_color",
  "ear_type",
];

/** map ป้ายภาษาไทยที่ผู้ใช้เลือก → outcome code ภายในต่อหมวด (ค่าที่ไม่รู้จักส่งต่อเป็น code ตรง → unsupported) */
const LABEL_TO_CODE: Partial<Record<TraitCategory, Record<string, string>>> = {
  coat_type: { ขนสั้น: "short", ขนยาว: "long", ไม่มีขน: "hairless" },
};

export function targetLabelToCode(category: TraitCategory, label: string): string {
  return LABEL_TO_CODE[category]?.[label] ?? label;
}
