/**
 * แปลงข้อความภาษาไทย (ภาษาธรรมชาติ) เป็นเป้าหมายลูกแมว — Rule-based NER / slot filling
 * input:  "อยากได้ลูกแมวสก็อตติชโฟลด์ ขนยาว ตาสีฟ้า แต่ไม่เอาหูพับนะ"
 * output: { breed: สก็อตติชโฟลด์, coat: ขนยาว, eye: ตาสีฟ้า, ear: หูตั้ง (อนุมานจากการปฏิเสธ) }
 *
 * ขั้นตอน: normalize → sentence segmentation → word segmentation → POS → entity matching
 *          (gazetteer n-gram + head-value pattern) → negation scope → slot resolution
 * ฟังก์ชันบริสุทธิ์: ไม่เรียก LLM/DB/network — ผลตัดคำจาก PyThaiNLP ส่งเข้ามาได้ผ่าน `external`
 */
import {
  ALIAS_INDEX,
  ANY_PHRASES,
  CLAUSE_BREAKERS,
  FILLERS,
  HEAD_VALUES,
  HEADS,
  MAX_ALIAS_TOKENS,
  NEGATORS,
  SLOT_LABELS,
  SLOT_OPTIONS,
  type EntityKind,
  type GoalSlot,
} from "./lexicon";
import { normalizeThai, segmentSentences, tokenizeThai, tokensFromWords, type Token } from "./thai";

export type Mention = {
  kind: EntityKind;
  value: string;
  text: string;
  /** ช่วง index ของ token [from, to) */
  from: number;
  to: number;
  negated: boolean;
  method: "gazetteer" | "pattern";
};

export type SlotStatus = "set" | "inferred" | "any" | "conflict" | "excluded" | "none";
export type SlotResult = {
  status: SlotStatus;
  /** ค่าที่จะกรอกลงฟอร์ม: string = ตั้งค่า ("" = ไม่จำกัด), null = ไม่แตะช่องนี้ */
  value: string | null;
  candidates: string[];
  excluded: string[];
  note?: string;
};

export type NlpEngine = "builtin" | "pythainlp";
export type GoalTextResult = {
  engine: NlpEngine;
  engineVersion?: string;
  normalized: string;
  sentences: string[];
  tokens: (Token & { entity?: EntityKind; negated?: boolean })[];
  mentions: Mention[];
  slots: Record<GoalSlot, SlotResult>;
  /** สิ่งที่ตรวจพบแต่หน้านี้ยังไม่รองรับ เช่น สี/ลายขน */
  ignored: string[];
  warnings: string[];
};

export type ExternalAnalysis = {
  engine: "pythainlp";
  version?: string;
  sentences: string[];
  tokens: { text: string; pos?: string }[];
};

const SLOTS: GoalSlot[] = ["breed", "coat", "eye", "ear", "color"];
const isColorSlotValue = (v: string) => (SLOT_OPTIONS.color as readonly string[]).includes(v);
const low = (s: string) => s.toLocaleLowerCase();

function isBreaker(t: Token) {
  return t.kind === "punct" || CLAUSE_BREAKERS.has(low(t.text));
}

/** gazetteer: จับคู่ n-gram ของ token (ยาวสุดก่อน) กับชื่อเรียกในพจนานุกรม */
function matchGazetteer(tokens: Token[], used: boolean[]): Mention[] {
  const out: Mention[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (used[i] || tokens[i]!.kind !== "word") continue;
    let joined = "";
    let found: { to: number; entry: ReturnType<typeof ALIAS_INDEX.get> } | null = null;
    let words = 0;
    for (let j = i; j < tokens.length && words < MAX_ALIAS_TOKENS; j++) {
      const t = tokens[j]!;
      if (used[j] || t.kind === "punct") break;
      if (t.kind === "space") continue;
      joined += low(t.text);
      words++;
      const entry = ALIAS_INDEX.get(joined);
      if (entry) found = { to: j + 1, entry };
    }
    if (found?.entry) {
      for (let k = i; k < found.to; k++) used[k] = true;
      out.push({
        kind: found.entry.kind,
        value: found.entry.value,
        text: tokens.slice(i, found.to).map((t) => t.text).join(""),
        from: i,
        to: found.to,
        negated: false,
        method: "gazetteer",
      });
      i = found.to - 1;
    }
  }
  return out;
}

/** หัวคำ + ค่า เช่น "ตา|เป็น|สี|ฟ้า", "ขน|ต้อง|ยาว", "หู|ไม่|พับ" และ "สายพันธุ์|อะไร|ก็|ได้" */
function matchPatterns(tokens: Token[], used: boolean[]) {
  const mentions: Mention[] = [];
  const any = new Set<GoalSlot>();
  for (let i = 0; i < tokens.length; i++) {
    const slot = HEADS[low(tokens[i]!.text)];
    if (!slot || used[i]) continue;
    // วลี "ไม่จำกัด"
    const after = tokens.slice(i + 1, i + 9).filter((t) => t.kind === "word").map((t) => low(t.text));
    while (after.length && FILLERS.has(after[0]!)) after.shift();
    const rest = after.join("");
    let negated = false;
    let hit: { j: number; value: string } | null = null;
    let words = 0;
    for (let j = i + 1; j < tokens.length && words < 5; j++) {
      const t = tokens[j]!;
      if (t.kind === "space") continue;
      if (used[j] || isBreaker(t)) break;
      words++;
      const w = low(t.text);
      if (NEGATORS.has(w)) {
        negated = true;
        continue;
      }
      const value = slot === "breed" || slot === "color" ? undefined : HEAD_VALUES[slot][w];
      if (value) {
        hit = { j, value };
        break;
      }
      if (!FILLERS.has(w)) break;
    }
    if (hit) {
      for (let k = i; k <= hit.j; k++) used[k] = true;
      mentions.push({
        kind: slot,
        value: hit.value,
        text: tokens.slice(i, hit.j + 1).map((t) => t.text).join(""),
        from: i,
        to: hit.j + 1,
        negated,
        method: "pattern",
      });
    } else if (ANY_PHRASES.some((p) => rest.startsWith(p))) {
      any.add(slot);
    }
  }
  return { mentions, any };
}

