// @vitest-environment node
import { describe, expect, it } from "vitest";
import caseStudy from "@/domain/nlp/fixtures/case-study.json";
import { parseGoalText } from "@/domain/nlp/goal-parser";
import { normalizeThai } from "@/domain/nlp/thai";
import { analyzeWithPyThaiNLP } from "./pythainlp";

/**
 * ทดสอบกับ PyThaiNLP service จริง (nlp-service/app.py) — ข้ามเมื่อไม่ได้ตั้ง THAI_NLP_URL
 * รัน: THAI_NLP_URL=http://127.0.0.1:8001 npx vitest run src/server/nlp/pythainlp.live.test.ts
 */
describe.skipIf(!process.env.THAI_NLP_URL)("PyThaiNLP service (live)", () => {
  it.each(caseStudy.cases)("$text", async ({ text, expect: gold }) => {
    const normalized = normalizeThai(text);
    const external = await analyzeWithPyThaiNLP(normalized);
    expect(external?.engine).toBe("pythainlp");
    const result = parseGoalText(normalized, external);
    expect(result.engine).toBe("pythainlp");
    for (const slot of ["breed", "coat", "eye", "ear"] as const) {
      expect([slot, result.slots[slot].value]).toEqual([slot, gold[slot]]);
    }
  });
});
