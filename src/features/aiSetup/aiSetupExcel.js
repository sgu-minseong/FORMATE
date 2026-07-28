import * as XLSX from "xlsx";
import { normalizeExcelRows } from "../aiExcelImport/excelMapping";

export function isSupportedAiSetupExcelFile(fileName) {
  return /\.(xlsx|xls)$/i.test(`${fileName ?? ""}`);
}

export async function parseAiSetupWorkbook(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  return (workbook.SheetNames ?? []).map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = normalizeExcelRows(XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: "",
      raw: false,
    }));
    return {
      name: sheetName,
      rows,
      rowCount: rows.length,
      columnCount: rows.reduce((max, row) => Math.max(max, row.length), 0),
    };
  });
}
