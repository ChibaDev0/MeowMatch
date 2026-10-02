import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CatIcon,
  HeartIcon,
  PawIcon,
  SearchIcon,
  TargetIcon,
} from "@/components/ui/icons";
import { CatCard } from "@/components/ui/cat-card";
import { DEMO_MY_CATS } from "@/features/cats/demo";

export const metadata: Metadata = { title: "หน้าหลัก" };

const ACTIONS = [
  { href: "/my-cats", label: "แมวของฉัน", desc: "จัดการแมวของคุณ", icon: CatIcon, tile: "bg-accent-blue text-accent-blue-fg" },
  { href: "/desired-cats", label: "แมวที่ต้องการ", desc: "ตั้งเป้าหมายลูกแมว", icon: TargetIcon, tile: "bg-accent-peach text-accent-peach-fg" },
  { href: "/breeding", label: "ผสมพันธุ์", desc: "ดูผลล่วงหน้าการผสม", icon: HeartIcon, tile: "bg-accent-pink text-accent-pink-fg" },
  { href: "/discover", label: "หาคู่", desc: "ค้นหาแมวจากผู้ใช้คนอื่น", icon: SearchIcon, tile: "bg-accent-indigo text-accent-indigo-fg" },
];

export default function HomePage() {
  const cats = DEMO_MY_CATS;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-50 to-primary-100 p-6 md:p-8">
        <div className="relative z-10 max-w-lg space-y-2">
          <p className="text-sm font-medium text-primary-700">ยินดีต้อนรับสู่</p>
          <h1 className="text-3xl font-bold">
            <span className="text-primary-900">Meow</span>
            <span className="text-primary-600">Match</span>
          </h1>
          <p className="text-muted">
            หาคู่แมว วิเคราะห์สายพันธุ์ สร้างลูกแมวในแบบที่คุณต้องการ
          </p>
        </div>
        <PawIcon className="absolute -right-2 top-6 hidden h-24 w-24 text-primary-200 sm:block" />
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ACTIONS.map(({ href, label, desc, icon: Icon, tile }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`mb-3 grid h-12 w-12 place-items-center rounded-xl ${tile}`}>
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="font-semibold text-ink">{label}</h2>
            <p className="text-xs text-muted">{desc}</p>
          </Link>
        ))}
      </section>

      {/* My cats preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            แมวของฉัน{" "}
            <span className="text-sm font-normal text-muted">
              (ทั้งหมด {cats.length} ตัว)
            </span>
          </h2>
          <Link
            href="/my-cats"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ดูทั้งหมด <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((cat, i) => (
            <CatCard key={cat.id} cat={cat} seed={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
