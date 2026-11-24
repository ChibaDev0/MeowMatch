// ถ่ายภาพหน้าจอจริงสำหรับรายงาน — สร้างผู้ใช้ทดสอบชั่วคราว แล้วลบทิ้งตอนจบ
// รัน: OUT=<dir> node docs/report/shoot.mjs   (ต้องเปิด npm run dev + nlp-service ไว้)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=["']?(.*?)["']?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const OUT = process.env.OUT; mkdirSync(OUT, { recursive: true });
const EMAIL = "report-demo@meowmatch.test", PASS = `Rep-${crypto.randomUUID()}`;
const BASE = "http://localhost:3000";
const api = async (path, opts = {}) => { const r = await fetch(U + path, { ...opts, headers: { ...H, ...(opts.headers || {}) } }); const t = await r.text(); if (!r.ok) throw new Error(path + " " + r.status + " " + t); return t ? JSON.parse(t) : null; };

let uid;
try {
  const list = await api("/auth/v1/admin/users?per_page=200");
  const old = list.users.find((u) => u.email === EMAIL); if (old) await api(`/auth/v1/admin/users/${old.id}`, { method: "DELETE" });
  uid = (await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: EMAIL, password: PASS, email_confirm: true, user_metadata: { username: "nong_mali" } }) })).id;
  await api("/rest/v1/profiles?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: uid, username: "nong_mali", onboarding_status: "complete" }) });
  const [mine] = await api("/rest/v1/cats", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ owner_id: uid, name: "มะลิ", breed: "ผสม", sex: "female", age_months: 20, coat: "ขนสั้น", coat_color: "ขาวดำ", coat_pattern: "สีพื้น", eye_color: "ตาสีทอง", ear_type: "หูตั้ง", photo_path: "/cats/seed/041.jpg", genes: { L: "Aa", S: "Aa", D: "AA", W: "aa", C: "AA", Fd: "aa", hr: "AA" } }) });
  const males = await api(`/rest/v1/cats?select=id,name&owner_id=is.null&sex=eq.male&coat=eq.${encodeURIComponent("ขนยาว")}&coat_color=eq.${encodeURIComponent("ส้ม")}&limit=1`);
  await api("/rest/v1/cat_likes", { method: "POST", body: JSON.stringify({ user_id: uid, cat_id: males[0].id }) });

  const b = await chromium.launch({ channel: "chrome" });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const shot = async (name, loc) => { await p.waitForTimeout(900); await (loc ?? p).screenshot({ path: `${OUT}/${name}.png` }); console.log("shot", name); };

  await p.goto(`${BASE}/login`); await p.waitForLoadState("networkidle"); await shot("01-login");
  await p.getByPlaceholder("กรอก Username หรือ Email").fill(EMAIL);
  await p.getByPlaceholder("กรอกรหัสผ่าน").fill(PASS);
  await p.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await p.waitForURL(/\/home$/); await p.waitForLoadState("networkidle"); await shot("02-home");

  await p.goto(`${BASE}/my-cats`); await p.waitForLoadState("networkidle"); await shot("03-my-cats");
  await p.goto(`${BASE}/my-cats/new`); await p.waitForLoadState("networkidle"); await shot("04-add-cat");
  await p.goto(`${BASE}/my-cats/${mine.id}/edit`); await p.waitForLoadState("networkidle");
  const gene = p.locator("details").filter({ hasText: "ยีนจำลอง" }); await gene.scrollIntoViewIfNeeded(); await shot("05-gene-editor", gene);

  await p.goto(`${BASE}/desired-cats`); await p.waitForLoadState("networkidle");
  await p.getByText("มะลิ").first().click();
  await p.getByLabel("พิมพ์บอกลูกแมวที่อยากได้ (ภาษาไทย)").fill("อยากได้ลูกแมวขนยาว สีกระดองเต่า ไม่เอาหูพับนะ");
  await p.getByRole("button", { name: "แปลงข้อความเป็นเป้าหมาย" }).click();
  await p.getByRole("region", { name: "ผลวิเคราะห์ข้อความ" }).waitFor();
  await p.getByRole("button", { name: /ดูขั้นตอน NLP/ }).click();
  const nlp = p.locator("#goal-text").locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await nlp.scrollIntoViewIfNeeded(); await shot("06-nlp", nlp);
  await p.getByRole("button", { name: "วิเคราะห์ผลลัพธ์" }).click();
  const plan = p.getByRole("region", { name: "แมวคู่ที่ต้องหาจากยีน" }); await plan.waitFor({ timeout: 60000 });
  await plan.scrollIntoViewIfNeeded(); await shot("07-mate-plan", plan);
  const appear = p.getByRole("region", { name: "ผลประเมินเบื้องต้น" });
  if (await appear.count()) { await appear.scrollIntoViewIfNeeded(); await shot("08-appearance", appear); }

  await p.getByRole("link", { name: /ค้นหาแมวแบบนี้/ }).click(); await p.waitForURL(/discover/); await p.waitForLoadState("networkidle");
  await p.waitForTimeout(1500); await shot("09-discover-genes");
  await p.goto(`${BASE}/discover`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500); await shot("10-discover");

  await p.goto(`${BASE}/breeding`); await p.waitForLoadState("networkidle");
  await p.locator("section").first().getByText("มะลิ").click();
  await p.getByRole("button", { name: "แมวที่กดใจไว้" }).click();
  await p.locator("section").nth(1).getByText(males[0].name).click();
  await shot("11-breeding-pick");
  await p.getByRole("button", { name: "วิเคราะห์ลูกแมว" }).click();
  const res = p.getByRole("region", { name: "ผลจำลองยีน" }); await res.waitFor({ timeout: 60000 });
  const parents = res.locator("div.grid").first(); await parents.scrollIntoViewIfNeeded(); await shot("12-breeding-parents", parents);
  const traits = res.locator("div.grid").nth(1); await traits.scrollIntoViewIfNeeded(); await shot("13-breeding-traits", traits);
  const sq = res.locator("figure").first(); if (await sq.count()) { await sq.scrollIntoViewIfNeeded(); await shot("14-punnett", sq); }
  await b.close();
} finally {
  if (uid) await api(`/auth/v1/admin/users/${uid}`, { method: "DELETE" }).then(() => console.log("deleted test user"));
}
