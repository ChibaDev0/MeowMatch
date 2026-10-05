import "server-only";
import { randomUUID } from "node:crypto";
import type { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

/**
 * ตัวช่วยจัดการรูปแมวใน Supabase Storage (งาน MEDIA-01)
 * - bucket 'cat-photos' (ดู migration 0005_storage_cats.sql)
 * - cats.photo_path เก็บเป็น "object key" ภายใน bucket เช่น "{owner}/{uuid}.jpg"
 *   ยกเว้นแมวตัวอย่าง (seed) ที่เก็บ path static ใน public/ (ขึ้นต้นด้วย '/')
 */

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const CAT_PHOTO_BUCKET = "cat-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB (ตรงกับ file_size_limit ของ bucket)

/** ชนิดไฟล์ที่รองรับ → นามสกุลที่ใช้ตั้งชื่อ object */
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** path ที่ขึ้นต้นด้วย '/' (static ใน public/) หรือ http(s) ไม่ใช่ object ใน Storage */
function isStorageKey(photoPath: string | null): photoPath is string {
  return !!photoPath && !photoPath.startsWith("/") && !photoPath.startsWith("http");
}

/**
 * แปลง photo_path → URL ที่ใช้กับ <Image> ได้
 * - null → undefined (ใช้ placeholder)
 * - '/...' หรือ 'http...' → คืนตามเดิม (รูป static / absolute)
 * - object key → public URL ของ Supabase Storage
 */
export function catPhotoSrc(photoPath: string | null): string | undefined {
  if (!photoPath) return undefined;
  if (photoPath.startsWith("/") || photoPath.startsWith("http")) return photoPath;
  const { url } = getPublicSupabaseEnv();
  return `${url}/storage/v1/object/public/${CAT_PHOTO_BUCKET}/${photoPath}`;
}

export type PhotoUploadResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

/** ตรวจไฟล์รูป (ชนิด/ขนาด) ก่อนอัปโหลด — server เป็นผู้ตัดสิน */
export function validatePhoto(file: File): { ok: true; ext: string } | { ok: false; error: string } {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { ok: false, error: "รองรับเฉพาะรูป JPG, PNG หรือ WebP" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "ไฟล์รูปต้องไม่เกิน 5 MB" };
  if (file.size === 0) return { ok: false, error: "ไฟล์รูปเสียหรือว่างเปล่า" };
  return { ok: true, ext };
}

/**
 * อัปโหลดรูปแมวของผู้ใช้ → คืน object key
 * ตั้งชื่อ {ownerId}/{uuid}.{ext} เพื่อให้ RLS ของ storage บังคับสิทธิ์ตามโฟลเดอร์แรก
 */
export async function uploadCatPhoto(
  supabase: ServerSupabase,
  ownerId: string,
  file: File,
): Promise<PhotoUploadResult> {
  const check = validatePhoto(file);
  if (!check.ok) return check;

  const key = `${ownerId}/${randomUUID()}.${check.ext}`;
  const { error } = await supabase.storage.from(CAT_PHOTO_BUCKET).upload(key, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { ok: false, error: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
  return { ok: true, key };
}

/**
 * ลบรูปใน Storage (cleanup) — ข้ามถ้าไม่ใช่ object key (รูป static/seed)
 * ไม่คืน error เพราะ cleanup ที่ล้มเหลวไม่ควรทำให้ action หลักล้ม (best-effort)
 */
export async function removeCatPhoto(supabase: ServerSupabase, photoPath: string | null): Promise<void> {
  if (!isStorageKey(photoPath)) return;
  await supabase.storage.from(CAT_PHOTO_BUCKET).remove([photoPath]);
}
