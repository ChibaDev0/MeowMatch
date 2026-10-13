import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseMock, hasEq, type QueryResult } from "@/test/supabase-mock";
import {
  ageLabel,
  applyDemoFilters,
  getAnalysisCandidates,
  getCatForEdit,
  getDiscoverCats,
  getMyCats,
} from "./queries";
import { DEMO_DISCOVER_CATS, DEMO_MY_CATS } from "@/features/cats/demo";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

/** ติดตั้ง mock client ให้ createClient คืนค่า แล้วคืน handle ไว้ assert */
function mockClient(...args: Parameters<typeof createSupabaseMock>) {
  const mock = createSupabaseMock(...args);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
});

/**
 * Phase 4 (ทดสอบ MVP-A) — ชั้นอ่านข้อมูลแมว (CAT-01/DISC-01)
 * เน้นตรรกะ: แปลงอายุ, กรอง demo, fallback เมื่อยังไม่ migrate, และ ownership guard
 */
describe("ageLabel", () => {
  it("น้อยกว่า 12 เดือน → ‘N เดือน’", () => {
    expect(ageLabel(8)).toBe("8 เดือน");
    expect(ageLabel(0)).toBe("0 เดือน");
  });
  it("ครบปีพอดี → ‘N ปี’", () => {
    expect(ageLabel(12)).toBe("1 ปี");
    expect(ageLabel(24)).toBe("2 ปี");
  });
  it("ปีกับเดือนปน → ‘N ปี M เดือน’", () => {
    expect(ageLabel(14)).toBe("1 ปี 2 เดือน");
  });
  it("null → ‘ไม่ระบุอายุ’", () => {
    expect(ageLabel(null)).toBe("ไม่ระบุอายุ");
  });
});

describe("applyDemoFilters", () => {
  it("ไม่มีตัวกรอง → คืนครบทุกตัว", () => {
    expect(applyDemoFilters(DEMO_DISCOVER_CATS, {})).toHaveLength(DEMO_DISCOVER_CATS.length);
  });
  it("กรองตามสายพันธุ์", () => {
    const res = applyDemoFilters(DEMO_DISCOVER_CATS, { breed: "Maine Coon" });
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe("นาชิ");
  });
  it("กรองหลายเงื่อนไขพร้อมกัน (AND)", () => {
    const res = applyDemoFilters(DEMO_DISCOVER_CATS, { coat: "ขนสั้น", ear: "หูพับ" });
    expect(res).toHaveLength(1);
    expect(res[0]?.name).toBe("ซากุระ");
  });
  it("ไม่มีตัวที่ตรง → ว่าง", () => {
    expect(applyDemoFilters(DEMO_DISCOVER_CATS, { breed: "ไม่มีพันธุ์นี้" })).toHaveLength(0);
  });
});

/** โค้ด error ของ Postgres เมื่อยังไม่ได้ migrate */
const MISSING: QueryResult = { error: { code: "42P01" } };

describe("getMyCats", () => {
  it("ยังไม่ล็อกอิน → ว่าง", async () => {
    mockClient({ user: null });
    expect(await getMyCats()).toEqual([]);
  });
  it("ยังไม่ migrate (42P01) → ใช้ DEMO", async () => {
    mockClient({ queries: [MISSING] });
    expect(await getMyCats()).toHaveLength(DEMO_MY_CATS.length);
  });
  it("มีข้อมูลจริง → แปลงเป็น view model และกรองเฉพาะเจ้าของ", async () => {
    const mock = mockClient({
      queries: [
        {
          data: [
            {
              id: "c-1",
              name: "มะขาม",
              age_months: 14,
              breed: "ผสม",
              coat: "ขนสั้น",
              eye_color: "ตาสีฟ้า",
              ear_type: "หูตั้ง",
              sex: "male",
              is_public: true,
              photo_path: null,
            },
          ],
        },
      ],
    });
    const res = await getMyCats();
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ name: "มะขาม", ageLabel: "1 ปี 2 เดือน", breed: "ผสม" });
    // ต้อง scope ด้วย owner_id = ผู้ใช้ปัจจุบัน
    expect(hasEq(mock.captureAt(0), "owner_id", "user-1")).toBe(true);
  });
});

describe("getDiscoverCats (demo fallback + pagination)", () => {
  it("ยังไม่ migrate → ใช้ DEMO, ตั้ง usingDemo และแบ่งหน้า", async () => {
    mockClient({ queries: [MISSING] });
    const page1 = await getDiscoverCats({ page: 1, pageSize: 2 });
    expect(page1.usingDemo).toBe(true);
    expect(page1.total).toBe(DEMO_DISCOVER_CATS.length);
    expect(page1.cats).toHaveLength(2);
  });
  it("หน้า 2 คืนส่วนที่เหลือ", async () => {
    mockClient({ queries: [MISSING] });
    const page2 = await getDiscoverCats({ page: 2, pageSize: 2 });
    expect(page2.cats).toHaveLength(DEMO_DISCOVER_CATS.length - 2);
    expect(page2.page).toBe(2);
  });
  it("demo + ตัวกรองสายพันธุ์", async () => {
    mockClient({ queries: [MISSING] });
    const res = await getDiscoverCats({ filters: { breed: "Scottish Fold" } });
    expect(res.total).toBe(1);
    expect(res.cats[0]?.name).toBe("ซากุระ");
  });
  it("page ต่ำกว่า 1 ถูกปรับเป็น 1", async () => {
    mockClient({ queries: [MISSING] });
    const res = await getDiscoverCats({ page: 0 });
    expect(res.page).toBe(1);
  });
});

