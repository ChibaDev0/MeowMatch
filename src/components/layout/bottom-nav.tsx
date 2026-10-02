"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

/**
 * แถบนำทางด้านล่างสำหรับมือถือ (5 รายการหลักตาม UX flow)
 * ตัด "หน้าหลัก" ออกเพื่อให้เหลือ 5 ปุ่มพอดีจอ: แมวของฉัน / แมวที่ต้องการ / ผสมพันธุ์ / หาคู่ / โปรไฟล์
 */
const MOBILE_ITEMS = NAV_ITEMS.filter((i) => i.href !== "/home");

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur md:hidden">
      {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
              active ? "text-primary-700" : "text-muted"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
