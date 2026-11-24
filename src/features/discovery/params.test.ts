import { describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseMock } from "@/test/supabase-mock";
import { geneMatchStatus, getDiscoverCats } from "@/server/cats/queries";
import { discoverHref, parseDiscoverParams } from "./params";
import type { CatView } from "@/features/cats/types";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("discover params", () => {
  it("parses the gene-plan link and drops unknown values", () => {
    const f = parseDiscoverParams({
      sex: "male",
      coat: "ขนยาว",
      color: "ส้ม",
      genes: "L.AA,X.zz",
      geneMatch: "1",
      from: "genes",
      page: "2",
    });
    expect(f).toMatchObject({ sex: "male", coat: "ขนยาว", color: "ส้ม", genes: { L: "AA" }, geneMatch: true, fromGenes: true, page: 2 });
    expect(parseDiscoverParams({ sex: "robot", color: "ม่วง" })).toMatchObject({ sex: undefined, color: undefined });
  });

  it("round-trips filters into a URL", () => {
    const href = discoverHref({ sex: "female", color: "สามสี", genes: { O: "Aa" }, fromGenes: true }, 3);
    const back = parseDiscoverParams(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
    expect(back).toMatchObject({ sex: "female", color: "สามสี", genes: { O: "Aa" }, fromGenes: true, page: 3 });
  });
});

describe("gene-aware discover query", () => {
  it("filters by sex, colour and recorded genes when strict matching is on", async () => {
    const mock = createSupabaseMock({ queries: [{ data: [], count: 0, error: null }, { data: [] }] });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    await getDiscoverCats({ filters: { sex: "male", color: "ส้ม", genes: { L: "AA" }, geneMatch: true } });
    expect(mock.captureAt(0).eq).toEqual(
      expect.arrayContaining([["sex", "male"], ["coat_color", "ส้ม"], ["genes->>L", "AA"]]),
    );
  });

  it("reports whether a cat's recorded genes match", () => {
    const c = (genes: CatView["genes"]) => ({ genes }) as CatView;
    expect(geneMatchStatus(c({ L: "AA" }), { L: "AA" })).toBe(true);
    expect(geneMatchStatus(c({ L: "Aa" }), { L: "AA" })).toBe(false);
    expect(geneMatchStatus(c({}), { L: "AA" })).toBeNull();
    expect(geneMatchStatus(c({ L: "AA" }), undefined)).toBeNull();
  });
});
