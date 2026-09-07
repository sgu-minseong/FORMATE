import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  calls: [],
  singleResults: [],
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
    single() {
      return Promise.resolve(mockState.singleResults.shift());
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
  archiveSashCatalogEntry,
  insertSashCatalogEntry,
  updateSashCatalogEntry,
} from "../sashCatalogApi";
import {
  archiveSashOptionValue,
  createSashOptionValue,
  renameSashOptionValue,
} from "../sashOptionApi";
import {
  createLocalSashCatalogEntry,
  SASH_CATEGORIES,
  SASH_MEASUREMENT_KINDS,
  SASH_PRICING_BASES,
  SASH_WINDOW_TYPES,
} from "../sashCatalogModel";

describe("sash catalog sparse persistence", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.singleResults = [];
  });

  it("inserts a sparse row and returns its canonical DB UUID", async () => {
    const localEntry = createLocalSashCatalogEntry({
      constructionSubitemId: "11111111-1111-1111-1111-111111111111",
      pricingBasis: SASH_PRICING_BASES.AREA,
      windowType: SASH_WINDOW_TYPES.UNSPECIFIED,
      measurementKind: SASH_MEASUREMENT_KINDS.ESTIMATE,
      sashCategory: SASH_CATEGORIES.STANDARD,
    });
    const persistedEntry = {
      ...localEntry,
      id: "22222222-2222-2222-2222-222222222222",
      brand: null,
      product_type: null,
      width_mm: null,
      height_mm: null,
      unit_price: null,
      cost_price: null,
    };
    mockState.singleResults.push({ data: persistedEntry, error: null });

    const result = await insertSashCatalogEntry(localEntry, {
      companyId: "33333333-3333-3333-3333-333333333333",
      constructionSubitemId: localEntry.construction_subitem_id,
    });

    expect(result.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(mockState.calls.find((call) => call.method === "insert")?.value).toMatchObject({
      brand: null,
      product_type: null,
      width_mm: null,
      height_mm: null,
      unit_price: null,
      cost_price: null,
    });
  });

  it("updates only the changed field under company and stable row scope", async () => {
    const entry = {
      ...createLocalSashCatalogEntry({
        constructionSubitemId: "11111111-1111-1111-1111-111111111111",
      }),
      id: "22222222-2222-2222-2222-222222222222",
    };
    mockState.singleResults.push({
      data: { ...entry, width_mm: 4500 },
      error: null,
    });

    await updateSashCatalogEntry(entry, { width_mm: "4500" }, {
      companyId: "33333333-3333-3333-3333-333333333333",
    });

    expect(mockState.calls.find((call) => call.method === "update")?.value)
      .toEqual({ width_mm: 4500 });
    expect(mockState.calls).toContainEqual({
      table: "sash_catalog_entries",
      method: "eq",
      column: "id",
      value: entry.id,
    });
    expect(mockState.calls).toContainEqual({
      table: "sash_catalog_entries",
      method: "eq",
      column: "company_id",
      value: "33333333-3333-3333-3333-333333333333",
    });
  });

  it("persists an explicitly cleared field as null and rejects invalid numbers before IO", async () => {
    const entry = {
      ...createLocalSashCatalogEntry({
        constructionSubitemId: "11111111-1111-1111-1111-111111111111",
      }),
      id: "22222222-2222-2222-2222-222222222222",
      brand: "KCC",
    };
    mockState.singleResults.push({
      data: { ...entry, brand: null },
      error: null,
    });

    await updateSashCatalogEntry(entry, { brand: "" }, {
      companyId: "33333333-3333-3333-3333-333333333333",
    });
    expect(mockState.calls.find((call) => call.method === "update")?.value)
      .toEqual({ brand: null });

    mockState.calls = [];
    await expect(updateSashCatalogEntry(entry, { width_mm: "-100" }, {
      companyId: "33333333-3333-3333-3333-333333333333",
    })).rejects.toThrow("가로");
    expect(mockState.calls).toEqual([]);
  });

  it("creates, renames, and archives company options without rewriting semantics", async () => {
    const companyId = "33333333-3333-3333-3333-333333333333";
    const optionId = "44444444-4444-4444-4444-444444444444";
    mockState.singleResults.push(
      { data: { id: optionId, label: "테스트", semantic_value: "double" }, error: null },
      { data: { id: optionId, label: "테스트 수정", semantic_value: "double" }, error: null },
      { data: { id: optionId, label: "테스트 수정", semantic_value: "double", archived_at: "2026-09-07T00:00:00Z" }, error: null },
    );

    await createSashOptionValue({
      companyId,
      optionKind: "window_type",
      label: "테스트",
      semanticValue: "double",
    });
    await renameSashOptionValue(optionId, companyId, "테스트 수정");
    await archiveSashOptionValue(optionId, companyId);

    const updates = mockState.calls.filter((call) => call.table === "sash_option_values" && call.method === "update");
    expect(updates[0].value).toEqual({ label: "테스트 수정" });
    expect(updates[0].value).not.toHaveProperty("semantic_value");
    expect(updates[1].value.archived_at).toBeTruthy();
    expect(mockState.calls.filter((call) => call.table === "sash_option_values" && call.method === "eq"))
      .toEqual(expect.arrayContaining([
        { table: "sash_option_values", method: "eq", column: "company_id", value: companyId },
        { table: "sash_option_values", method: "eq", column: "id", value: optionId },
      ]));
  });

  it("archives a persisted catalog UUID inside its company scope", async () => {
    const companyId = "33333333-3333-3333-3333-333333333333";
    const entryId = "55555555-5555-5555-5555-555555555555";
    mockState.singleResults.push({ data: { id: entryId, archived_at: "2026-09-07T00:00:00Z" }, error: null });

    await archiveSashCatalogEntry(entryId, companyId);

    expect(mockState.calls.find((call) => call.table === "sash_catalog_entries" && call.method === "update")?.value.archived_at)
      .toBeTruthy();
    expect(mockState.calls).toContainEqual({
      table: "sash_catalog_entries",
      method: "eq",
      column: "company_id",
      value: companyId,
    });
  });
});
