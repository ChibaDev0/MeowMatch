import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Appearance, AppearanceResult } from "@/domain/demo/appearance";

const keys = ["breed", "eye", "coat", "ear"] as const;
const prose = z
  .string()
  .trim()
  .min(8)
  .max(700)
  .refine(
    (text) =>
      /[ก-๙]/.test(text) &&
      !/DNA|ยีน|พันธุกรรม|RES-01|เปอร์เซ็นต์|%|รับประกัน|https?:|<[^>]*>/i.test(text),
  );
const guideSchema = z
  .object({
    traits: z
      .array(
        z
          .object({
            key: z.enum(keys),
            partner: z.string().min(1).max(100),
            description: prose,
            checks: z.array(prose).min(2).max(3),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict();

// Process-local cost guard for the demo. Distributed deployments need a shared limiter.
let windowStart = 0;
let calls = 0;
let active = 0;
function reserveCall() {
  if (Date.now() - windowStart >= 60_000) {
    windowStart = Date.now();
    calls = 0;
  }
  if (calls >= 20 || active >= 2) return false;
  calls++;
  active++;
  return true;
}

function section(markdown: string, heading: string): string {
  const parts = markdown.replace(/\r\n/g, "\n").split(/^## /m).slice(1);
  const found = parts.find((part) => (part.split("\n", 1)[0] ?? "").trim() === heading);
  if (!found?.trim()) throw new Error("missing_context_section");
  return `## ${found.trim()}`;
}

/** Read the actual allowlisted files and sections before each generation. */
export async function readGuidanceContext(traits: AppearanceResult["traits"]): Promise<string> {
  const [instructions, scope] = await Promise.all([
    readFile(path.join(process.cwd(), "docs/ai/gemini-flash.md"), "utf8"),
    readFile(path.join(process.cwd(), "docs/scope.md"), "utf8"),
  ]);
  return [
    section(instructions, "role"),
    section(instructions, "rules"),
    section(scope, "โปรเจกต์นี้คืออะไร"),
    section(scope, "ผลลัพธ์หน้าแมวที่ต้องการ (ปรับ 2026-10-13)"),
    ...keys
      .filter((key) => traits.some((trait) => trait.key === key))
      .map((key) => section(instructions, key)),
    section(instructions, "output"),
  ].join("\n\n");
}

/** The model can supply prose only; it cannot overwrite deterministic recommendations. */
export async function addGeminiGuidance(
  source: Appearance,
  result: AppearanceResult,
): Promise<AppearanceResult> {
  const fallback = { ...result, guidanceSource: "basic" as const };
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  if (!apiKey || !result.traits.length || !/^gemini-[a-z0-9.-]*flash[a-z0-9.-]*$/.test(model))
    return fallback;

  let instruction: string;
  try {
    instruction = await readGuidanceContext(result.traits);
  } catch {
    console.warn("[appearance-guidance] context_unavailable");
    return fallback;
  }
  if (!reserveCall()) return fallback;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    source: {
                      breed: source.breed,
                      eye: source.eye,
                      coat: source.coat,
                      ear: source.ear,
                    },
                    traits: result.traits.map(({ key, partner, target, level }) => ({
                      key,
                      partner,
                      target,
                      level,
                    })),
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            // This task only expands prose; reserve output budget for the JSON response.
            ...(model.startsWith("gemini-3")
              ? { thinkingConfig: { thinkingLevel: "low" } }
              : model === "gemini-2.5-flash" || model === "gemini-2.5-flash-lite"
                ? { thinkingConfig: { thinkingBudget: 0 } }
                : {}),
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: {
                traits: {
                  type: "array",
                  minItems: result.traits.length,
                  maxItems: result.traits.length,
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string", enum: result.traits.map((trait) => trait.key) },
                      partner: { type: "string" },
                      description: { type: "string" },
                      checks: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 2,
                        maxItems: 3,
                      },
                    },
                    required: ["key", "partner", "description", "checks"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["traits"],
              additionalProperties: false,
            },
          },
        }),
      },
    );
    if (!response.ok) {
      console.warn(`[appearance-guidance] provider_http_${response.status}`);
      return fallback;
    }
    const raw = await response.text();
    if (raw.length > 65_536) throw new Error("oversize_response");
    const envelope = z
      .object({
        candidates: z
          .array(
            z.object({
              finishReason: z.literal("STOP"),
              content: z.object({
                parts: z.array(
                  z.object({ text: z.string().optional(), thought: z.boolean().optional() }),
                ),
              }),
            }),
          )
          .min(1),
      })
      .parse(JSON.parse(raw));
    const candidate = envelope.candidates[0];
    if (!candidate) throw new Error("missing_candidate");
    const content = candidate.content.parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("");
    const parsed = guideSchema.parse(JSON.parse(content));
    if (
      parsed.traits.length !== result.traits.length ||
      new Set(parsed.traits.map((t) => t.key)).size !== parsed.traits.length
    )
      throw new Error("trait_mismatch");
    const traits = result.traits.map((trait) => {
      const guide = parsed.traits.find((item) => item.key === trait.key);
      if (!guide || guide.partner !== trait.partner) throw new Error("partner_mismatch");
      return { ...trait, selection: { description: guide.description, checks: guide.checks } };
    });
    return { ...result, traits, guidanceSource: "gemini" };
  } catch (error) {
    // Never log model responses, prompts, API keys or exception messages.
    console.warn(
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "[appearance-guidance] provider_timeout"
        : "[appearance-guidance] using_basic_guidance",
    );
    return fallback;
  } finally {
    active--;
  }
}
