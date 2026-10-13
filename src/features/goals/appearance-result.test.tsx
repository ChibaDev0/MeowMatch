import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { estimateAppearance } from "@/domain/demo/appearance";
import { AppearanceResultView } from "./appearance-result";
it("renders the four requested characteristics without the previous technical output", () => {
  const goal = { breed: "เปอร์เซีย", eye: "ตาสีฟ้า", coat: "ขนยาว", ear: "หูตั้ง" };
  const { container } = render(<AppearanceResultView result={estimateAppearance(goal, goal)} />);
  for (const text of Object.values(goal)) expect(screen.getByText(text)).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/DNA|ยีน|RES-01|100%|ครอก|engine/);
  expect(screen.getAllByText("ลักษณะที่ควรเลือก")).toHaveLength(4);
  expect(screen.getAllByText("จุดที่ควรสังเกต")).toHaveLength(4);
  expect(screen.getByText(/ขอภาพที่สีไม่เพี้ยน/)).toBeInTheDocument();
  expect(screen.getByText("แสดงคำแนะนำพื้นฐาน")).toBeInTheDocument();
});

it("labels generated guidance and explains unrestricted traits", () => {
  const goal = { breed: "", eye: "", coat: "ขนสั้น", ear: "" };
  const result = estimateAppearance(goal, goal);
  render(<AppearanceResultView result={{ ...result, guidanceSource: "gemini" }} />);
  expect(screen.getByText("คำอธิบายเพิ่มเติมโดย Gemini Flash")).toBeInTheDocument();
  expect(screen.getByText(/ให้ตั้งเป้าหมายสีตาก่อน/)).toBeInTheDocument();
});
