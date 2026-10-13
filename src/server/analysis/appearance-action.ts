"use server";

import { z } from "zod";
import { getMyCats } from "@/server/cats/queries";
import { estimateAppearance, type AppearanceResult } from "@/domain/demo/appearance";
import { analysisCatIdSchema } from "./map";
import { addGeminiGuidance } from "./gemini-guidance";

const text = z.string().trim().max(100);
const schema = z.object({ breed: text, eye: text, coat: text, ear: text }).strict();

export async function analyzeAppearanceAction(
  sourceId: string,
  target: unknown,
): Promise<{ ok: true; result: AppearanceResult } | { ok: false; error: string }> {
  const id = analysisCatIdSchema.safeParse(sourceId);
  const goal = schema.safeParse(target);
  if (!id.success || !goal.success) return { ok: false, error: "ข้อมูลเป้าหมายไม่ถูกต้อง" };
  if (!Object.values(goal.data).some(Boolean))
    return { ok: false, error: "เลือกเป้าหมายอย่างน้อยหนึ่งลักษณะ" };
  try {
    // แมวต้นทาง = แมวที่ผู้ใช้เลือก — ใช้ข้อมูลที่บันทึกไว้ของแมวตัวนั้นตรง ๆ
    const source = (await getMyCats()).find((cat) => cat.id === id.data);
    if (!source) return { ok: false, error: "กรุณาเลือกแมวของคุณ" };
    const appearance = { breed: source.breed, coat: source.coat, ear: source.ear, eye: source.eye };
    return {
      ok: true,
      result: await addGeminiGuidance(appearance, estimateAppearance(appearance, goal.data)),
    };
  } catch {
    return { ok: false, error: "อ่านข้อมูลแมวไม่สำเร็จ กรุณาลองใหม่" };
  }
}
