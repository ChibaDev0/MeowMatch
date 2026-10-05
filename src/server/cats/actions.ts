"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CAT_SEX } from "@/lib/validation/common";
import { removeCatPhoto, uploadCatPhoto } from "./photos";

/**
 * Server Actions ของแมว (CAT-01 / MEDIA-01 / FAV-01) — เวอร์ชัน MVP
 * - server เป็นผู้ตัดสินเสมอ; RLS คุมสิทธิ์อีกชั้น (owner_id = auth.uid())
 * - ข้อมูลแมวเก็บเป็น text ตรง ๆ (ยังไม่ normalize เป็น breeds/trait_options)
 * - รูปแมวเก็บใน Supabase Storage bucket 'cat-photos' (ดู photos.ts)
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** schema ฟอร์มแมว — ยอมรับค่าว่างจาก input แล้ว normalize ให้เป็น null */
const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const catFields = {
  name: z.string().trim().min(1, "กรอกชื่อแมว").max(80, "ชื่อยาวเกิน 80 ตัวอักษร"),
  breed: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()).default(null),
  sex: z.enum(CAT_SEX).default("unknown"),
  ageYears: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(50).nullable()).default(null),
  ageMonths: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(11).nullable()).default(null),
  coat: z.preprocess(emptyToNull, z.string().trim().nullable()).default(null),
  eyeColor: z.preprocess(emptyToNull, z.string().trim().nullable()).default(null),
  earType: z.preprocess(emptyToNull, z.string().trim().nullable()).default(null),
  temperament: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()).default(null),
} as const;

const createCatFormSchema = z
  .object(catFields)
  .refine((v) => v.coat != null, { message: "เลือกลักษณะขน", path: ["coat"] });
const updateCatFormSchema = z
  .object({ ...catFields, id: z.string().uuid("รหัสแมวไม่ถูกต้อง") })
  .refine((v) => v.coat != null, { message: "เลือกลักษณะขน", path: ["coat"] });

/** รวมปี+เดือนเป็นจำนวนเดือน; ถ้าไม่กรอกทั้งคู่ → null (ไม่ระบุอายุ) */
function toAgeMonths(years: number | null, months: number | null): number | null {
  if (years == null && months == null) return null;
  return (years ?? 0) * 12 + (months ?? 0);
}

/** ดึงฟิลด์แมวจาก FormData (ค่า raw เป็น string) เพื่อส่งเข้า zod */
function readCatFields(fd: FormData): Record<string, FormDataEntryValue | null> {
  return {
    name: fd.get("name"),
    breed: fd.get("breed"),
    sex: fd.get("sex"),
    ageYears: fd.get("ageYears"),
    ageMonths: fd.get("ageMonths"),
    coat: fd.get("coat"),
    eyeColor: fd.get("eyeColor"),
    earType: fd.get("earType"),
    temperament: fd.get("temperament"),
  };
}

/** แปลง zod issues → fieldErrors (ฟิลด์ละข้อความแรก) */
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** ไฟล์รูปจาก FormData ถ้ามีการเลือกจริง (ขนาด > 0) */
function pickPhoto(fd: FormData): File | null {
  const photo = fd.get("photo");
  return photo instanceof File && photo.size > 0 ? photo : null;
}

/** รีเฟรชทุกหน้าที่โชว์แมว */
function revalidateCatPages(): void {
  for (const p of ["/my-cats", "/home", "/profile", "/discover", "/breeding", "/desired-cats"]) {
    revalidatePath(p);
  }
}

const SCHEMA_MISSING = "ยังไม่ได้ติดตั้งฐานข้อมูลแมว (ต้อง apply migration 0003_cats.sql ก่อน)";

