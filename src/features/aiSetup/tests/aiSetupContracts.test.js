import { describe, expect, it } from "vitest";
import { buildAiRecommendationRequest } from "../aiSetupApi";
import {
  createEmptyAiSetupApplyCondition,
  createEmptyAiSetupConditionTouched,
} from "../useAiSetup";
import { isSupportedAiSetupExcelFile } from "../aiSetupExcel";

describe("AI setup contracts", () => {
  it("keeps empty condition state", () => {
    expect(createEmptyAiSetupApplyCondition()).toEqual({
      pyeong: "", buildType: "", conditionVariant: "", occupancy: "",
    });
    expect(createEmptyAiSetupConditionTouched()).toEqual({
      pyeong: false, buildType: false, conditionVariant: false, occupancy: false,
    });
    expect(isSupportedAiSetupExcelFile("estimate.XLSX")).toBe(true);
    expect(isSupportedAiSetupExcelFile("estimate.csv")).toBe(false);
  });

  it("keeps recommendation request mapping and excludes split children", () => {
    const payload = buildAiRecommendationRequest({
      catalogItems: [{ id: "item", name: "도배", subitems: [{ id: "sub", item_id: "item", name: "실크", unit: "평" }] }],
      matchRows: [
        { sourceRowNumber: 2, category: "도배", item_name: "실크", rowType: "work_item", action: "link_existing", selectedCategoryId: "item", selectedSubitemId: "sub" },
        { sourceRowNumber: 3, isSplitChild: true },
      ],
      overrides: { 2: { action: "add_new_item" } },
      mappings: [{ columnIndex: 0, field: "category" }],
      condition: { pyeong: "32" },
      conditionLabel: "32평",
    });
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0]).toMatchObject({
      rowIndex: 2, category: "도배", item_name: "실크", action: "add_new_item",
      matchedCategoryId: "item", matchedSubitemId: "sub",
    });
    expect(payload.condition).toEqual({ pyeong: "32", label: "32평" });
    expect(payload.existingSubitems[0]).toMatchObject({ categoryId: "item", categoryName: "도배" });
  });
});
