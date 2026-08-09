import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  calls: [],
  rows: {},
}));

function createQuery(table) {
  const query = {
    select(value = "*") {
      mockState.calls.push({ table, method: "select", value });
      return query;
    },
    eq(column, value) {
      mockState.calls.push({ table, method: "eq", column, value });
      return query;
    },
    in(column, value) {
      mockState.calls.push({ table, method: "in", column, value });
      return query;
    },
    is(column, value) {
      mockState.calls.push({ table, method: "is", column, value });
      return query;
    },
    order(column, value) {
      mockState.calls.push({ table, method: "order", column, value });
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(mockState.rows[table] ?? { data: [], error: null })
        .then(resolve, reject);
    },
  };
  return query;
}

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => createQuery(table),
  },
}));

import { fetchCanonicalConstructionCatalogRows } from "../constructionCatalogApi";
import { CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES } from "../constructionCatalogModel";

describe("canonical construction catalog reader", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.rows = {
      construction_items: {
        data: [{ id: "item-1", company_id: "company-1", name: "사용자 대분류" }],
        error: null,
      },
      construction_subitems: {
        data: [{
          id: "variant-18",
          item_id: "item-1",
          name: "자유 이름",
          variant_group_id: "group-1",
          variant_value: 1.8,
          variant_unit: "T",
        }],
        error: null,
      },
      construction_subitem_variant_groups: {
        data: [{
          id: "group-1",
          construction_item_id: "item-1",
          display_name: "사용자 제품",
          variant_kind: "thickness",
          archived_at: null,
        }],
        error: null,
      },
    };
  });

  it("loads active and archived groups through company-scoped construction item IDs", async () => {
    mockState.rows.construction_subitem_variant_groups.data.push({
      id: "archived-group",
      construction_item_id: "item-1",
      display_name: "보관된 제품",
      variant_kind: "색상",
      variant_value_type: "text",
      archived_at: "2026-08-09T00:00:00.000Z",
    });
    const result = await fetchCanonicalConstructionCatalogRows("company-1");

    expect(result.variantGroupRows.map((group) => group.id)).toEqual([
      "group-1",
      "archived-group",
    ]);
    expect(result.canonicalCatalog.items[0]).toMatchObject({
      constructionItemId: "item-1",
      products: [{
        productId: "group-1",
        variantGroupId: "group-1",
        selectableSubitemIds: ["variant-18"],
      }],
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_items",
      method: "eq",
      column: "company_id",
      value: "company-1",
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitems",
      method: "in",
      column: "item_id",
      value: ["item-1"],
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitem_variant_groups",
      method: "in",
      column: "construction_item_id",
      value: ["item-1"],
    });
    expect(result.canonicalCatalog.items[0].archivedVariantGroups).toEqual([
      expect.objectContaining({ id: "archived-group" }),
    ]);
    expect(mockState.calls).not.toContainEqual(expect.objectContaining({
      table: "construction_subitem_variant_groups",
      method: "is",
      column: "archived_at",
    }));
  });

  it("fails closed when a referenced group is missing", async () => {
    mockState.rows.construction_subitem_variant_groups = { data: [], error: null };

    await expect(fetchCanonicalConstructionCatalogRows("company-1"))
      .rejects.toMatchObject({
        code: CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.MISSING_VARIANT_GROUP,
      });
  });
});
