"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DotsIcon, EditIcon, EyeIcon, LockIcon, TrashIcon } from "./icons";
import { deleteCatAction, setCatVisibilityAction } from "@/server/cats/actions";

/**
 * ปุ่มแก้ไข/ลบ/ซ่อน บนการ์ดแมว (CAT-01 / DISC-01) — ใช้เฉพาะ "แมวของฉัน"
 * - แก้ไข → ไปหน้า /my-cats/[id]/edit
 * - เผยแพร่/ถอนเผยแพร่ → setCatVisibilityAction (ซ่อนจากหน้าหาคู่ของคนอื่น)
 * - ลบ → ยืนยันก่อน แล้วเรียก deleteCatAction (RLS คุมสิทธิ์อีกชั้น)
 */
export function CatCardActions({
  catId,
  name,
  isPublic = true,
}: {
  catId: string;
  name: string;
  isPublic?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [published, setPublished] = useState(isPublic);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ปิดเมนูเมื่อคลิกนอกพื้นที่
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCatAction(catId);
      if (res.ok) {
        setConfirming(false);
        setMenuOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function onToggleVisibility() {
    const next = !published;
    setPublished(next); // optimistic
    setMenuOpen(false);
    startTransition(async () => {
      const res = await setCatVisibilityAction(catId, next);
      if (res.ok) {
        router.refresh();
      } else {
        setPublished(!next); // rollback เงียบ ๆ (แนวเดียวกับปุ่มกดใจในหน้าหาคู่)
      }
    });
  }

  return (
    <div className="relative flex items-center gap-1 text-muted" ref={menuRef}>
      <Link
        href={`/my-cats/${catId}/edit`}
        aria-label={`แก้ไข ${name}`}
        className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-primary-50 hover:text-primary-700"
      >
        <EditIcon className="h-4 w-4" />
      </Link>
      <button
        type="button"
        aria-label={`ตัวเลือกเพิ่มเติมของ ${name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-primary-50 hover:text-primary-700"
      >
        <DotsIcon className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          <Link
            href={`/my-cats/${catId}/edit`}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink transition hover:bg-primary-50"
          >
            <EditIcon className="h-4 w-4" />
            แก้ไขข้อมูล
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onToggleVisibility}
            disabled={pending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-primary-50 disabled:opacity-60"
          >
            {published ? <LockIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            {published ? "ซ่อนจากหน้าหาคู่" : "เผยแพร่ในหน้าหาคู่"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setConfirming(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
          >
            <TrashIcon className="h-4 w-4" />
            ลบแมว
          </button>
        </div>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`ยืนยันการลบ ${name}`}
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink">ลบแมว “{name}”?</h2>
              <p className="text-sm text-muted">
                การลบจะนำข้อมูลและรูปของแมวตัวนี้ออกถาวร และกู้คืนไม่ได้
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                disabled={pending}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition hover:bg-primary-50 disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "กำลังลบ…" : "ลบถาวร"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