/** ขอบเขตการปฏิเสธ: คำปฏิเสธที่อยู่ก่อน entity ไม่เกิน 3 คำ และไม่ข้ามตัวแบ่งวลี/entity อื่น */
function applyNegation(tokens: Token[], mentions: Mention[]) {
  const ends = new Set(mentions.map((m) => m.to));
  for (const m of mentions) {
    if (m.negated) continue;
    let words = 0;
    for (let j = m.from - 1; j >= 0 && words < 3; j--) {
      const t = tokens[j]!;
      if (t.kind === "space") continue;
      if (isBreaker(t) || ends.has(j + 1)) break;
      words++;
      if (NEGATORS.has(low(t.text))) {
        m.negated = true;
        break;
      }
    }
  }
}

function resolveSlot(slot: GoalSlot, mentions: Mention[], anySlot: boolean): SlotResult {
  const mine = mentions.filter((m) => m.kind === slot && (slot !== "color" || isColorSlotValue(m.value)));
  const positives = [...new Set(mine.filter((m) => !m.negated).map((m) => m.value))];
  const excluded = [...new Set(mine.filter((m) => m.negated).map((m) => m.value))];
  const base = { candidates: positives, excluded };
  const label = SLOT_LABELS[slot];

  if (positives.length > 1)
    return { ...base, status: "conflict", value: null, note: `พบ${label}หลายค่า (${positives.join(", ")}) — กรุณาเลือกเอง` };
  if (positives.length === 1) {
    const v = positives[0]!;
    if (excluded.includes(v))
      return { ...base, status: "conflict", value: null, note: `ข้อความทั้งต้องการและไม่ต้องการ "${v}"` };
    return { ...base, status: "set", value: v };
  }
  if (excluded.length) {
    if (slot !== "breed") {
      const remaining = SLOT_OPTIONS[slot].filter((o) => !excluded.includes(o));
      if (remaining.length === 1)
        return { ...base, status: "inferred", value: remaining[0]!, note: `อนุมานจาก "ไม่เอา${excluded.join(", ")}"` };
      return {
        ...base,
        status: "excluded",
        value: null,
        note: `ไม่เอา ${excluded.join(", ")} — เหลือ ${remaining.join(" / ")} กรุณาเลือกเอง`,
      };
    }
    return { ...base, status: "excluded", value: null, note: `ไม่เอาสายพันธุ์ ${excluded.join(", ")} (ฟอร์มระบุได้เฉพาะพันธุ์ที่ต้องการ)` };
  }
  if (anySlot) return { ...base, status: "any", value: "", note: `${label}: ไม่จำกัด` };
  return { ...base, status: "none", value: null };
}

export function parseGoalText(input: string, external?: ExternalAnalysis | null): GoalTextResult {
  const normalized = normalizeThai(input);
  const fromExternal = external ? tokensFromWords(normalized, external.tokens) : null;
  const tokens = fromExternal ?? tokenizeThai(normalized);
  const engine: NlpEngine = fromExternal ? "pythainlp" : "builtin";
  const warnings: string[] = [];
  if (external && !fromExternal) warnings.push("ผลตัดคำจาก PyThaiNLP ไม่ตรงกับข้อความ จึงใช้ตัวตัดคำในแอปแทน");

  const used = tokens.map(() => false);
  const gazetteer = matchGazetteer(tokens, used);
  const { mentions: patterned, any } = matchPatterns(tokens, used);
  const mentions = [...gazetteer, ...patterned].sort((a, b) => a.from - b.from);
  applyNegation(tokens, mentions);

  const slots = Object.fromEntries(
    SLOTS.map((slot) => [slot, resolveSlot(slot, mentions, any.has(slot))]),
  ) as Record<GoalSlot, SlotResult>;
  for (const slot of SLOTS) if (slots[slot].status === "conflict" && slots[slot].note) warnings.push(slots[slot].note!);

  const ignored = [
    ...new Set(
      mentions
        .filter((m) => m.kind === "color" && !m.negated && !isColorSlotValue(m.value))
        .map((m) => `สี/ลายขน: ${m.value}`),
    ),
  ];
  if (!mentions.some((m) => m.kind !== "color" || isColorSlotValue(m.value)) && !any.size)
    warnings.push("ไม่พบลักษณะที่รองรับ ลองระบุ เช่น สายพันธุ์ ขนยาว/ขนสั้น สีตา หรือหูพับ/หูตั้ง");

  const tagged = tokens.map((t, i) => {
    const m = mentions.find((x) => i >= x.from && i < x.to);
    return m ? { ...t, entity: m.kind, negated: m.negated } : t;
  });

  return {
    engine,
    engineVersion: fromExternal ? external?.version : undefined,
    normalized,
    sentences: fromExternal && external?.sentences.length ? external.sentences : segmentSentences(normalized),
    tokens: tagged,
    mentions,
    slots,
    ignored,
    warnings,
  };
}
