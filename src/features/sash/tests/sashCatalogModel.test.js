import { describe, expect, it } from "vitest";
import {
  buildSashCatalogEntryPayload,
  buildSashCatalogEntryCounts,
  buildSashEstimateSelectionPatch,
  createLocalSashCatalogEntry,
  formatSashArea,
  getSashBillableArea,
  getSashCatalogEntryAmount,
  getSashEntryArea,
  getSashAreaPreview,
  getSashCatalogEntryValidationError,
  isSashItem,
  SASH_WINDOW_TYPES,
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

  it("counts only active catalog entries for each sash subitem", () => {
    expect(buildSashCatalogEntryCounts([
      { construction_subitem_id: "living", archived_at: null },
      { construction_subitem_id: "living", archived_at: null },
      { construction_subitem_id: "living", archived_at: "2026-08-08T00:00:00Z" },
      { construction_subitem_id: "bedroom", archived_at: null },
    ], ["living", "bedroom", "kitchen"])).toEqual({
      living: 2,
      bedroom: 1,
      kitchen: 0,
    });
  });

  it("allows sparse rows while rejecting supplied invalid numeric values", () => {
    const sparseEntry = createLocalSashCatalogEntry({
      constructionSubitemId: "subitem-a",
    });
    expect(getSashCatalogEntryValidationError(sparseEntry)).toBe("");
    expect(buildSashCatalogEntryPayload(sparseEntry, {
      companyId: "company-a",
    })).toMatchObject({
      company_id: "company-a",
      construction_subitem_id: "subitem-a",
      brand: null,
      product_type: null,
      width_mm: null,
      height_mm: null,
      unit_price: null,
      cost_price: null,
    });
    expect(getSashCatalogEntryAmount(sparseEntry)).toBeNull();
    expect(getSashEntryArea({
      ...sparseEntry,
      width_mm: "",
      height_mm: "2400",
      area_sqm: 9.6,
    })).toBe("");
    expect(getSashBillableArea({
      ...sparseEntry,
      width_mm: "",
      height_mm: "2400",
      window_type: SASH_WINDOW_TYPES.SINGLE,
      billable_area_sqm: 9.6,
    })).toBe("");

    ["-1", "NaN", "Infinity", "1.5"].forEach((width_mm) => {
      expect(getSashCatalogEntryValidationError({ ...sparseEntry, width_mm }))
        .toContain("가로");
    });
    ["-1", "NaN", "Infinity"].forEach((unit_price) => {
      expect(getSashCatalogEntryValidationError({ ...sparseEntry, unit_price }))
        .toContain("단가");
    });
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
