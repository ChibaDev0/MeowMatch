/**
 * เครื่องมือ NLP ภาษาไทยแบบเบา (ฟังก์ชันบริสุทธิ์ ไม่เรียก network)
 * 1) normalizeThai     — ทำความสะอาดข้อความ (zero-width, สระอำ, อักษรซ้ำ, ช่องว่าง)
 * 2) segmentSentences  — แบ่งประโยค/วลี
 * 3) tokenizeThai      — ตัดคำแบบ dictionary + maximal matching (แนวเดียวกับ newmm ของ PyThaiNLP)
 *                        ใช้ Intl.Segmenter("th") เป็นขอบเขตคำพื้นฐาน แล้วรวมคำด้วยพจนานุกรมโดเมน
 * 4) posTag            — ติดป้ายชนิดคำ (Universal POS) จาก lexicon ของโดเมน
 * ถ้าตั้งค่า PyThaiNLP service ไว้ ฝั่ง server จะใช้ผลตัดคำ/POS ของ PyThaiNLP แทน (ดู server/nlp)
 */
import { ALIAS_INDEX, DOMAIN_WORDS, FUNCTION_WORDS, NEGATORS } from "./lexicon";

export type TokenKind = "word" | "space" | "punct";
export type Token = { text: string; start: number; end: number; kind: TokenKind; pos: string };

export function normalizeThai(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u0E4D\u0E32/g, "\u0E33") // นิคหิต + สระอา → สระอำ
    .replace(/\u0E40\u0E40/g, "\u0E41") // เ + เ → แ (พิมพ์ผิดที่พบบ่อย)
    .replace(/([\u0E00-\u0E7Fa-zA-Z])\1{2,}/g, "$1") // ยาววววว → ยาว
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** แบ่งประโยค/วลี: ขึ้นบรรทัดใหม่ เครื่องหมายวรรคตอน หรือช่องว่างระหว่างข้อความไทย (ธรรมเนียมการเขียนไทย) */
export function segmentSentences(text: string): string[] {
  return text
    .split(/[\n.!?…,;]+|(?<=[\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const DICT = new Set<string>(DOMAIN_WORDS);
const MAX_WORD = Math.max(...DOMAIN_WORDS.map((w) => w.length));

let segmenter: Intl.Segmenter | null | undefined;
function intlBoundaries(run: string): Set<number> {
  if (segmenter === undefined) {
    try {
      segmenter = new Intl.Segmenter("th", { granularity: "word" });
    } catch {
      segmenter = null;
    }
  }
  const bounds = new Set<number>([0, run.length]);
  if (segmenter) for (const s of segmenter.segment(run)) bounds.add(s.index);
  else for (let i = 0; i <= run.length; i++) bounds.add(i); // ไม่มี ICU → ใช้พจนานุกรมล้วน
  return bounds;
}

/**
 * Maximal matching บนกราฟของตำแหน่ง: เส้นเชื่อมคือคำในพจนานุกรมโดเมน หรือคำจาก Intl.Segmenter
 * เลือกเส้นทางที่ (1) มีตัวอักษรที่ไม่รู้จักน้อยที่สุด (2) จำนวนคำน้อยที่สุด (3) ครอบคลุมด้วยคำในพจนานุกรมมากที่สุด
 * → "สก็อต|ติ|ชโฟ|ลด์" ถูกรวมเป็น "สก็อตติชโฟลด์" แต่ "ตามใจ" ไม่ถูกตัดเป็น "ตา|มใจ"
 */
function segmentThaiRun(run: string): string[] {
  const n = run.length;
  const bounds = intlBoundaries(run);
  const sorted = [...bounds].sort((a, b) => a - b);
  const nextBound = (p: number) => sorted.find((b) => b > p) ?? n;
  type Cost = { unk: number; count: number; dict: number; prev: number };
  const best: Cost[] = Array.from({ length: n + 1 }, () => ({ unk: Infinity, count: Infinity, dict: 0, prev: -1 }));
  best[0] = { unk: 0, count: 0, dict: 0, prev: -1 };
  const relax = (from: number, to: number, unk: number, dict: number) => {
    const f = best[from]!;
    const cand = { unk: f.unk + unk, count: f.count + 1, dict: f.dict + dict, prev: from };
    const cur = best[to]!;
    const better =
      cand.unk !== cur.unk
        ? cand.unk < cur.unk
        : cand.count !== cur.count
          ? cand.count < cur.count
          : cand.dict > cur.dict;
    if (better) best[to] = cand;
  };
  for (let p = 0; p < n; p++) {
    if (best[p]!.unk === Infinity) continue;
    for (let len = Math.min(MAX_WORD, n - p); len >= 1; len--) {
      if (DICT.has(run.slice(p, p + len))) relax(p, p + len, 0, len);
    }
    const q = nextBound(p);
    relax(p, q, bounds.has(p) ? 0 : q - p, 0);
  }
  const out: string[] = [];
  for (let p = n; p > 0; p = best[p]!.prev) out.unshift(run.slice(best[p]!.prev, p));
  return out;
}

/** ตัดคำ (คงช่องว่าง/เครื่องหมายไว้เป็น token เพื่อ map ตำแหน่งกลับได้) */
export function tokenizeThai(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /([\u0E00-\u0E7F]+)|([a-z0-9]+(?:['-][a-z0-9]+)*)|(\s+)|([^\s\u0E00-\u0E7Fa-z0-9]+)/giu;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (m[1]) {
      let offset = start;
      for (const word of segmentThaiRun(m[1])) {
        tokens.push({ text: word, start: offset, end: offset + word.length, kind: "word", pos: "" });
        offset += word.length;
      }
    } else {
      const kind: TokenKind = m[3] ? "space" : m[4] ? "punct" : "word";
      tokens.push({ text: m[0], start, end: start + m[0].length, kind, pos: "" });
    }
  }
  return posTag(tokens);
}

/** แปลงรายการคำจากตัวตัดคำภายนอก (PyThaiNLP) เป็น Token พร้อมตำแหน่ง */
export function tokensFromWords(text: string, words: { text: string; pos?: string }[]): Token[] | null {
  if (words.map((w) => w.text).join("") !== text) return null;
  let offset = 0;
  return words.map((w) => {
    const start = offset;
    offset += w.text.length;
    const kind: TokenKind = /^\s+$/.test(w.text)
      ? "space"
      : /^[^\p{L}\p{N}\u0E00-\u0E7F]+$/u.test(w.text)
        ? "punct"
        : "word";
    return { text: w.text, start, end: offset, kind, pos: kind === "space" ? "SPACE" : (w.pos ?? "") };
  });
}

/** POS แบบ lexicon (UD tagset) — ใช้เมื่อไม่มี PyThaiNLP; คำที่ไม่รู้จัก = X */
export function posTag(tokens: Token[]): Token[] {
  return tokens.map((t) => {
    if (t.pos) return t;
    if (t.kind === "space") return { ...t, pos: "SPACE" };
    if (t.kind === "punct") return { ...t, pos: "PUNCT" };
    const w = t.text.toLocaleLowerCase();
    const entry = ALIAS_INDEX.get(w);
    const pos = /^\d+$/.test(w)
      ? "NUM"
      : FUNCTION_WORDS[w]
        ? FUNCTION_WORDS[w]!
        : NEGATORS.has(w)
          ? "PART"
          : entry
            ? entry.kind === "breed"
              ? "PROPN"
              : "NOUN"
            : "X";
    return { ...t, pos };
  });
}
