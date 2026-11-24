"use server";

import { z } from "zod";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import { analysisCatIdSchema } from "@/server/analysis/map";
import { simulatePair, type PairGeneResult } from "@/domain/genes/cross";
import { planMate, type MatePlan } from "@/domain/genes/plan";
import { catToParent } from "./map";

type Result<T> = { ok: true; result: T } | { ok: false; error: string };

/** จำลองลูกจากยีนของแมว 2 ตัว — ตัวแรกต้องเป็นแมวของผู้ใช้ ตัวที่สองเป็นของผู้ใช้หรือแมวที่กดใจ */
export async function simulatePairGenesAction(aId: string, bId: string): Promise<Result<PairGeneResult>> {
  const a = analysisCatIdSchema.safeParse(aId);
  const b = analysisCatIdSchema.safeParse(bId);
  if (!a.success || !b.success) return { ok: false, error: "กรุณาเลือกแมวให้ครบสองตัว" };
  if (a.data === b.data) return { ok: false, error: "เลือกแมวตัวเดียวกันไม่ได้" };
  try {
    const [mine, liked] = await Promise.all([getMyCats(), getLikedCats()]);
    const catA = mine.find((c) => c.id === a.data);
    const catB = [...mine, ...liked].find((c) => c.id === b.data);
    if (!catA || !catB) return { ok: false, error: "เลือกแมวของคุณเป็นตัวแรก และแมวของคุณหรือแมวที่กดใจเป็นตัวที่สอง" };
    if (catA.sex !== "unknown" && catA.sex === catB.sex)
      return { ok: false, error: "แมวที่เลือกเป็นเพศเดียวกัน กรุณาเลือกเพศผู้และเพศเมีย" };
    return { ok: true, result: simulatePair(catToParent(catA), catToParent(catB)) };
  } catch {
    return { ok: false, error: "อ่านข้อมูลแมวไม่สำเร็จ กรุณาลองใหม่" };
  }
}

const text = z.string().trim().max(80).optional().transform((v) => v || undefined);
const targetSchema = z.object({ coat: text, ear: text, color: text, eye: text, breed: text }).strict();

/** หาสเปกแมวคู่จากยีนของแมวตั้งต้น (ของผู้ใช้) + ลักษณะลูกที่ต้องการ */
export async function planMateGenesAction(sourceId: string, target: unknown): Promise<Result<MatePlan>> {
  const id = analysisCatIdSchema.safeParse(sourceId);
  const goal = targetSchema.safeParse(target);
  if (!id.success || !goal.success) return { ok: false, error: "ข้อมูลเป้าหมายไม่ถูกต้อง" };
  try {
    const source = (await getMyCats()).find((c) => c.id === id.data);
    if (!source) return { ok: false, error: "กรุณาเลือกแมวของคุณ" };
    const plan = planMate(catToParent(source), goal.data);
    return "error" in plan ? { ok: false, error: plan.error } : { ok: true, result: plan };
  } catch {
    return { ok: false, error: "คำนวณยีนไม่สำเร็จ กรุณาลองใหม่" };
  }
}
