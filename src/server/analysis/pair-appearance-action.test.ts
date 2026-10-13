import { beforeEach, expect, it, vi } from "vitest";
import { getMyCats, getLikedCats } from "@/server/cats/queries";
import { addPairGemini } from "./pair-gemini";
import { analyzePairAppearanceAction } from "./pair-appearance-action";
import type { CatView } from "@/features/cats/types";
vi.mock("@/server/cats/queries", () => ({ getMyCats: vi.fn(), getLikedCats: vi.fn() }));
vi.mock("./pair-gemini", () => ({ addPairGemini: vi.fn(async (r) => r) }));
const a: CatView = { id: "a", name: "แม่", breed: "ผสม", sex: "female", coat: "ขนสั้น", coatColor: "ดำ", coatPattern: "สีพื้น", ear: "หูตั้ง", eye: "ตาสีทอง", ageLabel: "2 ปี" };
const b: CatView = { ...a, id: "b", name: "พ่อ", sex: "male", coatColor: "ส้ม" };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getMyCats).mockResolvedValue([a]); vi.mocked(getLikedCats).mockResolvedValue([b]); });
it("loads both selected cats server-side including colors and sex", async () => {
  const res = await analyzePairAppearanceAction("a", "b");
  expect(res.ok).toBe(true);
  if (res.ok) expect(res.result.parents.map((p) => [p.name, p.coatColor, p.sex])).toEqual([["แม่", "ดำ", "female"], ["พ่อ", "ส้ม", "male"]]);
  expect(addPairGemini).toHaveBeenCalledOnce();
});
it.each([["a", "a"], ["b", "a"], ["a", "private"], ["", "b"]])("rejects unauthorized or invalid pair %s %s", async (a, b) => {
  expect((await analyzePairAppearanceAction(a, b)).ok).toBe(false);
  expect(addPairGemini).not.toHaveBeenCalled();
});
it("rejects same-sex pairs before calling Gemini", async () => {
  vi.mocked(getLikedCats).mockResolvedValue([{ ...b, sex: "female" }]);
  expect((await analyzePairAppearanceAction("a", "b")).ok).toBe(false);
  expect(addPairGemini).not.toHaveBeenCalled();
});
