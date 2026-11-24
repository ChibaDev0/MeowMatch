import "server-only";
import { z } from "zod";
import { DOMAIN_WORDS } from "@/domain/nlp/lexicon";
import type { ExternalAnalysis } from "@/domain/nlp/goal-parser";

const responseSchema = z.object({
  engine: z.literal("pythainlp"),
  version: z.string().max(40),
  sentences: z.array(z.string().max(500)).max(100),
  tokens: z.array(z.object({ text: z.string().max(500), pos: z.string().max(20) })).max(1000),
});

/**
 * เรียก PyThaiNLP service (nlp-service/app.py) ถ้าตั้งค่า THAI_NLP_URL ไว้
 * คืน null เมื่อไม่ได้ตั้งค่า / หมดเวลา / ผลผิดรูปแบบ → ผู้เรียกใช้ตัวตัดคำในแอปแทน
 */
export async function analyzeWithPyThaiNLP(text: string): Promise<ExternalAnalysis | null> {
  const base = process.env.THAI_NLP_URL?.trim().replace(/\/+$/, "");
  if (!base || !/^https?:\/\//.test(base)) return null;
  try {
    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, custom_words: DOMAIN_WORDS }),
    });
    if (!res.ok) return null;
    const parsed = responseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    console.warn("[thai-nlp] pythainlp_unavailable");
    return null;
  }
}
