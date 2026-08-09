import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  catalog: {
    itemRows: [],
    subitemRows: [],
    variantGroupRows: [],
    canonicalCatalog: { items: [], products: [] },
  },
  fetchCatalog: vi.fn(),
}));

vi.mock("../../constructionCatalog/constructionCatalogApi", () => ({
  fetchCanonicalConstructionCatalogRows: mocks.fetchCatalog,
}));

import { fetchEstimateConstructionCatalogRows } from "../estimateApi";

describe("estimate variant catalog API", () => {
  beforeEach(() => {
    mocks.catalog = {
      itemRows: [],
      subitemRows: [],
      variantGroupRows: [],
      canonicalCatalog: { items: [], products: [] },
    };
    mocks.fetchCatalog.mockReset();
    mocks.fetchCatalog.mockImplementation(async () => mocks.catalog);
  });

  it("delegates to the feature-neutral canonical catalog reader", async () => {
    mocks.catalog = {
      itemRows: [{ id: "floor-item", company_id: "company-1" }],
      subitemRows: [{
        id: "variant-18",
        item_id: "floor-item",
        variant_group_id: "floor-group",
      }],
      variantGroupRows: [{
        id: "floor-group",
        construction_item_id: "floor-item",
        archived_at: null,
      }],
      canonicalCatalog: {
        items: [{ id: "floor-item" }],
        products: [{ productId: "floor-group" }],
      },
    };

    await expect(fetchEstimateConstructionCatalogRows("company-1"))
      .resolves.toEqual(mocks.catalog);
    expect(mocks.fetchCatalog).toHaveBeenCalledWith("company-1");
  });
});
