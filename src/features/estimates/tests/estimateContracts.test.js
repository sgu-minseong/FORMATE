import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  calculateEstimateRow,
  calculateEstimateTotals,
  cleanEstimateAdjustments,
  getEstimateItemsDataConstructionDaysTotal,
  getEstimateItemsDataDraftItems,
  getEstimateItemsDataItems,
  getLaborRateForResidence,
} from "../calculation";
import {
  buildConditionSnapshot,
  buildEstimateInsertPayload,
  buildEstimateItemsData,
  restoreEstimateDraft,
} from "../snapshot";
import { ESTIMATE_HISTORY_COMPATIBILITY_KIND } from "../estimateHistoryCompatibility";
import {
  buildEstimatePdfFileName,
  exportEstimatePdf,
} from "../exportEstimatePdf";
import { calculateEstimatePageSlices } from "../estimatePagination";

const estimateApiSource = readFileSync(
  new URL("../estimateApi.js", import.meta.url),
  "utf8"
);

const condition = {
  size: "32",
  buildType: "old",
  expanded: true,
  conditionVariant: "구형2",
  occupancy: "occupied",
};

const item = {
  categoryId: "floor",
  categoryName: "바닥",
  itemId: "floor",
  itemType: "itemized",
  subitemId: "wood",
  material: "강마루",
  quantity: "12",
  unitPrice: "25,000",
  laborCount: "2",
  laborRate: "180,000",
  construction_days: 3,
  selected: true,
};

describe("estimate calculation contracts", () => {
  it("keeps quantity, labor, adjustment, and floor-at-zero total formulas", () => {
    const row = calculateEstimateRow(item);
    expect(row.productAmount).toBe(300000);
    expect(row.laborAmount).toBe(360000);
    expect(row.totalAmount).toBe(660000);

    const adjustments = cleanEstimateAdjustments([
      { id: "charge", label: "폐기물", type: "charge", amount: "50,000", visibleToCustomer: true },
      { id: "discount", label: "할인", type: "discount", amount: "10,000", visibleToCustomer: false },
    ]);
    expect(calculateEstimateTotals([row], adjustments)).toEqual({
      selectedItemsTotal: 660000,
      adjustmentTotal: 40000,
      finalTotal: 700000,
    });
    expect(calculateEstimateTotals([], [{ type: "discount", amount: 1000 }]).finalTotal).toBe(0);
  });

  it("selects empty-house and occupied-house labor rates with legacy fallback", () => {
    const subitem = {
      labor_rate_empty: "120,000",
      labor_rate_occupied: "180,000",
      labor_rate: "90,000",
    };
    expect(getLaborRateForResidence(subitem, "empty")).toBe(120000);
    expect(getLaborRateForResidence(subitem, "occupied")).toBe(180000);
    expect(getLaborRateForResidence({ labor_rate: "90,000" }, "살림집")).toBe(90000);
  });

  it("reads object and legacy array items_data without changing construction days", () => {
    expect(getEstimateItemsDataItems([item])).toEqual([item]);
    expect(getEstimateItemsDataItems({ items: [item] })).toEqual([item]);
    expect(getEstimateItemsDataConstructionDaysTotal([item])).toBe(3);
    expect(getEstimateItemsDataConstructionDaysTotal({ items: [item], constructionDaysTotal: 7 })).toBe(7);
  });
});

