import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildCanonicalConstructionCatalog } from "../../constructionCatalog/constructionCatalogModel";
import {
  createFormateExportWorkbook,
  inspectFormateExportWorkbook,
} from "../excelExport";
import {
  EXCEL_IMPORT_TARGETS,
  buildCanonicalExcelCatalogItems,
} from "../excelImportModel";

const catalog = buildCanonicalExcelCatalogItems(buildCanonicalConstructionCatalog({
  itemRows: [{ id: "item-floor", name: "바닥", item_type: "itemized" }],
  subitemRows: [{
    id: "sub-vinyl-22",
    item_id: "item-floor",
    name: "장판 (2.2T)",
    unit: "평",
    unit_price: 11000,
    labor_rate_empty: 9000,
    labor_rate_occupied: 12000,
    variant_group_id: "floor-group",
    variant_value: 2.2,
    variant_value_text: null,
    variant_unit: "T",
  }],
  variantGroupRows: [{
    id: "floor-group",
    construction_item_id: "item-floor",
    display_name: "장판",
    variant_kind: "thickness",
    variant_value_type: "number",
    sort_order: 0,
  }],
}));

function roundTripWorkbook(workbook) {
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return XLSX.read(bytes, { type: "buffer", cellStyles: true });
}

describe("FORMATE Excel export workbook", () => {
  it("writes price rows, Korean headers, representative values, and stable keys", () => {
    const { workbook, summary } = createFormateExportWorkbook({
      companyId: "company-a",
      target: EXCEL_IMPORT_TARGETS.PRICES,
      catalogItems: catalog,
    });
    const reread = roundTripWorkbook(workbook);
    const rows = XLSX.utils.sheet_to_json(reread.Sheets["단가표"], { header: 1, defval: "" });

    expect(summary).toMatchObject({ sheetName: "단가표", rowCount: 1 });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.arrayContaining(["대분류", "세부항목", "자재 단가", "FORMATE_SUBITEM_ID"]));
    expect(rows[1]).toEqual(expect.arrayContaining(["바닥", "장판 (2.2T)", 11000, "sub-vinyl-22"]));
    expect(reread.Sheets["단가표"]["!cols"][0].width).toBeGreaterThan(0);
    expect(reread.Sheets["단가표"]["!cols"][10].hidden).toBe(true);
  });

  it("writes default-estimate rows, Korean headers, representative values, and stable keys", () => {
    const templates = [{
      id: "template-24-old",
      pyeong: 24,
      build_type: "구축",
      has_extension: false,
      condition_variant: "구형0",
    }];
    const { workbook } = createFormateExportWorkbook({
      companyId: "company-a",
      target: EXCEL_IMPORT_TARGETS.TEMPLATES,
      catalogItems: catalog,
      templates,
      valuesByTemplateId: {
        "template-24-old": [{
          item_id: "item-floor",
          subitem_id: "sub-vinyl-22",
          option_value: "legacy-wrong-value",
          quantity: 20,
          labor_count: 2,
          construction_days: 1,
        }],
      },
    });
    const reread = roundTripWorkbook(workbook);
    const rows = XLSX.utils.sheet_to_json(reread.Sheets["기본 견적 설정"], { header: 1, defval: "" });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.arrayContaining(["평수", "주택 유형", "대분류", "규격", "수량", "FORMATE_TEMPLATE_ID", "FORMATE_VARIANT_VALUE_NUMBER"]));
    expect(rows[1]).toEqual(expect.arrayContaining([24, "구축", "바닥", "장판 (2.2T)", "2.2T", 20, "template-24-old", 2.2]));
    expect(inspectFormateExportWorkbook(reread, "기본 견적 설정").rowCount).toBe(1);
  });

  it("rejects a silent empty download for both export targets", () => {
    expect(() => createFormateExportWorkbook({
      companyId: "company-a",
      target: EXCEL_IMPORT_TARGETS.PRICES,
    })).toThrow("내보낼 저장 단가표 데이터가 없습니다");
    expect(() => createFormateExportWorkbook({
      companyId: "company-a",
      target: EXCEL_IMPORT_TARGETS.TEMPLATES,
    })).toThrow("내보낼 기본 견적 설정 데이터가 없습니다");
  });
});
