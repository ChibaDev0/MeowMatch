import { describe, expect, it } from "vitest";
import caseStudy from "./fixtures/case-study.json";
import { parseGoalText } from "./goal-parser";
import { DOMAIN_WORDS } from "./lexicon";
import { normalizeThai, segmentSentences, tokenizeThai } from "./thai";

const words = (text: string) => tokenizeThai(normalizeThai(text)).filter((t) => t.kind === "word").map((t) => t.text);

describe("thai NLP tools", () => {
  it("normalizes repeated characters, zero-width spaces and sara am", () => {
    expect(normalizeThai("ขน\u200Bยาววววว  ตาสีฟ้าาา")).toBe("ขนยาว ตาสีฟ้า");
    expect(normalizeThai("ดํา")).toBe("ดำ");
  });

  it("merges domain words that Intl.Segmenter splits (custom dictionary maximal matching)", () => {
    expect(words("อยากได้ลูกแมวสก็อตติชโฟลด์ขนยาวตาสีฟ้า")).toEqual([
      "อยากได้", "ลูกแมว", "สก็อตติชโฟลด์", "ขนยาว", "ตาสีฟ้า",
    ]);
  });

  it("does not force a dictionary word inside an ordinary word", () => {
    expect(words("เอาตามใจ")).not.toContain("ตา");
  });

  it("keeps domain terms of the case study intact (recall metric, cf. nlp-service/experiment.py)", () => {
    const gold = DOMAIN_WORDS.filter((w) => w.length >= 4 && w !== "ไม่เอา");
    let hit = 0;
    let total = 0;
    for (const { text } of caseStudy.cases) {
      const t = normalizeThai(text);
      const present = gold.filter((g) => t.includes(g));
      const longest = present.filter((g) => !present.some((o) => o !== g && o.includes(g)));
      const tokens = words(text);
      total += longest.length;
      hit += longest.filter((g) => tokens.includes(g)).length;
    }
    console.info(`[builtin tokenizer] domain term recall ${hit}/${total}`);
    expect(hit / total).toBeGreaterThanOrEqual(0.85);
  });

  it("splits sentences at punctuation and spaces between Thai phrases", () => {
    expect(segmentSentences("ขนยาว ตาสีฟ้า. หูตั้ง")).toEqual(["ขนยาว", "ตาสีฟ้า", "หูตั้ง"]);
  });

  it("tags parts of speech from the domain lexicon", () => {
    const tags = Object.fromEntries(tokenizeThai("ไม่เอาเปอร์เซีย").map((t) => [t.text, t.pos]));
    expect(tags).toMatchObject({ ไม่: "PART", เอา: "VERB", เปอร์เซีย: "PROPN" });
  });
});

describe("parseGoalText", () => {
  it.each(caseStudy.cases)("$text", ({ text, expect: gold }) => {
    const result = parseGoalText(text);
    for (const slot of ["breed", "coat", "eye", "ear"] as const) {
      expect([slot, result.slots[slot].value]).toEqual([slot, gold[slot]]);
    }
  });

  it("infers หูตั้ง from a negated หูพับ and marks the mention as negated", () => {
    const r = parseGoalText("ไม่เอาหูพับ");
    expect(r.slots.ear).toMatchObject({ status: "inferred", value: "หูตั้ง", excluded: ["หูพับ"] });
    expect(r.mentions[0]).toMatchObject({ kind: "ear", negated: true });
  });

  it("leaves a multi-option slot untouched when only an exclusion is given", () => {
    const r = parseGoalText("ไม่เอาขนยาว");
    expect(r.slots.coat).toMatchObject({ status: "excluded", value: null });
    expect(r.slots.coat.note).toContain("ขนสั้น / ไม่มีขน");
  });

  it("reports conflicting values instead of guessing", () => {
    const r = parseGoalText("ตาฟ้าหรือตาเขียว");
    expect(r.slots.eye.status).toBe("conflict");
    expect(r.warnings.join(" ")).toContain("ตาสีฟ้า, ตาสีเขียว");
  });

  it("fills a modelled coat colour and reports unmodelled patterns as ignored", () => {
    const r = parseGoalText("ขนยาว สีส้ม ลายสลิด");
    expect(r.slots.color).toMatchObject({ status: "set", value: "ส้ม" });
    expect(r.ignored).toEqual(["สี/ลายขน: ลายสลิด"]);
  });

  it("uses tokens from an external PyThaiNLP analysis when they align with the text", () => {
    const r = parseGoalText("ตาสีฟ้า หูพับ", {
      engine: "pythainlp",
      version: "5.4.0",
      sentences: ["ตาสีฟ้า หูพับ"],
      tokens: [
        { text: "ตาสีฟ้า", pos: "NOUN" },
        { text: " ", pos: "PUNCT" },
        { text: "หู", pos: "NOUN" },
        { text: "พับ", pos: "VERB" },
      ],
    });
    expect(r.engine).toBe("pythainlp");
    expect(r.tokens.map((t) => t.pos)).toEqual(["NOUN", "SPACE", "NOUN", "VERB"]);
    expect(r.slots).toMatchObject({ eye: { value: "ตาสีฟ้า" }, ear: { value: "หูพับ" } });
  });

  it("falls back to the builtin tokenizer when external tokens do not align", () => {
    const r = parseGoalText("ขนยาว", { engine: "pythainlp", sentences: [], tokens: [{ text: "ขน" }] });
    expect(r.engine).toBe("builtin");
    expect(r.slots.coat.value).toBe("ขนยาว");
  });

  it("warns when nothing supported is found", () => {
    expect(parseGoalText("เอาตามใจเลยครับ").warnings[0]).toContain("ไม่พบลักษณะที่รองรับ");
  });
});
