import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MeowMatch",
    template: "%s · MeowMatch",
  },
  description:
    "เก็บข้อมูลแมว ค้นหาแมวที่สนใจ และสำรวจความเป็นไปได้ของลักษณะลูกแมวจากข้อมูลพันธุกรรม",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover เปิดใช้ env(safe-area-inset-*) เพื่อเลี่ยงรอยบาก/แถบ home indicator บน iOS/Android
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
