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
});
