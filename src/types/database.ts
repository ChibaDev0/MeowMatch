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

export type CatSexDb = "male" | "female" | "unknown";

export type CatRow = {
  id: string;
  owner_id: string | null;
  name: string;
  breed: string | null;
  sex: CatSexDb;
  age_months: number | null;
  coat: string | null;
  eye_color: string | null;
  ear_type: string | null;
  temperament: string | null;
  photo_path: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type CatLikeRow = {
  user_id: string;
  cat_id: string;
  created_at: string;
};

export type BreedingAnalysisRow = {
  id: string;
  owner_id: string;
  parent_a_id: string;
  parent_b_id: string;
  result: Json | null;
  note: string | null;
  created_at: string;
};

export type DesiredGoalRow = {
  id: string;
  owner_id: string;
  source_cat_id: string | null;
  target_breed: string | null;
  target_eye_color: string | null;
  target_coat: string | null;
  target_color: string | null;
  target_ear_type: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

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
      cats: {
        Row: CatRow;
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          breed?: string | null;
          sex?: CatSexDb;
          age_months?: number | null;
          coat?: string | null;
          eye_color?: string | null;
          ear_type?: string | null;
          temperament?: string | null;
          photo_path?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          breed?: string | null;
          sex?: CatSexDb;
          age_months?: number | null;
          coat?: string | null;
          eye_color?: string | null;
          ear_type?: string | null;
          temperament?: string | null;
          photo_path?: string | null;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      cat_likes: {
        Row: CatLikeRow;
        Insert: {
          user_id: string;
          cat_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [];
      };
      breeding_analyses: {
        Row: BreedingAnalysisRow;
        Insert: {
          id?: string;
          owner_id: string;
          parent_a_id: string;
          parent_b_id: string;
          result?: Json | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          result?: Json | null;
          note?: string | null;
        };
        Relationships: [];
      };
      desired_goals: {
        Row: DesiredGoalRow;
        Insert: {
          id?: string;
          owner_id: string;
          source_cat_id?: string | null;
          target_breed?: string | null;
          target_eye_color?: string | null;
          target_coat?: string | null;
          target_color?: string | null;
          target_ear_type?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_cat_id?: string | null;
          target_breed?: string | null;
          target_eye_color?: string | null;
          target_coat?: string | null;
          target_color?: string | null;
          target_ear_type?: string | null;
          note?: string | null;
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
