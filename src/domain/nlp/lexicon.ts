/**
 * พจนานุกรมโดเมน (gazetteer) สำหรับ NLP ภาษาไทยของ MeowMatch
 * - ใช้เป็น custom dictionary ตอนตัดคำ (แบบเดียวกับ PyThaiNLP `custom_dict`)
 * - ใช้ทำ entity/slot extraction จากข้อความเป้าหมายลูกแมว
 * ค่า `value` ต้องตรงกับตัวเลือกในฟอร์มหน้าแมวที่ต้องการ (desired-planner)
 */

import { COLOR_LABELS } from "@/domain/genes/model";

export type GoalSlot = "breed" | "coat" | "eye" | "ear" | "color";
export type EntityKind = GoalSlot;
export type LexiconEntry = { kind: EntityKind; value: string; aliases: string[] };

export const SLOT_LABELS: Record<GoalSlot, string> = {
  breed: "สายพันธุ์",
  coat: "ขน",
  eye: "สีตา",
  ear: "หู",
  color: "สีขน",
};

/** ตัวเลือกที่ฟอร์มรองรับ (breed เป็นข้อความอิสระ) */
export const SLOT_OPTIONS: Record<Exclude<GoalSlot, "breed">, readonly string[]> = {
  coat: ["ขนสั้น", "ขนยาว", "ไม่มีขน"],
  eye: ["ตาสีฟ้า", "ตาสีทอง", "ตาสีเขียว", "ตาสีน้ำตาล", "ตาสองสี"],
  ear: ["หูตั้ง", "หูพับ"],
  /** สีที่แบบจำลองยีนรองรับ — สีอื่น (เช่น ลายสลิด) ถูกรายงานว่า "ตรวจพบแต่ยังไม่ใช้" */
  color: COLOR_LABELS,
};

