import { expect, it } from "vitest";
import { estimateAppearance } from "@/domain/demo/appearance";
import { addGeminiGuidance } from "@/server/analysis/gemini-guidance";

// Opt-in suite: makes real, billable requests using the server's environment.
it("returns validated Thai guidance from the real provider for all four traits", async () => {
  expect(Boolean(process.env.GEMINI_API_KEY?.trim()), "GEMINI_API_KEY must be configured").toBe(true);
  const source = { breed: "เปอร์เซีย", eye: "ตาสีฟ้า", coat: "ขนยาว", ear: "หูตั้ง" };
  const baseline = estimateAppearance(source, source);
  const result = await addGeminiGuidance(source, baseline);
  expect(result.guidanceSource, "Real Gemini response must pass validation; fallback is not success").toBe("gemini");
  expect(result.traits).toHaveLength(4);
  expect(result.level).toBe(baseline.level);
  expect(result.traits.map(({ key, partner, level }) => ({ key, partner, level })))
    .toEqual(baseline.traits.map(({ key, partner, level }) => ({ key, partner, level })));
  for (const trait of result.traits) {
    expect(trait.selection?.description).toMatch(/[ก-๙]/);
    expect(trait.selection?.checks.length).toBeGreaterThanOrEqual(2);
  }
});

it("returns only the requested ear guidance and preserves the upright partner for a folded-ear source", async () => {
  const source = { breed: "สก็อตติช", eye: "ตาสีทอง", coat: "ขนสั้น", ear: "หูพับ" };
  const target = { breed: "", eye: "", coat: "", ear: "หูพับ" };
  const baseline = estimateAppearance(source, target);
  const result = await addGeminiGuidance(source, baseline);
  expect(result.guidanceSource).toBe("gemini");
  expect(result.traits).toHaveLength(1);
  expect(result.traits[0]?.key).toBe("ear");
  expect(result.traits[0]?.partner).toBe("หูตั้ง");
  expect(result.level).toBe(baseline.level);
});
