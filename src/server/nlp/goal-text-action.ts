"use server";

import { z } from "zod";
import { parseGoalText, type GoalTextResult } from "@/domain/nlp/goal-parser";
import { normalizeThai } from "@/domain/nlp/thai";
import { getUser } from "@/server/auth/session";
import { analyzeWithPyThaiNLP } from "./pythainlp";

const schema = z.string().trim().min(1, "พิมพ์ลักษณะลูกแมวที่อยากได้ก่อน").max(300, "ข้อความยาวเกิน 300 ตัวอักษร");

/** แปลงข้อความภาษาไทยเป็นเป้าหมายลูกแมว (ไม่บันทึก ไม่คำนวณโอกาส — ผู้ใช้ตรวจแล้วกดวิเคราะห์เอง) */
export async function parseGoalTextAction(
  text: unknown,
): Promise<{ ok: true; result: GoalTextResult } | { ok: false; error: string }> {
  const input = schema.safeParse(text);
  if (!input.success) return { ok: false, error: input.error.issues[0]?.message ?? "ข้อความไม่ถูกต้อง" };
  try {
    if (!(await getUser())) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
    const normalized = normalizeThai(input.data);
    const external = await analyzeWithPyThaiNLP(normalized);
    return { ok: true, result: parseGoalText(normalized, external) };
  } catch {
    return { ok: false, error: "วิเคราะห์ข้อความไม่สำเร็จ กรุณาลองใหม่" };
  }
}
