import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { PAIR_TRAITS, type PairAppearanceResult } from "@/domain/demo/pair-appearance";

const text = z.string().trim().min(2).max(700).refine((s) => /[ก-๙]/.test(s) && !/[0-9๐-๙%]|เปอร์เซ็นต์|รับประกัน|https?:|<[^>]*>/i.test(s));
const schema = z.object({ traits: z.array(z.object({
  key: z.enum(["coatColor", "coatPattern", "coat", "eye", "ear"]),
  description: text,
  possibilities: z.array(z.object({ label: text, condition: text }).strict()).max(4),
}).strict()).max(5) }).strict();
let active = 0;
let calls = 0;
let started = 0;

export async function addPairGemini(result: PairAppearanceResult): Promise<PairAppearanceResult> {
  const requested = result.traits.filter((t) => t.status === "unavailable");
  const key = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_PAIR_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  if (!key || !requested.length || !/^gemini-[a-z0-9.-]*flash[a-z0-9.-]*$/.test(model)) return result;
  if (Date.now() - started >= 60_000) { calls = 0; started = Date.now(); }
  if (calls >= 20 || active >= 2) return result;
  calls++; active++;
  try {
    const instruction = await readFile(path.join(process.cwd(), "docs/ai/pair-appearance.md"), "utf8");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(45_000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({
          parents: result.parents.map((parent) => ({ sex: parent.sex, breed: parent.breed,
            ...Object.fromEntries(PAIR_TRAITS.map(({ key }) => [key, parent[key] || null])) })),
          requestedKeys: requested.map((t) => t.key),
          referenceTraits: result.traits.filter((t) => t.status === "rule").map(({ key, possibilities }) => ({ key, possibilities })),
        }) }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          ...(model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } }
            : model === "gemini-2.5-flash" || model === "gemini-2.5-flash-lite" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          responseMimeType: "application/json",
          responseJsonSchema: { type: "object", additionalProperties: false, required: ["traits"], properties: {
            traits: { type: "array", minItems: requested.length, maxItems: requested.length, items: {
              type: "object", additionalProperties: false, required: ["key", "description", "possibilities"], properties: {
                key: { type: "string", enum: requested.map((t) => t.key) }, description: { type: "string" },
                possibilities: { type: "array", maxItems: 4, items: { type: "object", additionalProperties: false,
                  required: ["label", "condition"], properties: { label: { type: "string" }, condition: { type: "string" } } } },
              },
            } },
          } },
        },
      }),
    });
    if (!response.ok) { console.warn(`[pair-guidance] provider_http_${response.status}`); return result; }
    const raw = await response.text();
    if (raw.length > 65_536) throw new Error("oversize");
    const envelope = z.object({ candidates: z.array(z.object({ finishReason: z.literal("STOP"),
      content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
    })).min(1) }).parse(JSON.parse(raw));
    const content = envelope.candidates[0]!.content.parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
    const output = schema.parse(JSON.parse(content));
    if (output.traits.length !== requested.length || new Set(output.traits.map((t) => t.key)).size !== requested.length ||
      output.traits.some((t) => !requested.some((r) => r.key === t.key))) throw new Error("keys");
    return { ...result, source: "gemini", traits: result.traits.map((t) => {
      const generated = output.traits.find((r) => r.key === t.key);
      return generated ? { ...t, ...generated, status: "ai" } : t;
    }) };
  } catch (error) {
    console.warn(error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? "[pair-guidance] provider_timeout" : error instanceof z.ZodError
        ? `[pair-guidance] invalid_response:${error.issues.map((i) => `${i.path.join(".")}:${i.code}`).join(",")}`
        : "[pair-guidance] using_basic_guidance");
    return result;
  } finally { active--; }
}
