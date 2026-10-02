/**
 * ⚠️ DEMO DATA — ข้อมูลตัวอย่างสำหรับแสดงหน้าตา UI เท่านั้น
 * ใช้ชั่วคราวระหว่างยังไม่มีฐานข้อมูล/การ query จริง (งาน CAT-01, DISC-01)
 * ให้ลบไฟล์นี้แล้วดึงข้อมูลจริงผ่านชั้น server/repositories เมื่อพร้อม
 */
export type DemoCat = {
  id: string;
  name: string;
  ageLabel: string;
  breed: string;
  coat: string;
  eye: string;
  ear: string;
  liked?: boolean;
};

export const DEMO_MY_CATS: DemoCat[] = [
  { id: "c1", name: "โทฟุ", ageLabel: "8 เดือน", breed: "ผสม", coat: "ขนสั้น", eye: "ตาสีฟ้า", ear: "หูตั้ง" },
  { id: "c2", name: "โมจิ", ageLabel: "1 ปี", breed: "เปอร์เซีย", coat: "ขนยาว", eye: "ตาสีทอง", ear: "หูตั้ง" },
  { id: "c3", name: "ชินะ", ageLabel: "6 เดือน", breed: "ผสม", coat: "ขนสั้น", eye: "ตาสีเขียว", ear: "หูตั้ง" },
];

export const DEMO_DISCOVER_CATS: DemoCat[] = [
  { id: "d1", name: "นาชิ", ageLabel: "1 ปี", breed: "Maine Coon", coat: "ขนยาว", eye: "ตาสีฟ้า", ear: "หูตั้ง" },
  { id: "d2", name: "ทาโอะ", ageLabel: "8 เดือน", breed: "British Shorthair", coat: "ขนสั้น", eye: "ตาสีทอง", ear: "หูตั้ง", liked: true },
  { id: "d3", name: "ซากุระ", ageLabel: "1 ปี", breed: "Scottish Fold", coat: "ขนสั้น", eye: "ตาสีเขียว", ear: "หูพับ" },
  { id: "d4", name: "มิโกะ", ageLabel: "2 ปี", breed: "Ragdoll", coat: "ขนยาว", eye: "ตาสีฟ้า", ear: "หูตั้ง", liked: true },
  { id: "d5", name: "คุโระ", ageLabel: "1 ปี", breed: "American Shorthair", coat: "ขนสั้น", eye: "ตาสีเขียว", ear: "หูตั้ง" },
  { id: "d6", name: "โมจิ", ageLabel: "1 ปี", breed: "Persian", coat: "ขนยาว", eye: "ตาสีทอง", ear: "หูตั้ง" },
];
