"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  reportSchema,
  resolveReportSchema,
  type ModerationDecision,
} from "@/lib/validation/moderation";

/**
 * Server Actions ของระบบรายงาน/ดูแล (SAFE-01, Phase 6)
 * - สมาชิกรายงานแมว; ห้ามรายงานแมวของตัวเอง; กันรายงานซ้ำขณะยังเปิดอยู่ (abuse limit)
 * - ผู้ดูแลตัดสินผ่าน RPC resolve_report (security definer) ที่ตรวจ is_admin() ภายใน
 * server เป็นผู้ตัดสินเสมอ และ RLS/RPC กันสิทธิ์อีกชั้น
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const SCHEMA_MISSING = "ยังไม่ได้ติดตั้งฐานข้อมูลการรายงาน (apply migration 0008_moderation.sql ก่อน)";

/** จำนวนรายงานที่ยังเปิดอยู่สูงสุดต่อผู้ใช้ (soft cap กันการสแปมรายงาน) */
const MAX_OPEN_REPORTS_PER_USER = 20;

function isMissingSchema(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "42703";
}

/**
 * สมาชิกรายงานแมวหนึ่งตัว (SAFE-01)
 * - ตรวจ input ด้วย zod, ต้องล็อกอิน
 * - ห้ามรายงานแมวของตัวเอง (ตรวจที่ server + RLS with check กันอีกชั้น)
 * - กันรายงานซ้ำขณะยังเปิดอยู่ (unique index → 23505 แปลงเป็นข้อความเป็นมิตร)
 * - soft cap จำนวนรายงานที่เปิดค้างต่อผู้ใช้
 */
export async function reportCatAction(input: {
  catId: string;
  reason: string;
  detail?: string | null;
}): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "ข้อมูลรายงานไม่ถูกต้อง", fieldErrors };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  // ตรวจว่ามีแมวอยู่จริงและไม่ใช่ของตัวเอง (RLS ก็กันซ้ำ แต่ให้ error ชัดฝั่ง UX)
  const { data: cat, error: catErr } = await supabase
    .from("cats")
    .select("id, owner_id")
    .eq("id", v.catId)
    .maybeSingle();
  if (catErr) {
    if (isMissingSchema(catErr)) return { ok: false, error: SCHEMA_MISSING };
    return { ok: false, error: "ตรวจสอบข้อมูลแมวไม่สำเร็จ กรุณาลองใหม่" };
  }
  if (!cat) return { ok: false, error: "ไม่พบแมวที่ต้องการรายงาน" };
  if (cat.owner_id === user.id) return { ok: false, error: "ไม่สามารถรายงานแมวของตัวเองได้" };

  // soft cap: นับรายงานที่ยังเปิดอยู่ของผู้ใช้คนนี้
  const { count, error: countErr } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .in("status", ["open", "reviewing"]);
  if (countErr && isMissingSchema(countErr)) return { ok: false, error: SCHEMA_MISSING };
  if ((count ?? 0) >= MAX_OPEN_REPORTS_PER_USER) {
    return { ok: false, error: "คุณมีรายงานที่รอตรวจจำนวนมากแล้ว กรุณารอผู้ดูแลตรวจก่อน" };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    cat_id: v.catId,
    reason: v.reason,
    detail: v.detail,
  });

  if (error) {
    if (isMissingSchema(error)) return { ok: false, error: SCHEMA_MISSING };
    if (error.code === "23505") {
      return { ok: false, error: "คุณได้รายงานแมวตัวนี้ไว้แล้ว กำลังรอผู้ดูแลตรวจ" };
    }
    // 42501 = RLS ปฏิเสธ (เช่น พยายามรายงานแมวตัวเอง/สวมสิทธิ์ผู้อื่น)
    if (error.code === "42501") return { ok: false, error: "ไม่สามารถรายงานแมวตัวนี้ได้" };
    return { ok: false, error: "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  return { ok: true, message: "ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลชุมชน" };
}

/**
 * ผู้ดูแลตัดสินรายงาน (SAFE-01) — เรียก RPC resolve_report ที่ตรวจ is_admin() ภายใน
 * decision: hide | unhide | dismiss | reviewing | reopen
 */
export async function resolveReportAction(input: {
  reportId: string;
  decision: string;
  note?: string | null;
}): Promise<ActionResult> {
  const parsed = resolveReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const { error } = await supabase.rpc("resolve_report", {
    p_report_id: v.reportId,
    p_decision: v.decision as ModerationDecision,
    p_note: v.note,
  });

  if (error) {
    if (isMissingSchema(error)) return { ok: false, error: SCHEMA_MISSING };
    if (error.code === "42501") return { ok: false, error: "เฉพาะผู้ดูแลเท่านั้น" };
    if (error.code === "P0002") return { ok: false, error: "ไม่พบรายงานนี้แล้ว" };
    return { ok: false, error: "ดำเนินการกับรายงานไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/admin/reports");
  for (const p of ["/discover", "/home", "/my-cats"]) revalidatePath(p);
  return { ok: true, message: "บันทึกการตัดสินแล้ว" };
}
