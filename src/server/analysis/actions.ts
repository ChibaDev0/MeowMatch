"use server";

import type { PairAnalysisResult } from "@/domain/genetics/contracts/types";
import { analyzePair } from "@/domain/genetics/pair/analyze";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import { ANALYZED_CATEGORIES, analysisCatIdSchema, analysisOptsSchema, catToParent } from "./map";

/**
 * วิเคราะห์คู่ (PAIR-01) — ชั้น server เป็นผู้ "ตรวจสิทธิ์" ก่อนส่งให้ engine (07-genetics-engine §A)
 *  - A ต้องเป็นแมวของผู้ใช้; B เป็นของตนหรือแมวที่กดใจไว้
 *  - ไม่รับ genotype จาก client (ยังไม่มีข้อมูล DNA) — ส่งเฉพาะรูปลักษณ์ที่เจ้าของกรอก
 *  - engine เป็นฟังก์ชันบริสุทธิ์ ไม่แตะ DB/LLM; ชั้นนี้แค่เตรียม input และคืนผล
 */

export type PairAnalysisResponse =
  | { ok: true; result: PairAnalysisResult }
  | { ok: false; error: string };

export async function analyzePairAction(
  aId: string,
  bId: string,
  opts?: { demo?: boolean },
): Promise<PairAnalysisResponse> {
  // ตรวจ payload ตอน runtime ก่อน (P5-06)
  const aParsed = analysisCatIdSchema.safeParse(aId);
  const bParsed = analysisCatIdSchema.safeParse(bId);
  if (!aParsed.success || !bParsed.success) {
    return { ok: false, error: "กรุณาเลือกแมวให้ครบสองตัว" };
  }
  if (!analysisOptsSchema.safeParse(opts).success) {
    return { ok: false, error: "ตัวเลือกไม่ถูกต้อง" };
  }
  aId = aParsed.data;
  bId = bParsed.data;
  if (aId === bId) return { ok: false, error: "เลือกแมวตัวเดียวกันไม่ได้" };

  const [myCats, likedCats] = await Promise.all([getMyCats(), getLikedCats()]);

  const a = myCats.find((c) => c.id === aId);
  if (!a) return { ok: false, error: "แมวตัวที่ 1 ต้องเป็นแมวของคุณ" };

  const b =
    myCats.find((c) => c.id === bId) ?? likedCats.find((c) => c.id === bId);
  if (!b) return { ok: false, error: "แมวตัวที่ 2 ต้องเป็นแมวของคุณหรือแมวที่กดใจไว้" };

  const result = analyzePair({
    categories: ANALYZED_CATEGORIES,
    a: catToParent(a),
    b: catToParent(b),
    allowUnverifiedRulesets: opts?.demo ?? false,
  });

  return { ok: true, result };
}
