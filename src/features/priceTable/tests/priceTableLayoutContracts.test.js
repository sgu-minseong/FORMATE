import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_ITEM_RENDERER_KINDS,
  getConstructionItemRendererKind,
} from "../priceTableModel";

const pageSource = readFileSync(
  new URL("../PriceTablePage.jsx", import.meta.url),
  "utf8"
);
const appStyles = readFileSync(
  new URL("../../../styles/appStyles.js", import.meta.url),
  "utf8"
);

describe("price table add action layout contracts", () => {
  it("replaces the full-width material add rows with centered item actions", () => {
    expect(pageSource).not.toContain("admin-add-subitem-row admin-price-v2-add-row");
    expect(pageSource.match(/admin-price-v2-add-action/g)).toHaveLength(1);
    expect(pageSource.match(/항목 추가/g)).toHaveLength(1);
    expect(pageSource).not.toContain("소재 추가");
  });

  it("centers the action without recreating the bordered row", () => {
    expect(appStyles).toMatch(
      /\.admin-price-v2-add-action\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?padding:\s*var\(--space-2\) 0;/
    );
  });
});

describe("construction item renderer contracts", () => {
  it("uses stable item_kind and ignores item_type and display names", () => {
    expect(getConstructionItemRendererKind({ item_kind: "standard", item_type: "flat", name: "도배" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD);
    expect(getConstructionItemRendererKind({ item_kind: "standard", name: "샷시" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD);
    expect(getConstructionItemRendererKind({ item_kind: "standard", name: "바닥재" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD);
    expect(getConstructionItemRendererKind({ item_kind: "sash", name: "표시명 변경" }))
      .toBe(CONSTRUCTION_ITEM_RENDERER_KINDS.SASH);
  });

  it("keeps the price table standard path independent from flat and flooring name checks", () => {
    expect(pageSource).toContain("getConstructionItemRendererKind(item)");
    expect(pageSource).not.toContain("isFlooringThicknessItem(item)");
    expect(pageSource).not.toContain('item.item_type === "flat"');
  });
});
