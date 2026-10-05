import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { catPhotoSrc, MAX_PHOTO_BYTES, validatePhoto } from "./photos";

/**
 * Phase 4 (ทดสอบ MVP-A) — ตัวช่วยรูปแมว (MEDIA-01)
 * ทดสอบตรรกะล้วน: ตรวจไฟล์ (ชนิด/ขนาด) และการแปลง photo_path → URL
 */

/** สร้าง File ปลอมขนาดที่กำหนด โดยไม่ต้องจองหน่วยความจำจริงเท่าขนาด */
function fakeFile(type: string, size: number): File {
  const file = new File(["x"], "cat.img", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validatePhoto", () => {
  it("ยอมรับ JPG/PNG/WebP ขนาดปกติ พร้อมคืนนามสกุลที่ถูกต้อง", () => {
    expect(validatePhoto(fakeFile("image/jpeg", 1024))).toEqual({ ok: true, ext: "jpg" });
    expect(validatePhoto(fakeFile("image/png", 1024))).toEqual({ ok: true, ext: "png" });
    expect(validatePhoto(fakeFile("image/webp", 1024))).toEqual({ ok: true, ext: "webp" });
  });

  it("ปฏิเสธชนิดไฟล์ที่ไม่รองรับ", () => {
    const res = validatePhoto(fakeFile("image/gif", 1024));
    expect(res.ok).toBe(false);
  });

  it("ปฏิเสธไฟล์ใหญ่เกิน 5 MB", () => {
    const res = validatePhoto(fakeFile("image/jpeg", MAX_PHOTO_BYTES + 1));
    expect(res.ok).toBe(false);
  });

  it("ยอมรับไฟล์ขนาดเท่าลิมิตพอดี", () => {
    expect(validatePhoto(fakeFile("image/jpeg", MAX_PHOTO_BYTES)).ok).toBe(true);
  });

  it("ปฏิเสธไฟล์ว่าง (0 ไบต์)", () => {
    const res = validatePhoto(fakeFile("image/jpeg", 0));
    expect(res.ok).toBe(false);
  });
});

describe("catPhotoSrc", () => {
  it("คืน undefined เมื่อไม่มี path (ให้ใช้ placeholder)", () => {
    expect(catPhotoSrc(null)).toBeUndefined();
  });

  it("คืน path เดิมสำหรับรูป static ใน public/ (ขึ้นต้นด้วย /)", () => {
    expect(catPhotoSrc("/cats/seed-1.jpg")).toBe("/cats/seed-1.jpg");
  });

  it("คืน URL เดิมสำหรับ absolute URL", () => {
    expect(catPhotoSrc("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
  });

  describe("เมื่อเป็น object key ใน Storage", () => {
    beforeAll(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    });
    afterAll(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    });

    it("ประกอบเป็น public URL ของ bucket cat-photos", () => {
      expect(catPhotoSrc("owner-1/abc.jpg")).toBe(
        "https://proj.supabase.co/storage/v1/object/public/cat-photos/owner-1/abc.jpg",
      );
    });
  });
});
