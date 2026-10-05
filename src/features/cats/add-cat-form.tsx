import { CatForm } from "./cat-form";

/**
 * ฟอร์มเพิ่มแมว (CAT-01 + MEDIA-01) — บางลงเป็น wrapper ของ CatForm โหมด create
 * ตรรกะทั้งหมด (ฟิลด์ + อัปโหลดรูป) อยู่ใน cat-form.tsx ใช้ร่วมกับหน้าแก้ไข
 */
export function AddCatForm() {
  return <CatForm mode="create" />;
}
