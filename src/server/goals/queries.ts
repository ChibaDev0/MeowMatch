import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DesiredGoalData } from "@/features/goals/types";

/**
 * ชั้นอ่านเป้าหมายลูกแมว (GOAL-01) จากตาราง public.desired_goals
 * - ยึด "แถวล่าสุด" ของผู้ใช้เป็นเป้าหมายปัจจุบัน เพื่อให้กู้ state กลับมาได้
 * - ถ้ายังไม่ได้ migrate (0004) หรือยังไม่เคยบันทึก → คืน null (ฟอร์มเริ่มจากค่าว่าง)
 */
export async function getDesiredGoal(): Promise<DesiredGoalData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("desired_goals")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    sourceCatId: data.source_cat_id,
    targetBreed: data.target_breed ?? "",
    targetEyeColor: data.target_eye_color ?? "",
    targetCoat: data.target_coat,
    targetColor: data.target_color ?? "",
    targetEarType: data.target_ear_type ?? "",
  };
}
