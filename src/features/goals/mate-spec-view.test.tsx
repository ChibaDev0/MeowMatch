import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MateSpecView } from "./mate-spec-view";
import { requiredMateProfile } from "@/domain/genetics/ranking/mate-spec";
import type { AnalysisParent } from "@/domain/genetics/contracts/input";

afterEach(cleanup);

function spec(source: AnalysisParent, targetCode: string) {
  return requiredMateProfile({ source, category: "coat_type", targetCode, allowUnverifiedRulesets: true });
}
const longCat: AnalysisParent = { catId: "a", name: "มะนาว", sex: "female", phenotype: { coat_type: "ขนยาว" } };

describe("MateSpecView", () => {
  it("แสดงคู่ที่การันตี 100% + แผนขั้นเดียว เมื่อ source ขนยาว เป้าขนยาว", () => {
    render(<MateSpecView spec={spec(longCat, "long")} />);
    expect(screen.getByText(/ผสมครั้งเดียวได้ลูกตรงเป้า 100%/)).toBeInTheDocument();
    expect(screen.getByText("แผนการผสม")).toBeInTheDocument();
    // แสดงชุดยีนคู่ที่ต้องใช้ (ปรากฏทั้งในการ์ดคู่และในแผน)
    expect(screen.getAllByText(/ชุดยีน l\/l/).length).toBeGreaterThan(0);
  });

  it("แสดงช่วงโอกาส + แผนหลายรุ่น เมื่อ source ขนสั้น (ไม่ทราบ genotype)", () => {
    const short: AnalysisParent = { ...longCat, phenotype: { coat_type: "ขนสั้น" } };
    render(<MateSpecView spec={spec(short, "long")} />);
    expect(screen.getByText(/มีโอกาส แต่ไม่การันตี/)).toBeInTheDocument();
    expect(screen.getByText("แผนการผสม")).toBeInTheDocument();
    expect(screen.getAllByText(/ยืนยันด้วยผล DNA/).length).toBeGreaterThan(0);
  });

  it("หมวดที่ยังไม่รองรับ → บอกเหตุผล ไม่มีตัวเลข", () => {
    render(
      <MateSpecView
        spec={requiredMateProfile({
          source: { ...longCat, phenotype: { eye_color: "ฟ้า" } },
          category: "eye_color",
          targetCode: "blue",
          allowUnverifiedRulesets: true,
        })}
      />,
    );
    expect(screen.getByText(/รอ RES-01/)).toBeInTheDocument();
    expect(screen.queryByText("แผนการผสม")).toBeNull();
  });
});
