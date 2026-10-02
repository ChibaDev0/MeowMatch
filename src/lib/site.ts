/** URL ฐานของเว็บ ใช้สร้าง redirect ของ Auth (email confirm, OAuth, password reset) */
export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"
  );
}
