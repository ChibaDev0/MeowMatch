import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Topbar } from "@/components/layout/topbar";
import { requireProfile } from "@/server/auth/session";

/**
 * Shell ของพื้นที่สมาชิก — sidebar (เดสก์ท็อป) + topbar + แถบล่าง (มือถือ)
 * ป้องกันเส้นทาง: ไม่มี session → /login; ยังไม่ตั้ง username → /onboarding
 */
export default async function MemberLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";

  return (
    <div className="flex min-h-dvh bg-page">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
