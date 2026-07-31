export const EXCEL_IMPORT_TARGETS = Object.freeze({
  PRICES: "prices",
  TEMPLATES: "templates",
});

export const LUMP_SUM_CATEGORY_NAME = "1식 공사";
export const LUMP_SUM_ITEM_TYPE = "flat";
export const LUMP_SUM_CALCULATION_BASIS = "parent_total";

export function normalizeExcelStableKey(value) {
  return `${value ?? ""}`
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\([^)]*\)|（[^）]*）/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function isLumpSumImportRow(row = {}) {
  const unit = normalizeExcelStableKey(row.unit);
  const text = normalizeExcelStableKey([
    row.category,
    row.item_name,
    row.memo,
  ].filter(Boolean).join(" "));
  return unit === "식" || unit === "1식" || /(?:^|[^0-9])1식/.test(`${row.unit ?? ""}`) || text.includes("일식공사") || text.includes("묶음공사");
}

export function getLumpSumSourceTotal(row = {}) {
  const originalAmount = `${row.original_amount ?? ""}`.trim();
  return originalAmount || `${row.unit_price ?? ""}`.trim();
}

export function buildImportSubitemName(itemName, spec) {
  const name = `${itemName ?? ""}`.trim();
  const option = `${spec ?? ""}`.trim();
  if (!option || normalizeExcelStableKey(name).endsWith(normalizeExcelStableKey(option))) return name;
  return `${name} (${option})`;
}

export function findCatalogMatchByStableIds(catalogItems = [], row = {}) {
  const itemId = `${row.formate_item_id ?? ""}`.trim();
  const subitemId = `${row.formate_subitem_id ?? ""}`.trim();
  if (!itemId && !subitemId) return null;

  const item = catalogItems.find((candidate) =>
    candidate.id === itemId || (candidate.subitems ?? []).some((subitem) => subitem.id === subitemId)
  );
  if (!item) return null;
  const subitem = (item.subitems ?? []).find((candidate) => candidate.id === subitemId) ?? null;
  return { item, subitem };
}

export function getImportReviewStatus({ row, stableMatch, categoryMatch, subitemMatch, hasConflict = false } = {}) {
  if (hasConflict) return "conflict";
  if (stableMatch?.subitem || (categoryMatch?.categoryConfidence >= 0.82 && subitemMatch?.subitemConfidence >= 0.82)) {
    return "automatic";
  }
  if (row?.category || row?.item_name) return "needs_review";
  return "unmapped";
}

export function shouldApplyExcelConflict(decision) {
  return decision === "excel";
}

export function buildLumpSumExclusionPatches(rows = [], targetRow, activatesRow) {
  if (!activatesRow || !targetRow) return {};
  if (targetRow.isSplitChild) {
    return {
      [targetRow.sourceParentRowNumber]: { rowType: "ignored", action: "ignore", source: "manual" },
    };
  }
  if (targetRow.isSplitParent) {
    return Object.fromEntries(rows
      .filter((row) => row.isSplitChild && `${row.sourceParentRowNumber}` === `${targetRow.sourceRowNumber}`)
      .map((row) => [row.sourceRowNumber, { rowType: "ignored", action: "ignore", source: "manual" }]));
  }
  return {};
}

export function createScopedExcelExportRequest(companyId, target) {
  if (!companyId) throw new Error("업체 범위가 필요합니다.");
  if (!Object.values(EXCEL_IMPORT_TARGETS).includes(target)) throw new Error("내보내기 대상이 올바르지 않습니다.");
  return { companyId, target };
}

export function dedupeImportRows(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = [
      row.formate_subitem_id,
      normalizeExcelStableKey(row.category),
      normalizeExcelStableKey(row.item_name),
      normalizeExcelStableKey(row.spec),
    ].filter(Boolean).join("|");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveLegacyExcelImportRoute(page) {
  return page === "admin-ai-setup" ? "admin-prices" : page;
}

export function readFormateWorkbookMetadata(sheets = []) {
  const sheet = sheets.find((candidate) => candidate.name === "FORMATE_META");
  if (!sheet) return {};
  return Object.fromEntries((sheet.rows ?? [])
    .filter((row) => row?.[0])
    .map((row) => [`${row[0]}`.trim(), `${row[1] ?? ""}`.trim()]));
}

export function buildPriceExportRows(catalogItems = []) {
  return catalogItems.flatMap((item) =>
    (item.subitems ?? []).map((subitem) => ({
      대분류: item.name,
      세부항목: subitem.name,
      "규격 또는 옵션": subitem.selected_spec_option || (subitem.spec_options ?? []).join(", "),
      단위: subitem.unit ?? "",
      "자재 단가": subitem.unit_price ?? 0,
      "인건비(빈집)": subitem.labor_rate_empty ?? subitem.labor_rate ?? 0,
      "인건비(살림집)": subitem.labor_rate_occupied ?? subitem.labor_rate ?? 0,
      비고: "",
      "묶음 여부": item.item_type === LUMP_SUM_ITEM_TYPE ? "1식" : "일반",
      "계산 기준": item.item_type === LUMP_SUM_ITEM_TYPE ? LUMP_SUM_CALCULATION_BASIS : "line_items",
      FORMATE_ITEM_ID: item.id,
      FORMATE_SUBITEM_ID: subitem.id,
      FORMATE_ITEM_TYPE: item.item_type ?? "itemized",
    }))
  );
}

export function buildTemplateExportRows(templates = [], valuesByTemplateId = {}, catalogItems = []) {
  const itemById = new Map(catalogItems.map((item) => [item.id, item]));
  const subitemById = new Map(catalogItems.flatMap((item) =>
    (item.subitems ?? []).map((subitem) => [subitem.id, subitem])
  ));
  return templates.flatMap((template) =>
    (valuesByTemplateId[template.id] ?? []).map((value) => {
      const item = itemById.get(value.item_id);
      const subitem = subitemById.get(value.subitem_id);
      return {
        평수: template.pyeong,
        "주택 유형": template.build_type,
        "확장 여부": template.has_extension ? "확장" : "확장 없음",
        "세부 유형": template.condition_variant ?? "",
        대분류: item?.name ?? "",
        세부항목: subitem?.name ?? "",
        규격: value.option_value ?? "",
        단위: subitem?.unit ?? "",
        수량: value.quantity ?? "",
        인원: value.labor_count ?? "",
        공사기간: value.construction_days ?? 0,
        FORMATE_TEMPLATE_ID: template.id,
        FORMATE_ITEM_ID: value.item_id,
        FORMATE_SUBITEM_ID: value.subitem_id,
      };
    })
  );
}

export function makeExcelExportFileName(companyName, target, date = new Date()) {
  const safeCompany = `${companyName || "FORMATE"}`
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
  const kind = target === EXCEL_IMPORT_TARGETS.TEMPLATES ? "기본견적설정" : "단가표";
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${safeCompany || "FORMATE"}_${kind}_${datePart}.xlsx`;
}