export async function createCatAction(fd: FormData): Promise<ActionResult> {
  const parsed = createCatFormSchema.safeParse(readCatFields(fd));
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: toFieldErrors(parsed.error) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  // อัปโหลดรูปก่อน (ถ้ามี) — ถ้า insert ล้มจะลบรูปทิ้ง
  let photoKey: string | null = null;
  const photo = pickPhoto(fd);
  if (photo) {
    const up = await uploadCatPhoto(supabase, user.id, photo);
    if (!up.ok) return { ok: false, error: up.error, fieldErrors: { photo: up.error } };
    photoKey = up.key;
  }

  const { error } = await supabase.from("cats").insert({
    owner_id: user.id,
    name: v.name,
    breed: v.breed,
    sex: v.sex,
    age_months: toAgeMonths(v.ageYears, v.ageMonths),
    coat: v.coat,
    eye_color: v.eyeColor,
    ear_type: v.earType,
    temperament: v.temperament,
    photo_path: photoKey,
  });

  if (error) {
    if (photoKey) await removeCatPhoto(supabase, photoKey); // cleanup รูปที่อัปโหลดค้าง
    if (error.code === "42P01") return { ok: false, error: SCHEMA_MISSING };
    return { ok: false, error: "บันทึกแมวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidateCatPages();
  return { ok: true, message: "เพิ่มแมวสำเร็จ" };
}

export async function updateCatAction(fd: FormData): Promise<ActionResult> {
  const parsed = updateCatFormSchema.safeParse({ ...readCatFields(fd), id: fd.get("id") });
  if (!parsed.success) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง", fieldErrors: toFieldErrors(parsed.error) };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  // ยืนยันว่าแมวเป็นของผู้ใช้ และดึง photo_path เดิมไว้ cleanup
  const { data: existing, error: selErr } = await supabase
    .from("cats")
    .select("photo_path")
    .eq("id", v.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (selErr) {
    if (selErr.code === "42P01") return { ok: false, error: SCHEMA_MISSING };
    return { ok: false, error: "โหลดข้อมูลแมวไม่สำเร็จ" };
  }
  if (!existing) return { ok: false, error: "ไม่พบแมว หรือคุณไม่มีสิทธิ์แก้ไขแมวตัวนี้" };

  const removePhoto = fd.get("removePhoto") === "1";

  // อัปโหลดรูปใหม่ (ถ้ามี) ก่อน update
  let newPhotoKey: string | null = null;
  const photo = pickPhoto(fd);
  if (photo) {
    const up = await uploadCatPhoto(supabase, user.id, photo);
    if (!up.ok) return { ok: false, error: up.error, fieldErrors: { photo: up.error } };
    newPhotoKey = up.key;
  }

  const payload = {
    name: v.name,
    breed: v.breed,
    sex: v.sex,
    age_months: toAgeMonths(v.ageYears, v.ageMonths),
    coat: v.coat,
    eye_color: v.eyeColor,
    ear_type: v.earType,
    temperament: v.temperament,
    // ตั้งรูปใหม่ / ลบรูป / คงรูปเดิม (omit)
    ...(newPhotoKey ? { photo_path: newPhotoKey } : removePhoto ? { photo_path: null } : {}),
  };

  const { error } = await supabase.from("cats").update(payload).eq("id", v.id).eq("owner_id", user.id);

  if (error) {
    if (newPhotoKey) await removeCatPhoto(supabase, newPhotoKey); // cleanup รูปใหม่ที่ค้าง
    return { ok: false, error: "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  // ลบรูปเดิมเมื่อเปลี่ยนรูปหรือสั่งลบ (best-effort)
  if (newPhotoKey || removePhoto) await removeCatPhoto(supabase, existing.photo_path);

  revalidateCatPages();
  return { ok: true, message: "บันทึกการแก้ไขสำเร็จ" };
}

export async function deleteCatAction(catId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(catId).success) {
    return { ok: false, error: "รหัสแมวไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  // ดึง photo_path ก่อนลบ เพื่อ cleanup ไฟล์ใน Storage
  const { data: existing, error: selErr } = await supabase
    .from("cats")
    .select("photo_path")
    .eq("id", catId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (selErr) {
    if (selErr.code === "42P01") return { ok: false, error: SCHEMA_MISSING };
    return { ok: false, error: "โหลดข้อมูลแมวไม่สำเร็จ" };
  }
  if (!existing) return { ok: false, error: "ไม่พบแมว หรือคุณไม่มีสิทธิ์ลบแมวตัวนี้" };

  const { error } = await supabase.from("cats").delete().eq("id", catId).eq("owner_id", user.id);
  if (error) return { ok: false, error: "ลบแมวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

  await removeCatPhoto(supabase, existing.photo_path);

  revalidateCatPages();
  return { ok: true, message: "ลบแมวสำเร็จ" };
}

/** เผยแพร่/ถอนเผยแพร่แมวของตัวเอง (DISC-01/FAV-01) — server ตรวจ ownership, RLS กันอีกชั้น */
export async function setCatVisibilityAction(
  catId: string,
  isPublic: boolean,
): Promise<{ ok: true; isPublic: boolean } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(catId).success) {
    return { ok: false, error: "รหัสแมวไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const { data, error } = await supabase
    .from("cats")
    .update({ is_public: isPublic })
    .eq("id", catId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.code === "42703") return { ok: false, error: SCHEMA_MISSING };
    return { ok: false, error: "อัปเดตการเผยแพร่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
  if (!data) return { ok: false, error: "ไม่พบแมว หรือคุณไม่มีสิทธิ์แก้ไขแมวตัวนี้" };

  revalidateCatPages();
  return { ok: true, isPublic };
}

/** กดใจ/ยกเลิกกดใจแมว (toggle) — คืนสถานะ liked ล่าสุด */
export async function toggleLikeAction(
  catId: string,
): Promise<{ ok: true; liked: boolean } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(catId).success) {
    return { ok: false, error: "รหัสแมวไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบก่อน" };

  const { data: existing, error: selErr } = await supabase
    .from("cat_likes")
    .select("cat_id")
    .eq("user_id", user.id)
    .eq("cat_id", catId)
    .maybeSingle();

  if (selErr && selErr.code === "42P01") {
    return { ok: false, error: "ยังไม่ได้ติดตั้งฐานข้อมูล (apply migration 0003_cats.sql)" };
  }

  if (existing) {
    const { error } = await supabase.from("cat_likes").delete().eq("user_id", user.id).eq("cat_id", catId);
    if (error) return { ok: false, error: "ยกเลิกกดใจไม่สำเร็จ" };
    revalidatePath("/profile");
    revalidatePath("/desired-cats");
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from("cat_likes").insert({ user_id: user.id, cat_id: catId });
  if (error) return { ok: false, error: "กดใจไม่สำเร็จ" };
  revalidatePath("/profile");
  revalidatePath("/desired-cats");
  return { ok: true, liked: true };
}
