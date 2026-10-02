/**
 * โลโก้ MeowMatch — ไอคอนหน้าแมวทรงกลม + wordmark สองโทน (ตาม reference UI)
 * NOTE: ภาพอ้างอิงใช้คำว่า "MewMatch"; ที่นี่ใช้ชื่อโปรเจกต์ "MeowMatch" (ดูหมายเหตุใน PR/README)
 */
export function CatMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 9c0-1.5 1.7-2.3 2.9-1.4L18 11a13.7 13.7 0 0 1 12 0l5.1-3.4C36.3 6.7 38 7.5 38 9v15a14 14 0 0 1-28 0z"
      />
      <circle cx="18.5" cy="21" r="2" fill="#fff" />
      <circle cx="29.5" cy="21" r="2" fill="#fff" />
      <path
        d="M22 27c1.2.9 2.8.9 4 0"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  className,
  mark = true,
}: {
  className?: string;
  mark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      {mark && <CatMarkIcon className="h-7 w-7 text-primary-600" />}
      <span className="text-xl font-bold tracking-tight">
        <span className="text-primary-900">Meow</span>
        <span className="text-primary-600">Match</span>
      </span>
    </span>
  );
}
