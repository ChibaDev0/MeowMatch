import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DesiredPlanner } from "./desired-planner";
import { analyzeAppearanceAction } from "@/server/analysis/appearance-action";
import { estimateAppearance } from "@/domain/demo/appearance";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/goals/actions", () => ({ saveDesiredGoalAction: vi.fn() }));
vi.mock("@/server/analysis/appearance-action", () => ({ analyzeAppearanceAction: vi.fn() }));
it("sends breed/eye/coat/ear from the goal and clears the result when the goal changes", async () => {
  const target = { breed: "เปอร์เซีย", eye: "ตาสีทอง", coat: "ขนยาว", ear: "หูตั้ง" };
  vi.mocked(analyzeAppearanceAction).mockResolvedValue({ ok: true, result: estimateAppearance(target, target) });
  render(<DesiredPlanner myCats={[]} likedCats={[]} initialGoal={{
    sourceCatId: "mine", targetBreed: target.breed, targetEyeColor: target.eye,
    targetCoat: target.coat, targetEarType: target.ear, targetColor: "",
  }} />);
  fireEvent.click(screen.getByRole("button", { name: "วิเคราะห์ผลลัพธ์" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "ผลประเมินเบื้องต้น" })).toBeInTheDocument());
  expect(analyzeAppearanceAction).toHaveBeenCalledWith("mine", target);
  fireEvent.change(screen.getByPlaceholderText("ไม่จำกัด"), { target: { value: "สก็อตติช" } });
  expect(screen.queryByRole("region", { name: "ผลประเมินเบื้องต้น" })).not.toBeInTheDocument();
});
