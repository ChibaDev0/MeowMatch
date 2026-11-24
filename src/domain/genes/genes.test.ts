import { describe, expect, it } from "vitest";
import { crossLocus, simulatePair, type Parent } from "./cross";
import {
  colorLabel,
  effectiveOptions,
  formatGenotype,
  parseColor,
  possibleFromAppearance,
  pruneGenes,
  validateGenes,
} from "./model";
import { decodeGenes, encodeGenes, planMate } from "./plan";

const cat = (over: Partial<Parent["appearance"]>, genes?: Parent["genes"], name = "แมว"): Parent => ({
  name,
  appearance: { sex: "female", coat: "ขนสั้น", ear: "หูตั้ง", eye: "ตาสีทอง", coatColor: "ดำ", coatPattern: "สีพื้น", ...over },
  genes,
});
const trait = (r: ReturnType<typeof simulatePair>, key: string) => r.traits.find((t) => t.key === key)!;
const outcome = (r: ReturnType<typeof simulatePair>, key: string, label: string) =>
  trait(r, key).outcomes.find((o) => o.label === label);

describe("gene model", () => {
  it("formats genotypes with real allele letters", () => {
    expect(formatGenotype("L", "Aa")).toBe("Ll");
    expect(formatGenotype("C", "Aa")).toBe("C/cs");
    expect(formatGenotype("O", "A")).toBe("O");
  });

  it("parses standard and free-text coat colours", () => {
    expect(parseColor("ขาวดำ")).toMatchObject({ white: false, spots: true, orange: "o", dilute: false });
    expect(parseColor("สามสีจาง")).toMatchObject({ orange: "tortie", spots: true, dilute: true });
    expect(parseColor("ครีม")).toMatchObject({ orange: "O", dilute: true, spots: false });
    expect(parseColor("ขาว")).toEqual({ white: true });
    expect(parseColor("ขาวน้ำตาล")).toMatchObject({ orange: "o", dilute: false, spots: true });
    expect(parseColor("ขาวแต้มเทา")).toMatchObject({ orange: "o", dilute: true, spots: true });
    expect(parseColor("แต้มน้ำตาลเข้ม")).toMatchObject({ orange: "o", spots: false });
    expect(parseColor("")).toEqual({});
  });

  it("infers possible genotypes from appearance", () => {
    expect(possibleFromAppearance("L", { sex: "female", coat: "ขนยาว" })).toEqual(["aa"]);
    expect(possibleFromAppearance("L", { sex: "female", coat: "ขนสั้น" })).toEqual(["AA", "Aa"]);
    expect(possibleFromAppearance("O", { sex: "male", coatColor: "ส้ม" })).toEqual(["A"]);
    expect(possibleFromAppearance("O", { sex: "female", coatColor: "สามสี" })).toEqual(["Aa"]);
    expect(possibleFromAppearance("C", { sex: "male", coatPattern: "แต้มสี" })).toEqual(["aa"]);
    expect(possibleFromAppearance("C", { sex: "male", eye: "ตาสีเขียว" })).toEqual(["AA", "Aa"]);
    expect(possibleFromAppearance("Fd", { sex: "male", ear: "หูพับ" })).toEqual(["Aa"]);
  });

  it("uses an owner-chosen hidden gene only when it fits the appearance", () => {
    const a = { sex: "female" as const, coat: "ขนสั้น" };
    expect(effectiveOptions("L", a, { L: "Aa" })).toEqual(["Aa"]);
    expect(effectiveOptions("L", a, { L: "aa" })).toEqual(["AA", "Aa"]);
    expect(validateGenes(a, { L: "aa" })[0]).toContain("ไม่ตรงกับหน้าตา");
    expect(validateGenes({ sex: "unknown" }, { O: "A" })[0]).toContain("ต้องระบุเพศ");
    expect(pruneGenes({ ...a, coat: "ขนยาว" }, { L: "Aa" })).toEqual({});
  });

  it("derives coat colour labels from colour genes", () => {
    expect(colorLabel("female", { W: "aa", S: "Aa", O: "Aa", D: "AA" })).toBe("สามสี");
    expect(colorLabel("male", { W: "aa", S: "aa", O: "A", D: "aa" })).toBe("ครีม");
    expect(colorLabel("male", { W: "Aa", O: "a" })).toBe("ขาว");
  });

  it("round-trips the discover gene parameter", () => {
    expect(decodeGenes(encodeGenes({ L: "Aa", O: "A" }))).toEqual({ L: "Aa", O: "A" });
    expect(decodeGenes("L.zz,X.AA")).toEqual({});
  });
});

describe("crossLocus (Punnett)", () => {
  it("Ll × Ll → 25% ll", () => {
    expect(crossLocus("L", "Aa", "Aa").male.get("aa")).toBe(0.25);
  });
  it("orange is X-linked: sons copy the mother, daughters mix both", () => {
    const r = crossLocus("O", "AA", "a");
    expect([...r.male]).toEqual([["A", 1]]);
    expect([...r.female]).toEqual([["Aa", 1]]);
  });
});

