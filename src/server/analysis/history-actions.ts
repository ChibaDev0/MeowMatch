"use server";
import { readHistory } from "./history";

export async function getAnalysisHistoryAction(id: string) {
  try {
    return await readHistory(id);
  } catch {
    return { ok: false as const, error: "ไม่พบประวัติ หรือไม่สามารถเข้าถึงประวัตินี้ได้" };
  }
}

export async function replayAnalysisHistoryAction(id: string) {
  try {
    return await readHistory(id, true);
  } catch {
    return {
      ok: false as const,
      error: "ไม่สามารถคำนวณซ้ำได้: สิทธิ์หรือเวอร์ชันของข้อมูลไม่พร้อมใช้งาน",
    };
  }
}
