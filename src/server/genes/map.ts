import type { CatView } from "@/features/cats/types";
import type { Parent } from "@/domain/genes/cross";

/** แปลงแมวที่อ่านจากฐานข้อมูลเป็นข้อมูลสำหรับแบบจำลองยีน (เฉพาะหน้าตา + ยีนที่เจ้าของระบุ) */
export function catToParent(cat: CatView): Parent {
  return {
    name: cat.name,
    appearance: {
      sex: cat.sex,
      coat: cat.coat,
      ear: cat.ear,
      eye: cat.eye,
      coatColor: cat.coatColor,
      coatPattern: cat.coatPattern,
    },
    genes: cat.genes ?? {},
  };
}
