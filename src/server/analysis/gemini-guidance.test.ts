// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { estimateAppearance } from "@/domain/demo/appearance";

const goal = { breed: "เปอร์เซีย", eye: "ตาสีฟ้า", coat: "ขนยาว", ear: "หูตั้ง" };
const baseline = () => estimateAppearance(goal, goal);
const valid = () => ({
  traits: baseline().traits.map(({ key, partner }) => ({
    key,
    partner,
    description: `เลือกแมวลักษณะ ${partner} โดยดูรูปหลายมุมและสอบถามเจ้าของประกอบ`,
    checks: ["ดูภาพเต็มตัวในแสงธรรมชาติ", "สอบถามลักษณะปัจจุบันกับเจ้าของแมว"],
  })),
});
function envelope(data: unknown, finishReason = "STOP") {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason,
          content: {
            parts: [{ text: JSON.stringify(data) }],
          },
        },
      ],
    }),
    { status: 200 },
  );
}
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
  vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("reads real required document sections, sends only relevant traits, preserves deterministic results", async () => {
  const fetchMock = vi.fn().mockResolvedValue(envelope(valid()));
  vi.stubGlobal("fetch", fetchMock);
  const { addGeminiGuidance, readGuidanceContext } = await import("./gemini-guidance");
  const context = await readGuidanceContext(baseline().traits.filter((t) => t.key === "coat"));
  expect(context).toContain("## coat");
  expect(context).not.toContain("## eye");
  expect(context).toContain("## rules");
  expect(context).toContain("โปรเจกต์ทดลองความน่าจะเป็น");
  const result = await addGeminiGuidance(goal, baseline());
  expect(result.guidanceSource).toBe("gemini");
  expect(result.level).toBe(baseline().level);
  expect(result.traits.map((t) => t.partner)).toEqual(baseline().traits.map((t) => t.partner));
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).not.toContain("test-key");
  expect(init.headers["x-goog-api-key"]).toBe("test-key-not-real");
  const body = JSON.parse(init.body);
  expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
  expect(body.systemInstruction.parts[0].text).toContain("## output");
  expect(Object.keys(JSON.parse(body.contents[0].parts[0].text).source)).toEqual([
    "breed",
    "eye",
    "coat",
    "ear",
  ]);
});

it("uses the default model when none is configured", async () => {
  vi.stubEnv("GEMINI_MODEL", "");
  const fetchMock = vi.fn().mockResolvedValue(envelope(valid()));
  vi.stubGlobal("fetch", fetchMock);
  const { addGeminiGuidance } = await import("./gemini-guidance");
  expect((await addGeminiGuidance(goal, baseline())).guidanceSource).toBe("gemini");
  expect(fetchMock.mock.calls[0]![0]).toContain("/gemini-3.8-flash:generateContent");
});

it("reports provider status without logging the response or key", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret", { status: 429 })));
  const { addGeminiGuidance } = await import("./gemini-guidance");
  expect(await addGeminiGuidance(goal, baseline())).toEqual(baseline());
  expect(console.warn).toHaveBeenCalledWith("[appearance-guidance] provider_http_429");
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toMatch(/secret|test-key/);
});

it("reports timeout safely and releases its concurrency slot", async () => {
  const fetchMock = vi.fn().mockRejectedValue(new DOMException("secret", "TimeoutError"));
  vi.stubGlobal("fetch", fetchMock);
  const { addGeminiGuidance } = await import("./gemini-guidance");
  for (let i = 0; i < 3; i++) expect(await addGeminiGuidance(goal, baseline())).toEqual(baseline());
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(console.warn).toHaveBeenCalledWith("[appearance-guidance] provider_timeout");
  fetchMock.mockResolvedValue(envelope(valid()));
  expect((await addGeminiGuidance(goal, baseline())).guidanceSource).toBe("gemini");
});

it("does not call the provider without a key", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const { addGeminiGuidance } = await import("./gemini-guidance");
  expect(await addGeminiGuidance(goal, baseline())).toEqual(baseline());
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  "partner",
  "duplicate",
  "missing",
  "percent",
  "extra",
  "truncated",
  "json",
  "http",
  "timeout",
])("falls back safely for %s and retains usable per-trait guidance", async (failure) => {
  const data = valid();
  if (failure === "partner") data.traits[0]!.partner = "พันธุ์อื่น";
  if (failure === "duplicate") data.traits[1] = data.traits[0]!;
  if (failure === "missing") data.traits.pop();
  if (failure === "percent") data.traits[0]!.description = "ลูกตรงเป้าหมายแน่นอน 100%";
  const fetchMock = vi.fn();
  if (failure === "http")
    fetchMock.mockResolvedValue(new Response("provider secret", { status: 429 }));
  else if (failure === "timeout")
    fetchMock.mockRejectedValue(new DOMException("secret", "TimeoutError"));
  else if (failure === "json") fetchMock.mockResolvedValue(new Response("not-json"));
  else
    fetchMock.mockResolvedValue(
      envelope(
        failure === "extra" ? { ...data, level: "สูง" } : data,
        failure === "truncated" ? "MAX_TOKENS" : "STOP",
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  const { addGeminiGuidance } = await import("./gemini-guidance");
  const result = await addGeminiGuidance(goal, baseline());
  expect(result).toEqual(baseline());
  expect(result.traits.every((t) => t.selection?.checks.length === 2)).toBe(true);
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("secret");
});

it("caps provider calls per process without breaking the result", async () => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(envelope(valid())));
  vi.stubGlobal("fetch", fetchMock);
  const { addGeminiGuidance } = await import("./gemini-guidance");
  for (let i = 0; i < 20; i++) await addGeminiGuidance(goal, baseline());
  expect((await addGeminiGuidance(goal, baseline())).guidanceSource).toBe("basic");
  expect(fetchMock).toHaveBeenCalledTimes(20);
});
