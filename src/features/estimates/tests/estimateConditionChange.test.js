import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  ESTIMATE_PYEONG_CHANGE_DELAY_MS,
  applyEstimateConditionChange,
  createEstimatePyeongChange,
  normalizeEstimatePyeongInput,
} from "../estimateConditionChange";
import { reconcileEstimateDraftItems } from "../estimateDraftReconciliation";

const adminAppSource = readFileSync(
  new URL("../../../app/AdminApp.jsx", import.meta.url),
  "utf8"
);

describe("estimate condition change", () => {
  it("applies a direct pyeong change through the shared condition pipeline", async () => {
    const updateCondition = vi.fn();
    const loadCatalog = vi.fn(async () => true);
    const nextCondition = {
      size: "34",
      buildType: "new",
      conditionVariant: "확장형1",
      occupancy: "empty",
    };

    const result = await applyEstimateConditionChange({
      nextCondition,
      preserveDraft: true,
      updateCondition,
      loadCatalog,
    });

    expect(result).toEqual({ applied: true, condition: nextCondition });
    expect(updateCondition).toHaveBeenCalledWith(nextCondition);
    expect(loadCatalog).toHaveBeenCalledWith("34", nextCondition, {
      preserveDraft: true,
      forceBlank: false,
    });
  });

  it("keeps selection and prices, refreshes untouched labor, and reviews a manual quantity", () => {
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
          quantity: 34,
          baseQuantity: 34,
          laborCount: 4,
          baseLaborCount: 4,
          unitPrice: 25000,
          baseUnitPrice: 25000,
        }],
      },
    });

    expect(result.items.wall[0]).toMatchObject({
      selected: true,
      quantity: 27,
      laborCount: 4,
      unitPrice: 26000,
    });
    expect(result.conflicts).toEqual([
      expect.objectContaining({ fields: ["quantity"] }),
    ]);
  });

  it("refreshes untouched quantity and labor without creating a conflict", () => {
    const result = reconcileEstimateDraftItems({
      previousItems: {
        floor: [{
          itemId: "floor",
          subitemId: "vinyl",
          material: "장판",
          selected: true,
          quantity: 24,
          baseQuantity: 24,
          laborCount: 2,
          baseLaborCount: 2,
          unitPrice: 18000,
          baseUnitPrice: 18000,
        }],
      },
      nextItems: {
        floor: [{
          itemId: "floor",
          subitemId: "vinyl",
          material: "장판",
          selected: false,
          quantity: 34,
          baseQuantity: 34,
          laborCount: 4,
          baseLaborCount: 4,
          unitPrice: 18000,
          baseUnitPrice: 18000,
        }],
      },
    });

    expect(result.items.floor[0]).toMatchObject({
      selected: true,
      quantity: 34,
      laborCount: 4,
      unitPrice: 18000,
    });
    expect(result.conflicts).toEqual([]);
  });

  it("debounces rapid changes and applies only the last valid pyeong", () => {
    const scheduled = [];
    const apply = vi.fn();
    const cancel = vi.fn();
    const change = createEstimatePyeongChange({
      apply,
      schedule: (callback, delay) => {
        scheduled.push({ callback, delay });
        return scheduled.length;
      },
      cancel,
    });

    change.queue("30");
    change.queue("34");
    expect(scheduled.map((entry) => entry.delay)).toEqual([
      ESTIMATE_PYEONG_CHANGE_DELAY_MS,
      ESTIMATE_PYEONG_CHANGE_DELAY_MS,
    ]);
    expect(cancel).toHaveBeenCalledWith(1);

    scheduled[0].callback();
    scheduled[1].callback();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("34");
  });

  it("flushes a valid value and ignores empty or invalid input", () => {
    const apply = vi.fn();
    const change = createEstimatePyeongChange({ apply });

    expect(normalizeEstimatePyeongInput(34)).toBe("34");
    expect(normalizeEstimatePyeongInput("")).toBe("");
    expect(normalizeEstimatePyeongInput("0")).toBe("");
    expect(normalizeEstimatePyeongInput("34.5")).toBe("");
    expect(change.flush("")).toBe(false);
    expect(change.flush("0")).toBe(false);
    expect(change.flush("34")).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("34");
  });

  it("uses the same pipeline for Drawer and direct input and exposes the target pyeong in actions", () => {
    expect(adminAppSource).toContain("applyEstimateConditionChangePipeline(condition");
    expect(adminAppSource).toContain("applyEstimateConditionChangePipeline(nextCondition");
    expect(adminAppSource).toContain("handleEstimatePyeongInputChange");
    expect(adminAppSource).not.toContain("평 단위 수량에 적용");
    expect(adminAppSource).toContain("내가 입력한 값 유지");
    expect(adminAppSource).toContain("평 기준값으로 변경");
  });
});