describe("simulatePair", () => {
  it("gives exact Punnett results when hidden genes are recorded", () => {
    const r = simulatePair(cat({}, { L: "Aa" }, "แม่"), cat({ sex: "male" }, { L: "Aa" }, "พ่อ"));
    expect(trait(r, "coat").exact).toBe(true);
    expect(outcome(r, "coat", "ขนยาว")?.all).toEqual({ lower: 0.25, upper: 0.25 });
    const sq = r.squares.find((s) => s.locus === "L")!;
    expect(sq.rows).toEqual(["L", "l"]);
    expect(sq.cells[1]![1]!.genotype).toBe("ll");
  });

  it("shows dilute carriers as a range instead of guessing", () => {
    const r = simulatePair(cat({ coatColor: "ส้ม" }), cat({ sex: "male", coatColor: "ดำ" }));
    expect(outcome(r, "color", "ส้ม")?.male).toEqual({ lower: 0.75, upper: 1 });
    expect(outcome(r, "color", "ครีม")?.male).toEqual({ lower: 0, upper: 0.25 });
  });

  it("assumes the rare hairless gene is not hidden unless the owner says so", () => {
    const plain = simulatePair(cat({}), cat({ sex: "male" }));
    expect(outcome(plain, "coat", "ไม่มีขน")).toBeUndefined();
    const carriers = simulatePair(cat({}, { hr: "Aa" }), cat({ sex: "male" }, { hr: "Aa" }));
    expect(outcome(carriers, "coat", "ไม่มีขน")?.all.upper).toBe(0.25);
    expect(plain.parents[0].loci.find((l) => l.locus === "hr")?.meaning).toContain("สมมติ");
  });

  it("reports a range when carrier status is unknown (no invented prior)", () => {
    const r = simulatePair(cat({}), cat({ sex: "male", coat: "ขนยาว" }));
    expect(outcome(r, "coat", "ขนยาว")?.all).toEqual({ lower: 0, upper: 0.5 });
    expect(trait(r, "coat").exact).toBe(false);
  });

  it("splits colour by kitten sex: orange mother × black father", () => {
    const r = simulatePair(cat({ coatColor: "ส้ม" }, { D: "AA" }), cat({ sex: "male", coatColor: "ดำ" }));
    expect(outcome(r, "color", "ส้ม")?.male).toEqual({ lower: 1, upper: 1 });
    expect(outcome(r, "color", "กระดองเต่า")?.female).toEqual({ lower: 1, upper: 1 });
    expect(outcome(r, "color", "กระดองเต่า")?.all).toEqual({ lower: 0.5, upper: 0.5 });
  });

  it("refuses colour without known opposite sexes and warns on fold × fold", () => {
    const r = simulatePair(cat({ ear: "หูพับ" }), cat({ ear: "หูพับ" }));
    expect(trait(r, "color").outcomes).toEqual([]);
    expect(r.warnings.join(" ")).toContain("ไม่ควรผสมคู่นี้");
  });
});

describe("planMate", () => {
  it("finds a long-haired mate for a carrier and links to discover", () => {
    const plan = planMate(cat({}, { L: "Aa" }), { coat: "ขนยาว" });
    if ("error" in plan) throw new Error(plan.error);
    expect(plan.mateSex).toBe("male");
    expect(plan.groups[0]).toMatchObject({ matePhenotype: "ขนยาว", probability: { lower: 0.5, upper: 0.5 } });
    expect(plan.discoverHref).toContain("sex=male");
    expect(decodeURIComponent(plan.discoverHref)).toContain("coat=ขนยาว");
  });

  it("explains when the target is impossible in one generation", () => {
    const plan = planMate(cat({}, { L: "AA" }), { coat: "ขนยาว" });
    if ("error" in plan) throw new Error(plan.error);
    expect(plan.total.upper).toBe(0);
    expect(plan.groups[0]?.impossible).toContain("ผสมต่ออีกรุ่น");
  });

  it("asks for a hidden gene when the visible look is not enough", () => {
    const plan = planMate(cat({ coat: "ขนยาว" }), { coat: "ขนสั้น" });
    if ("error" in plan) throw new Error(plan.error);
    expect(plan.groups[0]).toMatchObject({ matePhenotype: "ขนสั้น", probability: { lower: 1, upper: 1 } });
    expect(plan.requiredGenes).toEqual({ L: "AA" });
    expect(plan.ifGenesUnknown).toEqual({ lower: 0.5, upper: 1 });
    expect(plan.discoverHref).toContain("genes=L.AA");
  });

  it("never pairs fold with fold", () => {
    const plan = planMate(cat({ ear: "หูพับ" }), { ear: "หูพับ" });
    if ("error" in plan) throw new Error(plan.error);
    expect(plan.groups[0]).toMatchObject({ matePhenotype: "หูตั้ง", probability: { lower: 0.5, upper: 0.5 } });
  });

  it("plans calico: a female black cat with white needs an orange male", () => {
    const plan = planMate(cat({ coatColor: "ขาวดำ" }, { S: "AA" }), { color: "สามสี" });
    if ("error" in plan) throw new Error(plan.error);
    const g = plan.groups[0]!;
    expect(g.mateGenes.O).toBe("A");
    expect(g.probability.lower).toBeGreaterThan(0);
    expect(plan.notes.join(" ")).toContain("ลูกตัวเมีย");
  });

  it("requires a known sex", () => {
    expect(planMate(cat({ sex: "unknown" }), { coat: "ขนยาว" })).toHaveProperty("error");
  });
});

describe("performance", () => {
  it("handles the worst case (white cats, every hidden gene unknown) quickly", () => {
    const white = (sex: "male" | "female") =>
      cat({ sex, coat: "", ear: "", eye: "", coatColor: "ขาว", coatPattern: "" });
    const start = performance.now();
    simulatePair(white("female"), white("male"));
    const plan = planMate(white("female"), { coat: "ขนยาว", ear: "หูตั้ง", color: "สามสี", eye: "ตาสีฟ้า" });
    expect("error" in plan).toBe(false);
    expect(performance.now() - start).toBeLessThan(1500);
  });
});
