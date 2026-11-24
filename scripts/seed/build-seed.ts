/**
 * สร้าง + อัปโหลดแมวตัวอย่างของระบบ (owner_id = NULL) จากรูปที่คัดและติดป้ายลักษณะด้วยตาแล้ว
 *
 * อินพุต  scripts/seed/picks.json   — ลักษณะที่ "มองเห็นในรูป" ของแต่ละตัว (คนตรวจรูปเป็นผู้ติดป้าย)
 *         <candDir>/candidates.json + img/<n>.jpg — รูปและข้อมูลสัญญาอนุญาตจาก Wikimedia Commons
 * เอาต์พุต public/cats/seed/NNN.jpg, public/cats/seed/CREDITS.md, supabase/seed/cats-100.json
 *         และ upsert ลงตาราง cats (ถ้าใส่ --push; ใช้ SUPABASE_SERVICE_ROLE_KEY จาก .env.local)
 *
 * เพศ อายุ นิสัย และ "ยีนที่ซ่อนอยู่" มองไม่เห็นจากรูป → สุ่มแบบกำหนด seed (ผลซ้ำได้)
 * ยีนสุ่มเฉพาะจากชุดที่เข้ากับหน้าตา (possibleFromAppearance) จึงไม่ขัดกับรูป
 *
 * รัน: npx vite-node scripts/seed/build-seed.ts -- <candDir> [--push]
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LOCI, possibleFromAppearance, validateGenes, type Appearance, type Code, type GeneMap } from "../../src/domain/genes/model";

type Pick = {
  n: number;
  breed?: string;
  coat: "ขนสั้น" | "ขนยาว" | "ไม่มีขน";
  color?: string;
  pattern?: string;
  eye?: string;
  ear: "หูตั้ง" | "หูพับ";
  /** บังคับเพศเมื่อสีบอกเพศได้ (สามสี/กระดองเต่า = เมีย) */
  sex?: "male" | "female";
};
type Cand = { n: number; breed: string; title: string; license: string; licenseUrl: string; artist: string; page: string };

const args = process.argv.slice(2).filter((a) => a !== "--");
const candDir = args.find((a) => !a.startsWith("--"));
if (!candDir) throw new Error("usage: build-seed.ts <candDir> [--push]");
const push = args.includes("--push");
const root = process.cwd();
const picks: Pick[] = JSON.parse(readFileSync(path.join(root, "scripts/seed/picks.json"), "utf8"));
const cands: Cand[] = JSON.parse(readFileSync(path.join(candDir, "candidates.json"), "utf8"));

