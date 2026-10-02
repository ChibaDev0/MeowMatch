/**
 * อ่านและตรวจค่า Supabase public env ที่ต้องมีทั้งฝั่ง client และ server
 * ล้มเร็ว (fail fast) พร้อมข้อความชัดเจนหากตั้งค่าไม่ครบ
 */
export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "ขาดค่า NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY — คัดลอก .env.example เป็น .env.local แล้วเติมค่า",
    );
  }

  return { url, anonKey } as const;
}
