import { describe, expect, it } from "vitest";
import { buildCanonicalConstructionCatalog } from "../../constructionCatalog/constructionCatalogModel";
import { normalizeAdminItems } from "../../priceTable/priceTableModel";
import { calculateEstimateRow } from "../calculation";
import {
  applyEstimateRowPatch,
  buildEstimateItemsFromTemplate,
  getEstimateRowSpecChoices,
  getEstimateRowSpecPatchFromChoice,
} from "../estimateItemModel";

function selectVariant(row, optionId) {
  return calculateEstimateRow(
    applyEstimateRowPatch(row, getEstimateRowSpecPatchFromChoice(optionId))
  );
}

function getIdentityAndAmounts(row) {
  return {
    selectedEstimateOptionId: row.selectedEstimateOptionId,
    subitemId: row.subitemId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    laborCount: row.laborCount,
    laborRate: row.laborRate,
    productAmount: row.productAmount,
    laborAmount: row.laborAmount,
    totalAmount: row.totalAmount,
  };
}

describe("estimate generic canonical variant identity", () => {
  it("selects arbitrary text variants by construction_subitem ID and round-trips their own values", () => {
    const itemRows = [{ id: "finish-item", name: "마감재", item_type: "itemized", sort_order: 0 }];
    const subitemRows = [
      {
        id: "finish-blue",
        item_id: "finish-item",
        name: "사용자가 바꿀 수 있는 이름 B",
        unit: "㎡",
        unit_price: 42000,
        labor_rate_empty: 130000,
        sort_order: 2,
        variant_group_id: "finish-product",
        variant_value: null,
        variant_value_text: "Ocean Blue",
        variant_unit: null,
      },
      {
        id: "finish-red",
        item_id: "finish-item",
        name: "사용자가 바꿀 수 있는 이름 A",
        unit: "㎡",
        unit_price: 39000,
        labor_rate_empty: 110000,
        sort_order: 1,
        variant_group_id: "finish-product",
        variant_value: null,
        variant_value_text: "빨강",
        variant_unit: null,
      },
    ];
    const variantGroupRows = [{
      id: "finish-product",
      construction_item_id: "finish-item",
      display_name: "사용자 브랜드 마감재",
      variant_kind: "사용자 정의 색상",
      variant_value_type: "text",
      archived_at: null,
    }];
    const catalog = normalizeAdminItems(
      itemRows,
      subitemRows,
      [
        { id: "template-blue", subitem_id: "finish-blue", quantity: 12, labor_count: 2 },
        { id: "template-red", subitem_id: "finish-red", quantity: 10, labor_count: 1 },
      ],
      buildCanonicalConstructionCatalog({ itemRows, subitemRows, variantGroupRows })
    );
    const items = buildEstimateItemsFromTemplate(catalog, 24, "empty");
    const initial = items["finish-item"][0];

    expect(items["finish-item"]).toHaveLength(1);
    expect(getEstimateRowSpecChoices(initial)).toEqual([
      {
        key: "variant:finish-red",
        type: "variant",
        value: "variant:finish-red",
        label: "빨강",
      },
      {
        key: "variant:finish-blue",
        type: "variant",
        value: "variant:finish-blue",
        label: "Ocean Blue",
      },
    ]);
    expect(initial).toMatchObject({
      variantGroupId: "finish-product",
      selectedEstimateOptionId: "variant:finish-red",
      subitemId: "finish-red",
      selectedThickness: "",
      quantity: 10,
      unitPrice: 39000,
      laborCount: 1,
      laborRate: 110000,
    });

    const initialState = getIdentityAndAmounts(initial);
    const blue = selectVariant(initial, "variant:finish-blue");
    expect(blue).toMatchObject({
      selectedEstimateOptionId: "variant:finish-blue",
      subitemId: "finish-blue",
      quantity: 12,
      unitPrice: 42000,
      laborCount: 2,
      laborRate: 130000,
    });

    const restored = selectVariant(blue, "variant:finish-red");
    expect(getIdentityAndAmounts(restored)).toEqual(initialState);
  });
});
