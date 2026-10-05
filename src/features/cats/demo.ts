/**
 * ⚠️ DEMO DATA — ใช้เป็น "fallback" เท่านั้น เมื่อยังไม่ได้ apply migration 0003_cats.sql
 * ข้อมูลจริงมาจากตาราง public.cats ผ่าน src/server/cats/queries.ts
 * เมื่อฐานข้อมูลพร้อมและมีข้อมูลจริงแล้ว ไฟล์นี้จะไม่ถูกใช้แสดงผล
 */
import type { CatView } from "./types";

/** รูปทรงเดียวกับ CatView — คงชื่อเดิมไว้เพื่อความเข้ากันได้ของคอมโพเนนต์ */
export type DemoCat = CatView;

export const DEMO_MY_CATS: CatView[] = [
  { id: "c1", name: "โทฟุ", ageLabel: "8 เดือน", breed: "ผสม", coat: "ขนสั้น", eye: "ตาสีฟ้า", ear: "หูตั้ง", sex: "male", isPublic: true },
  { id: "c2", name: "โมจิ", ageLabel: "1 ปี", breed: "เปอร์เซีย", coat: "ขนยาว", eye: "ตาสีทอง", ear: "หูตั้ง", sex: "female", isPublic: true },
  { id: "c3", name: "ชินะ", ageLabel: "6 เดือน", breed: "ผสม", coat: "ขนสั้น", eye: "ตาสีเขียว", ear: "หูตั้ง", sex: "female", isPublic: false },
];

/** แมวตัวอย่าง 3 ตัว คละเพศ (ตรงกับ seed ใน 0003_cats.sql) */
export const DEMO_DISCOVER_CATS: CatView[] = [
  { id: "d1", name: "นาชิ", ageLabel: "1 ปี", breed: "Maine Coon", coat: "ขนยาว", eye: "ตาสีฟ้า", ear: "หูตั้ง", sex: "female" },
  { id: "d2", name: "ทาโอะ", ageLabel: "8 เดือน", breed: "British Shorthair", coat: "ขนสั้น", eye: "ตาสีทอง", ear: "หูตั้ง", sex: "male" },
  { id: "d3", name: "ซากุระ", ageLabel: "1 ปี", breed: "Scottish Fold", coat: "ขนสั้น", eye: "ตาสีเขียว", ear: "หูพับ", sex: "female" },
];
