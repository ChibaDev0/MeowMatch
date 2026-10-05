import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CatRow } from "@/types/database";
import type { CatEditData, CatView } from "@/features/cats/types";
import { DEMO_DISCOVER_CATS, DEMO_MY_CATS } from "@/features/cats/demo";
import { catPhotoSrc } from "./photos";

/**
 * ชั้นอ่านข้อมูลแมวจากฐานข้อมูลจริง (ตาราง public.cats / public.cat_likes)
 * - ถ้ายังไม่ได้ apply migration 0003_cats.sql จะ fallback เป็น DEMO เพื่อไม่ให้หน้าพัง
 * - RLS คุมสิทธิ์จริงอีกชั้น (เห็นแมวได้ทั้งหมด, like เห็นเฉพาะของตัวเอง)
 */

/** โค้ด error ของ Postgres เมื่อตาราง/คอลัมน์ยังไม่มี → ถือเป็นสัญญาณ "ยังไม่ได้ migrate" */
function isMissingSchema(error: { code?: string } | null): boolean {
  // 42P01 = undefined_table, 42703 = undefined_column
  return error?.code === "42P01" || error?.code === "42703";
}

/** แปลงอายุ (เดือน) เป็นข้อความไทย เช่น "8 เดือน", "1 ปี", "1 ปี 2 เดือน" */
export function ageLabel(months: number | null): string {
  if (months == null) return "ไม่ระบุอายุ";
  if (months < 12) return `${months} เดือน`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} ปี` : `${years} ปี ${rest} เดือน`;
}

/** แปลงแถว cats → view model ที่คอมโพเนนต์การ์ดใช้ */
function toView(row: CatRow, liked = false): CatView {
  return {
    id: row.id,
    name: row.name,
    ageLabel: ageLabel(row.age_months),
    breed: row.breed ?? "ไม่ทราบสายพันธุ์",
    coat: row.coat ?? "—",
    eye: row.eye_color ?? "—",
    ear: row.ear_type ?? "—",
    sex: row.sex,
    liked,
    isPublic: row.is_public,
    photo: catPhotoSrc(row.photo_path),
  };
}

/** แยกจำนวนเดือน → ปี/เดือน สำหรับเติมฟอร์มแก้ไข */
function splitAge(months: number | null): { years: number | null; months: number | null } {
  if (months == null) return { years: null, months: null };
  return { years: Math.floor(months / 12), months: months % 12 };
}

/**
 * โหลดข้อมูลแมวตัวเดียวสำหรับหน้าแก้ไข (เฉพาะเจ้าของ)
 * คืน null ถ้าไม่พบ/ไม่ใช่ของผู้ใช้ (ให้หน้าเรียก notFound())
 */
export async function getCatForEdit(id: string): Promise<CatEditData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const age = splitAge(data.age_months);
  return {
    id: data.id,
    name: data.name,
    breed: data.breed ?? "",
    sex: data.sex,
    ageYears: age.years,
    ageMonths: age.months,
    coat: data.coat,
    eyeColor: data.eye_color ?? "",
    earType: data.ear_type ?? "",
    temperament: data.temperament ?? "",
    photo: catPhotoSrc(data.photo_path),
  };
}

/** id ของแมวที่ผู้ใช้คนนี้กดใจไว้ (เป็น Set เพื่อ mark เร็ว) */
async function likedCatIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase.from("cat_likes").select("cat_id").eq("user_id", userId);
  return new Set((data ?? []).map((r) => r.cat_id));
}

/** แมวของผู้ใช้ที่ล็อกอินอยู่ (หน้า "แมวของฉัน" / โปรไฟล์ / หน้าหลัก) */
export async function getMyCats(): Promise<CatView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("cats")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return isMissingSchema(error) ? DEMO_MY_CATS : [];
  return (data ?? []).map((row) => toView(row));
}

/** ตัวกรองหน้าหาคู่ (DISC-01) — map ตรงกับคอลัมน์จริงในตาราง cats */
export type DiscoverFilters = {
  breed?: string;
  coat?: string;
  eye?: string;
  ear?: string;
};

export type DiscoverPage = {
  cats: CatView[];
  total: number;
  page: number; // เริ่มที่ 1
  pageSize: number;
  usingDemo: boolean;
};

export const DISCOVER_PAGE_SIZE = 12;

/** กรองชุด DEMO ในหน่วยความจำ (ใช้ตอนยังไม่ได้ migrate) — export เพื่อทดสอบ (Phase 4) */
export function applyDemoFilters(cats: CatView[], f: DiscoverFilters): CatView[] {
  return cats.filter(
    (c) =>
      (!f.breed || c.breed === f.breed) &&
      (!f.coat || c.coat === f.coat) &&
      (!f.eye || c.eye === f.eye) &&
      (!f.ear || c.ear === f.ear),
  );
}

/**
 * แมวในหน้า "หาคู่" — แมวตัวอย่างของระบบ (owner_id NULL) + แมวของผู้ใช้คนอื่น
 * ไม่รวมแมวของตัวเอง; เรียงใหม่สุดก่อน; รองรับตัวกรองและแบ่งหน้า (DISC-01)
 * ไม่คืนข้อมูลส่วนตัว (เฉพาะคอลัมน์ที่สาธารณะในการ์ด) และกันแมวของตัวเองออกเสมอ
 */
export async function getDiscoverCats(
  opts: { filters?: DiscoverFilters; page?: number; pageSize?: number } = {},
): Promise<DiscoverPage> {
  const pageSize = opts.pageSize ?? DISCOVER_PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);
  const filters = opts.filters ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let q = supabase
    .from("cats")
    .select("*", { count: "exact" })
    .eq("is_public", true) // แมวที่เผยแพร่เท่านั้น (RLS กันแมวคนอื่นที่ซ่อนอยู่แล้วอีกชั้น)
    .order("created_at", { ascending: false });
  if (user) q = q.or(`owner_id.is.null,owner_id.neq.${user.id}`);
  if (filters.breed) q = q.eq("breed", filters.breed);
  if (filters.coat) q = q.eq("coat", filters.coat);
  if (filters.eye) q = q.eq("eye_color", filters.eye);
  if (filters.ear) q = q.eq("ear_type", filters.ear);
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    if (isMissingSchema(error)) {
      const all = applyDemoFilters(DEMO_DISCOVER_CATS, filters);
      return { cats: all.slice(from, from + pageSize), total: all.length, page, pageSize, usingDemo: true };
    }
    return { cats: [], total: 0, page, pageSize, usingDemo: false };
  }

  const liked = user ? await likedCatIds(supabase, user.id) : new Set<string>();
  return {
    cats: (data ?? []).map((row) => toView(row, liked.has(row.id))),
    total: count ?? 0,
    page,
    pageSize,
    usingDemo: false,
  };
}

/** สายพันธุ์ที่พบจริงในหน้าหาคู่ (เติม dropdown ตัวกรอง) — เรียงตามตัวอักษร ไม่ซ้ำ */
export async function getDiscoverBreeds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let q = supabase.from("cats").select("breed").eq("is_public", true);
  if (user) q = q.or(`owner_id.is.null,owner_id.neq.${user.id}`);

  const { data, error } = await q;
  if (error) {
    if (isMissingSchema(error)) {
      return [...new Set(DEMO_DISCOVER_CATS.map((c) => c.breed))].sort((a, b) => a.localeCompare(b, "th"));
    }
    return [];
  }

  const breeds = (data ?? []).map((r) => r.breed).filter((b): b is string => !!b && b.trim() !== "");
  return [...new Set(breeds)].sort((a, b) => a.localeCompare(b, "th"));
}

/** แมวที่ผู้ใช้กดใจไว้ (แท็บ "แมวที่กดใจ" ในโปรไฟล์/เป้าหมาย/ผสมพันธุ์) */
export async function getLikedCats(): Promise<CatView[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: likes, error } = await supabase
    .from("cat_likes")
    .select("cat_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchema(error)) return DEMO_DISCOVER_CATS.filter((c) => c.liked);
    return [];
  }

  const ids = (likes ?? []).map((l) => l.cat_id);
  if (ids.length === 0) return [];

  const { data: cats, error: catsErr } = await supabase.from("cats").select("*").in("id", ids);
  if (catsErr) return [];

  // คงลำดับตามเวลา like ล่าสุด
  const byId = new Map((cats ?? []).map((c) => [c.id, c]));
  return ids
    .map((id) => byId.get(id))
    .filter((c): c is CatRow => c != null)
    .map((row) => toView(row, true));
}

export type ProfileStats = { myCats: number; liked: number; breeding: number };

/** ตัวเลขสถิติในหน้าโปรไฟล์ (ของจริงจากฐานข้อมูล) */
export async function getProfileStats(): Promise<ProfileStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { myCats: 0, liked: 0, breeding: 0 };

  const [mine, liked, breeding] = await Promise.all([
    supabase.from("cats").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("cat_likes").select("cat_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("breeding_analyses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id),
  ]);

  // ยังไม่ได้ migrate → ใช้ค่าจาก DEMO ให้สอดคล้องกับหน้าอื่น
  if (isMissingSchema(mine.error)) {
    return { myCats: DEMO_MY_CATS.length, liked: DEMO_DISCOVER_CATS.filter((c) => c.liked).length, breeding: 0 };
  }

  return {
    myCats: mine.count ?? 0,
    liked: liked.count ?? 0,
    // นับจากตาราง breeding_analyses จริง (0004); ตารางยังว่างจนกว่า PAIR-01 จะบันทึกผล
    breeding: isMissingSchema(breeding.error) ? 0 : breeding.count ?? 0,
  };
}
