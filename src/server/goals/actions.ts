"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Actions ของเป้าหมายลูกแมว (GOAL-01)
 * - server เป็นผู้ตัดสิน: ตรวจว่า "แมวต้นทาง" เป็นของผู้ใช้เองเท่านั้น (กันเลือกแมวคนอื่น)
 * - เก็บเป้าหมายปัจจุบันเป็นแถวเดียวต่อผู้ใช้ (update แถวล่าสุด ถ้ายังไม่มีจึง insert) เพื่อกู้ state ได้
 * - RLS คุมสิทธิ์อีกชั้น (owner_id = auth.uid())
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const nullableText = (max = 80) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).default(null);

const goalSchema = z.object({
  sourceCatId: z.preprocess(emptyToNull, z.string().uuid("รหัสแมวไม่ถูกต้อง").nullable()).default(null),
  targetBreed: nullableText(80),
  targetEyeColor: nullableText(40),
  targetCoat: nullableText(40),
  targetColor: nullableText(40),
  targetEarType: nullableText(40),
});

function readGoalFields(fd: FormData) {
  return {
    sourceCatId: fd.get("sourceCatId"),
    targetBreed: fd.get("targetBreed"),
    targetEyeColor: fd.get("targetEyeColor"),
    targetCoat: fd.get("targetCoat"),
    targetColor: fd.get("targetColor"),
    targetEarType: fd.get("targetEarType"),
  };
}

const SCHEMA_MISSING = "ยังไม่ได้ติดตั้งฐานข้อมูลเป้าหมาย (ต้อง apply migration 0004_features.sql ก่อน)";

export async function saveDesiredGoalAction(fd: FormData): Promise<ActionResult> {
  const parsed = goalSchema.safeParse(readGoalFields(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  // กันเลือกแมวของคนอื่นเป็นต้นทาง — ต้องเป็นแมวที่ owner_id = ผู้ใช้เท่านั้น
  if (v.sourceCatId) {
    const { data: owned, error: ownErr } = await supabase
      .from("cats")
      .select("id")
      .eq("id", v.sourceCatId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (ownErr && ownErr.code === "42P01") return { ok: false, error: SCHEMA_MISSING };
    if (!owned) {
      return { ok: false, error: "เลือกได้เฉพาะแมวของคุณเองเป็นแมวต้นทาง", fieldErrors: { sourceCatId: "ไม่ใช่แมวของคุณ" } };
    }
  }

  const payload = {
    source_cat_id: v.sourceCatId,
    target_breed: v.targetBreed,
    target_eye_color: v.targetEyeColor,
    target_coat: v.targetCoat,
    target_color: v.targetColor,
    target_ear_type: v.targetEarType,
  };

  // แถวล่าสุด = เป้าหมายปัจจุบัน → update ถ้ามี, ไม่มีจึง insert
  const { data: existing, error: selErr } = await supabase
    .from("desired_goals")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr && selErr.code === "42P01") return { ok: false, error: SCHEMA_MISSING };

  const { error } = existing
    ? await supabase.from("desired_goals").update(payload).eq("id", existing.id).eq("owner_id", user.id)
    : await supabase.from("desired_goals").insert({ owner_id: user.id, ...payload });

  if (error) {
    if (error.code === "42P01") return { ok: false, error: SCHEMA_MISSING };
    return { ok: false, error: "บันทึกเป้าหมายไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/desired-cats");
  revalidatePath("/home");
  return { ok: true, message: "บันทึกเป้าหมายสำเร็จ" };
}
