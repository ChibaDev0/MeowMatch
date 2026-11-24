/** รันกรณีทดสอบจริงจาก engine แล้วเขียนผลเป็น JSON สำหรับรายงาน (บทผลลัพธ์ทุกกรณี)
 *  รัน: npx vite-node docs/report/cases.ts */
import { writeFileSync } from "node:fs";
import caseStudy from "../../src/domain/nlp/fixtures/case-study.json";
import { parseGoalText } from "../../src/domain/nlp/goal-parser";
import { simulatePair, type Parent } from "../../src/domain/genes/cross";
import { planMate } from "../../src/domain/genes/plan";
import { formatGenotype, type LocusId, type Code } from "../../src/domain/genes/model";

const pct = (r: { lower: number; upper: number }) =>
  Math.abs(r.upper - r.lower) < 1e-9 ? `${Math.round(r.upper * 100)}%` : `${Math.round(r.lower * 100)}–${Math.round(r.upper * 100)}%`;

const slotText = (v: string | null) => (v === null ? "-" : v === "" ? "ไม่จำกัด" : v);
const nlp = caseStudy.cases.map(({ text, expect }) => {
  const r = parseGoalText(text);
  const got = { breed: r.slots.breed.value, coat: r.slots.coat.value, eye: r.slots.eye.value, ear: r.slots.ear.value, color: r.slots.color.value };
  const ok = (["breed", "coat", "eye", "ear"] as const).every((k) => got[k] === (expect as Record<string, string | null>)[k]);
  return {
    text,
    tokens: r.tokens.filter((t) => t.kind === "word").map((t) => t.text).join(" | "),
    result: `${slotText(got.breed)} / ${slotText(got.coat)} / ${slotText(got.eye)} / ${slotText(got.ear)}${got.color ? " / สี" + got.color : ""}`,
    statuses: Object.entries(r.slots).filter(([, s]) => s.status !== "none").map(([k, s]) => `${k}:${s.status}`).join(", "),
    warnings: r.warnings.join("; "),
    ok,
  };
});

// ขอบกรณีพิเศษของ NLP
const nlpEdge = ["ไม่เอาหูพับ", "ไม่เอาขนยาว", "ตาฟ้าหรือตาเขียว", "สายพันธุ์อะไรก็ได้", "ขนยาว สีส้ม ลายสลิด", "เอาตามใจเลยครับ"].map((text) => {
  const r = parseGoalText(text);
  return {
    text,
    result: Object.entries(r.slots).filter(([, s]) => s.status !== "none").map(([k, s]) => `${k}=${slotText(s.value)} (${s.status})`).join(", ") || "-",
    note: [...new Set([...r.warnings, ...r.ignored, ...Object.values(r.slots).map((s) => s.note).filter(Boolean)])].join("; "),
  };
});

// Punnett ยีนเดี่ยว ทุกคู่ genotype
const cat = (sex: "male" | "female", over: Record<string, string>, genes: Record<string, Code> = {}): Parent => ({
  name: sex === "female" ? "แม่" : "พ่อ",
  appearance: { sex, coat: "ขนสั้น", ear: "หูตั้ง", eye: "ตาสีทอง", coatColor: "ดำ", coatPattern: "สีพื้น", ...over },
  genes: { D: "AA", ...genes },
});
const coatCodes: [string, Code][] = [["ขนสั้น", "AA"], ["ขนสั้น", "Aa"], ["ขนยาว", "aa"]];
const coat = [] as { mother: string; father: string; short: string; long: string }[];
for (const [mc, m] of coatCodes)
  for (const [fc, f] of coatCodes) {
    const r = simulatePair(cat("female", { coat: mc }, { L: m }), cat("male", { coat: fc }, { L: f }));
    const t = r.traits.find((x) => x.key === "coat")!;
    const get = (l: string) => { const o = t.outcomes.find((x) => x.label === l); return o ? pct(o.all) : "0%"; };
    coat.push({ mother: `${mc} (${formatGenotype("L", m)})`, father: `${fc} (${formatGenotype("L", f)})`, short: get("ขนสั้น"), long: get("ขนยาว") });
  }

const unknownCoat = (() => {
  const r = simulatePair(cat("female", { coat: "ขนสั้น" }), cat("male", { coat: "ขนยาว" }));
  return r.traits.find((x) => x.key === "coat")!.outcomes.map((o) => `${o.label} ${pct(o.all)}`).join(", ");
})();

const ears: [string, string, string][] = [["หูตั้ง", "หูตั้ง", ""], ["หูพับ", "หูตั้ง", ""], ["หูพับ", "หูพับ", ""]];
const ear = ears.map(([m, f]) => {
  const r = simulatePair(cat("female", { ear: m }), cat("male", { ear: f }));
  return { mother: m, father: f, result: r.traits.find((x) => x.key === "ear")!.outcomes.map((o) => `${o.label} ${pct(o.all)}`).join(", "), warn: r.warnings.join("; ") };
});

