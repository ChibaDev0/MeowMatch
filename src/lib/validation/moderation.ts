import { z } from "zod";

/**
 * Schema และป้ายภาษาไทยของระบบรายงาน/ดูแล (SAFE-01)
 * ใช้ร่วมทั้ง client (ฟอร์มรายงาน) และ server (ตรวจซ้ำที่ action)
 * อ้างอิง: MeowMatch/00-prd (รายงานข้อมูลไม่เหมาะสม), MeowMatch/03-tasks (SAFE-01)
 */

export const REPORT_REASONS = ["inappropriate", "spam", "fake", "animal_welfare", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** ป้ายภาษาไทยของเหตุผลรายงาน (เรียงตามที่แสดงในฟอร์ม) */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: "เนื้อหาไม่เหมาะสม",
  spam: "สแปม / โฆษณา",
  fake: "ข้อมูลเท็จ / แอบอ้าง",
  animal_welfare: "เสี่ยงต่อสวัสดิภาพสัตว์",
  other: "อื่น ๆ",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "รอตรวจ",
  reviewing: "กำลังตรวจ",
  actioned: "ดำเนินการแล้ว",
  dismissed: "ไม่พบปัญหา",
};

/** คำตัดสินของผู้ดูแลที่ส่งเข้า RPC resolve_report */
export const MODERATION_DECISIONS = ["hide", "unhide", "dismiss", "reviewing", "reopen"] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export const MODERATION_DECISION_LABELS: Record<ModerationDecision, string> = {
  hide: "ซ่อนจากหน้าหาคู่",
  unhide: "คืนการแสดง",
  dismiss: "ปิด (ไม่พบปัญหา)",
  reviewing: "ทำเครื่องหมายกำลังตรวจ",
  reopen: "เปิดรายงานใหม่",
};

/** ฟอร์มรายงานแมว 1 รายการ */
export const reportSchema = z.object({
  catId: z.string().uuid("รหัสแมวไม่ถูกต้อง"),
  reason: z.enum(REPORT_REASONS, { errorMap: () => ({ message: "เลือกเหตุผลการรายงาน" }) }),
  detail: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(1000, "รายละเอียดยาวเกิน 1000 ตัวอักษร").nullable(),
    )
    .default(null),
});
export type ReportInput = z.infer<typeof reportSchema>;

/** input ของ resolveReportAction (ฝั่งผู้ดูแล) */
export const resolveReportSchema = z.object({
  reportId: z.string().uuid("รหัสรายงานไม่ถูกต้อง"),
  decision: z.enum(MODERATION_DECISIONS, { errorMap: () => ({ message: "คำตัดสินไม่ถูกต้อง" }) }),
  note: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(1000, "หมายเหตุยาวเกิน 1000 ตัวอักษร").nullable(),
    )
    .default(null),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
