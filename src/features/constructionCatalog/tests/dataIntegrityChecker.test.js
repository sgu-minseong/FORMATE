import { describe, expect, it } from "vitest";
import { checkFormateDataIntegrity } from "../../../../scripts/data-integrity/checker.mjs";

function createDataset() {
  return {
    constructionItems: [
      { id: "item-a", company_id: "company-a" },
      { id: "item-b", company_id: "company-b" },
    ],
    variantGroups: [{
      id: "group-a",
      construction_item_id: "item-a",
      display_name: "사용자 제품",
      variant_kind: "색상",
      variant_value_type: "text",
      base_subitem_id: "base-a",
      archived_at: null,
    }],
    constructionSubitems: [
      {
        id: "base-a", item_id: "item-a", variant_group_id: null,
        variant_value: null, variant_value_text: null, variant_unit: null,
      },
      {
        id: "variant-a", item_id: "item-a", variant_group_id: "group-a",
        variant_value: null, variant_value_text: "Blue", variant_unit: null, archived_at: null,
      },
      {
        id: "other-company-subitem", item_id: "item-b", variant_group_id: null,
        variant_value: null, variant_value_text: null, variant_unit: null,
      },
    ],
    templates: [{ id: "template-a", company_id: "company-a" }],
    templateValues: [{
      id: "value-a", template_id: "template-a", item_id: "item-a",
      subitem_id: "variant-a", option_value: "", quantity: 1,
      labor_count: null, construction_days: 0,
    }],
    photoLibraryFolders: [],
    photoCollections: [],
    sashCatalogEntries: [],
    detailCosts: [],
    photos: [{
      id: "photo-a", company_id: "company-a", photo_type: "subitem", target_type: "subitem",
      target_id: "variant-a", construction_subitem_id: "variant-a", pyeong: 24,
      photo_library_folder_id: null, sash_catalog_entry_id: null,
      storage_bucket: "formate-photos",
      storage_path: "company-a/subitem/variant-a/photo-a.jpg",
      archived_at: null,
    }],
    estimates: [{
      id: "estimate-a",
      company_id: "company-a",
      condition_snapshot: { company_id: "company-a" },
      items_data: {
        items: [{ subitemId: "variant-a", totalAmount: 100 }],
        adjustments: [],
        selectedItemsTotal: 100,
        adjustmentTotal: 0,
        finalTotal: 100,
      },
      total_amount: 100,
    }],
    priceConditions: [],
    storageObjects: ["company-a/subitem/variant-a/photo-a.jpg"],
  };
}

describe("FORMATE DB integrity checker", () => {
  it("accepts a complete canonical number/text/non-variant graph", () => {
    expect(checkFormateDataIntegrity(createDataset())).toMatchObject({
      ok: true,
      issues: [],
    });
  });

  it("reports incomplete and duplicate active variant identities", () => {
    const dataset = createDataset();
    dataset.variantGroups[0].variant_value_type = null;
    dataset.constructionSubitems.push(
      {
        id: "incomplete", item_id: "item-a", variant_group_id: "group-a",
        variant_value: null, variant_value_text: null, variant_unit: null,
      },
      {
        id: "duplicate", item_id: "item-a", variant_group_id: "group-a",
        variant_value: null, variant_value_text: " blue ", variant_unit: null, archived_at: null,
      }
    );

    const codes = checkFormateDataIntegrity(dataset).issues.map((issue) => issue.code);
    expect(codes).toContain("incomplete-variant-group-metadata");
    expect(codes).toContain("incomplete-variant-metadata");
    expect(codes).toContain("duplicate-active-variant-identity");
  });

  it("reports invalid base, cross-company Template, and Photo scope", () => {
    const dataset = createDataset();
    dataset.variantGroups[0].base_subitem_id = "variant-a";
    dataset.templateValues[0] = {
      ...dataset.templateValues[0],
      item_id: "item-b",
      subitem_id: "other-company-subitem",
      option_value: "legacy-identity",
    };
    dataset.photos[0] = {
      ...dataset.photos[0],
      target_id: "other-company-subitem",
      construction_subitem_id: "other-company-subitem",
    };

    const codes = checkFormateDataIntegrity(dataset).issues.map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      "invalid-variant-group-base-relation",
      "template-subitem-mismatch",
      "legacy-template-option-identity",
      "photo-subitem-scope-mismatch",
    ]));
  });

  it("reports sash catalog entries that escape their stable company/subitem kind scope", () => {
    const dataset = createDataset();
    dataset.sashCatalogEntries.push({
      id: "sash-a",
      company_id: "company-a",
      construction_subitem_id: "variant-a",
    });

    const codes = checkFormateDataIntegrity(dataset).issues.map((issue) => issue.code);
    expect(codes).toContain("sash-catalog-subitem-scope-mismatch");
  });

  it("reports cross-company detail-cost subitem references", () => {
    const dataset = createDataset();
    dataset.detailCosts.push({
      id: "detail-a",
      company_id: "company-a",
      subitem_id: "other-company-subitem",
    });

    const codes = checkFormateDataIntegrity(dataset).issues.map((issue) => issue.code);
    expect(codes).toContain("detail-cost-subitem-scope-mismatch");
  });

  it("detects missing/orphan Storage objects and inconsistent Estimate totals", () => {
    const dataset = createDataset();
    dataset.storageObjects = ["company-a/subitem/variant-a/unreferenced.jpg"];
    dataset.estimates[0].total_amount = 120;

    const result = checkFormateDataIntegrity(dataset);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "photo-storage-object-missing",
      "possible-photo-storage-orphan",
      "estimate-snapshot-total-mismatch",
      "estimate-calculated-total-mismatch",
    ]));
  });

  it("checks an empty Storage snapshot plus Photo collection and Estimate condition company scope", () => {
    const dataset = createDataset();
    dataset.storageObjects = [];
    dataset.photoCollections = [{ id: "collection-b", company_id: "company-b", photo_type: "subitem" }];
    dataset.photos[0].collection_id = "collection-b";
    dataset.priceConditions = [{ id: "condition-b", company_id: "company-b" }];
    dataset.estimates[0].condition_id = "condition-b";

    expect(checkFormateDataIntegrity(dataset).issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "photo-storage-object-missing",
      "photo-collection-scope-mismatch",
      "estimate-condition-company-mismatch",
    ]));
  });

  it("preserves legacy saved-history arrays while still checking their reproducible total", () => {
    const dataset = createDataset();
    dataset.estimates[0] = {
      id: "legacy-estimate",
      company_id: "company-a",
      condition_snapshot: {},
      items_data: [{ material: "과거 표시명", price: 70 }],
      total_amount: 70,
    };

    expect(checkFormateDataIntegrity(dataset).issues).toEqual([]);
  });
});
