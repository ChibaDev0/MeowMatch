/**
 * Supabase types — เขียนด้วยมือเฉพาะส่วนที่ใช้งานแล้ว (auth/profiles)
 *
 * เมื่อ schema ครบ (DB-01) ให้สร้างใหม่อัตโนมัติด้วย:
 *   npm run db:types
 * แล้วไฟล์นี้จะถูกแทนที่ทั้งหมด อ้างอิง schema: MeowMatch/06-database
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OnboardingStatus = "needs_username" | "complete";

// NOTE: ใช้ `type` (ไม่ใช่ `interface`) เพื่อให้ assignable กับ Record<string, unknown>
// ที่ supabase-js ต้องการ มิฉะนั้น schema จะ fallback เป็น never
export type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  onboarding_status: OnboardingStatus;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          user_id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          onboarding_status?: OnboardingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          onboarding_status?: OnboardingStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      auth_email_for_username: {
        Args: { p_username: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
