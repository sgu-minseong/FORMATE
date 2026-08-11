import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  rpcCalls: [],
  rpcResults: [],
  fromCalls: [],
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    rpc: async (name, args) => {
      mockState.rpcCalls.push({ name, args });
      return mockState.rpcResults.length
        ? mockState.rpcResults.shift()
        : { data: { ok: true }, error: null };
    },
    from: (table) => {
      mockState.fromCalls.push(table);
      throw new Error(`Unexpected non-atomic table write: ${table}`);
    },
  },
}));

import { createCanonicalVariantProductAtomic } from "../../constructionCatalog/constructionCatalogApi";
import { bulkUpdateDetailCosts } from "../../detailCosts/detailCostsApi";
import { saveEstimateDraftWithTemplate } from "../../estimates/estimateApi";
import { saveSashCatalogEntryOrder } from "../../sash/sashCatalogApi";
import {
  createStandardCatalogEntriesAtomic,
  initializeDefaultConstructionCatalogAtomic,
  reorderAdminCatalogAtomic,
  saveAdminCatalogAtomic,
  saveAdminTemplateAtomic,
} from "../priceTableApi";

const migrationSource = readFileSync(
  new URL("../../../../supabase/canonical_variant_stability_guards.sql", import.meta.url),
  "utf8"
);

describe("atomic canonical persistence APIs", () => {
  beforeEach(() => {
    mockState.rpcCalls = [];
    mockState.rpcResults = [];
    mockState.fromCalls = [];
  });

  it("sends one PriceTable plus Template action to one transaction RPC", async () => {
    mockState.rpcResults.push({
      data: {
        ok: true,
        insertedSubitems: [{ clientId: "new-local", subitem: { id: "new-uuid" } }],
        templateValues: [{ subitemId: "new-uuid", valueId: "value-uuid" }],
      },
      error: null,
    });
    const request = {
      companyId: "company-a",
      itemUpdates: [{ id: "item-a", sort_order: 0 }],
      subitemUpdates: [{ id: "variant-a", item_id: "item-a", unit_price: 10 }],
      subitemInserts: [{ client_id: "new-local", item_id: "item-a", name: "새 제품" }],
      templateCondition: { pyeong: 24, build_type: "확장형", has_extension: false, condition_variant: "확장형1" },
      templateValues: [{ item_id: "item-a", subitem_ref: "new-local", quantity: 2 }],
    };

    await expect(saveAdminCatalogAtomic(request)).resolves.toMatchObject({ ok: true });
    expect(mockState.rpcCalls).toEqual([{
      name: "save_admin_catalog_atomic",
      args: {
        p_company_id: request.companyId,
        p_item_updates: request.itemUpdates,
        p_subitem_updates: request.subitemUpdates,
        p_subitem_inserts: request.subitemInserts,
        p_template_condition: request.templateCondition,
        p_template_values: request.templateValues,
      },
    }]);
    expect(mockState.fromCalls).toEqual([]);
  });

  it("fails once without falling back to partial table writes", async () => {
    mockState.rpcResults.push({
      data: null,
      error: { code: "23514", message: "forced transaction failure" },
    });

    await expect(saveAdminCatalogAtomic({
      companyId: "company-a",
      subitemUpdates: [{ id: "variant-a", item_id: "item-a", unit_price: 10 }],
    })).rejects.toMatchObject({ code: "23514" });
    expect(mockState.rpcCalls).toHaveLength(1);
    expect(mockState.fromCalls).toEqual([]);
  });

  it("uses dedicated atomic RPCs for Template, catalog reorder, and first variant conversion", async () => {
    mockState.rpcResults.push(
      { data: { ok: true, template: { id: "template-a" } }, error: null },
      { data: { ok: true, updatedCount: 2 }, error: null },
      { data: { ok: true, variantGroup: { id: "group-a" }, subitem: { id: "variant-a" } }, error: null },
      { data: { ok: true, updatedCount: 2 }, error: null }
    );

    await saveAdminTemplateAtomic({
      companyId: "company-a",
      condition: { pyeong: 24 },
      mode: "duplicate",
      sourceTemplateId: "source-template",
    });
    await reorderAdminCatalogAtomic({
      companyId: "company-a",
      entries: [{ entity_type: "subitem", id: "variant-a", item_id: "item-a", sort_order: 0 }],
    });
    await createCanonicalVariantProductAtomic({
      companyId: "company-a",
      constructionItemId: "item-a",
      sourceSubitemId: "variant-a",
      group: { display_name: "제품", variant_kind: "색상", variant_value_type: "text" },
      variant: { variant_value_type: "text", value: "Blue", unit: null },
    });
    await saveSashCatalogEntryOrder(
      [{ id: "sash-b" }, { id: "sash-a" }],
      "company-a"
    );

    expect(mockState.rpcCalls.map((call) => call.name)).toEqual([
      "save_admin_template_atomic",
      "reorder_admin_catalog_atomic",
      "create_canonical_variant_product_atomic",
      "reorder_sash_catalog_entries_atomic",
    ]);
    expect(mockState.fromCalls).toEqual([]);
  });

  it("keeps default/import catalog writes and estimate-plus-Template save inside one RPC each", async () => {
    mockState.rpcResults.push(
      { data: { ok: true, created: true }, error: null },
      { data: { ok: true, entries: [] }, error: null },
      {
        data: {
          ok: true,
          estimateId: "estimate-a",
          templateCreated: true,
          templateId: "template-a",
        },
        error: null,
      }
    );

    await initializeDefaultConstructionCatalogAtomic({
      companyId: "company-a",
      catalog: [{ name: "기본", subitems: [] }],
    });
    await createStandardCatalogEntriesAtomic({
      companyId: "company-a",
      entries: [{ client_id: "row-a", category_ref: "new-a", category: {}, subitem: {} }],
    });
    await expect(saveEstimateDraftWithTemplate({
      estimate: {
        company_id: "company-a",
        address: "",
        construction_date: null,
        condition_id: null,
        condition_snapshot: {},
        items_data: { finalTotal: 100 },
        total_amount: 100,
      },
      clientDraftKey: "draft-a",
      templateCondition: { pyeong: 24, build_type: "확장형", has_extension: false, condition_variant: "확장형1" },
      templateValues: [{ item_id: "item-a", subitem_ref: "variant-a", quantity: 1 }],
    })).resolves.toMatchObject({
      estimateId: "estimate-a",
      templateCreated: true,
      templateId: "template-a",
    });

    expect(mockState.rpcCalls.map((call) => call.name)).toEqual([
      "initialize_default_construction_catalog_atomic",
      "create_standard_catalog_entries_atomic",
      "save_estimate_draft_with_template",
    ]);
    expect(mockState.fromCalls).toEqual([]);
  });

  it("does not fall back after an estimate-plus-Template transaction failure", async () => {
    mockState.rpcResults.push({
      data: null,
      error: { code: "23514", message: "forced Template guard failure" },
    });

    await expect(saveEstimateDraftWithTemplate({
      estimate: {
        company_id: "company-a",
        address: "",
        construction_date: null,
        condition_id: null,
        condition_snapshot: {},
        items_data: { finalTotal: 100 },
        total_amount: 100,
      },
      clientDraftKey: "draft-failure",
      templateCondition: { pyeong: 24 },
      templateValues: [],
    })).rejects.toMatchObject({ code: "23514" });

    expect(mockState.rpcCalls).toHaveLength(1);
    expect(mockState.rpcCalls[0].name).toBe("save_estimate_draft_with_template");
    expect(mockState.fromCalls).toEqual([]);
  });

  it("keeps the remaining DetailCosts bulk writer in one transaction RPC", async () => {
    mockState.rpcResults.push({ data: { ok: true, updatedCount: 2 }, error: null });

    await bulkUpdateDetailCosts({
      companyId: "company-a",
      costs: [{ id: "detail-a" }, { id: "detail-b" }],
      cost: 12000,
    });

    expect(mockState.rpcCalls).toEqual([{
      name: "bulk_update_detail_costs_atomic",
      args: {
        p_company_id: "company-a",
        p_cost_ids: ["detail-a", "detail-b"],
        p_cost: 12000,
      },
    }]);
    expect(mockState.fromCalls).toEqual([]);
  });
});

