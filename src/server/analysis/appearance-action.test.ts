import { beforeEach, expect, it, vi } from "vitest";
import { getMyCats } from "@/server/cats/queries";
import type { CatView } from "@/features/cats/types";
import { analyzeAppearanceAction } from "./appearance-action";
import { addGeminiGuidance } from "./gemini-guidance";
vi.mock("@/server/cats/queries", () => ({ getMyCats: vi.fn() }));
vi.mock("./gemini-guidance", () => ({
  addGeminiGuidance: vi.fn(async (_source, result) => result),
}));
const target = { breed: "เปอร์เซีย", eye: "ตาสีฟ้า", coat: "ขนยาว", ear: "หูตั้ง" };
const cat = (over: Partial<CatView> = {}): CatView => ({
  id: "mine",
  name: "มูมู่",
  breed: "เปอร์เซีย",
  coat: "ขนยาว",
  eye: "ตาสีฟ้า",
  ear: "หูตั้ง",
  sex: "female",
  ageLabel: "2 ปี",
  ...over,
});
beforeEach(() => {
  vi.mocked(addGeminiGuidance).mockClear();
  vi.mocked(getMyCats).mockResolvedValue([cat()]);
});
it("builds the source from the selected cat's own stored data", async () => {
  const res = await analyzeAppearanceAction("mine", target);
  expect(res.ok).toBe(true);
  if (res.ok) {
    expect(res.result.level).toBe("สูง");
    expect(res.result.traits.map((t) => t.partner)).toEqual(Object.values(target));
  }
});
it("reports insufficient data when the source cat's trait is unknown", async () => {
  vi.mocked(getMyCats).mockResolvedValue([cat({ eye: "—" })]);
  const res = await analyzeAppearanceAction("mine", target);
  if (!res.ok) throw Error(res.error);
  expect(res.result.level).toBe("ข้อมูลไม่พอ");
  expect(res.result.traits.find((t) => t.key === "eye")?.level).toBe("ข้อมูลไม่พอ");
});
it("supports breed-only and eye-only goals", async () => {
  for (const key of ["breed", "eye"] as const) {
    const res = await analyzeAppearanceAction("mine", {
      breed: "",
      eye: "",
      coat: "",
      ear: "",
      [key]: target[key],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.result.traits).toHaveLength(1);
  }
});
it("rejects another owner's cat, empty goals and malformed inputs", async () => {
  expect((await analyzeAppearanceAction("other", target)).ok).toBe(false);
  expect(
    (await analyzeAppearanceAction("mine", { breed: "", eye: "", coat: "", ear: "" })).ok,
  ).toBe(false);
  expect((await analyzeAppearanceAction("mine", { ...target, eye: 123 })).ok).toBe(false);
  expect(addGeminiGuidance).not.toHaveBeenCalled();
});
