import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DesiredPlanner } from "./desired-planner";
import { parseGoalTextAction } from "@/server/nlp/goal-text-action";
import { parseGoalText } from "@/domain/nlp/goal-parser";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/goals/actions", () => ({ saveDesiredGoalAction: vi.fn() }));
vi.mock("@/server/analysis/appearance-action", () => ({ analyzeAppearanceAction: vi.fn() }));
vi.mock("@/server/nlp/goal-text-action", () => ({ parseGoalTextAction: vi.fn() }));

it("fills the goal form from Thai free text and shows the NLP steps", async () => {
  const text = "อยากได้ลูกแมวเปอร์เซีย ขนยาว ตาสีฟ้า ไม่เอาหูพับ";
  vi.mocked(parseGoalTextAction).mockResolvedValue({ ok: true, result: parseGoalText(text) });
  render(<DesiredPlanner myCats={[]} likedCats={[]} initialGoal={null} />);

  fireEvent.change(screen.getByLabelText("พิมพ์บอกลูกแมวที่อยากได้ (ภาษาไทย)"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "แปลงข้อความเป็นเป้าหมาย" }));

  await waitFor(() => expect(screen.getByRole("region", { name: "ผลวิเคราะห์ข้อความ" })).toBeInTheDocument());
  expect(parseGoalTextAction).toHaveBeenCalledWith(text);
  expect(screen.getByPlaceholderText("ไม่จำกัด")).toHaveValue("เปอร์เซีย");
  expect(screen.getByRole("button", { name: "ขนยาว" }).className).toContain("border-primary-500");
  expect(screen.getByDisplayValue("ตาสีฟ้า")).toBeInTheDocument();
  expect(screen.getByDisplayValue("หูตั้ง")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /ดูขั้นตอน NLP/ }));
  expect(screen.getByRole("list", { name: "คำที่ตัดได้" })).toHaveTextContent("เปอร์เซีย");
});
