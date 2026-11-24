import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getUser } from "@/server/auth/session";
import { parseGoalTextAction } from "./goal-text-action";

vi.mock("@/server/auth/session", () => ({ getUser: vi.fn() }));

beforeEach(() => {
  vi.mocked(getUser).mockResolvedValue({ id: "u1" } as Awaited<ReturnType<typeof getUser>>);
  delete process.env.THAI_NLP_URL;
});
afterEach(() => vi.unstubAllGlobals());

it("parses Thai goal text with the builtin tokenizer when PyThaiNLP is not configured", async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  const res = await parseGoalTextAction("อยากได้เปอร์เซียขนยาว ไม่เอาหูพับ");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(res.ok && res.result.engine).toBe("builtin");
  expect(res.ok && res.result.slots).toMatchObject({
    breed: { value: "เปอร์เซีย" },
    coat: { value: "ขนยาว" },
    ear: { value: "หูตั้ง", status: "inferred" },
  });
});

it("uses PyThaiNLP tokens and POS when the service answers", async () => {
  process.env.THAI_NLP_URL = "http://127.0.0.1:8001/";
  const fetchSpy = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        engine: "pythainlp",
        version: "5.4.0",
        tokenizer: "newmm+custom_dict",
        pos_corpus: "orchid_ud",
        sentences: ["ตาสีฟ้า"],
        tokens: [{ text: "ตาสีฟ้า", pos: "NOUN" }],
      }),
    ),
  );
  vi.stubGlobal("fetch", fetchSpy);
  const res = await parseGoalTextAction("ตาสีฟ้า");
  expect(fetchSpy.mock.calls[0]?.[0]).toBe("http://127.0.0.1:8001/analyze");
  const body = JSON.parse(fetchSpy.mock.calls[0]?.[1].body);
  expect(body.custom_words).toContain("สก็อตติชโฟลด์");
  expect(res.ok && res.result).toMatchObject({ engine: "pythainlp", engineVersion: "5.4.0" });
});

it("falls back to the builtin tokenizer when the service fails", async () => {
  process.env.THAI_NLP_URL = "http://127.0.0.1:8001";
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const res = await parseGoalTextAction("ขนสั้น");
  expect(res.ok && res.result.engine).toBe("builtin");
  expect(res.ok && res.result.slots.coat.value).toBe("ขนสั้น");
});

it("rejects empty or oversized input and anonymous callers", async () => {
  expect(await parseGoalTextAction("   ")).toMatchObject({ ok: false });
  expect(await parseGoalTextAction("ก".repeat(301))).toMatchObject({ ok: false });
  vi.mocked(getUser).mockResolvedValue(null);
  expect(await parseGoalTextAction("ขนยาว")).toEqual({ ok: false, error: "กรุณาเข้าสู่ระบบ" });
});