const colorPairs: [string, string][] = [["ดำ", "ดำ"], ["ดำ", "ส้ม"], ["ส้ม", "ดำ"], ["ส้ม", "ส้ม"], ["กระดองเต่า", "ดำ"], ["กระดองเต่า", "ส้ม"], ["สามสี", "ดำ"], ["ขาว", "ดำ"]];
const color = colorPairs.map(([m, f]) => {
  const r = simulatePair(cat("female", { coatColor: m }, { S: "aa", W: "aa" }), cat("male", { coatColor: f }, { S: "aa" }));
  const t = r.traits.find((x) => x.key === "color")!;
  return {
    mother: m, father: f,
    male: t.outcomes.filter((o) => o.male && o.male.upper > 0).map((o) => `${o.label} ${pct(o.male!)}`).join(", "),
    female: t.outcomes.filter((o) => o.female && o.female.upper > 0).map((o) => `${o.label} ${pct(o.female!)}`).join(", "),
  };
});

const point = [["AA", "AA"], ["Aa", "Aa"], ["Aa", "aa"], ["aa", "aa"]].map(([m, f]) => {
  const look = (c: string): Record<string, string> => (c === "aa" ? { coatPattern: "แต้มสี (colorpoint)", eye: "ตาสีฟ้า" } : {});
  const r = simulatePair(cat("female", look(m!), { C: m as Code }), cat("male", look(f!), { C: f as Code }));
  return { mother: formatGenotype("C", m as Code), father: formatGenotype("C", f as Code), result: r.traits.find((x) => x.key === "point")!.outcomes.map((o) => `${o.label} ${pct(o.all)}`).join(", ") };
});

const hairless = (() => {
  const r = simulatePair(cat("female", {}, { hr: "Aa", L: "AA" }), cat("male", {}, { hr: "Aa", L: "AA" }));
  return r.traits.find((x) => x.key === "coat")!.outcomes.map((o) => `${o.label} ${pct(o.all)}`).join(", ");
})();

// วางแผนหาคู่
const plans = [
  ["แม่ขนสั้นซ่อนขนยาว (Ll) → อยากได้ขนยาว", cat("female", {}, { L: "Aa" }), { coat: "ขนยาว" }],
  ["แม่ขนสั้นแท้ (LL) → อยากได้ขนยาว", cat("female", {}, { L: "AA" }), { coat: "ขนยาว" }],
  ["แม่ขนยาว → อยากได้ขนสั้นแน่นอน", cat("female", { coat: "ขนยาว" }), { coat: "ขนสั้น" }],
  ["แม่หูพับ → อยากได้หูพับ", cat("female", { ear: "หูพับ" }), { ear: "หูพับ" }],
  ["แม่ขาวดำ → อยากได้สามสี", cat("female", { coatColor: "ขาวดำ" }, { S: "AA" }), { color: "สามสี" }],
  ["พ่อสีดำ → อยากได้ตาสีฟ้า", cat("male", {}), { eye: "ตาสีฟ้า" }],
  ["แมวไม่ระบุเพศ → อยากได้ขนยาว", { ...cat("female", {}), appearance: { ...cat("female", {}).appearance, sex: "unknown" as const } }, { coat: "ขนยาว" }],
  ["แม่ → อยากได้ตาสีเขียว (ไม่อยู่ในแบบจำลอง)", cat("female", {}), { eye: "ตาสีเขียว" }],
] as const;
const plan = plans.map(([label, src, target]) => {
  const p = planMate(src as Parent, target);
  if ("error" in p) return { label, mate: "-", prob: "-", note: p.error };
  const spec = [p.mateSex === "male" ? "เพศผู้" : "เพศเมีย", p.mateSpec.coat, p.mateSpec.ear, p.mateSpec.color && "สี" + p.mateSpec.color, p.mateSpec.pattern].filter(Boolean).join(" ");
  const hidden = Object.entries(p.requiredGenes).map(([l, c]) => formatGenotype(l as LocusId, c as Code)).join(", ");
  return { label, mate: spec + (hidden ? ` (ต้องมียีน ${hidden})` : ""), prob: pct(p.total), note: [...p.groups.map((g) => g.impossible).filter(Boolean), ...p.notes].join("; ") };
});

writeFileSync("docs/report/cases.json", JSON.stringify({ nlp, nlpEdge, coat, unknownCoat, ear, color, point, hairless, plan }, null, 1), "utf8");
console.log("nlp ok", nlp.filter((n) => n.ok).length, "/", nlp.length);
