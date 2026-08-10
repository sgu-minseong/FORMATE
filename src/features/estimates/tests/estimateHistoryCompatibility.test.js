import { describe, expect, it } from "vitest";
import {
  applyEstimateRowPatch,
  getEstimateRowSpecChoices,
  getEstimateRowSpecPatchFromChoice,
} from "../estimateItemModel";
import {
  ESTIMATE_HISTORY_COMPATIBILITY_KIND,
  getLegacyEstimateHistorySpecLabel,
} from "../estimateHistoryCompatibility";
import { restoreEstimateDraft } from "../snapshot";

const legacyFields = {
  subitemId: "legacy-a",
  material: "과거 소재",
  selectedThickness: "1.8",
  thicknessOptions: [
    { subitemId: "legacy-a", thickness: "1.8", label: "1.8T", quantity: 10 },
    { subitemId: "legacy-b", thickness: "2.2", label: "2.2T", quantity: 20 },
  ],
  specOptions: ["과거 규격"],
};

describe("saved estimate history compatibility boundary", () => {
  it("does not expose legacy thickness/spec choices on a canonical runtime row", () => {
    expect(getEstimateRowSpecChoices(legacyFields)).toEqual([]);
    expect(applyEstimateRowPatch(
      legacyFields,
      getEstimateRowSpecPatchFromChoice("variant:legacy-b")
    )).toEqual(legacyFields);
  });

  it("keeps the old selector behavior only for an explicitly restored history row", () => {
    const historyRow = {
      ...legacyFields,
      estimateHistoryCompatibility: ESTIMATE_HISTORY_COMPATIBILITY_KIND,
    };
    expect(getEstimateRowSpecChoices(historyRow).map((choice) => choice.key)).toEqual([
      "variant:legacy-a",
      "variant:legacy-b",
      "base-spec:legacy-a:%EA%B3%BC%EA%B1%B0%20%EA%B7%9C%EA%B2%A9",
    ]);
    expect(applyEstimateRowPatch(
      historyRow,
      getEstimateRowSpecPatchFromChoice("variant:legacy-b")
    )).toMatchObject({
      subitemId: "legacy-b",
      selectedThickness: "2.2",
      quantity: 20,
    });
    expect(getLegacyEstimateHistorySpecLabel(historyRow)).toBe("1.8T");
  });

  it("enters compatibility mode through the real saved-history restore path", () => {
    const restored = restoreEstimateDraft({
      condition_snapshot: {
        condition_pyeong: 24,
        build_type: "구형",
        condition_variant: "구형1",
        has_extension: false,
      },
      items_data: [{
        categoryId: "floor",
        itemId: "floor",
        categoryName: "바닥",
        subitemId: "legacy-a",
        material: "과거 소재",
        selectedSpecOption: "과거 규격",
        specOptions: '["과거 규격", "과거 규격"]',
        quantity: 1,
        unitPrice: 1000,
        laborCount: 1,
        laborRate: 2000,
        totalAmount: 3000,
      }],
    });
    const row = restored.items.floor[0];

    expect(row.estimateHistoryCompatibility).toBe(ESTIMATE_HISTORY_COMPATIBILITY_KIND);
    expect(getEstimateRowSpecChoices(row).map((choice) => choice.label))
      .toEqual(["과거 규격"]);
    expect(getLegacyEstimateHistorySpecLabel(row)).toBe("과거 규격");
  });
});
