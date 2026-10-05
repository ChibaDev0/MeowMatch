"use server";

import { TRAIT_CATEGORIES } from "@/lib/validation/common";
import type { TraitCategory } from "@/lib/validation/common";
import type { PairAnalysisResult } from "@/domain/genetics/contracts/types";
import type { AnalysisParent } from "@/domain/genetics/contracts/input";
import { analyzePair } from "@/domain/genetics/pair/analyze";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import type { CatView } from "@/features/cats/types";

/**
 * วิเคราะห์คู่ (PAIR-01) — ชั้น server เป็นผู้ "ตรวจสิทธิ์" ก่อนส่งให้ engine (07-genetics-engine §A)
 *  - A ต้องเป็นแมวของผู้ใช้; B เป็นของตนหรือแมวที่กดใจไว้
 *  - ไม่รับ genotype จาก client (ยังไม่มีข้อมูล DNA) — ส่งเฉพาะรูปลักษณ์ที่เจ้าของกรอก
 *  - engine เป็นฟังก์ชันบริสุทธิ์ ไม่แตะ DB/LLM; ชั้นนี้แค่เตรียม input และคืนผล
 */

export type PairAnalysisResponse =
  | { ok: true; result: PairAnalysisResult }
  | { ok: false; error: string };

/** หมวดที่วิเคราะห์ในหน้า breeding (ตัด temperament ออก — ไม่คำนวณพันธุกรรมเป็นเปอร์เซ็นต์) */
const ANALYZED_CATEGORIES: readonly TraitCategory[] = TRAIT_CATEGORIES.filter(
  (c) => c !== "temperament",
);

/** map รูปลักษณ์ข้อความใน CatView → phenotype ต่อหมวดที่ engine รับ */
function toParent(cat: CatView): AnalysisParent {
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

export async function analyzePairAction(
  aId: string,
  bId: string,
  opts?: { demo?: boolean },
): Promise<PairAnalysisResponse> {
  if (!aId || !bId) return { ok: false, error: "กรุณาเลือกแมวให้ครบสองตัว" };
  if (aId === bId) return { ok: false, error: "เลือกแมวตัวเดียวกันไม่ได้" };

  const [myCats, likedCats] = await Promise.all([getMyCats(), getLikedCats()]);

  const a = myCats.find((c) => c.id === aId);
  if (!a) return { ok: false, error: "แมวตัวที่ 1 ต้องเป็นแมวของคุณ" };

  const b =
    myCats.find((c) => c.id === bId) ?? likedCats.find((c) => c.id === bId);
  if (!b) return { ok: false, error: "แมวตัวที่ 2 ต้องเป็นแมวของคุณหรือแมวที่กดใจไว้" };

  const result = analyzePair({
    categories: ANALYZED_CATEGORIES,
    a: toParent(a),
    b: toParent(b),
    allowUnverifiedRulesets: opts?.demo ?? false,
  });

  return { ok: true, result };
}
