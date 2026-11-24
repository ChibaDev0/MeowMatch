import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLikedCats, getMyCats } from "@/server/cats/queries";
import type { CatView } from "@/features/cats/types";
import { planMateGenesAction, simulatePairGenesAction } from "./actions";

vi.mock("@/server/cats/queries", () => ({ getMyCats: vi.fn(), getLikedCats: vi.fn() }));

const cat = (over: Partial<CatView>): CatView => ({
  id: "mine",
  name: "มิ้ว",
  ageLabel: "1 ปี",
  breed: "ผสม",
  coat: "ขนสั้น",
  coatColor: "ดำ",
  coatPattern: "สีพื้น",
  eye: "ตาสีทอง",
  ear: "หูตั้ง",
  sex: "female",
  genes: { L: "Aa" },
  ...over,
});

beforeEach(() => {
  vi.mocked(getMyCats).mockResolvedValue([cat({}), cat({ id: "mine-m", name: "ต้นข้าว", sex: "male" })]);
  vi.mocked(getLikedCats).mockResolvedValue([cat({ id: "liked", name: "ส้มโอ", sex: "male", coatColor: "ส้ม", coat: "ขนยาว", genes: {} })]);
});

describe("simulatePairGenesAction", () => {
  it("simulates my cat with a liked cat using recorded genes", async () => {
    const res = await simulatePairGenesAction("mine", "liked");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const coat = res.result.traits.find((t) => t.key === "coat")!;
    expect(coat.outcomes.find((o) => o.label === "ขนยาว")?.all).toEqual({ lower: 0.5, upper: 0.5 });
    expect(res.result.traits.find((t) => t.key === "color")!.outcomes.map((o) => o.label)).toContain("กระดองเต่า");
  });

  it("rejects cats that are not mine/liked and same-sex pairs", async () => {
    expect(await simulatePairGenesAction("liked", "mine")).toMatchObject({ ok: false });
    vi.mocked(getLikedCats).mockResolvedValue([cat({ id: "liked", sex: "female" })]);
    expect(await simulatePairGenesAction("mine", "liked")).toMatchObject({ ok: false });
  });
});

describe("planMateGenesAction", () => {
  it("returns a mate spec and a discover link", async () => {
    const res = await planMateGenesAction("mine", { coat: "ขนยาว", color: "", breed: "" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.mateSex).toBe("male");
    expect(decodeURIComponent(res.result.discoverHref)).toContain("coat=ขนยาว");
  });

  it("only plans for the user's own cat and validates input", async () => {
    expect(await planMateGenesAction("liked", { coat: "ขนยาว" })).toMatchObject({ ok: false });
    expect(await planMateGenesAction("mine", { coat: 5 })).toMatchObject({ ok: false });
    expect(await planMateGenesAction("mine", { hack: "x" })).toMatchObject({ ok: false });
  });
});
