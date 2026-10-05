import { describe, expect, it } from "vitest";
import { analyzePair } from "../pair/analyze";
import type { AnalysisParent, PairAnalysisInput } from "../contracts/input";

/**
 * Golden fixtures — พิสูจน์ความถูกต้องของ engine วิเคราะห์คู่ (GEN-02)
 * ตัวเลขอ้างอิงตารางใน MeowMatch/10-algorithm-design §1 (ตัวอย่างคณิตศาสตร์ ไม่ใช่กฎ FGF5 จริง)
 */

function parent(over: Partial<AnalysisParent>): AnalysisParent {
  return {
    catId: over.catId ?? "x",
    name: over.name ?? "แมว",
    sex: over.sex ?? "unknown",
    phenotype: over.phenotype ?? {},
    genotype: over.genotype,
  };
}

const base: Omit<PairAnalysisInput, "a" | "b"> = {
  categories: ["coat_type"],
  allowUnverifiedRulesets: true,
};

describe("analyzePair — gating (ความซื่อสัตย์ของผล)", () => {
  it("ค่าเริ่มต้น (ไม่เปิดโหมดสาธิต) → unsupported เพราะยังไม่มี ruleset ที่ผ่านตรวจรับ", () => {
    const res = analyzePair({
      categories: ["coat_type"],
      a: parent({ phenotype: { coat_type: "ขนสั้น" } }),
      b: parent({ phenotype: { coat_type: "ขนยาว" } }),
    });
    expect(res.traits[0]!.status).toBe("unsupported");
    expect(res.traits[0]!.distribution).toHaveLength(0);
    expect(res.coverage.complete).toBe(false);
  });

  it("โหมดสาธิต + รูปลักษณ์ไม่รู้จัก → insufficient_data (ไม่ใช่ unsupported)", () => {
    const res = analyzePair({
      ...base,
      a: parent({ phenotype: { coat_type: "ขนหยิก" } }),
      b: parent({ phenotype: { coat_type: "ขนยาว" } }),
    });
    expect(res.traits[0]!.status).toBe("insufficient_data");
  });

  it("โหมดสาธิตมี warning กำกับเสมอว่าไม่ใช่ผลจริง", () => {
    const res = analyzePair({
      ...base,
      a: parent({ phenotype: { coat_type: "ขนสั้น" } }),
      b: parent({ phenotype: { coat_type: "ขนยาว" } }),
    });
    expect(res.warnings.some((w) => w.includes("โหมดสาธิต"))).toBe(true);
  });
});

describe("analyzePair — computed (ทราบ genotype แน่นอน)", () => {
  it("L/l × L/l → ขนสั้น 75%, ขนยาว 25% และผลรวม = 1", () => {
    const res = analyzePair({
      ...base,
      a: parent({ genotype: { coat_type: ["L", "l"] } }),
      b: parent({ genotype: { coat_type: ["L", "l"] } }),
    });
    const t = res.traits[0]!;
    expect(t.status).toBe("computed");
    const byCode = Object.fromEntries(t.distribution.map((d) => [d.outcomeCode, d.probability]));
    expect(byCode.short).toBeCloseTo(0.75);
    expect(byCode.long).toBeCloseTo(0.25);
    const total = t.distribution.reduce((s, d) => s + (d.probability ?? 0), 0);
    expect(total).toBeCloseTo(1);
  });

  it("L/L × l/l → ขนสั้น 100% (พาหะทั้งหมด ไม่มีขนยาว)", () => {
    const res = analyzePair({
      ...base,
      a: parent({ genotype: { coat_type: ["L", "L"] } }),
      b: parent({ genotype: { coat_type: ["l", "l"] } }),
    });
    const byCode = Object.fromEntries(
      res.traits[0]!.distribution.map((d) => [d.outcomeCode, d.probability]),
    );
    expect(byCode.short).toBeCloseTo(1);
    expect(byCode.long).toBeCloseTo(0);
  });
});

