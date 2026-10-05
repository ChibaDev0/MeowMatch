import type { SVGProps } from "react";

/**
 * ชุดไอคอน inline SVG (สไตล์เส้น) — ปรับสีด้วย currentColor ผ่าน className
 * อ้างอิงไอคอนจาก reference UI (sidebar, actions, ฟอร์ม)
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function CatIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M4 4.5 7 8a7.5 7.5 0 0 1 10 0l3-3.5V13a8 8 0 0 1-16 0z" />
      <path d="M9 13h.01M15 13h.01" />
      <path d="M10.5 16.5c.9.6 2.1.6 3 0" />
    </svg>
  );
}

export function TargetIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function HeartIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 20s-7-4.4-9.3-9C1.2 7.9 2.8 5 5.8 5 7.7 5 9 6 12 9c3-3 4.3-4 6.2-4 3 0 4.6 2.9 3.1 6-2.3 4.6-9.3 9-9.3 9z" />
    </svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function EditIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export function DotsIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function EyeIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function LogoutIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}

export function PawIcon(p: IconProps) {
  return (
    <svg {...base} {...p} fill="currentColor" stroke="none">
      <ellipse cx="6" cy="11" rx="1.8" ry="2.4" />
      <ellipse cx="18" cy="11" rx="1.8" ry="2.4" />
      <ellipse cx="9.5" cy="7" rx="1.8" ry="2.4" />
      <ellipse cx="14.5" cy="7" rx="1.8" ry="2.4" />
      <path d="M12 12.5c2.8 0 5 1.9 5 4.2 0 1.8-1.6 2.8-3.4 2.3-1-.3-2.2-.3-3.2 0C8.6 19.5 7 18.5 7 16.7c0-2.3 2.2-4.2 5-4.2z" />
    </svg>
  );
}

export function GoogleIcon(p: IconProps) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" {...p}>
      <path
        fill="#4285F4"
        d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.5h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.3-4.9 3.3-8.3z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"
      />
    </svg>
  );
}
