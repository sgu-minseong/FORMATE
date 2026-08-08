import { describe, expect, it } from "vitest";
import {
  getTemplateOverrideConflictFields,
  isEstimateDraftFieldEdited,
  reconcileEstimateDraftItems,
} from "../estimateDraftReconciliation";

describe("estimate draft reconciliation", () => {
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
      unitPrice: 1600000,
    });
    expect(result.conflicts).toEqual([]);
  });
});
