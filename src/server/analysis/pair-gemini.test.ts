// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { describePair } from "@/domain/demo/pair-appearance";
const cat = { id: "a", name: "secret-name", breed: "ผสม", sex: "female" as const, ageLabel: "2 ปี", coat: "ขนสั้น", coatColor: "ดำ", coatPattern: "สีพื้น", eye: "ตาสีทอง", ear: "หูตั้ง" };
const baseline = () => describePair(cat, { ...cat, id: "b", sex: "male" });
const valid = () => ({ traits: baseline().traits.filter((t) => t.status === "unavailable").map((t) => ({ key: t.key, description: "ลูกอาจมีลักษณะนี้ได้ขึ้นกับข้อมูลของพ่อแม่ที่ยังไม่ทราบ", possibilities: [{ label: "ลักษณะที่อาจพบ", condition: "เมื่อเงื่อนไขการถ่ายทอดลักษณะของทั้งคู่สอดคล้องกัน" }] })) });
const response = (data: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(data) }] } }] }));
beforeEach(() => { vi.resetModules(); vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash"); vi.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("sends both phenotypes without identity and preserves computed ranges", async () => {
  const fetchMock = vi.fn().mockResolvedValue(response(valid())); vi.stubGlobal("fetch", fetchMock);
  const { addPairGemini } = await import("./pair-gemini");
  const result = await addPairGemini(baseline());
  expect(result.source).toBe("gemini");
  expect(result.traits.find((t) => t.key === "coat")).toEqual(baseline().traits.find((t) => t.key === "coat"));
  const body = fetchMock.mock.calls[0]![1].body;
  expect(body).not.toContain("secret-name");
  expect(body).toContain("coatColor"); expect(body).toContain("female"); expect(body).toContain("male");
});
it.each(["percent", "missing", "duplicate", "extra", "http", "timeout"])("falls back for %s", async (failure) => {
  const data = valid();
  if (failure === "percent") data.traits[0]!.description = "ลูกมีโอกาสเป็นสีดำ 50%";
  if (failure === "missing") data.traits.pop();
  if (failure === "duplicate") data.traits[1] = data.traits[0]!;
  const mock = vi.fn();
  if (failure === "http") mock.mockResolvedValue(new Response("secret", { status: 429 }));
  else if (failure === "timeout") mock.mockRejectedValue(new Error("secret"));
  else mock.mockResolvedValue(response(failure === "extra" ? { ...data, score: 80 } : data));
  vi.stubGlobal("fetch", mock);
  const { addPairGemini } = await import("./pair-gemini");
  expect(await addPairGemini(baseline())).toEqual(baseline());
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("secret");
});
it("never fills a missing color from AI output", async () => {
  const original = describePair({ ...cat, coatColor: "" }, { ...cat, id: "b", sex: "male" });
  const data = valid();
  data.traits.push({ ...data.traits[0]!, key: "coatColor" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(data)));
  const { addPairGemini } = await import("./pair-gemini");
  expect(await addPairGemini(original)).toEqual(original);
});
