import * as XLSX from "xlsx";
import {
  EXCEL_IMPORT_TARGETS,
  buildCanonicalExcelCatalogItems,
  buildPriceExportRows,
  buildTemplateExportRows,
  createScopedExcelExportRequest,
  makeExcelExportFileName,
} from "./excelImportModel";
import {
  fetchAdminTemplateRows,
  fetchAdminTemplateValues,
} from "../priceTable/priceTableApi";
import { fetchCanonicalConstructionCatalogRows } from "../constructionCatalog/constructionCatalogApi";

function hideStableColumns(worksheet, rows) {
  const headers = Object.keys(rows[0] ?? {});
  worksheet["!cols"] = headers.map((header) => {
    if (header.startsWith("FORMATE_")) return { hidden: true, wch: 1 };

    const contentWidth = rows.reduce((width, row) => (
      Math.max(width, `${row[header] ?? ""}`.length)
    ), header.length);
    return { wch: Math.min(36, Math.max(10, contentWidth + 2)) };
  });
}

function appendMetadataSheet(workbook, { companyId, target }) {
  const metadata = XLSX.utils.aoa_to_sheet([
    ["FORMATE_EXPORT_VERSION", "2"],
    ["TARGET", target],
    ["COMPANY_ID", companyId],
    ["EXPORTED_AT", new Date().toISOString()],
  ]);
  XLSX.utils.book_append_sheet(workbook, metadata, "FORMATE_META");
  workbook.Workbook = workbook.Workbook ?? {};
  workbook.Workbook.Sheets = workbook.SheetNames.map((name) => ({
    name,
    Hidden: name === "FORMATE_META" ? 1 : 0,
  }));
}

function getExportSheetConfig(target) {
  if (target === EXCEL_IMPORT_TARGETS.TEMPLATES) {
    return {
      sheetName: "기본 견적 설정",
      emptyMessage: "내보낼 기본 견적 설정 데이터가 없습니다. 조건별 기본값을 저장한 뒤 다시 시도해주세요.",
    };
  }
  return {
    sheetName: "단가표",
    emptyMessage: "내보낼 저장 단가표 데이터가 없습니다. 단가표를 저장한 뒤 다시 시도해주세요.",
  };
}

export function inspectFormateExportWorkbook(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  const sheetRows = worksheet
    ? XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })
    : [];
  const headers = sheetRows[0] ?? [];
  const firstDataRow = sheetRows[1] ?? [];

  if (!worksheet || sheetRows.length < 2 || headers.length === 0 || firstDataRow.length === 0) {
    throw new Error("Excel 사용자용 시트에 저장 데이터가 반영되지 않았습니다.");
  }

  return {
    sheetNames: [...workbook.SheetNames],
    sheetName,
    rowCount: sheetRows.length - 1,
    headers,
    firstDataRow,
  };
}

export function createFormateExportWorkbook({
  companyId,
  target,
  catalogItems = [],
  templates = [],
  valuesByTemplateId = {},
}) {
  createScopedExcelExportRequest(companyId, target);
  const { sheetName, emptyMessage } = getExportSheetConfig(target);
  const rows = target === EXCEL_IMPORT_TARGETS.TEMPLATES
    ? buildTemplateExportRows(templates, valuesByTemplateId, catalogItems)
    : buildPriceExportRows(catalogItems);

  if (rows.length === 0) throw new Error(emptyMessage);

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  hideStableColumns(worksheet, rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  appendMetadataSheet(workbook, { companyId, target });

  return {
    workbook,
    summary: inspectFormateExportWorkbook(workbook, sheetName),
  };
}

export async function exportFormateExcel({ companyId, companyName, target }) {
  createScopedExcelExportRequest(companyId, target);
  const { canonicalCatalog } = await fetchCanonicalConstructionCatalogRows(companyId);
  const catalog = buildCanonicalExcelCatalogItems(canonicalCatalog);
  let templates = [];
  let valuesByTemplateId = {};

  if (target === EXCEL_IMPORT_TARGETS.TEMPLATES) {
    templates = await fetchAdminTemplateRows(companyId);
    const valueEntries = await Promise.all(templates.map(async (template) => [
      template.id,
      await fetchAdminTemplateValues(template.id),
    ]));
    valuesByTemplateId = Object.fromEntries(valueEntries);
  }

  const { workbook, summary } = createFormateExportWorkbook({
    companyId,
    target,
    catalogItems: catalog,
    templates,
    valuesByTemplateId,
  });
  XLSX.writeFile(workbook, makeExcelExportFileName(companyName, target));
  return summary;
}
