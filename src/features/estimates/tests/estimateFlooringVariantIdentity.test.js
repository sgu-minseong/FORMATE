import { describe, expect, it } from "vitest";
import { normalizeAdminItems } from "../../priceTable/priceTableModel";
import { calculateEstimateRow } from "../calculation";
import { reconcileEstimateDraftItems } from "../estimateDraftReconciliation";
import {
  applyEstimateRowPatch,
  buildEstimateItemsFromTemplate,
  getEstimateRowSpecChoices,
  getEstimateRowSpecChoiceValue,
  getEstimateRowSpecPatchFromChoice,
} from "../estimateItemModel";

const itemRows = [
  { id: "floor-item", name: "바닥", item_type: "itemized", sort_order: 0 },
  { id: "wall-item", name: "도배", item_type: "itemized", sort_order: 1 },
];

const subitemRows = [
  {
    id: "variant-27",
    item_id: "floor-item",
    name: "비닐장판 2.7T",
    unit: "평",
    unit_price: 73000,
    labor_rate_empty: 180000,
    sort_order: 3,
    variant_group_id: "floor-group",
    variant_value: 2.7,
    variant_unit: "T",
  },
  {
    id: "wall-standard",
    item_id: "wall-item",
    name: "합지",
    unit: "평",
    unit_price: 25000,
    labor_rate_empty: 120000,
    spec_options: ["일반"],
    sort_order: 0,
  },
  {
    id: "floor-base",
    item_id: "floor-item",
    name: "비닐장판 (5.0, 2.8, 2.2, 2.7, 3.5)",
    unit: "평",
    unit_price: 52000,
    labor_rate_empty: 150000,
    spec_options: ["5.0T", "2.8T", "2.2T", "2.7T", "3.5T"],
    sort_order: 1,
  },
  {
    id: "variant-18",
    item_id: "floor-item",
    name: "비닐장판 1.8T",
    unit: "평",
    unit_price: 61000,
    labor_rate_empty: 160000,
    sort_order: 2,
    variant_group_id: "floor-group",
    variant_value: 1.8,
    variant_unit: "T",
  },
  {
    id: "variant-22",
    item_id: "floor-item",
    name: "비닐장판 2.2T",
    unit: "평",
    unit_price: 67000,
    labor_rate_empty: 170000,
    sort_order: 5,
    variant_group_id: "floor-group",
    variant_value: 2.2,
    variant_unit: "T",
  },
  {
    id: "floor-standard",
    item_id: "floor-item",
    name: "걸레받이",
    unit: "m",
    unit_price: 8000,
    labor_rate_empty: 90000,
    sort_order: 4,
  },
];

const templateValueRows = [
  { id: "template-base", subitem_id: "floor-base", quantity: 20, labor_count: 0, construction_days: 2 },
  { id: "template-18", subitem_id: "variant-18", quantity: 18, labor_count: 1, construction_days: 1 },
  { id: "template-22", subitem_id: "variant-22", quantity: 22, labor_count: 2, construction_days: 2 },
  { id: "template-27", subitem_id: "variant-27", quantity: 23, labor_count: 3, construction_days: 3 },
  { id: "template-floor-standard", subitem_id: "floor-standard", quantity: 30, labor_count: 1, construction_days: 1 },
  { id: "template-wall", subitem_id: "wall-standard", quantity: 24, labor_count: 1, construction_days: 2 },
];

const variantGroupRows = [{
  id: "floor-group",
  construction_item_id: "floor-item",
  display_name: "비닐장판",
  base_subitem_id: "floor-base",
  variant_kind: "thickness",
  sort_order: 1,
  archived_at: null,
}];

function changeOption(row, optionId) {
  return calculateEstimateRow(
    applyEstimateRowPatch(row, getEstimateRowSpecPatchFromChoice(optionId))
  );
}

