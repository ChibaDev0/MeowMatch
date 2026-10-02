import { z } from "zod";
import { CAT_SEX, NEUTER_STATUS, TRAIT_POSITION, uuid } from "./common";

/**
 * Schema ของแมว — อ้างอิง MeowMatch/00-prd (CAT-02) และ MeowMatch/06-database (cats, cat_traits)
 * breed_id / trait_option_id อ้างตารางอ้างอิง; server ตรวจว่า id มีอยู่จริงอีกชั้น
 */

const traitRef = z.object({
  traitOptionId: z.number().int().positive(),
  position: z.enum(TRAIT_POSITION).optional(), // สำหรับตาสองสี
});

/** ฟิลด์หลักของแมว (ไม่รวมอายุ) */
const catFields = {
  name: z.string().trim().min(1, "กรอกชื่อแมว").max(80, "ชื่อยาวเกิน 80 ตัวอักษร"),
  breedId: z.number().int().positive(),
  sex: z.enum(CAT_SEX),
  neuterStatus: z.enum(NEUTER_STATUS),
  coatTypeId: z.number().int().positive(),
  earTypeId: z.number().int().positive(),
  temperamentNote: z.string().trim().max(500).optional(),
  // สีขนหลายค่า/สีตา/ลวดลาย/นิสัย ผ่านตาราง cat_traits
  traits: z.array(traitRef).max(50).default([]),
} as const;

/** ฟิลด์อายุ — เลือกวันเกิด หรืออายุประมาณการ อย่างใดอย่างหนึ่ง (06-database constraint) */
const ageFields = {
  birthDate: z.coerce.date().max(new Date(), "วันเกิดต้องไม่อยู่ในอนาคต").optional(),
  estimatedAgeMonths: z.number().int().min(0, "อายุต้องไม่ติดลบ").optional(),
  ageRecordedOn: z.coerce.date().optional(),
} as const;

export const createCatSchema = z
  .object({ ...catFields, ...ageFields })
  .refine((v) => v.birthDate != null || v.estimatedAgeMonths != null, {
    message: "ระบุวันเกิด หรืออายุประมาณการอย่างใดอย่างหนึ่ง",
  })
  .refine((v) => v.estimatedAgeMonths == null || v.ageRecordedOn != null, {
    message: "อายุประมาณการต้องมีวันที่อ้างอิง",
    path: ["ageRecordedOn"],
  });
export type CreateCatInput = z.infer<typeof createCatSchema>;

/** แก้ไข: ทุกฟิลด์เป็น optional + id และ version (optimistic concurrency ตรงกับ cats.version) */
export const updateCatSchema = z
  .object({ ...catFields, ...ageFields })
  .partial()
  .extend({
    id: uuid,
    version: z.number().int().nonnegative(),
  });
export type UpdateCatInput = z.infer<typeof updateCatSchema>;
