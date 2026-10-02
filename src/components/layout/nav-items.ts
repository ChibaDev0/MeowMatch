import type { ComponentType, SVGProps } from "react";
import {
  CatIcon,
  HeartIcon,
  HomeIcon,
  SearchIcon,
  TargetIcon,
  UserIcon,
} from "@/components/ui/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/** เมนูหลัก (ตาม reference UI: sidebar เดสก์ท็อป / แถบล่างมือถือ) */
export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "หน้าหลัก", icon: HomeIcon },
  { href: "/my-cats", label: "แมวของฉัน", icon: CatIcon },
  { href: "/desired-cats", label: "แมวที่ต้องการ", icon: TargetIcon },
  { href: "/breeding", label: "ผสมพันธุ์", icon: HeartIcon },
  { href: "/discover", label: "หาคู่", icon: SearchIcon },
  { href: "/profile", label: "โปรไฟล์", icon: UserIcon },
];
