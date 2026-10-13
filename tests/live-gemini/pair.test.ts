import { expect, it } from "vitest";
import { describePair } from "@/domain/demo/pair-appearance";
import { addPairGemini } from "@/server/analysis/pair-gemini";

it("analyzes stored colors and appearances of two parents with the live Gemini API", async () => {
  const a = { id: "mother", name: "แม่ตัวอย่าง", breed: "ผสม", sex: "female" as const, ageLabel: "2 ปี", coat: "ขนสั้น", coatColor: "ดำ", coatPattern: "สีพื้น", eye: "ตาสีทอง", ear: "หูตั้ง" };
  const result = await addPairGemini(describePair(a, { ...a, id: "father", name: "พ่อตัวอย่าง", sex: "male", coatColor: "ส้ม", coatPattern: "ลายสลิด", coat: "ขนยาว" }));
  expect(result.source).toBe("gemini");
  expect(result.traits.find((t) => t.key === "coatColor")?.status).toBe("rule");
  expect(result.traits.find((t) => t.key === "eye")?.status).toBe("ai");
  expect(result.traits.find((t) => t.key === "coatColor")?.possibilities.length).toBeGreaterThan(0);
  expect(result.traits.find((t) => t.key === "coat")?.status).toBe("model");
  expect(result.parents.map((p) => p.coatColor)).toEqual(["ดำ", "ส้ม"]);
});
