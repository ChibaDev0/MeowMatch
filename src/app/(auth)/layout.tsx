/** Auth layout — พื้นหลังเต็มหน้าจอ; แต่ละหน้าจัด layout ของตัวเอง (login เป็น split, อื่น ๆ เป็นการ์ด) */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-page">{children}</div>;
}
