/**
 * ข้อมูลเป้าหมายลูกแมวที่ผู้ใช้ตั้งไว้ (หน้า "แมวที่ต้องการ", งาน GOAL-01)
 * ค่าตรงกับช่องในฟอร์ม (text ตรง ๆ) — map กับตาราง public.desired_goals (0004)
 */
export type DesiredGoalData = {
  sourceCatId: string | null;
  targetBreed: string;
  targetEyeColor: string;
  targetCoat: string | null;
  targetColor: string;
  targetEarType: string;
};