export const LEXICON: LexiconEntry[] = [
  // --- สายพันธุ์ ---
  { kind: "breed", value: "เปอร์เซีย", aliases: ["เปอร์เซีย", "เปอร์เซียน", "เปอเซีย", "persian"] },
  {
    kind: "breed",
    value: "สก็อตติชโฟลด์",
    aliases: ["สก็อตติชโฟลด์", "สก๊อตติชโฟลด์", "สกอตติชโฟลด์", "สก็อตติช", "สก๊อตติช", "scottish fold", "scottish"],
  },
  {
    kind: "breed",
    value: "บริติชช็อตแฮร์",
    aliases: ["บริติชช็อตแฮร์", "บริติชชอร์ตแฮร์", "บริติช", "british shorthair", "british"],
  },
  { kind: "breed", value: "อเมริกันช็อตแฮร์", aliases: ["อเมริกันช็อตแฮร์", "อเมริกันชอร์ตแฮร์", "american shorthair"] },
  { kind: "breed", value: "เอ็กโซติกช็อตแฮร์", aliases: ["เอ็กโซติกช็อตแฮร์", "เอ็กโซติก", "exotic shorthair", "exotic"] },
  { kind: "breed", value: "เมนคูน", aliases: ["เมนคูน", "เมนคูณ", "maine coon", "mainecoon"] },
  { kind: "breed", value: "แร็กดอลล์", aliases: ["แร็กดอลล์", "แร็กดอล", "แรกดอล", "ragdoll"] },
  { kind: "breed", value: "วิเชียรมาศ", aliases: ["วิเชียรมาศ", "ไซมีส", "siamese"] },
  { kind: "breed", value: "ขาวมณี", aliases: ["ขาวมณี", "khao manee"] },
  { kind: "breed", value: "โคราช", aliases: ["โคราช", "สีสวาด", "แมวสีสวาด", "korat"] },
  { kind: "breed", value: "ศุภลักษณ์", aliases: ["ศุภลักษณ์", "suphalak"] },
  { kind: "breed", value: "เบงกอล", aliases: ["เบงกอล", "bengal"] },
  { kind: "breed", value: "สฟิงซ์", aliases: ["สฟิงซ์", "sphynx", "sphinx"] },
  { kind: "breed", value: "มันช์กิ้น", aliases: ["มันช์กิ้น", "มันชกิ้น", "munchkin"] },
  { kind: "breed", value: "รัสเซียนบลู", aliases: ["รัสเซียนบลู", "russian blue"] },

  // --- ขน ---
  { kind: "coat", value: "ขนยาว", aliases: ["ขนยาว", "ขนฟู", "ขนปุย", "long hair", "longhair", "long haired"] },
  { kind: "coat", value: "ขนสั้น", aliases: ["ขนสั้น", "ขนเกรียน", "short hair", "shorthair", "short haired"] },
  { kind: "coat", value: "ไม่มีขน", aliases: ["ไม่มีขน", "ไร้ขน", "hairless"] },

  // --- สีตา ---
  {
    kind: "eye",
    value: "ตาสีฟ้า",
    aliases: ["ตาสีฟ้า", "ตาฟ้า", "สีตาฟ้า", "ตาสีน้ำเงิน", "ตาน้ำเงิน", "blue eyes", "blue eye", "blue eyed"],
  },
  {
    kind: "eye",
    value: "ตาสีทอง",
    aliases: ["ตาสีทอง", "ตาทอง", "สีตาทอง", "ตาสีเหลือง", "ตาเหลือง", "ตาสีอำพัน", "gold eyes", "amber eyes"],
  },
  { kind: "eye", value: "ตาสีเขียว", aliases: ["ตาสีเขียว", "ตาเขียว", "สีตาเขียว", "green eyes", "green eye"] },
  { kind: "eye", value: "ตาสีน้ำตาล", aliases: ["ตาสีน้ำตาล", "ตาน้ำตาล", "สีตาน้ำตาล", "brown eyes", "hazel eyes"] },
  {
    kind: "eye",
    value: "ตาสองสี",
    aliases: ["ตาสองสี", "ตา2สี", "ตาต่างสี", "ตาคนละสี", "odd eye", "odd eyed", "odd eyes", "heterochromia"],
  },

  // --- หู ---
  { kind: "ear", value: "หูพับ", aliases: ["หูพับ", "fold ear", "folded ears", "folded ear"] },
  { kind: "ear", value: "หูตั้ง", aliases: ["หูตั้ง", "หูชี้", "หูปกติ", "หูไม่พับ", "straight ear", "straight ears"] },

  // --- สี/ลายขน (สีที่อยู่ใน COLOR_LABELS ใช้เป็นเป้าหมายได้; ลาย/แต้มสี รายงานว่าตรวจพบแต่ยังไม่ใช้) ---
  { kind: "color", value: "ส้ม", aliases: ["สีส้ม", "ขนส้ม", "แมวส้ม", "orange"] },
  { kind: "color", value: "ดำ", aliases: ["สีดำ", "ขนดำ", "แมวดำ", "black"] },
  { kind: "color", value: "ขาว", aliases: ["สีขาว", "ขนขาว", "แมวขาว", "white"] },
  { kind: "color", value: "เทา", aliases: ["สีเทา", "ขนเทา", "แมวเทา", "grey", "gray"] },
  { kind: "color", value: "ครีม", aliases: ["สีครีม", "ขนครีม", "cream"] },
  { kind: "color", value: "ขาวดำ", aliases: ["ขาวดำ", "ทักซิโด้", "tuxedo"] },
  { kind: "color", value: "ขาวส้ม", aliases: ["ขาวส้ม", "ส้มขาว"] },
  { kind: "color", value: "ขาวเทา", aliases: ["ขาวเทา", "เทาขาว"] },
  { kind: "color", value: "กระดองเต่า", aliases: ["กระดองเต่า", "tortie", "tortoiseshell"] },
  { kind: "color", value: "สามสี", aliases: ["สามสี", "3สี", "calico"] },
  { kind: "color", value: "ลายสลิด", aliases: ["ลายสลิด", "สลิด", "ลายเสือ", "tabby"] },
  { kind: "color", value: "แต้มสี", aliases: ["แต้มสี", "พอยท์", "colorpoint"] },
];

/** หัวคำ (head) ที่ตามด้วยค่าลักษณะ เช่น "ตา|เป็น|สี|ฟ้า", "หู|ไม่|พับ", "ขน|ต้อง|ยาว" */
export const HEADS: Record<string, GoalSlot> = {
  ตา: "eye",
  สีตา: "eye",
  ดวงตา: "eye",
  ลูกตา: "eye",
  ขน: "coat",
  เส้นขน: "coat",
  หู: "ear",
  ใบหู: "ear",
  สายพันธุ์: "breed",
  พันธุ์: "breed",
};

/** ค่าที่ตามหัวคำ → ค่าในฟอร์ม */
export const HEAD_VALUES: Record<Exclude<GoalSlot, "breed" | "color">, Record<string, string>> = {
  eye: {
    ฟ้า: "ตาสีฟ้า",
    น้ำเงิน: "ตาสีฟ้า",
    ทอง: "ตาสีทอง",
    เหลือง: "ตาสีทอง",
    อำพัน: "ตาสีทอง",
    เขียว: "ตาสีเขียว",
    น้ำตาล: "ตาสีน้ำตาล",
    สองสี: "ตาสองสี",
    ต่างสี: "ตาสองสี",
    blue: "ตาสีฟ้า",
    gold: "ตาสีทอง",
    green: "ตาสีเขียว",
  },
  coat: { ยาว: "ขนยาว", ฟู: "ขนยาว", ปุย: "ขนยาว", สั้น: "ขนสั้น", เกรียน: "ขนสั้น" },
  ear: { พับ: "หูพับ", ตั้ง: "หูตั้ง", ชี้: "หูตั้ง", ปกติ: "หูตั้ง" },
};

