import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  calls: [],
  rows: {},
  singleResults: {},
}));

function createQuery(table) {
  const query = {
    insert(value) {
      mockState.calls.push({ table, method: "insert", value });
      return query;
    },
    update(value) {
      mockState.calls.push({ table, method: "update", value });
      return query;
    },
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
    single() {
      mockState.calls.push({ table, method: "single" });
      const results = mockState.singleResults[table] ?? [];
      return Promise.resolve(
        results.length
          ? results.shift()
          : mockState.rows[table] ?? { data: null, error: null }
      );
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

import {
  archiveCanonicalConstructionSubitem,
  archiveCanonicalVariantGroup,
  fetchCanonicalConstructionCatalogRows,
  insertCanonicalVariantGroup,
  insertCanonicalVariantSubitem,
  updateCanonicalConstructionSubitem,
  updateCanonicalVariantGroup,
} from "../constructionCatalogApi";
import { CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES } from "../constructionCatalogModel";

describe("canonical construction catalog reader", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.singleResults = {};
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

describe("canonical construction catalog writer", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.rows = {};
    mockState.singleResults = {
      construction_subitem_variant_groups: [],
      construction_subitems: [],
    };
  });

  it("inserts and updates variant groups through stable IDs and item scope", async () => {
    const insertPayload = {
      construction_item_id: "item-1",
      display_name: "사용자 제품",
      variant_kind: "색상",
      variant_value_type: "text",
      sort_order: 1,
      archived_at: null,
    };
    mockState.singleResults.construction_subitem_variant_groups.push(
      { data: { id: "group-1", ...insertPayload }, error: null },
      { data: { id: "group-1", ...insertPayload, display_name: "변경 제품" }, error: null }
    );

    await insertCanonicalVariantGroup(insertPayload);
    await updateCanonicalVariantGroup("group-1", "item-1", {
      display_name: "변경 제품",
    });

    expect(mockState.calls).toContainEqual({
      table: "construction_subitem_variant_groups",
      method: "insert",
      value: insertPayload,
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitem_variant_groups",
      method: "update",
      value: { display_name: "변경 제품" },
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitem_variant_groups",
      method: "eq",
      column: "id",
      value: "group-1",
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitem_variant_groups",
      method: "eq",
      column: "construction_item_id",
      value: "item-1",
    });
  });

  it("writes one exact construction_subitem UUID and never uses names as a filter", async () => {
    const metadata = {
      variant_group_id: "group-1",
      variant_value: null,
      variant_value_text: "Ocean Blue",
      variant_unit: null,
      archived_at: null,
    };
    mockState.singleResults.construction_subitems.push(
      { data: { id: "variant-blue", item_id: "item-1", ...metadata }, error: null },
      { data: { id: "variant-blue", item_id: "item-1", ...metadata }, error: null }
    );

    await insertCanonicalVariantSubitem({
      item_id: "item-1",
      name: "표시 이름",
      ...metadata,
    });
    await updateCanonicalConstructionSubitem(
      "variant-blue",
      "item-1",
      metadata
    );

    expect(mockState.calls).toContainEqual({
      table: "construction_subitems",
      method: "eq",
      column: "id",
      value: "variant-blue",
    });
    expect(mockState.calls).toContainEqual({
      table: "construction_subitems",
      method: "eq",
      column: "item_id",
      value: "item-1",
    });
    expect(mockState.calls).not.toContainEqual(expect.objectContaining({
      table: "construction_subitems",
      method: "eq",
      column: "name",
    }));
  });

  it("archives groups and subitems non-destructively", async () => {
    const archivedAt = "2026-08-10T00:00:00.000Z";
    mockState.singleResults.construction_subitem_variant_groups.push(
      { data: { id: "group-1", archived_at: archivedAt }, error: null }
    );
    mockState.singleResults.construction_subitems.push(
      { data: { id: "variant-blue", archived_at: archivedAt }, error: null }
    );

    await archiveCanonicalVariantGroup("group-1", "item-1", archivedAt);
    await archiveCanonicalConstructionSubitem(
      "variant-blue",
      "item-1",
      archivedAt
    );

    expect(mockState.calls.filter((call) => call.method === "update"))
      .toEqual([
        {
          table: "construction_subitem_variant_groups",
          method: "update",
          value: { archived_at: archivedAt },
        },
        {
          table: "construction_subitems",
          method: "update",
          value: { archived_at: archivedAt },
        },
      ]);
    expect(mockState.calls.some((call) => call.method === "delete")).toBe(false);
  });
});
