"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { NAV_ITEMS } from "./nav-items";

/** Sidebar สำหรับเดสก์ท็อป (ซ่อนบนมือถือ — ใช้ BottomNav แทน) */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      data-testid="sidebar"
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 border-r border-line bg-surface px-4 py-6 md:flex"
    >
      <Link href="/home" className="mb-4 px-2">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active
                  ? "bg-primary-700 text-white shadow-sm"
                  : "text-muted hover:bg-primary-50 hover:text-primary-700"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
