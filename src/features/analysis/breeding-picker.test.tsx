import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { BreedingPicker } from "./breeding-picker";
import { analyzePairAppearanceAction } from "@/server/analysis/pair-appearance-action";
import { describePair } from "@/domain/demo/pair-appearance";
import type { CatView } from "@/features/cats/types";
vi.mock("@/server/analysis/pair-appearance-action", () => ({ analyzePairAppearanceAction: vi.fn() }));
vi.mock("@/components/ui/selectable-cat", () => ({ SelectableCat: ({ cat, onSelect }: { cat: CatView; onSelect: () => void }) => <button onClick={onSelect}>{cat.name}</button> }));
const a: CatView = { id: "a", name: "แม่", sex: "female", breed: "ผสม", coat: "ขนสั้น", coatColor: "ดำ", coatPattern: "สีพื้น", eye: "ตาสีทอง", ear: "หูตั้ง", ageLabel: "2 ปี" };
const b: CatView = { ...a, id: "b", name: "พ่อ", sex: "male", coatColor: "ส้ม" };
beforeEach(() => vi.clearAllMocks());
function select() {
  const headings = screen.getAllByRole("heading", { level: 2 });
  fireEvent.click(within(headings[0]!.closest("section")!).getByRole("button", { name: "แม่" }));
  fireEvent.click(within(headings[1]!.closest("section")!).getByRole("button", { name: "พ่อ" }));
}
it("sends only selected IDs and shows the returned parent data", async () => {
  vi.mocked(analyzePairAppearanceAction).mockResolvedValue({ ok: true, result: describePair(a, b) });
  render(<BreedingPicker myCats={[a, b]} likedCats={[]} />); select();
  fireEvent.click(screen.getByRole("button", { name: "วิเคราะห์ลูกแมว" }));
  await waitFor(() => expect(screen.getByRole("region", { name: "ความเป็นไปได้ของลูกแมว" })).toBeInTheDocument());
  expect(analyzePairAppearanceAction).toHaveBeenCalledWith("a", "b");
  expect(screen.getByText("จาก ดำ × ส้ม")).toBeInTheDocument();
});
it("discards in-flight results after changing the selected pair", async () => {
  let finish!: (value: Awaited<ReturnType<typeof analyzePairAppearanceAction>>) => void;
  vi.mocked(analyzePairAppearanceAction).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<BreedingPicker myCats={[a, b]} likedCats={[]} />); select();
  fireEvent.click(screen.getByRole("button", { name: "วิเคราะห์ลูกแมว" }));
  fireEvent.click(screen.getByRole("button", { name: "แมวที่กดใจไว้" }));
  await act(async () => finish({ ok: true, result: describePair(a, b) }));
  expect(screen.queryByRole("region", { name: "ความเป็นไปได้ของลูกแมว" })).not.toBeInTheDocument();
});
