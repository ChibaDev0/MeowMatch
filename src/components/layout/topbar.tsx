import { BellIcon, SearchIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";

/**
 * แถบบน: โลโก้ (มือถือ) + ช่องค้นหา + กระดิ่ง + อวาตาร์
 * ช่องค้นหายังเป็นโครง (ฟังก์ชันค้นหาเป็นงาน DISC-01)
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-page/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="md:hidden">
        <Logo />
      </div>

      <label className="relative hidden flex-1 items-center sm:flex">
        <SearchIcon className="pointer-events-none absolute left-4 h-5 w-5 text-muted" />
        <input
          type="search"
          placeholder="ค้นหาแมว, สายพันธุ์, สีขน..."
          className="w-full rounded-full border border-line bg-surface py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="การแจ้งเตือน"
          className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-primary-50 hover:text-primary-700"
        >
          <BellIcon className="h-5 w-5" />
        </button>
        <span
          aria-label="โปรไฟล์ของฉัน"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700"
        >
          ฉัน
        </span>
      </div>
    </header>
  );
}
