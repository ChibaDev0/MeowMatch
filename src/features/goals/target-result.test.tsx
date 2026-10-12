import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { TargetResultView } from "./target-result";
import { PairResultView } from "../analysis/pair-result";
import { analyzePair } from "@/domain/genetics/pair/analyze";
import { analyzeTarget } from "@/domain/genetics/ranking/target";
import type { AnalysisParent } from "@/domain/genetics/contracts/input";

afterEach(cleanup);
const a: AnalysisParent = { catId: "a", name: "ต้นทาง", sex: "female", phenotype: { coat_type: "ขนยาว" } };
const b: AnalysisParent = { ...a, catId: "b", name: "รอยืนยัน", sex: "unknown" };

describe("policy result views", () => {
  it("renders unknown-sex math separately without a numbered recommendation", () => {
    const result = analyzeTarget({ source: a, candidates: [b, { ...b, catId: "c", name: "ทราบเพศ", sex: "male" }], targets: { coat_type: "long" }, allowUnverifiedRulesets: true });
    render(<TargetResultView result={result} />);
    const ranked = screen.getByRole("list", { name: "อันดับคำนวณตามโมเดล" });
    expect(within(ranked).getByText("ทราบเพศ")).toBeInTheDocument();
    expect(within(ranked).queryByText("รอยืนยัน")).toBeNull();
    const pending = screen.getByRole("region", { name: "รอยืนยันเพศ" });
    expect(within(pending).getByText("รอยืนยัน")).toBeInTheDocument();
    expect(within(pending).queryByText("1", { exact: true })).toBeNull();
    expect(within(pending).getByText("100%", { exact: true })).toBeInTheDocument();
  });
  it("unsupported pending result shows no invented percentage", () => {
    render(<TargetResultView result={analyzeTarget({ source: a, candidates: [b], targets: { coat_type: "hairless" } })} />);
    const pending = screen.getByRole("region", { name: "รอยืนยันเพศ" });
    expect(within(pending).getByText("—")).toBeInTheDocument();
    expect(within(pending).getByText("ยังคำนวณครบไม่ได้")).toBeInTheDocument();
    expect(screen.queryByText(/ลองกดใจแมวเพิ่ม/)).toBeNull();
  });
  it("pair with one Fold has no probability bars even for coat-only requests", () => {
    const result = analyzePair({ a, b: { ...b, phenotype: { ear_type: "หูพับ", coat_type: "ขนยาว" } }, categories: ["coat_type"], allowUnverifiedRulesets: true });
    render(<PairResultView result={result} />);
    expect(screen.getByText("ระงับคำแนะนำ")).toBeInTheDocument();
    expect(screen.queryByText("100%")).toBeNull();
  });
});