/** คำที่ข้ามได้ระหว่างหัวคำกับค่า */
export const FILLERS = new Set([
  "เป็น", "สี", "ต้อง", "ขอ", "แบบ", "ที่", "มี", "จะ", "ควร", "ๆ", "อยาก", "ได้", "เอา", "ออก", "ค่อนข้าง",
  "มาก", "นิด", "หน่อย", "ไป", "ทาง", "ด้วย", "ชอบ",
]);

/** คำปฏิเสธ (negation cue) */
export const NEGATORS = new Set(["ไม่", "ไม่เอา", "ห้าม", "ยกเว้น", "นอกจาก", "ไม่ใช่", "no", "not", "without", "non"]);

/** คำ/วลีที่บอกว่า "ไม่จำกัด" หลังหัวคำ */
export const ANY_PHRASES = ["อะไรก็ได้", "ไหนก็ได้", "แบบไหนก็ได้", "ยังไงก็ได้", "ก็ได้", "ไม่จำกัด", "ไม่สน", "any"];

/** ตัวแบ่งขอบเขตการปฏิเสธ/วลี */
export const CLAUSE_BREAKERS = new Set(["แต่", "และ", "กับ", "หรือ", "ส่วน", "แล้วก็", "แล้ว", "รวมถึง", "but", "and", "or"]);

/** คำทั่วไปในโดเมน (ช่วยตัดคำ + POS แบบ lexicon) */
export const FUNCTION_WORDS: Record<string, string> = {
  อยาก: "VERB", อยากได้: "VERB", ได้: "VERB", เอา: "VERB", ต้องการ: "VERB", ชอบ: "VERB", หา: "VERB",
  มี: "VERB", เป็น: "VERB", ขอ: "VERB", ต้อง: "AUX", ควร: "AUX", จะ: "AUX",
  พับ: "VERB", ตั้ง: "VERB", ชี้: "VERB",
  แมว: "NOUN", ลูกแมว: "NOUN", ลูก: "NOUN", น้อง: "NOUN", ตัว: "NOUN", คู่: "NOUN", สี: "NOUN",
  ตา: "NOUN", สีตา: "NOUN", ดวงตา: "NOUN", ขน: "NOUN", หู: "NOUN", สายพันธุ์: "NOUN", พันธุ์: "NOUN",
  ยาว: "ADJ", สั้น: "ADJ", ฟู: "ADJ", ฟ้า: "ADJ", ทอง: "ADJ", เขียว: "ADJ", น้ำตาล: "ADJ", เหลือง: "ADJ",
  ส้ม: "ADJ", ดำ: "ADJ", ขาว: "ADJ", เทา: "ADJ", ปกติ: "ADJ",
  ไม่: "PART", ครับ: "PART", ค่ะ: "PART", คะ: "PART", นะ: "PART", จ้า: "PART", ๆ: "PART", ก็: "ADV",
  มาก: "ADV", หน่อย: "ADV", ด้วย: "ADV", ห้าม: "VERB", ยกเว้น: "ADP", นอกจาก: "ADP",
  แต่: "CCONJ", และ: "CCONJ", กับ: "CCONJ", หรือ: "CCONJ", ส่วน: "CCONJ", แล้วก็: "CCONJ",
  อะไร: "PRON", ไหน: "DET", ที่: "SCONJ", แบบ: "NOUN",
};

const strip = (s: string) => s.toLocaleLowerCase().replace(/\s+/g, "");

/** alias (ตัดช่องว่าง, ตัวพิมพ์เล็ก) → entry */
export const ALIAS_INDEX: ReadonlyMap<string, LexiconEntry> = new Map(
  LEXICON.flatMap((entry) => entry.aliases.map((alias) => [strip(alias), entry] as const)),
);
export const MAX_ALIAS_TOKENS = 6;

/** คำทั้งหมดของโดเมน (ภาษาไทย) — ส่งให้ตัวตัดคำทั้งแบบ builtin และ PyThaiNLP `custom_dict` */
export const DOMAIN_WORDS: readonly string[] = [
  ...new Set(
    [
      ...LEXICON.flatMap((e) => e.aliases),
      ...Object.keys(HEADS),
      ...Object.values(HEAD_VALUES).flatMap((m) => Object.keys(m)),
      ...Object.keys(FUNCTION_WORDS),
      ...ANY_PHRASES,
      ...NEGATORS,
      ...CLAUSE_BREAKERS,
    ]
      .map((w) => w.toLocaleLowerCase())
      .filter((w) => /^[\u0E00-\u0E7F0-9]+$/.test(w))
      // คงคำปฏิเสธ "ไม่" ไว้เป็นคำเดี่ยว (POS = NEG/PART) ไม่รวมเป็น "ไม่เอา"
      .filter((w) => w !== "ไม่เอา"),
  ),
];