describe("analyzePair — computed จาก phenotype ล้วน (เส้นทางสาธิตจริง)", () => {
  it("ขนยาว × ขนยาว → l/l × l/l = ขนยาว 100% (phenotype กำหนด genotype ได้)", () => {
    const res = analyzePair({
      ...base,
      a: parent({ phenotype: { coat_type: "ขนยาว" } }),
      b: parent({ phenotype: { coat_type: "ขนยาว" } }),
    });
    const t = res.traits[0]!;
    expect(t.status).toBe("computed");
    const byCode = Object.fromEntries(t.distribution.map((d) => [d.outcomeCode, d.probability]));
    expect(byCode.long).toBeCloseTo(1);
    expect(byCode.short).toBeCloseTo(0);
  });
});

describe("analyzePair — หลายหมวดพร้อมกัน (flow จริงจากหน้า breeding)", () => {
  const CATS = ["coat_type", "coat_color", "coat_pattern", "eye_color", "ear_type"] as const;

  it("มี ruleset เฉพาะ coat_type → หมวดอื่น unsupported และ coverage ระบุครบ", () => {
    const res = analyzePair({
      categories: CATS,
      allowUnverifiedRulesets: true,
      a: parent({ phenotype: { coat_type: "ขนสั้น", eye_color: "ตาสีฟ้า", ear_type: "หูตั้ง" } }),
      b: parent({ phenotype: { coat_type: "ขนยาว", eye_color: "ตาสีทอง", ear_type: "หูตั้ง" } }),
    });

    expect(res.traits).toHaveLength(5);
    const byCat = Object.fromEntries(res.traits.map((t) => [t.category, t.status]));
    expect(byCat.coat_type).toBe("scenario_range");
    expect(byCat.coat_color).toBe("unsupported");
    expect(byCat.coat_pattern).toBe("unsupported");
    expect(byCat.eye_color).toBe("unsupported");
    expect(byCat.ear_type).toBe("unsupported");

    // coverage: 4 หมวดถูกตัด (unsupported) → ไม่ complete และ omitted ระบุหมวด+สถานะ
    expect(res.coverage.complete).toBe(false);
    expect(res.coverage.omitted).toHaveLength(4);
    expect(res.coverage.omitted).toContain("eye_color: unsupported");
  });
});

describe("analyzePair — scenario_range (genotype ไม่แน่นอน ไม่มี prior)", () => {
  it("ขนสั้น × ขนยาว → ขนยาวอยู่ในช่วง 0–50% (ไม่เฉลี่ยเป็นค่าเดียว)", () => {
    const res = analyzePair({
      ...base,
      a: parent({ phenotype: { coat_type: "ขนสั้น" } }), // {L/L, L/l}
      b: parent({ phenotype: { coat_type: "ขนยาว" } }), // {l/l}
    });
    const t = res.traits[0]!;
    expect(t.status).toBe("scenario_range");
    const long = t.distribution.find((d) => d.outcomeCode === "long")!;
    const short = t.distribution.find((d) => d.outcomeCode === "short")!;
    expect(long.probability).toBeNull();
    expect(long.lower).toBeCloseTo(0);
    expect(long.upper).toBeCloseTo(0.5);
    expect(short.lower).toBeCloseTo(0.5);
    expect(short.upper).toBeCloseTo(1);
  });
});

describe("analyzePair — welfare gate", () => {
  it("หูพับ × หูพับ → ear_type ถูก blocked และมี warning", () => {
    const res = analyzePair({
      categories: ["ear_type"],
      allowUnverifiedRulesets: true,
      a: parent({ phenotype: { ear_type: "หูพับ" } }),
      b: parent({ phenotype: { ear_type: "หูพับ" } }),
    });
    expect(res.traits[0]!.status).toBe("blocked");
    expect(res.warnings.some((w) => w.includes("Fold"))).toBe(true);
  });

  it("หูพับ × หูตั้ง → ไม่ถูก block (แต่ ear_type ยัง unsupported เพราะไม่มี ruleset)", () => {
    const res = analyzePair({
      categories: ["ear_type"],
      allowUnverifiedRulesets: true,
      a: parent({ phenotype: { ear_type: "หูพับ" } }),
      b: parent({ phenotype: { ear_type: "หูตั้ง" } }),
    });
    expect(res.traits[0]!.status).toBe("unsupported");
    expect(res.warnings).toHaveLength(1); // เฉพาะ warning โหมดสาธิต
  });
});
