import type { CatSex } from "@/lib/validation/common";

/**
 * รูปแบบข้อมูลแมวที่หน้า UI ใช้แสดงผล (view model)
 * แปลงมาจากแถวในตาราง public.cats ผ่านชั้น server/cats/queries
 * คงรูปทรงเดิมที่คอมโพเนนต์การ์ดใช้อยู่ (name, ageLabel, breed, coat, eye, ear, photo, liked)
 */
export type CatView = {
  id: string;
  name: string;
  ageLabel: string;
  breed: string;
  coat: string;
  eye: string;
  ear: string;
  sex: CatSex;
  liked?: boolean;
  /** true = เผยแพร่ในหน้าหาคู่; false = เจ้าของซ่อนไว้ (ใช้ในหน้า "แมวของฉัน") */
  isPublic?: boolean;
  /** "hidden" = ผู้ดูแลระงับการแสดง (SAFE-01); เจ้าของยังเห็นในแมวของฉัน */
  moderationStatus?: "active" | "hidden";
  /** รูปใน public/ หรือ URL จาก Supabase Storage (ภายหลัง) */
  photo?: string;
};

/**
 * ข้อมูลแมวสำหรับเติมฟอร์มแก้ไข (ค่าดิบตรงกับช่องฟอร์ม ไม่ใช่ view model)
 * อายุถูกแยกเป็นปี/เดือน; photo เป็น URL พร้อมแสดง (resolve แล้ว)
 */
export type CatEditData = {
  id: string;
  name: string;
  breed: string;
  sex: CatSex;
  ageYears: number | null;
  ageMonths: number | null;
  coat: string | null;
  eyeColor: string;
  earType: string;
  temperament: string;
  photo?: string;
};
