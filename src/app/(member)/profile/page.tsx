import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { EditIcon } from "@/components/ui/icons";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { LogoutButton } from "@/features/auth/logout-button";
import { getProfile } from "@/server/auth/session";

export const metadata: Metadata = { title: "โปรไฟล์" };

/** ตัวเลขสถิติเป็น DEMO — เชื่อมข้อมูลจริงในงาน PRO-01 */
const STATS = [
  { label: "แมวของฉัน", value: 3 },
  { label: "แมวที่กดใจ", value: 12 },
  { label: "การผสมพันธุ์", value: 5 },
];

export default async function ProfilePage() {
  const profile = await getProfile();
  const displayName = profile?.display_name ?? "สมาชิก MeowMatch";
  const username = profile?.username ?? "meowmatch_user";

  return (
    <div className="space-y-6">
      <PageHeader
        title="โปรไฟล์"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-50"
            >
              <EditIcon className="h-4 w-4" />
              แก้ไขโปรไฟล์
            </button>
            <LogoutButton />
          </div>
        }
      />

      <div className="space-y-6 rounded-2xl border border-line bg-surface p-6">
        {/* Identity + stats */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-2xl font-bold text-primary-700">
            ฉัน
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-ink">{displayName}</h2>
            <p className="text-muted">@{username}</p>
          </div>
          <div className="grid grid-cols-3 gap-6 sm:gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xs text-muted">{s.label}</p>
                <p className="text-xl font-bold text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-line" />

        <ProfileTabs />
      </div>
    </div>
  );
}
