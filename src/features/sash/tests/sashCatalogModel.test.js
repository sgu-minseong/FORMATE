import { describe, expect, it } from "vitest";
import {
  buildSashEstimateSelectionPatch,
  formatSashArea,
  getSashAreaPreview,
  getSashCatalogEntryValidationError,
  isSashItem,
} from "../sashCatalogModel";

describe("sash catalog model", () => {
  it("uses stable item_kind instead of the display name", () => {
    expect(isSashItem({ item_kind: "sash", name: "임의 표시명" })).toBe(true);
    expect(isSashItem({ item_kind: "standard", name: "샷시" })).toBe(false);
  });

  it("derives the area presentation from numeric dimensions", () => {
    expect(getSashAreaPreview(4000, 2400)).toBe(9.6);
    expect(formatSashArea(9.6)).toBe("9.6㎡");
    expect(formatSashArea(7.25)).toBe("7.25㎡");
  });

  it("requires only the DB-backed editable fields before a row is saved", () => {
    expect(getSashCatalogEntryValidationError({
      brand: "LG",
      product_type: "발코니",
      width_mm: "4000",
      height_mm: "2400",
    })).toBe("");
    expect(getSashCatalogEntryValidationError({
      brand: "",
      product_type: "발코니",
      width_mm: "4000",
      height_mm: "2400",
    })).toBe("제조사를 입력하세요.");
  });

  it("creates an estimate snapshot and one-set calculation contract from a selected spec", () => {
    const patch = buildSashEstimateSelectionPatch({
      id: "sash-entry-1",
      brand: "KCC",
      product_type: "일반",
      width_mm: 4000,
      height_mm: 2400,
      area_sqm: 9.6,
      unit_price: 1200000,
    });

    expect(patch).toMatchObject({
      sashCatalogEntryId: "sash-entry-1",
      quantity: 1,
      laborCount: 0,
      unit: "식",
      unitPrice: 1200000,
      sashSpec: {
        brand: "KCC",
        area_sqm: 9.6,
      },
    });
  });
});
