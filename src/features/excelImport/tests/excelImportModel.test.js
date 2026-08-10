import { describe, expect, it } from "vitest";
import { analyzeExcelSheetForFormate } from "../../aiExcelImport/excelMapping";
import {
  CROSS_COMPANY_IMPORT_NOTICE,
  EXCEL_IMPORT_MODES,
  EXCEL_IMPORT_TARGETS,
  LUMP_SUM_CALCULATION_BASIS,
  LUMP_SUM_ITEM_TYPE,
  buildImportSubitemName,
  buildLumpSumExclusionPatches,
  buildPriceExportRows,
  buildTemplateExportRows,
  createScopedExcelImportContext,
  createScopedExcelExportRequest,
  dedupeImportRows,
  findCatalogMatchByStableIds,
  findCatalogCopyMatch,
  getLumpSumSourceTotal,
  getCopyImportDefaultAction,
  isLumpSumImportRow,
  hasExcelImportWriteTargets,
  prepareExcelImportRowsForCompany,
  resolveLegacyExcelImportRoute,
  shouldApplyExcelConflict,
} from "../excelImportModel";

const catalog = [{
  id: "item-floor",
  name: "바닥",
  item_type: "itemized",
  subitems: [
    { id: "sub-22", item_id: "item-floor", name: "장판 (2.2T)", unit: "평", unit_price: 11000, labor_rate_empty: 9000, labor_rate_occupied: 12000, variant_group_id: "floor-group", variant_value: 2.2, variant_value_text: null, variant_unit: "T" },
    { id: "sub-27", item_id: "item-floor", name: "장판 (2.7T)", unit: "평", unit_price: 17000, labor_rate_empty: 9500, labor_rate_occupied: 12500, variant_group_id: "floor-group", variant_value: 2.7, variant_value_text: null, variant_unit: "T" },
  ],
}];

