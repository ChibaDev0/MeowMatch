"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { DiscoverFilters } from "@/server/cats/queries";

const EYE = ["ตาสีฟ้า", "ตาสีทอง", "ตาสีเขียว", "ตาสีน้ำตาล", "ตาสองสี"];
const COAT = ["ขนสั้น", "ขนยาว", "ไม่มีขน"];
const EAR = ["หูตั้ง", "หูพับ"];

function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

/**
 * แผงตัวกรองหน้าหาคู่ (DISC-01) — ผูกกับ URL searchParams เพื่อให้หน้า (server) ดึงผลตามตัวกรอง
 * "ค้นหา" → push query (รีเซ็ตไปหน้าแรก); "ล้างตัวกรอง" → กลับไป /discover
 * มีเฉพาะตัวกรองที่มีคอลัมน์จริงใน cats (สายพันธุ์/สีตา/ขน/หู) — ยังไม่เก็บ "สีของแมว" ใน MVP
 */
export function DiscoverFilterPanel({ breeds, initial }: { breeds: string[]; initial: DiscoverFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [breed, setBreed] = useState(initial.breed ?? "");
  const [eye, setEye] = useState(initial.eye ?? "");
  const [coat, setCoat] = useState(initial.coat ?? "");
  const [ear, setEar] = useState(initial.ear ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (breed) params.set("breed", breed);
    if (eye) params.set("eye", eye);
    if (coat) params.set("coat", coat);
    if (ear) params.set("ear", ear);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/discover?${qs}` : "/discover"));
  }

  function clear() {
    setBreed("");
    setEye("");
    setCoat("");
    setEar("");
    startTransition(() => router.push("/discover"));
  }

  return (
    <aside className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold text-ink">ตัวกรอง</h2>

      <Dropdown label="สายพันธุ์" value={breed} onChange={setBreed} options={breeds} placeholder="ทุกสายพันธุ์" />
      <Dropdown label="สีตา" value={eye} onChange={setEye} options={EYE} placeholder="ทุกสีตา" />

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-ink">ลักษณะขน</span>
        <div className="flex flex-wrap gap-2">
          {COAT.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCoat((v) => (v === c ? "" : c))}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                coat === c
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-line text-muted hover:border-primary-400 hover:text-primary-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Dropdown label="หู" value={ear} onChange={setEar} options={EAR} placeholder="ทุกแบบ" />

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          className="flex-1 rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-800 disabled:opacity-60"
        >
          ค้นหา
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={pending}
          className="text-sm font-medium text-primary-600 transition hover:text-primary-700 disabled:opacity-60"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </aside>
  );
}
