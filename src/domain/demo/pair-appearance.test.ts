import { expect, it } from "vitest";
import { describePair } from "./pair-appearance";
import type { CatView } from "@/features/cats/types";
export const parent = (over: Partial<CatView> = {}): CatView => ({ id: "a", name: "มูมู่", breed: "เปอร์เซีย", sex: "female", ageLabel: "2 ปี", coat: "ขนยาว", eye: "ตาสีทอง", ear: "หูตั้ง", ...over });
it("does not invent colors or patterns from a breed or photo", () => {
  const result = describePair(parent(), parent({ id: "b", sex: "male", photo: "/black-cat.png" }));
  expect(result.traits.slice(0, 2).map((t) => t.status)).toEqual(["missing", "missing"]);
  expect(result.traits.slice(0, 2).every((t) => !t.possibilities.length)).toBe(true);
});
it.each([
  ["ขนยาว", "ขนยาว", [["ขนยาว", 1, 1]]],
  ["ขนสั้น", "ขนยาว", [["ขนสั้น", 0.5, 1], ["ขนยาว", 0, 0.5]]],
  ["ขนสั้น", "ขนสั้น", [["ขนสั้น", 0.75, 1], ["ขนยาว", 0, 0.25]]],
] as const)("calculates %s × %s model ranges", (a, b, expected) => {
  const result = describePair(parent({ coat: a }), parent({ id: "b", coat: b }));
  expect(result.traits.find((t) => t.key === "coat")?.possibilities.map((p) => [p.label, p.lower, p.upper])).toEqual(expected);
});
it("keeps unsupported hairless coats nonnumeric and welfare note separate from other traits", () => {
  const result = describePair(parent({ coat: "ไม่มีขน", ear: "หูพับ" }), parent({ id: "b" }));
  expect(result.traits.find((t) => t.key === "coat")?.status).toBe("unavailable");
  expect(result.warnings).toHaveLength(1);
  expect(result.traits.find((t) => t.key === "eye")?.status).toBe("unavailable");
});
it.each([
  ["ดำ", "ส้ม", "ลูกเพศผู้: กลุ่มสีดำ", "ลูกเพศเมีย: กลุ่มสีกระดองเต่า"],
  ["ส้ม", "ดำ", "ลูกเพศผู้: กลุ่มสีส้ม", "ลูกเพศเมีย: กลุ่มสีกระดองเต่า"],
  ["ดำ", "ดำ", "ลูกเพศผู้: กลุ่มสีดำ", "ลูกเพศเมีย: กลุ่มสีดำ"],
  ["ส้ม", "ส้ม", "ลูกเพศผู้: กลุ่มสีส้ม", "ลูกเพศเมีย: กลุ่มสีส้ม"],
])("keeps mother %s and father %s color outcomes sex-specific", (mother, father, male, female) => {
  const a = parent({ coatColor: mother });
  const b = parent({ id: "b", sex: "male", coatColor: father });
  for (const pair of [[a, b], [b, a]] as const) {
    const trait = describePair(...pair).traits.find((t) => t.key === "coatColor")!;
    expect(trait.status).toBe("rule");
    expect(trait.possibilities.map((p) => p.label)).toEqual([male, female]);
    expect(trait.possibilities.every((p) => p.lower === undefined)).toBe(true);
  }
});
it("does not apply the color rule for unknown sex, masked colors, or contradictory pattern", () => {
  for (const over of [{ sex: "unknown" as const }, { coatColor: "ขาว" }, { coatPattern: "สามสี" }]) {
    const r = describePair(parent({ coatColor: "ดำ", ...over }), parent({ id: "b", sex: "male", coatColor: "ส้ม" }));
    expect(r.traits.find((t) => t.key === "coatColor")?.status).toBe("unavailable");
  }
});