describe("getCatForEdit (ownership guard)", () => {
  it("ยังไม่ล็อกอิน → null", async () => {
    mockClient({ user: null });
    expect(await getCatForEdit("cat-1")).toBeNull();
  });
  it("ไม่พบแมวของผู้ใช้ (data null) → null", async () => {
    mockClient({ queries: [{ data: null }] });
    expect(await getCatForEdit("cat-1")).toBeNull();
  });
  it("พบแมวของผู้ใช้ → แปลงเป็น CatEditData และ scope ด้วย owner_id", async () => {
    const mock = mockClient({
      queries: [
        {
          data: {
            id: "cat-1",
            name: "โมจิ",
            breed: "เปอร์เซีย",
            sex: "female",
            age_months: 14,
            coat: "ขนยาว",
            eye_color: "ตาสีทอง",
            ear_type: "หูตั้ง",
            temperament: "ขี้อ้อน",
            photo_path: null,
          },
        },
      ],
    });
    const res = await getCatForEdit("cat-1");
    expect(res).toMatchObject({ id: "cat-1", name: "โมจิ", ageYears: 1, ageMonths: 2 });
    expect(hasEq(mock.captureAt(0), "owner_id", "user-1")).toBe(true);
    expect(hasEq(mock.captureAt(0), "id", "cat-1")).toBe(true);
  });
});

/**
 * P5-01 — getAnalysisCandidates: ดึง pool ครบ, แยก error จาก empty, และ provenance (real/demo)
 */
type LikeRow = { cat_id: string; created_at: string };
const likeRows = (n: number, start = 0): LikeRow[] =>
  Array.from({ length: n }, (_, i) => ({ cat_id: `c${start + i}`, created_at: "2026-01-01" }));
const catRowsFor = (ids: string[]) =>
  ids.map((id) => ({
    id,
    name: id,
    age_months: 12,
    breed: "ผสม",
    coat: "ขนยาว",
    eye_color: "ตาสีฟ้า",
    ear_type: "หูตั้ง",
    sex: "male",
    is_public: true,
    photo_path: null,
  }));

describe("getAnalysisCandidates (P5-01)", () => {
  it("ไม่มี like เลย → cats ว่าง, complete=true, ไม่มี error (empty ไม่ใช่ error)", async () => {
    mockClient({ queries: [{ data: [], count: 0 }] });
    const pool = await getAnalysisCandidates();
    expect(pool.cats).toHaveLength(0);
    expect(pool.complete).toBe(true);
    expect(pool.error).toBeNull();
    expect(pool.source).toBe("real");
  });

  it("หน้าเดียว (< page size) → ดึงครบและ resolve cats", async () => {
    const ids = ["c0", "c1"];
    mockClient({
      queries: [
        { data: likeRows(2), count: 2 },
        { data: catRowsFor(ids) },
      ],
    });
    const pool = await getAnalysisCandidates();
    expect(pool.complete).toBe(true);
    expect(pool.cats.map((c) => c.id)).toEqual(ids);
    expect(pool.fetched).toBe(2);
    expect(pool.expected).toBe(2);
  });

  it("หลายหน้า → สะสม like ข้ามหน้าแล้ว resolve cats ครบ", async () => {
    const page0 = likeRows(50, 0); // เต็มหน้า → อ่านหน้าถัดไป
    const page1 = likeRows(10, 50); // < page size → หน้าสุดท้าย
    const allIds = [...page0, ...page1].map((r) => r.cat_id);
    mockClient({
      queries: [
        { data: page0, count: 60 },
        { data: page1, count: 60 },
        { data: catRowsFor(allIds) },
      ],
    });
    const pool = await getAnalysisCandidates();
    expect(pool.complete).toBe(true);
    expect(pool.fetched).toBe(60);
    expect(pool.cats).toHaveLength(60);
  });

  it("ล้มเหลวกลางหน้า (timeout) → complete=false + error (ไม่รายงานว่าครบ)", async () => {
    mockClient({
      queries: [
        { data: likeRows(50, 0), count: 60 },
        { error: { code: "57014" } }, // statement_timeout
        { data: catRowsFor(likeRows(50, 0).map((r) => r.cat_id)) },
      ],
    });
    const pool = await getAnalysisCandidates();
    expect(pool.complete).toBe(false);
    expect(pool.error).not.toBeNull();
  });

  it("แมวบางตัวถูกซ่อน (RLS) → หายไปได้ ถือว่าปกติ complete ยัง true", async () => {
    mockClient({
      queries: [
        { data: likeRows(2), count: 2 },
        { data: catRowsFor(["c0"]) }, // c1 ถูกซ่อน
      ],
    });
    const pool = await getAnalysisCandidates();
    expect(pool.complete).toBe(true);
    expect(pool.cats.map((c) => c.id)).toEqual(["c0"]);
  });

  it("ยังไม่ migrate (missing schema) → demo พร้อม source='demo' (ไม่อ้างว่าเป็นข้อมูลจริง)", async () => {
    mockClient({ queries: [{ error: { code: "42P01" } }] });
    const pool = await getAnalysisCandidates();
    expect(pool.source).toBe("demo");
    expect(pool.cats.length).toBeGreaterThan(0);
  });

  it("ตัด excludeCatId (แมวต้นทาง) ออกจากผู้สมัคร", async () => {
    mockClient({
      queries: [
        { data: likeRows(2), count: 2 }, // c0, c1
        { data: catRowsFor(["c1"]) },
      ],
    });
    const pool = await getAnalysisCandidates("c0");
    expect(pool.cats.map((c) => c.id)).toEqual(["c1"]);
  });
});
