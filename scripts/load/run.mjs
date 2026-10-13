// QA-01 — Load test harness (autocannon)
//
// รันโหลดเทสต์กับ endpoint ที่ปลอดภัย (ค่าเริ่มต้น: /api/v1/health ที่เป็น read-only)
// ควรรันกับ production build (`npm run build && npm run start`) ไม่ใช่ dev server
// เพราะ dev มี overhead ของ HMR/compile ตัวเลขจึงไม่สะท้อนของจริง
//
// ใช้:
//   node scripts/load/run.mjs [--url=...] [--path=/api/v1/health] [--duration=10] [--connections=50]
//   LOAD_URL=https://staging.example node scripts/load/run.mjs
//
// ไม่ผูกกับ CI/threshold ตายตัว — เป้าหมายเวลา/throughput ต้องทีมตกลงตามสภาพแวดล้อมจริง (OPS-01)

import autocannon from "autocannon";

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

const base = (arg("url", process.env.LOAD_URL) ?? "http://localhost:3000").replace(/\/$/, "");
const path = arg("path", "/api/v1/health");
const duration = Number(arg("duration", "10"));
const connections = Number(arg("connections", "50"));
const url = `${base}${path}`;

console.log(`[load] ${url} — ${connections} connections, ${duration}s`);

const result = await autocannon({ url, connections, duration });

const summary = {
  url,
  connections,
  duration,
  requests_total: result.requests.total,
  rps_mean: result.requests.mean,
  latency_p50_ms: result.latency.p50,
  latency_p97_5_ms: result.latency.p97_5,
  latency_max_ms: result.latency.max,
  non2xx: result.non2xx,
  errors: result.errors,
  timeouts: result.timeouts,
};

console.log(JSON.stringify(summary, null, 2));

// fail เฉพาะเมื่อมี error/timeout หรือ response ไม่ใช่ 2xx (ความถูกต้องของ endpoint)
// ไม่ fail บนเกณฑ์ latency — ปล่อยให้ทีมตั้งเป้าตามสภาพแวดล้อมจริง
if (result.errors > 0 || result.timeouts > 0 || result.non2xx > 0) {
  console.error("[load] พบ error/timeout/non-2xx — ตรวจสอบ endpoint");
  process.exit(1);
}
