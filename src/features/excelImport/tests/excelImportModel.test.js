import { describe, expect, it } from "vitest";
import { analyzeExcelSheetForFormate } from "../../aiExcelImport/excelMapping";
import { buildCanonicalConstructionCatalog } from "../../constructionCatalog/constructionCatalogModel";
import {
  CROSS_COMPANY_IMPORT_NOTICE,
  EXCEL_IMPORT_MODES,
  EXCEL_IMPORT_TARGETS,
  LUMP_SUM_CALCULATION_BASIS,
  LUMP_SUM_ITEM_TYPE,
  buildCanonicalExcelCatalogItems,
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

const catalog = buildCanonicalExcelCatalogItems(buildCanonicalConstructionCatalog({
  itemRows: [{ id: "item-floor", name: "바닥", item_type: "itemized" }],
  subitemRows: [
    { id: "sub-22", item_id: "item-floor", name: "장판 (2.2T)", unit: "평", unit_price: 11000, labor_rate_empty: 9000, labor_rate_occupied: 12000, variant_group_id: "floor-group", variant_value: 2.2, variant_value_text: null, variant_unit: "T" },
    { id: "sub-27", item_id: "item-floor", name: "장판 (2.7T)", unit: "평", unit_price: 17000, labor_rate_empty: 9500, labor_rate_occupied: 12500, variant_group_id: "floor-group", variant_value: 2.7, variant_value_text: null, variant_unit: "T" },
  ],
  variantGroupRows: [{
    id: "floor-group",
    construction_item_id: "item-floor",
    display_name: "장판",
    variant_kind: "thickness",
    variant_value_type: "number",
    sort_order: 0,
  }],
}));

const genericCatalog = buildCanonicalExcelCatalogItems(buildCanonicalConstructionCatalog({
  itemRows: [{ id: "item-finish", name: "마감", item_type: "itemized" }],
  subitemRows: [
    { id: "sub-text", item_id: "item-finish", name: "도장 프리미엄", unit: "식", variant_group_id: "finish-group", variant_value: null, variant_value_text: "프리미엄", variant_unit: null },
    { id: "sub-standard", item_id: "item-finish", name: "보양", unit: "식", variant_group_id: null, variant_value: null, variant_value_text: null, variant_unit: null },
  ],
  variantGroupRows: [{
    id: "finish-group",
    construction_item_id: "item-finish",
    display_name: "도장",
    variant_kind: "grade",
    variant_value_type: "text",
    sort_order: 0,
  }],
}));

const targetGenericCatalog = buildCanonicalExcelCatalogItems(buildCanonicalConstructionCatalog({
  itemRows: [{ id: "target-item-finish", name: "마감", item_type: "itemized" }],
  subitemRows: [
    { id: "target-sub-text", item_id: "target-item-finish", name: "도장 프리미엄", unit: "식", variant_group_id: "target-finish-group", variant_value: null, variant_value_text: "프리미엄", variant_unit: null },
    { id: "target-sub-standard", item_id: "target-item-finish", name: "보양", unit: "식", variant_group_id: null, variant_value: null, variant_value_text: null, variant_unit: null },
  ],
  variantGroupRows: [{
    id: "target-finish-group",
    construction_item_id: "target-item-finish",
    display_name: "도장",
    variant_kind: "grade",
    variant_value_type: "text",
    sort_order: 0,
  }],
}));

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
      formate_product_kind: "variant-group",
      formate_variant_kind: "thickness",
      formate_variant_value_type: "number",
      formate_variant_value_number: "2.2",
      formate_variant_unit: "T",
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

  it("matches a cross-company variant by portable canonical metadata, not visible spec", () => {
    const context = createScopedExcelImportContext("company-current", {
      COMPANY_ID: "company-source",
    });
    const [exportedRow] = buildPriceExportRows(catalog);
    const [preparedRow] = prepareExcelImportRowsForCompany([{
      category: exportedRow.대분류,
      item_name: exportedRow.세부항목,
      spec: "사용자가 수정한 표시 규격",
      formate_item_id: "source-item",
      formate_subitem_id: "source-subitem",
      formate_product_kind: exportedRow.FORMATE_PRODUCT_KIND,
      formate_variant_kind: exportedRow.FORMATE_VARIANT_KIND,
      formate_variant_value_type: exportedRow.FORMATE_VARIANT_VALUE_TYPE,
      formate_variant_value_number: exportedRow.FORMATE_VARIANT_VALUE_NUMBER,
      formate_variant_value_text: exportedRow.FORMATE_VARIANT_VALUE_TEXT,
      formate_variant_unit: exportedRow.FORMATE_VARIANT_UNIT,
    }], context);

    const match = findCatalogCopyMatch(catalog, preparedRow);
    expect(preparedRow).not.toHaveProperty("formate_subitem_id");
    expect(match).toMatchObject({
      matchMethod: "canonical_portable_copy",
      subitem: { id: "sub-22" },
    });

    const mismatched = findCatalogCopyMatch(catalog, {
      ...preparedRow,
      formate_variant_value_number: "2.7",
      item_name: "장판 (2.2T)",
      spec: "2.2T",
    });
    expect(mismatched.subitem).toBeNull();

    const invalidPortableMetadata = findCatalogCopyMatch(catalog, {
      ...preparedRow,
      formate_variant_value_number: "",
      spec: "2.2T",
    });
    expect(invalidPortableMetadata.subitem).toBeNull();
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
      "template-1": [{ template_id: "template-1", item_id: "item-floor", subitem_id: "sub-22", option_value: "legacy-wrong-value", quantity: 32, labor_count: 2, construction_days: 1 }],
    }, catalog);
    expect(rows[0].규격).toBe("2.2T");
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

  it("exports text variants and standard subitems from canonical metadata only", () => {
    const template = { id: "template-generic", pyeong: 24, build_type: "구축", has_extension: false, condition_variant: "구축0" };
    const rows = buildTemplateExportRows([template], {
      "template-generic": [
        { template_id: template.id, item_id: "item-finish", subitem_id: "sub-text", option_value: "legacy-text", quantity: 1, labor_count: 1, construction_days: 1 },
        { template_id: template.id, item_id: "item-finish", subitem_id: "sub-standard", option_value: "legacy-standard", quantity: 2, labor_count: 0, construction_days: 0 },
      ],
    }, genericCatalog);

    expect(rows[0]).toMatchObject({
      규격: "프리미엄",
      FORMATE_PRODUCT_KIND: "variant-group",
      FORMATE_VARIANT_KIND: "grade",
      FORMATE_VARIANT_VALUE_TYPE: "text",
      FORMATE_VARIANT_VALUE_TEXT: "프리미엄",
      FORMATE_VARIANT_UNIT: "",
    });
    expect(rows[1]).toMatchObject({
      규격: "",
      FORMATE_PRODUCT_KIND: "subitem",
      FORMATE_VARIANT_KIND: "",
      FORMATE_VARIANT_VALUE_TYPE: "",
    });
  });

  it("keeps text variants and non-variant rows portable across company-local UUIDs", () => {
    const context = createScopedExcelImportContext("company-target", {
      COMPANY_ID: "company-source",
    });
    const sourceRows = buildPriceExportRows(genericCatalog).map((row) => ({
      category: row.대분류,
      item_name: row.세부항목,
      spec: `legacy-${row.세부항목}`,
      formate_item_id: row.FORMATE_ITEM_ID,
      formate_subitem_id: row.FORMATE_SUBITEM_ID,
      formate_product_kind: row.FORMATE_PRODUCT_KIND,
      formate_variant_kind: row.FORMATE_VARIANT_KIND,
      formate_variant_value_type: row.FORMATE_VARIANT_VALUE_TYPE,
      formate_variant_value_number: row.FORMATE_VARIANT_VALUE_NUMBER,
      formate_variant_value_text: row.FORMATE_VARIANT_VALUE_TEXT,
      formate_variant_unit: row.FORMATE_VARIANT_UNIT,
    }));
    const preparedRows = prepareExcelImportRowsForCompany(sourceRows, context);

    expect(findCatalogCopyMatch(targetGenericCatalog, preparedRows[0])?.subitem?.id)
      .toBe("target-sub-text");
    expect(findCatalogCopyMatch(targetGenericCatalog, preparedRows[1])?.subitem?.id)
      .toBe("target-sub-standard");
  });

  it("keeps archived variant metadata available for existing Template export only", () => {
    const archivedCatalog = buildCanonicalExcelCatalogItems(buildCanonicalConstructionCatalog({
      itemRows: [{ id: "item-archive", name: "바닥", item_type: "itemized" }],
      subitemRows: [{
        id: "archived-variant",
        item_id: "item-archive",
        name: "장판 (1.8T)",
        unit: "평",
        variant_group_id: "archive-group",
        variant_value: 1.8,
        variant_value_text: null,
        variant_unit: "T",
        archived_at: "2026-01-01T00:00:00.000Z",
      }],
      variantGroupRows: [{
        id: "archive-group",
        construction_item_id: "item-archive",
        display_name: "장판",
        variant_kind: "thickness",
        variant_value_type: "number",
        sort_order: 0,
      }],
    }));
    const template = { id: "template-archive", pyeong: 24, build_type: "구축", has_extension: false, condition_variant: "구축0" };
    const rows = buildTemplateExportRows([template], {
      "template-archive": [{
        template_id: template.id,
        item_id: "item-archive",
        subitem_id: "archived-variant",
        quantity: 3,
        labor_count: 1,
        construction_days: 1,
      }],
    }, archivedCatalog);

    expect(buildPriceExportRows(archivedCatalog)).toEqual([]);
    expect(rows[0]).toMatchObject({
      규격: "1.8T",
      수량: 3,
      인원: 1,
      공사기간: 1,
      FORMATE_SUBITEM_ID: "archived-variant",
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
