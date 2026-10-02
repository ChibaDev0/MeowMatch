import { z } from "zod";

/**
 * ชนิดข้อมูลร่วมและ enum ที่ใช้ทั้ง client และ server
 * อ้างอิง: MeowMatch/06-database (trait_options.category, cats.*)
 * ค่า code จริงของ breed/trait มาจากตารางอ้างอิง (seed.sql) — ที่นี่เก็บเฉพาะหมวดและสถานะ
 */

/** หมวดของ trait_options — ใช้ตรวจว่า trait ตรงช่องที่ถูกต้อง (เช่น สีขนห้ามอยู่ช่องหู) */
export const TRAIT_CATEGORIES = [
  "eye_color",
  "coat_color",
  "coat_pattern",
  "coat_type",
  "ear_type",
  "temperament",
] as const;
export type TraitCategory = (typeof TRAIT_CATEGORIES)[number];

/** เพศทางชีวภาพ — รองรับ "ไม่ทราบ" ตามข้อเสนอใน PRD */
export const CAT_SEX = ["male", "female", "unknown"] as const;
export type CatSex = (typeof CAT_SEX)[number];

export const NEUTER_STATUS = ["intact", "neutered", "unknown"] as const;
export type NeuterStatus = (typeof NEUTER_STATUS)[number];

/** ตำแหน่งของ trait (รองรับตาสองสี) */
export const TRAIT_POSITION = ["left_eye", "right_eye"] as const;

export const uuid = z.string().uuid();

/** Username: a-z, 0-9, underscore 3–30 ตัว (ข้อเสนอใน 06-database) — normalize เป็น lowercase */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "ใช้ a–z, 0–9 และ _ ความยาว 3–30 ตัว");

/** รหัสผ่าน: ขั้นต่ำเชิงความปลอดภัย — ปรับนโยบายจริงตาม DEC-01 */
export const passwordSchema = z
  .string()
  .min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร")
  .max(72, "รหัสผ่านยาวเกินไป");
