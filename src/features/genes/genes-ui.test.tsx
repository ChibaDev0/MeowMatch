import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { GeneEditor } from "./gene-editor";
import { DesiredPlanner } from "@/features/goals/desired-planner";
import { planMateGenesAction } from "@/server/genes/actions";
import { planMate } from "@/domain/genes/plan";
import type { Appearance, GeneMap } from "@/domain/genes/model";
import type { CatView } from "@/features/cats/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/goals/actions", () => ({ saveDesiredGoalAction: vi.fn() }));
vi.mock("@/server/analysis/appearance-action", () => ({ analyzeAppearanceAction: vi.fn() }));
vi.mock("@/server/nlp/goal-text-action", () => ({ parseGoalTextAction: vi.fn() }));
vi.mock("@/server/genes/actions", () => ({ planMateGenesAction: vi.fn(), simulatePairGenesAction: vi.fn() }));

function Harness({ appearance }: { appearance: Appearance }) {
  const [genes, setGenes] = useState<GeneMap>({});
  return (
    <>
      <GeneEditor appearance={appearance} genes={genes} onChange={setGenes} />
      <output data-testid="genes">{JSON.stringify(genes)}</output>
    </>
  );
}

describe("GeneEditor", () => {
  it("shows genes known from appearance and lets the owner pick hidden ones", () => {
    render(<Harness appearance={{ sex: "female", coat: "ขนสั้น", ear: "หูตั้ง", coatColor: "ดำ" }} />);
    expect(screen.getAllByText(/รู้จากหน้าตา/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("ยีนความยาวขน"), { target: { value: "Aa" } });
    expect(screen.getByTestId("genes")).toHaveTextContent('{"L":"Aa"}');
    expect(screen.queryByLabelText("ยีนหูพับ")).not.toBeInTheDocument(); // หูตั้ง → fdfd รู้แน่นอน
  });

  it("asks for sex before the X-linked orange gene", () => {
    render(<Harness appearance={{ sex: "unknown", coat: "ขนสั้น" }} />);
    expect(screen.getByText(/ระบุเพศก่อน/)).toBeInTheDocument();
  });
});

describe("DesiredPlanner gene plan", () => {
  it("shows the mate spec from genes and links to discover", async () => {
    const mine: CatView = {
      id: "mine", name: "มิ้ว", ageLabel: "1 ปี", breed: "ผสม", coat: "ขนสั้น", eye: "ตาสีทอง", ear: "หูตั้ง",
      sex: "female", coatColor: "ดำ", genes: { L: "Aa" },
    };
    const plan = planMate({ name: "มิ้ว", appearance: { ...mine, sex: "female" }, genes: mine.genes }, { coat: "ขนยาว" });
    if ("error" in plan) throw new Error(plan.error);
    vi.mocked(planMateGenesAction).mockResolvedValue({ ok: true, result: plan });
    render(<DesiredPlanner myCats={[mine]} likedCats={[]} initialGoal={{
      sourceCatId: "mine", targetBreed: "", targetEyeColor: "", targetCoat: "ขนยาว", targetEarType: "", targetColor: "",
    }} />);
    fireEvent.click(screen.getByRole("button", { name: "วิเคราะห์ผลลัพธ์" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "แมวคู่ที่ต้องหาจากยีน" })).toBeInTheDocument());
    expect(planMateGenesAction).toHaveBeenCalledWith("mine", expect.objectContaining({ coat: "ขนยาว" }));
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ค้นหาแมวแบบนี้/ }).getAttribute("href")).toContain("sex=male");
  });
});
