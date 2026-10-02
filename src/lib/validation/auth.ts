import { z } from "zod";
import { passwordSchema, usernameSchema } from "./common";

/**
 * Schemas สำหรับ Auth — ใช้ร่วมกันระหว่างฟอร์ม (React Hook Form) และ server
 * server เป็นผู้ตัดสินเสมอ (client validation เป็นเพียง UX)
 * อ้างอิง: MeowMatch/00-prd (AUTH-01/02), MeowMatch/09-decisions (D-01: เพิ่ม email)
 */

// Login รับได้ทั้ง Username หรือ Email (resolve เป็น email ฝั่ง server)
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "กรอก Username หรือ Email"),
  password: z.string().min(1, "กรอกรหัสผ่าน"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Onboarding ผู้ใช้ Google: ตั้ง Username ครั้งแรก
export const usernameOnlySchema = z.object({ username: usernameSchema });
export type UsernameOnlyInput = z.infer<typeof usernameOnlySchema>;

export const registerSchema = z
  .object({
    username: usernameSchema,
    // Email จำเป็นสำหรับ Supabase Password Auth และการกู้บัญชี (ข้อเสนอ D-01)
    email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านยืนยันไม่ตรงกัน",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("อีเมลไม่ถูกต้อง"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านยืนยันไม่ตรงกัน",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