describe("shared Excel import model", () => {
  it("round-trips price rows with stable keys and independent spec prices", () => {
    const rows = buildPriceExportRows(catalog);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row["자재 단가"])).toEqual([11000, 17000]);
    expect(rows.map((row) => row["규격 또는 옵션"])).toEqual(["2.2T", "2.7T"]);

    const headers = Object.keys(rows[0]);
    const sheet = { rows: [headers, ...rows.map((row) => headers.map((header) => row[header]))], columnCount: headers.length };
    const analysis = analyzeExcelSheetForFormate(sheet);
    expect(analysis.hasHeader).toBe(true);
    expect(analysis.previewRows[0]).toMatchObject({
      category: "바닥",
      item_name: "장판 (2.2T)",
      formate_item_id: "item-floor",
      formate_subitem_id: "sub-22",
      unit_price: "11000",
      labor_rate_empty: "9000",
      labor_rate_occupied: "12000",
    });
    expect(findCatalogMatchByStableIds(catalog, analysis.previewRows[1])?.subitem?.id).toBe("sub-27");
  });

  it("keeps existing values unless Excel replacement is explicitly selected", () => {
    expect(shouldApplyExcelConflict("keep")).toBe(false);
    expect(shouldApplyExcelConflict(undefined)).toBe(false);
    expect(shouldApplyExcelConflict("excel")).toBe(true);
    expect(hasExcelImportWriteTargets([])).toBe(false);
    expect(hasExcelImportWriteTargets([{ selected: true }])).toBe(true);
  });

  it("accepts another company's metadata in copy mode without reusing its row ids", () => {
    const context = createScopedExcelImportContext("company-current", {
      COMPANY_ID: "company-source",
    });
    const sourceRows = [{
      category: "바닥",
      item_name: "장판",
      spec: "2.2T",
      unit: "평",
      unit_price: "15000",
      formate_item_id: "source-item",
      formate_subitem_id: "source-subitem",
      formate_template_id: "source-template",
      formate_item_type: "itemized",
    }];
    const preparedRows = prepareExcelImportRowsForCompany(sourceRows, context);

    expect(context).toMatchObject({
      companyId: "company-current",
      sourceCompanyId: "company-source",
      mode: EXCEL_IMPORT_MODES.COPY,
      notice: CROSS_COMPANY_IMPORT_NOTICE,
    });
    expect(preparedRows[0]).not.toHaveProperty("formate_item_id");
    expect(preparedRows[0]).not.toHaveProperty("formate_subitem_id");
    expect(preparedRows[0]).not.toHaveProperty("formate_template_id");
    expect(sourceRows[0].formate_subitem_id).toBe("source-subitem");

    const match = findCatalogCopyMatch(catalog, preparedRows[0]);
    expect(match.item?.id).toBe("item-floor");
    expect(match.subitem?.id).toBe("sub-22");
    expect(match.subitem?.unit_price).toBe(11000);
    expect(getCopyImportDefaultAction(match)).toBe("link");
    expect(shouldApplyExcelConflict()).toBe(false);
  });

  it("keeps stable ids for an exact same-company round trip", () => {
    const context = createScopedExcelImportContext("company-current", {
      COMPANY_ID: "company-current",
    });
    const rows = [{
      category: "바닥",
      item_name: "장판 (2.7T)",
      formate_item_id: "item-floor",
      formate_subitem_id: "sub-27",
    }];
    const preparedRows = prepareExcelImportRowsForCompany(rows, context);

    expect(context.mode).toBe(EXCEL_IMPORT_MODES.ROUND_TRIP);
    expect(preparedRows).toBe(rows);
    expect(findCatalogMatchByStableIds(catalog, preparedRows[0])?.subitem?.id).toBe("sub-27");
  });

  it("keeps the initial app render safe before an import context exists", () => {
    const rows = [{ category: "바닥", item_name: "장판" }];
    expect(prepareExcelImportRowsForCompany(rows, null)).toBe(rows);
  });

  it("keeps a missing current-company item as a new-item candidate", () => {
    const context = createScopedExcelImportContext("company-current", {
      COMPANY_ID: "company-source",
    });
    const [preparedRow] = prepareExcelImportRowsForCompany([{
      category: "바닥",
      item_name: "강마루",
      spec: "프리미엄",
      unit: "평",
      formate_item_id: "source-item",
      formate_subitem_id: "source-only-subitem",
      formate_item_type: "itemized",
    }], context);
    const match = findCatalogCopyMatch(catalog, preparedRow);

    expect(match.item?.id).toBe("item-floor");
    expect(match.subitem).toBeNull();
    expect(getCopyImportDefaultAction(match)).toBe("new");
    expect(findCatalogMatchByStableIds(catalog, preparedRow)).toBeNull();
  });

  it("deduplicates retries while preserving each specification as its own row", () => {
    const rows = [
      { category: "바닥", item_name: "장판", spec: "2.2T" },
      { category: " 바닥 ", item_name: "장판", spec: "2.2t" },
      { category: "바닥", item_name: "장판", spec: "2.7T" },
    ];
    expect(dedupeImportRows(rows)).toHaveLength(2);
    expect(buildImportSubitemName("장판", "2.2T")).toBe("장판 (2.2T)");
    expect(buildImportSubitemName("장판 2.2T", "2.2T")).toBe("장판 2.2T");
  });

  it("maps the supported default-estimate condition and value columns", () => {
    const templates = [{ id: "template-1", pyeong: 32, build_type: "구축", has_extension: false, condition_variant: "구형0" }];
    const rows = buildTemplateExportRows(templates, {
      "template-1": [{ template_id: "template-1", item_id: "item-floor", subitem_id: "sub-22", option_value: "2.2T", quantity: 32, labor_count: 2, construction_days: 1 }],
    }, catalog);
    const headers = Object.keys(rows[0]);
    const analysis = analyzeExcelSheetForFormate({
      rows: [headers, headers.map((header) => rows[0][header])],
      columnCount: headers.length,
    });
    expect(analysis.previewRows[0]).toMatchObject({
      pyeong: "32",
      build_type: "구축",
      condition_variant: "구형0",
      quantity: "32",
      labor_count: "2",
      construction_days: "1",
      formate_template_id: "template-1",
    });
  });

  it("treats lump-sum work as a flat parent-total model and prevents double selection", () => {
    const row = { category: "욕실", item_name: "욕실 전체 공사", unit: "1식", original_amount: "8,500,000" };
    expect(isLumpSumImportRow(row)).toBe(true);
    expect(getLumpSumSourceTotal(row)).toBe("8,500,000");

    const parent = { sourceRowNumber: 7, isSplitParent: true };
    const childA = { sourceRowNumber: "7-1", sourceParentRowNumber: 7, isSplitChild: true };
    const childB = { sourceRowNumber: "7-2", sourceParentRowNumber: 7, isSplitChild: true };
    expect(buildLumpSumExclusionPatches([parent, childA, childB], parent, true)).toEqual({
      "7-1": { rowType: "ignored", action: "ignore", source: "manual" },
      "7-2": { rowType: "ignored", action: "ignore", source: "manual" },
    });
    expect(buildLumpSumExclusionPatches([parent, childA, childB], childA, true)).toEqual({
      7: { rowType: "ignored", action: "ignore", source: "manual" },
    });

    const exported = buildPriceExportRows([{
      id: "bundle",
      name: "1식 공사",
      item_type: LUMP_SUM_ITEM_TYPE,
      subitems: [{ id: "bundle-row", item_id: "bundle", name: "욕실 전체 공사", unit: "식", unit_price: 8500000 }],
    }]);
    expect(exported[0]).toMatchObject({ "묶음 여부": "1식", "계산 기준": LUMP_SUM_CALCULATION_BASIS });
  });

  it("requires company scope and safely redirects the removed route", () => {
    expect(createScopedExcelExportRequest("company-a", EXCEL_IMPORT_TARGETS.PRICES)).toEqual({
      companyId: "company-a",
      target: EXCEL_IMPORT_TARGETS.PRICES,
    });
    expect(() => createScopedExcelExportRequest("", EXCEL_IMPORT_TARGETS.PRICES)).toThrow("업체 범위");
    expect(resolveLegacyExcelImportRoute("admin-ai-setup")).toBe("admin-prices");
    expect(resolveLegacyExcelImportRoute("admin-items")).toBe("admin-items");
  });
});
