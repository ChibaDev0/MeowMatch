import "server-only";
import { createClient } from "@/lib/supabase/server";
import { catPhotoSrc } from "@/server/cats/photos";
import type { ReportReason, ReportStatus } from "@/types/database";

/**
 * ชั้นอ่านข้อมูลรายงาน (SAFE-01) สำหรับหน้าผู้ดูแล
 * RLS คุมสิทธิ์: admin เห็นรายงานทั้งหมด, สมาชิกทั่วไปเห็นเฉพาะของตัวเอง
 */

export type ReportView = {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
  cat: {
    id: string;
    name: string;
    breed: string | null;
    ownerId: string | null;
    moderationStatus: "active" | "hidden";
    photo?: string;
  } | null;
};

type ReportJoinRow = {
  id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  resolution: string | null;
  created_at: string;
  cats: {
    id: string;
    name: string;
    breed: string | null;
    owner_id: string | null;
    moderation_status: "active" | "hidden";
    photo_path: string | null;
  } | null;
};

export type ReportQueue = {
  reports: ReportView[];
  openCount: number;
  available: boolean; // false = ยังไม่ได้ migrate 0008
};

const MAX_REPORTS = 200;

function toView(row: ReportJoinRow): ReportView {
  const c = row.cats;
  return {
    id: row.id,
    reason: row.reason,
    detail: row.detail,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.created_at,
    cat: c
      ? {
          id: c.id,
          name: c.name,
          breed: c.breed,
          ownerId: c.owner_id,
          moderationStatus: c.moderation_status,
          photo: catPhotoSrc(c.photo_path),
        }
      : null,
  };
}

/** ลำดับความสำคัญของสถานะในคิวผู้ดูแล (เปิด/กำลังตรวจ มาก่อน) */
const STATUS_ORDER: Record<ReportStatus, number> = {
  open: 0,
  reviewing: 1,
  actioned: 2,
  dismissed: 3,
};

/**
 * คิวรายงานสำหรับผู้ดูแล — เรียง "ยังเปิด" ก่อน แล้วตามเวลาใหม่สุด
 * (หน้าเรียกหลัง requireAdmin แล้ว; RLS จะคืนเฉพาะที่ผู้เรียกมีสิทธิ์เห็นอยู่ดี)
 */
export async function getReportQueue(): Promise<ReportQueue> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reason, detail, status, resolution, created_at, cats:cat_id (id, name, breed, owner_id, moderation_status, photo_path)",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_REPORTS);

  if (error) {
    // ยังไม่ได้ migrate → หน้าแสดงสถานะ "ยังไม่พร้อม" แทนที่จะพัง
    if (error.code === "42P01" || error.code === "42703") {
      return { reports: [], openCount: 0, available: false };
    }
    return { reports: [], openCount: 0, available: true };
  }

  const rows = ((data ?? []) as unknown as ReportJoinRow[]).map(toView);
  rows.sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return s !== 0 ? s : b.createdAt.localeCompare(a.createdAt);
  });

  const openCount = rows.filter((r) => r.status === "open" || r.status === "reviewing").length;
  return { reports: rows, openCount, available: true };
}
