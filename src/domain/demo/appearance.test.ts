import { expect, it } from "vitest";
import { estimateAppearance } from "./appearance";
const source = { breed: "เปอร์เซีย", eye: "ตาสีฟ้า", coat: "ขนยาว", ear: "หูตั้ง" };
it("matches normalized appearance and separates mixed targets", () => {
  expect(estimateAppearance(source, { ...source, breed: " เปอร์เซีย " }).level).toBe("สูง");
  expect(estimateAppearance(source, { ...source, eye: "ตาสีทอง" }).level).toBe("ปานกลาง");
  expect(estimateAppearance(source, { breed: "", eye: "", coat: "", ear: "" }).level).toBe(
    "ข้อมูลไม่พอ",
  );
});
it("does not recommend two folded ears", () => {
  const result = estimateAppearance({ ...source, ear: "หูพับ" }, { ...source, ear: "หูพับ" });
  expect(result.traits.find((t) => t.key === "ear")?.partner).toBe("หูตั้ง");
  expect(result.level).toBe("ปานกลาง");
});