// mulberry32 — สุ่มแบบกำหนด seed
let state = 20261110;
function rnd() {
  state |= 0;
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const choice = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

const NAMES = `โมจิ โทฟุ ถุงทอง ส้มจี๊ด ข้าวปั้น มะลิ น้ำตาล ชาเย็น ปุยฝ้าย เต้าหู้ ลาเต้ มอคค่า คุกกี้ บราวนี่ พุดดิ้ง วาฟเฟิล
ข้าวเหนียว มะม่วง ทองหยอด ฝอยทอง ขนมชั้น ลูกชุบ บัวลอย สาคู ถั่วแดง งาดำ นมสด โกโก้ กาแฟ ชาไทย มัทฉะ ยูซุ ซูชิ วาซาบิ
ทาโร่ ราเมน เกี๊ยวซ่า ดังโงะ ไดฟุกุ โมโม่ ยูกิ ฮานะ โซระ ไคโตะ ริน เรน ลูน่า เบลล่า ไมโล ลีโอ ซิมบ้า นาล่า โอลิเวอร์ โคโค่
ชาร์ลี แม็กซ์ โอรีโอ้ คิตตี้ ทิกเกอร์ สโมคกี้ ชาโดว์ จิงเจอร์ เปปเปอร์ มิดไนท์ สโนว์ คลาวด์ สตอร์ม สกาย ซันนี่ เมเปิ้ล ฮันนี่
พีช เชอร์รี่ เบอร์รี่ มิ้นท์ โรส ลิลลี่ เดซี่ ไข่มุก เพชร ทับทิม มรกต หยก เงิน ทองคำ ดาว เดือน ตะวัน เมฆ ฝน หมอก น้ำค้าง
สายไหม ไหมพรม กำมะหยี่ ปุกปุย นุ่มนิ่ม จิ๋ว ตุ้ยนุ้ย อ้วนกลม ซาลาเปา หมั่นโถว ติ่มซำ ขนมจีบ ฮะเก๋า`.split(/\s+/);
const TEMPER = [
  "ขี้อ้อน ชอบให้อุ้ม", "ซน ชอบวิ่งเล่น", "เงียบ ๆ ชอบนอนริมหน้าต่าง", "ช่างคุย ร้องทักทุกคน", "ขี้สงสัย ชอบสำรวจ",
  "ใจดี เข้ากับแมวตัวอื่นได้", "ขี้อาย ต้องใช้เวลาทำความคุ้นเคย", "ตะกละ ได้ยินเสียงถุงขนมเป็นมา", "ชอบเล่นไม้ตกแมว", "รักสะอาด ชอบเลียขน",
];

const uuid = (key: string) => {
  const h = createHash("sha1").update(`meowmatch-seed-cat:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

const outImg = path.join(root, "public/cats/seed");
rmSync(outImg, { recursive: true, force: true }); // สร้างใหม่ทุกครั้ง ไม่ให้รูปเก่าค้าง
mkdirSync(outImg, { recursive: true });
mkdirSync(path.join(root, "supabase/seed"), { recursive: true });

const names = [...NAMES];
const rows: Record<string, unknown>[] = [];
const credits: string[] = [
  "# เครดิตรูปแมวตัวอย่าง (public/cats/seed)",
  "",
  "รูปทั้งหมดมาจาก Wikimedia Commons ภายใต้สัญญาอนุญาตเสรี ย่อขนาดเป็นกว้าง 640px ไม่ได้ดัดแปลงเนื้อหา",
  "ลักษณะที่มองเห็น (ขน สี ลาย ตา หู) ติดป้ายจากการดูรูป · เพศ อายุ นิสัย และยีนที่ซ่อนอยู่เป็นค่าสุ่มจำลอง",
  "",
  "| ไฟล์ | ชื่อในระบบ | ต้นฉบับ | ผู้สร้าง | สัญญาอนุญาต |",
  "|---|---|---|---|---|",
];

picks.forEach((p, i) => {
  const cand = cands.find((c) => c.n === p.n);
  if (!cand) throw new Error(`no candidate ${p.n}`);
  const file = `${String(i + 1).padStart(3, "0")}.jpg`;
  copyFileSync(path.join(candDir, "img", `${p.n}.jpg`), path.join(outImg, file));

  const female = /สามสี|กระดองเต่า/.test(p.color ?? "");
  const sex = p.sex ?? (female ? "female" : rnd() < 0.5 ? "male" : "female");
  const appearance: Appearance = { sex, coat: p.coat, ear: p.ear, eye: p.eye, coatColor: p.color, coatPattern: p.pattern };
  const genes: GeneMap = {};
  for (const locus of LOCI) {
    const options = possibleFromAppearance(locus.id, appearance);
    if (!options.length) continue;
    // ยีนไม่มีขนหายาก: ส่วนใหญ่ไม่ซ่อน (สุ่มซ่อน 8%)
    const pickCode: Code = locus.id === "hr" && options.length > 1 ? (rnd() < 0.08 ? "Aa" : "AA") : choice(options);
    genes[locus.id] = pickCode;
  }
  const bad = validateGenes(appearance, genes);
  if (bad.length) throw new Error(`pick ${p.n}: ${bad.join("; ")}`);

  const name = names.splice(Math.floor(rnd() * names.length), 1)[0]!;
  rows.push({
    id: uuid(String(p.n) + cand.title),
    owner_id: null,
    name,
    breed: p.breed ?? cand.breed,
    sex,
    age_months: 6 + Math.floor(rnd() * 90),
    coat: p.coat,
    coat_color: p.color ?? null,
    coat_pattern: p.pattern ?? null,
    eye_color: p.eye ?? null,
    ear_type: p.ear,
    temperament: choice(TEMPER),
    photo_path: `/cats/seed/${file}`,
    is_public: true,
    genes,
  });
  credits.push(`| ${file} | ${name} | [${cand.title.replace(/^File:/, "").replace(/\|/g, "-")}](${cand.page}) | ${cand.artist.replace(/\|/g, "-") || "—"} | ${cand.licenseUrl ? `[${cand.license}](${cand.licenseUrl})` : cand.license} |`);
});

writeFileSync(path.join(root, "supabase/seed/cats-100.json"), JSON.stringify(rows, null, 1) + "\n", "utf8");
writeFileSync(path.join(outImg, "CREDITS.md"), credits.join("\n") + "\n", "utf8");
console.log(`built ${rows.length} cats`);

if (push) {
  const env = Object.fromEntries(
    readFileSync(path.join(root, ".env.local"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z_]+)=["']?(.*?)["']?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1]!, m[2]!]),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing Supabase env");
  const res = await fetch(`${url}/rest/v1/cats?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  console.log("push", res.status, res.ok ? "ok" : await res.text());
  if (!res.ok) process.exit(1);
}
