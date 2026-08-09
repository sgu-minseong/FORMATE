import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  catalog: { itemRows: [], subitemRows: [] },
  fetchCatalog: vi.fn(),
  groupResult: { data: [], error: null },
  from: vi.fn(),
}));

vi.mock("../../priceTable/priceTableApi", () => ({
  fetchConstructionCatalogRows: mocks.fetchCatalog,
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { fetchEstimateConstructionCatalogRows } from "../estimateApi";

function createVariantGroupQuery() {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(mocks.groupResult).then(resolve, reject),
  };
  return query;
}

describe("estimate variant catalog API", () => {
  beforeEach(() => {
    mocks.catalog = { itemRows: [], subitemRows: [] };
    mocks.groupResult = { data: [], error: null };
    mocks.fetchCatalog.mockReset();
    mocks.fetchCatalog.mockImplementation(async () => mocks.catalog);
    mocks.from.mockReset();
    mocks.from.mockImplementation(() => createVariantGroupQuery());
  });

  it("loads referenced groups and fails closed when their metadata is unavailable", async () => {
    mocks.catalog = {
      itemRows: [{ id: "floor-item", company_id: "company-1" }],
      subitemRows: [{
        id: "variant-18",
        item_id: "floor-item",
        variant_group_id: "floor-group",
      }],
    };
    mocks.groupResult = {
      data: [{
        id: "floor-group",
        construction_item_id: "floor-item",
        archived_at: null,
      }],
      error: null,
    };

    await expect(fetchEstimateConstructionCatalogRows("company-1")).resolves.toEqual({
      ...mocks.catalog,
      variantGroupRows: mocks.groupResult.data,
    });
    expect(mocks.fetchCatalog).toHaveBeenCalledWith("company-1");
    expect(mocks.from).toHaveBeenCalledWith("construction_subitem_variant_groups");

    mocks.groupResult = { data: [], error: null };
    await expect(fetchEstimateConstructionCatalogRows("company-1"))
      .rejects.toThrow("Estimate variant group metadata could not be loaded.");
  });
});
