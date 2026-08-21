import { describe, expect, it } from "vitest";
import {
  getTemplateOverrideConflictFields,
  getEstimateDraftRowKeys,
  isEstimateDraftFieldEdited,
  reconcileEstimateDraftItems,
} from "../estimateDraftReconciliation";
import { ESTIMATE_HISTORY_COMPATIBILITY_KIND } from "../estimateHistoryCompatibility";
import { applyEstimateRowPatch } from "../estimateItemModel";

describe("estimate draft reconciliation", () => {
  it("uses one sash row identity per construction subitem regardless of product category", () => {
    expect(getEstimateDraftRowKeys({
      itemKind: "sash",
      subitemId: "living-window",
      sashCategory: "standard",
    })).toEqual(["sash:living-window"]);
    expect(getEstimateDraftRowKeys({
      itemKind: "sash",
      subitemId: "living-window",
      sashCategory: "balcony",
    })).toEqual(["sash:living-window"]);
  });

  it("updates untouched template fields without treating formatting as an override", () => {
    const previousRow = {
      quantity: "24.0",
      baseQuantity: 24,
      laborCount: "2",
      baseLaborCount: 2,
    };
    const nextTemplateRow = {
      baseQuantity: 30,
      baseLaborCount: 3,
    };

    expect(isEstimateDraftFieldEdited(previousRow, "quantity", "baseQuantity")).toBe(false);
    expect(getTemplateOverrideConflictFields(previousRow, nextTemplateRow)).toEqual([]);
  });

  it("keeps a manual template-derived value for review while excluding price fields", () => {
    const previousRow = {
      quantity: 27,
      baseQuantity: 24,
      laborCount: 2,
      baseLaborCount: 2,
      unitPrice: 25000,
      baseUnitPrice: 20000,
    };
    const nextTemplateRow = {
      baseQuantity: 30,
      baseLaborCount: 3,
      baseUnitPrice: 20000,
    };

    expect(getTemplateOverrideConflictFields(previousRow, nextTemplateRow)).toEqual(["quantity"]);
  });

  it("preserves selection and manual values while refreshing untouched template values", () => {
    const result = reconcileEstimateDraftItems({
      previousItems: {
        wall: [{
          itemId: "wall",
          subitemId: "paper",
          material: "도배",
          selected: true,
          quantity: 27,
          baseQuantity: 24,
          laborCount: 2,
          baseLaborCount: 2,
          unitPrice: 26000,
          baseUnitPrice: 25000,
        }],
      },
      nextItems: {
        wall: [{
          itemId: "wall",
          subitemId: "paper",
          material: "도배",
          selected: false,
          quantity: 30,
          baseQuantity: 30,
          laborCount: 3,
          baseLaborCount: 3,
          unitPrice: 25000,
          baseUnitPrice: 25000,
        }],
      },
    });

    expect(result.items.wall[0]).toMatchObject({
      selected: true,
      quantity: 27,
      laborCount: 3,
      unitPrice: 26000,
    });
    expect(result.conflicts).toEqual([
      expect.objectContaining({ categoryId: "wall", fields: ["quantity"] }),
    ]);
  });

  it("matches a canonical product by variant_group_id across variant and display-name changes", () => {
    const result = reconcileEstimateDraftItems({
      previousItems: {
        floor: [{
          itemId: "floor",
          variantGroupId: "stable-product-id",
          subitemId: "variant-b-id",
          material: "이전 표시명",
          selected: true,
          contractor: "담당자",
        }],
      },
      nextItems: {
        floor: [{
          itemId: "floor",
          variantGroupId: "stable-product-id",
          subitemId: "variant-a-id",
          material: "변경된 표시명",
          selected: false,
          contractor: "",
        }],
      },
    });

    expect(result.items.floor[0]).toMatchObject({
      variantGroupId: "stable-product-id",
      subitemId: "variant-a-id",
      material: "변경된 표시명",
      selected: true,
      contractor: "담당자",
    });
  });

  it("rehydrates a saved snapshot only from its exact construction_subitem UUID", () => {
    const result = reconcileEstimateDraftItems({
      previousItems: {
        floor: [{
          estimateHistoryCompatibility: ESTIMATE_HISTORY_COMPATIBILITY_KIND,
          itemId: "floor",
          subitemId: "variant-b-id",
          material: "이전 표시명",
          selectedThickness: "2.2",
          selected: true,
        }],
      },
      nextItems: {
        floor: [{
          itemId: "floor",
          variantGroupId: "stable-product-id",
          subitemId: "variant-a-id",
          material: "변경된 표시명",
          selectedEstimateOptionId: "variant:variant-a-id",
          selected: false,
          estimateOptions: [
            { id: "variant:variant-a-id", subitemId: "variant-a-id", quantity: 10 },
            { id: "variant:variant-b-id", subitemId: "variant-b-id", quantity: 20 },
          ],
        }],
      },
      applyRowPatch: applyEstimateRowPatch,
    });

    expect(result.items.floor[0]).toMatchObject({
      selectedEstimateOptionId: "variant:variant-b-id",
      subitemId: "variant-b-id",
      quantity: 20,
      selected: true,
    });
  });

  it("does not infer a canonical variant from a legacy thickness or display name", () => {
    const result = reconcileEstimateDraftItems({
      previousItems: {
        floor: [{
          estimateHistoryCompatibility: ESTIMATE_HISTORY_COMPATIBILITY_KIND,
          itemId: "floor",
          subitemId: "missing-legacy-id",
          material: "같은 표시명",
          selectedThickness: "2.2",
          quantity: 99,
          selected: true,
        }],
      },
      nextItems: {
        floor: [{
          itemId: "floor",
          variantGroupId: "stable-product-id",
          subitemId: "variant-a-id",
          material: "같은 표시명",
          selectedEstimateOptionId: "variant:variant-a-id",
          quantity: 10,
          selected: false,
          estimateOptions: [
            { id: "variant:variant-a-id", subitemId: "variant-a-id", selectedThickness: "1.8" },
            { id: "variant:variant-b-id", subitemId: "variant-b-id", selectedThickness: "2.2" },
          ],
        }],
      },
      applyRowPatch: applyEstimateRowPatch,
    });

    expect(result.items.floor[0]).toMatchObject({
      selectedEstimateOptionId: "variant:variant-a-id",
      subitemId: "variant-a-id",
      quantity: 10,
      selected: false,
    });
  });

  it("keeps a selected sash snapshot out of pyeong template reconciliation", () => {
    const result = reconcileEstimateDraftItems({
      previousItems: {
        sash: [{
          itemId: "sash",
          subitemId: "living-window",
          material: "거실 샷시",
          itemKind: "sash",
          selected: true,
          sashCatalogEntryId: "entry-1",
          selectedSashCatalogEntryId: "entry-1",
          sashSpec: { brand: "LG", width_mm: 4000, height_mm: 2400, unit_price: 1500000 },
          sashLocationKind: "balcony",
          sashSpecialItemSelections: [{
            sashSpecialItemId: "special-a",
            sashSpecialItemSnapshot: {
              sash_special_item_id: "special-a",
              description: "현장 보강",
              amount: 150000,
            },
          }],
          quantity: 1,
          baseQuantity: 1,
          laborCount: 0,
          baseLaborCount: 0,
          unitPrice: 1600000,
          baseUnitPrice: 1500000,
          laborRate: 0,
          baseLaborRate: 0,
          unit: "식",
        }],
      },
      nextItems: {
        sash: [{
          itemId: "sash",
          subitemId: "living-window",
          material: "거실 샷시",
          itemKind: "sash",
          selected: false,
          sashCatalogEntryId: "",
          sashSpec: null,
          quantity: 1,
          baseQuantity: 1,
          laborCount: 0,
          baseLaborCount: 0,
          unitPrice: 0,
          baseUnitPrice: 0,
          laborRate: 0,
          baseLaborRate: 0,
          unit: "식",
        }],
      },
    });

    expect(result.items.sash[0]).toMatchObject({
      selected: true,
      sashCatalogEntryId: "entry-1",
      sashSpec: { brand: "LG", unit_price: 1500000 },
      sashLocationKind: "balcony",
      sashSpecialItemSelections: [{ sashSpecialItemId: "special-a" }],
      unitPrice: 1600000,
    });
    expect(result.conflicts).toEqual([]);
  });
});
