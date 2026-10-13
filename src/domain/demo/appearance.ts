import { basicSelectionGuide, type SelectionGuide } from "./selection-guide";

/** Qualitative appearance matching by similarity — a likelihood hint, not measured offspring probabilities. */
export type Appearance = { breed: string; eye: string; coat: string; ear: string };
export type MatchLevel = "สูง" | "ปานกลาง" | "ต่ำ" | "ข้อมูลไม่พอ";
export type AppearanceTrait = {
  key: keyof Appearance;
  label: string;
  target: string;
  partner: string;
  level: MatchLevel;
  reason: string;
  selection?: SelectionGuide;
};
export type AppearanceResult = {
  traits: AppearanceTrait[];
  level: MatchLevel;
  note: string;
  guidanceSource?: "basic" | "gemini";
};
const labels: Record<keyof Appearance, string> = {
  breed: "สายพันธุ์",
  eye: "สีตา",
  coat: "ขน",
  ear: "หู",
};
const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
const known = (value: string) =>
  !["", "—", "ไม่ระบุ", "ไม่ทราบสายพันธุ์"].includes(normalize(value));
const folded = (value: string) =>
  ["หูพับ", "fold", "folded", "scottish fold"].includes(normalize(value));

export function estimateAppearance(source: Appearance, target: Appearance): AppearanceResult {
  const traits = (Object.keys(labels) as (keyof Appearance)[])
    .filter((key) => target[key].trim())
    .map((key): AppearanceTrait => {
      const wanted = target[key].trim();
      const base = { key, label: labels[key], target: wanted, partner: wanted };
      // ไม่แนะนำให้จับคู่หูพับกับหูพับ (เหตุผลด้านสวัสดิภาพ) → เสนอคู่หูตั้งแทน
      if (key === "ear" && folded(source.ear)) {
        return {
          ...base,
          partner: "หูตั้ง",
          level: "ปานกลาง",
          reason: "เลือกคู่หูตั้ง เพราะไม่แนะนำให้จับคู่หูพับกับหูพับ",
        };
      }
      if (!known(source[key]))
        return {
          ...base,
          level: "ข้อมูลไม่พอ",
          reason: `ยังไม่ได้ระบุ${labels[key]}ของแมวตั้งต้น`,
        };
      const same = normalize(source[key]) === normalize(wanted);
      return {
        ...base,
        level: same ? "สูง" : "ปานกลาง",
        reason: same
          ? "แมวตั้งต้นและคู่ที่แนะนำมีลักษณะตรงเป้าหมายเหมือนกัน"
          : "เลือกคู่ที่มีลักษณะตรงเป้าหมาย โดยแมวตั้งต้นมีลักษณะต่างกัน",
      };
    });
  const level: MatchLevel =
    !traits.length || traits.some((t) => t.level === "ข้อมูลไม่พอ")
      ? "ข้อมูลไม่พอ"
      : traits.every((t) => t.level === "สูง")
        ? "สูง"
        : "ปานกลาง";
  return {
    traits: traits.map((trait) => ({ ...trait, selection: basicSelectionGuide(trait) })),
    level,
    guidanceSource: "basic",
    note: "ประเมินจากความคล้ายของลักษณะภายนอก เป็นแนวโน้มเบื้องต้น ไม่ใช่เปอร์เซ็นต์การเกิดจริง",
  };
}
