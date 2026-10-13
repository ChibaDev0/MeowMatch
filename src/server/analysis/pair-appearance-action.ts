"use server";
import { getMyCats, getLikedCats } from "@/server/cats/queries";
import { analysisCatIdSchema } from "./map";
import { describePair, type PairAppearanceResult } from "@/domain/demo/pair-appearance";
import { addPairGemini } from "./pair-gemini";

export async function analyzePairAppearanceAction(aId: string, bId: string): Promise<
  { ok: true; result: PairAppearanceResult } | { ok: false; error: string }
> {
  const aKey = analysisCatIdSchema.safeParse(aId);
  const bKey = analysisCatIdSchema.safeParse(bId);
  if (!aKey.success || !bKey.success) return { ok: false, error: "กรุณาเลือกแมวให้ครบสองตัว" };
  if (aKey.data === bKey.data) return { ok: false, error: "เลือกแมวตัวเดียวกันไม่ได้" };
  try {
    const [mine, liked] = await Promise.all([getMyCats(), getLikedCats()]);
    const a = mine.find((c) => c.id === aKey.data);
    const b = [...mine, ...liked].find((c) => c.id === bKey.data);
    if (!a || !b) return { ok: false, error: "เลือกแมวของคุณเป็นตัวแรก และแมวของคุณหรือแมวที่กดใจเป็นตัวที่สอง" };
    if (a.sex !== "unknown" && a.sex === b.sex) return { ok: false, error: "แมวที่เลือกเป็นเพศเดียวกัน กรุณาเลือกเพศผู้และเพศเมีย" };
    return { ok: true, result: await addPairGemini(describePair(a, b)) };
  } catch { return { ok: false, error: "อ่านข้อมูลแมวไม่สำเร็จ กรุณาลองใหม่" }; }
}