function getFinancialIdentity(row) {
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

describe("estimate flooring variant identity", () => {
  const catalog = normalizeAdminItems(
    itemRows,
    subitemRows,
    templateValueRows
  );
  const estimateItems = buildEstimateItemsFromTemplate(catalog, 24, "empty", variantGroupRows);
  const getStableFlooringRow = () => estimateItems["floor-item"]
    .find((row) => row.variantGroupId === "floor-group");

  it("projects one stable-group row with only sorted canonical variant options", () => {
    expect(estimateItems["floor-item"]).toHaveLength(2);
    expect(estimateItems["floor-item"].filter((row) => row.variantGroupId === "floor-group"))
      .toHaveLength(1);
    const row = getStableFlooringRow();
    expect(row).toMatchObject({
      variantGroupId: "floor-group",
      material: "비닐장판",
      subitemId: "variant-18",
    });

    const choices = getEstimateRowSpecChoices(row);
    expect(choices.map((choice) => choice.label)).toEqual(["1.8T", "2.2T", "2.7T"]);
    expect(choices.map((choice) => choice.key)).toEqual([
      "variant:variant-18",
      "variant:variant-22",
      "variant:variant-27",
    ]);
    expect(choices.every((choice) => choice.type === "variant")).toBe(true);
    expect(new Set(choices.map((choice) => choice.label)).size).toBe(choices.length);
    expect(getEstimateRowSpecChoiceValue(row)).toBe("variant:variant-18");
    expect(row).toMatchObject({
      quantity: 18,
      unitPrice: 61000,
      laborCount: 1,
      laborRate: 160000,
      productAmount: 1098000,
      laborAmount: 160000,
      totalAmount: 1258000,
    });
  });

  it("restores the exact canonical entity and amounts after a 1.8 -> 2.2 -> 1.8 round-trip", () => {
    const initialRow = getStableFlooringRow();
    const initialChoiceId = getEstimateRowSpecChoiceValue(initialRow);
    const initialIdentity = getFinancialIdentity(initialRow);

    const variant22Row = changeOption(initialRow, "variant:variant-22");
    expect(variant22Row).toMatchObject({
      selectedEstimateOptionId: "variant:variant-22",
      subitemId: "variant-22",
      quantity: 22,
      unitPrice: 67000,
      laborCount: 2,
      laborRate: 170000,
      productAmount: 1474000,
      laborAmount: 340000,
      totalAmount: 1814000,
    });
    expect(variant22Row).not.toMatchObject({ subitemId: "floor-base", unitPrice: 52000 });
    expect(getEstimateRowSpecChoices(variant22Row).map((choice) => choice.key))
      .toContain(initialChoiceId);
    expect(getEstimateRowSpecChoiceValue(variant22Row)).toBe("variant:variant-22");

    const restoredRow = changeOption(variant22Row, initialChoiceId);
    expect(getEstimateRowSpecChoiceValue(restoredRow)).toBe(initialChoiceId);
    expect(getFinancialIdentity(restoredRow)).toEqual(initialIdentity);
  });

  it("uses the selected canonical variant's own price, quantity, and labor fields", () => {
    const row = changeOption(getStableFlooringRow(), "variant:variant-27");
    expect(row).toMatchObject({
      selectedEstimateOptionId: "variant:variant-27",
      subitemId: "variant-27",
      selectedThickness: "2.7",
      selectedSpecOption: "",
      quantity: 23,
      unitPrice: 73000,
      laborCount: 3,
      laborRate: 180000,
      productAmount: 1679000,
      laborAmount: 540000,
      totalAmount: 2219000,
    });
  });

  it("defaults to the smallest canonical variant even when only a later variant has template values", () => {
    const catalogWithoutSmallestTemplate = normalizeAdminItems(
      itemRows,
      subitemRows,
      templateValueRows.filter((row) => row.subitem_id !== "variant-18")
    );
    const row = buildEstimateItemsFromTemplate(
      catalogWithoutSmallestTemplate,
      24,
      "empty",
      variantGroupRows
    )["floor-item"].find((entry) => entry.variantGroupId === "floor-group");

    expect(row).toMatchObject({
      selectedEstimateOptionId: "variant:variant-18",
      subitemId: "variant-18",
      quantity: "",
      unitPrice: 61000,
      laborCount: "",
      laborRate: 160000,
    });
  });

  it("restores the explicit option identity when template data is reloaded", () => {
    const selectedVariant = changeOption(getStableFlooringRow(), "variant:variant-27");
    const refreshedItems = buildEstimateItemsFromTemplate(catalog, 24, "empty", variantGroupRows);
    const result = reconcileEstimateDraftItems({
      previousItems: { "floor-item": [selectedVariant] },
      nextItems: {
        "floor-item": refreshedItems["floor-item"]
          .filter((row) => row.variantGroupId === "floor-group"),
      },
      applyRowPatch: applyEstimateRowPatch,
      recalculateRow: calculateEstimateRow,
    });

    expect(result.items["floor-item"][0]).toMatchObject({
      selectedEstimateOptionId: "variant:variant-27",
      subitemId: "variant-27",
      quantity: 23,
      unitPrice: 73000,
      laborCount: 3,
      laborRate: 180000,
      totalAmount: 2219000,
    });
  });

  it("keeps an ungrouped flooring subitem beside the stable group without changing its data", () => {
    const row = estimateItems["floor-item"].find((entry) => entry.subitemId === "floor-standard");
    expect(row).not.toHaveProperty("variantGroupId");
    expect(row).toMatchObject({
      subitemId: "floor-standard",
      quantity: 30,
      unitPrice: 8000,
      laborCount: 1,
      laborRate: 90000,
      productAmount: 240000,
      laborAmount: 90000,
      totalAmount: 330000,
    });
  });

  it("keeps a non-variant subitem on the standard identity and calculation path", () => {
    const initialRow = estimateItems["wall-item"][0];
    const choice = getEstimateRowSpecChoices(initialRow)[0];
    const nextRow = changeOption(initialRow, choice.key);

    expect(choice).toMatchObject({
      key: "base-spec:wall-standard:%EC%9D%BC%EB%B0%98",
      label: "일반",
    });
    expect(nextRow).toMatchObject({
      subitemId: "wall-standard",
      selectedSpecOption: "일반",
      quantity: 24,
      unitPrice: 25000,
      laborCount: 1,
      laborRate: 120000,
      productAmount: 600000,
      laborAmount: 120000,
      totalAmount: 720000,
    });
  });
});
