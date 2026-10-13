import type { NextConfig } from "next";

/**
 * Next.js configuration for MeowMatch.
 * อ้างอิง: MeowMatch/01-architecture — modular monolith บน Next.js App Router
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/*": ["./docs/ai/gemini-flash.md", "./docs/ai/pair-appearance.md", "./docs/scope.md"],
  },
  // Server Actions รับ FormData ที่มีไฟล์รูป — ขยายลิมิต body จากค่าเริ่มต้น 1MB
  // ให้พอกับรูปสูงสุด 5MB (MAX_PHOTO_BYTES) + overhead ของฟิลด์อื่นและ multipart encoding
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  // รูปภาพแมวเก็บใน Supabase Storage — อนุญาต remote pattern ของ Supabase project เท่านั้น
  // ตั้งค่า NEXT_PUBLIC_SUPABASE_URL ก่อน แล้ว host จะถูกดึงมาใช้ตอน build/runtime
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