describe("estimate snapshot and persistence contracts", () => {
  it("disambiguates saved estimate versions from the current-version relationship", () => {
    expect(estimateApiSource).toContain(
      "estimate_versions!estimate_versions_estimate_id_fkey("
    );
  });

  it("keeps condition_snapshot and estimate insert field names", () => {
    const conditionSnapshot = buildConditionSnapshot({
      condition,
      companyId: "company-1",
      summary: "32평 · 구축",
      estimatePyeong: "34",
      conditionVariantLabel: "구축 확장",
      conditionVariantLabelOverrides: { 구형2: "구축 확장" },
    });
    expect(conditionSnapshot).toEqual({
      company_id: "company-1",
      pyeong: 32,
      build_type: "구형",
      condition_variant: "구형2",
      powder_room: null,
      dress_room: null,
      has_extension: true,
      extension_areas: null,
      occupancy_type: "살림집",
      summary: "32평 · 구축",
      condition_pyeong: 32,
      estimate_pyeong: 34,
      condition_variant_label: "구축 확장",
      condition_variant_display_label: "구축 확장",
      condition_variant_label_overrides: { 구형2: "구축 확장" },
    });

    const itemsData = buildEstimateItemsData({
      items: [calculateEstimateRow(item)],
      adjustments: [],
      siteMemo: "  내부 메모  ",
      estimateMeta: { customerName: "홍길동" },
      selectedItemsTotal: 660000,
      constructionDaysTotal: 3,
      adjustmentTotal: 0,
      finalTotal: 660000,
    });
    expect(buildEstimateInsertPayload({
      companyId: "company-1",
      address: "서울",
      workDate: "",
      conditionSnapshot,
      itemsData,
      total: 660000,
    })).toEqual({
      company_id: "company-1",
      address: "서울",
      construction_date: null,
      condition_id: null,
      condition_snapshot: conditionSnapshot,
      items_data: itemsData,
      total_amount: 660000,
    });
  });

  it("restores a saved object payload and legacy array payload with the same total", () => {
    const calculated = calculateEstimateRow(item);
    const base = {
      condition_snapshot: {
        condition_pyeong: 32,
        estimate_pyeong: 34,
        build_type: "구형",
        condition_variant: "구형2",
        has_extension: true,
        occupancy_type: "살림집",
      },
    };
    const objectDraft = restoreEstimateDraft({
      ...base,
      items_data: { items: [calculated], adjustments: [], siteMemo: "메모", estimateMeta: {} },
    });
    const legacyDraft = restoreEstimateDraft({ ...base, items_data: [calculated] });
    expect(objectDraft.condition).toMatchObject({
      size: "32",
      buildType: "old",
      expanded: true,
      conditionVariant: "구형2",
      occupancy: "occupied",
    });
    expect(objectDraft.items.floor[0].totalAmount).toBe(660000);
    expect(legacyDraft.items.floor[0].totalAmount).toBe(660000);
    expect(objectDraft.items.floor[0].estimateHistoryCompatibility)
      .toBe(ESTIMATE_HISTORY_COMPATIBILITY_KIND);
    expect(legacyDraft.items.floor[0].estimateHistoryCompatibility)
      .toBe(ESTIMATE_HISTORY_COMPATIBILITY_KIND);
  });

  it("keeps ranking items selected-only while restoring additive editor draft rows", () => {
    const selectedItem = { ...calculateEstimateRow(item), selected: true };
    const previewOnlyItem = {
      ...calculateEstimateRow({ ...item, subitemId: "floor-preview", selected: false }),
      selected: false,
    };
    const itemsData = buildEstimateItemsData({
      items: [selectedItem],
      draftItems: [selectedItem, previewOnlyItem],
      adjustments: [],
      siteMemo: "",
      estimateMeta: {},
      selectedItemsTotal: selectedItem.totalAmount,
      constructionDaysTotal: 0,
      adjustmentTotal: 0,
      finalTotal: selectedItem.totalAmount,
    });

    expect(getEstimateItemsDataItems(itemsData)).toHaveLength(1);
    expect(getEstimateItemsDataDraftItems(itemsData)).toHaveLength(2);
    const restored = restoreEstimateDraft({
      condition_snapshot: { condition_pyeong: 32, estimate_pyeong: 32 },
      items_data: itemsData,
    });
    expect(restored.items.floor.map((row) => row.selected)).toEqual([true, false]);
  });
});

describe("estimate PDF generation contracts", () => {
  it("keeps the filename format and sanitization", () => {
    expect(buildEstimatePdfFileName({
      companyName: "FORM/ATE",
      customerName: "홍 길동",
      address: "",
      issuedAt: "2026-07-28",
    })).toBe("견적서_FORM_ATE_홍_길동_2026-07-28.pdf");
  });

  it("keeps capture settings, A4 margins, and page splitting", async () => {
    const canvas = { width: 1000, height: 2200, toDataURL: vi.fn(() => "image") };
    const capture = vi.fn(async () => canvas);
    const documentNode = { nodeType: 1, dataset: { estimateDocument: "pdf" } };
    const pdf = {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      addImage: vi.fn(),
      addPage: vi.fn(),
      save: vi.fn(),
    };
    await exportEstimatePdf({
      documentNode,
      companyName: "FORMATE",
      customerName: "",
      address: "서울",
      issuedAt: "2026-07-28",
      backgroundColor: "#fff",
      capture,
      createPdf: () => pdf,
    });
    expect(capture).toHaveBeenCalledWith(documentNode, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fff",
    });
    expect(pdf.addImage).toHaveBeenCalled();
    expect(pdf.addPage).toHaveBeenCalled();
    const slices = calculateEstimatePageSlices(canvas.width, canvas.height);
    expect(pdf.addImage).toHaveBeenCalledTimes(slices.length);
    expect(pdf.addImage.mock.calls[1][3]).toBeCloseTo(10 - 277);
    expect(pdf.save).toHaveBeenCalledWith("견적서_FORMATE_서울_2026-07-28.pdf");
  });

  it("does not capture a screen viewport or screen document by mistake", async () => {
    const capture = vi.fn();

    await expect(exportEstimatePdf({
      documentNode: { dataset: { estimateDocument: "screen" } },
      capture,
    })).resolves.toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });
});