describe("canonical DB guard migration", () => {
  it("locks UUID identity and rejects partial/mismatched writes before live application", () => {
    expect(migrationSource).toContain("admin_condition_template_values_template_subitem_uidx");
    expect(migrationSource).toContain("formate_validate_admin_template_value_scope");
    expect(migrationSource).toContain("create or replace function public.save_admin_catalog_atomic");
    expect(migrationSource).toContain("create or replace function public.save_estimate_draft_with_template");
    expect(migrationSource).toContain("create or replace function public.create_canonical_variant_product_atomic");
    expect(migrationSource).toContain("create or replace function public.reorder_photo_entities_atomic");
    expect(migrationSource).toContain("create or replace function public.reorder_sash_catalog_entries_atomic");
    expect(migrationSource).toContain("create or replace function public.compensate_photo_upload_batch_atomic");
    expect(migrationSource).toContain("create or replace function public.bulk_update_detail_costs_atomic");
    expect(migrationSource).toContain("prevent_construction_subitem_item_scope_move");
    expect(migrationSource).toContain("prevent_photo_collection_type_scope_move");
    expect(migrationSource).toContain("create trigger validate_estimate_snapshot_total");
    expect(migrationSource).toContain("raise exception 'Duplicate canonical Template values exist");
    expect(migrationSource.trimStart()).toMatch(/^--[\s\S]*?\bbegin;/i);
    expect(migrationSource.trimEnd()).toMatch(/commit;$/i);
    expect(migrationSource).not.toMatch(/KCC|장판|1\.8T|두께/);
  });
});
