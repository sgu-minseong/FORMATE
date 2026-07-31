import * as XLSX from "xlsx";
import {
  EXCEL_IMPORT_TARGETS,
  buildPriceExportRows,
  buildTemplateExportRows,
  createScopedExcelExportRequest,
  makeExcelExportFileName,
} from "./excelImportModel";
import {
  fetchAdminTemplateRows,
  fetchAdminTemplateValues,
  fetchConstructionCatalogRows,
} from "../priceTable/priceTableApi";

function groupCatalog(itemRows, subitemRows) {
  return itemRows.map((item) => ({
    ...item,
    subitems: subitemRows.filter((subitem) => subitem.item_id === item.id),
  }));
}

function hideStableColumns(worksheet, rows) {
  const headers = Object.keys(rows[0] ?? {});
  worksheet["!cols"] = headers.map((header) => ({ hidden: header.startsWith("FORMATE_") }));
}

function appendMetadataSheet(workbook, { companyId, target }) {
  const metadata = XLSX.utils.aoa_to_sheet([
    ["FORMATE_EXPORT_VERSION", "1"],
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

export async function exportFormateExcel({ companyId, companyName, target }) {
  createScopedExcelExportRequest(companyId, target);
  const { itemRows, subitemRows } = await fetchConstructionCatalogRows(companyId);
  const catalog = groupCatalog(itemRows, subitemRows);
  const workbook = XLSX.utils.book_new();

  if (target === EXCEL_IMPORT_TARGETS.TEMPLATES) {
    const templates = await fetchAdminTemplateRows(companyId);
    const valueEntries = await Promise.all(templates.map(async (template) => [
      template.id,
      await fetchAdminTemplateValues(template.id),
    ]));
    const rows = buildTemplateExportRows(templates, Object.fromEntries(valueEntries), catalog);
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 안내: "저장된 기본 견적 설정이 없습니다." }]);
    hideStableColumns(worksheet, rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "기본 견적 설정");
  } else {
    const rows = buildPriceExportRows(catalog);
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 안내: "저장된 단가표 항목이 없습니다." }]);
    hideStableColumns(worksheet, rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "단가표");
  }

  appendMetadataSheet(workbook, { companyId, target });
  XLSX.writeFile(workbook, makeExcelExportFileName(companyName, target));
}
