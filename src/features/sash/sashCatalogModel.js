import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
} from "../../shared/utils/numbers";

export const SASH_ITEM_KIND = "sash";
export const LOCAL_SASH_CATALOG_ENTRY_PREFIX = "local-sash-catalog-entry-";

export function isSashItem(item) {
  return item?.item_kind === SASH_ITEM_KIND;
}

export function isLocalSashCatalogEntry(entry) {
  return String(entry?.id ?? "").startsWith(LOCAL_SASH_CATALOG_ENTRY_PREFIX);
}

export function buildSashCatalogEntryCounts(entries = [], constructionSubitemIds = []) {
  const counts = Object.fromEntries(
    constructionSubitemIds.map((constructionSubitemId) => [constructionSubitemId, 0])
  );

  entries.forEach((entry) => {
    const constructionSubitemId = entry?.construction_subitem_id;
    if (!constructionSubitemId || entry?.archived_at || !(constructionSubitemId in counts)) return;
    counts[constructionSubitemId] += 1;
  });

  return counts;
}

export function formatSashArea(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "-";
  return Number(numericValue.toFixed(4)).toLocaleString("ko-KR") + "㎡";
}

export function getSashAreaPreview(widthMm, heightMm) {
  const width = Number(widthMm);
  const height = Number(heightMm);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "";
  }
  return (width / 1000) * (height / 1000);
}

export function createLocalSashCatalogEntry({
  constructionSubitemId,
  sortOrder = 0,
  id = LOCAL_SASH_CATALOG_ENTRY_PREFIX + Date.now() + "-" + Math.random().toString(16).slice(2),
} = {}) {
  return {
    id,
    construction_subitem_id: constructionSubitemId,
    brand: "",
    product_type: "",
    width_mm: "",
    height_mm: "",
    area_sqm: null,
    unit_price: "",
    cost_price: "",
    sort_order: sortOrder,
    archived_at: null,
    created_at: "",
    updated_at: "",
  };
}

export function normalizeSashCatalogEntry(entry) {
  return {
    ...entry,
    brand: String(entry?.brand ?? ""),
    product_type: String(entry?.product_type ?? ""),
    width_mm: entry?.width_mm ?? "",
    height_mm: entry?.height_mm ?? "",
    unit_price: entry?.unit_price ?? "",
    cost_price: entry?.cost_price ?? "",
    sort_order: Number(entry?.sort_order ?? 0),
  };
}

export function getSashEntryArea(entry) {
  return entry?.area_sqm ?? getSashAreaPreview(entry?.width_mm, entry?.height_mm);
}

export function getSashCatalogEntryValidationError(entry) {
  if (!String(entry?.brand ?? "").trim()) return "제조사를 입력하세요.";
  if (!String(entry?.product_type ?? "").trim()) return "제품 구분을 입력하세요.";
  if (!hasNumericInput(entry?.width_mm) || Number(entry.width_mm) <= 0) {
    return "가로(mm)를 0보다 크게 입력하세요.";
  }
  if (!hasNumericInput(entry?.height_mm) || Number(entry.height_mm) <= 0) {
    return "세로(mm)를 0보다 크게 입력하세요.";
  }
  return "";
}

export function buildSashCatalogEntryPayload(entry, {
  companyId,
  constructionSubitemId = entry?.construction_subitem_id,
} = {}) {
  return {
    company_id: companyId,
    construction_subitem_id: constructionSubitemId,
    brand: String(entry?.brand ?? "").trim(),
    product_type: String(entry?.product_type ?? "").trim(),
    width_mm: Math.trunc(Number(entry?.width_mm)),
    height_mm: Math.trunc(Number(entry?.height_mm)),
    unit_price: toNonNegativeNumberOrZero(entry?.unit_price),
    cost_price: toNonNegativeNumberOrZero(entry?.cost_price),
    sort_order: Number(entry?.sort_order ?? 0),
  };
}

export function getSashSpecLabel(spec) {
  if (!spec) return "";
  const dimensions = spec.width_mm && spec.height_mm
    ? Number(spec.width_mm).toLocaleString("ko-KR") + " × " + Number(spec.height_mm).toLocaleString("ko-KR")
    : "";
  return [spec.brand, spec.product_type, dimensions].filter(Boolean).join(" / ");
}

export function createSashSpecSnapshot(entry) {
  return {
    sash_catalog_entry_id: entry.id,
    brand: String(entry?.brand ?? ""),
    product_type: String(entry?.product_type ?? ""),
    width_mm: Number(entry?.width_mm),
    height_mm: Number(entry?.height_mm),
    area_sqm: Number(getSashEntryArea(entry)),
    unit_price: toNonNegativeNumberOrZero(entry?.unit_price),
  };
}

export function buildSashEstimateSelectionPatch(entry) {
  const sashSpec = createSashSpecSnapshot(entry);
  return {
    sashCatalogEntryId: sashSpec.sash_catalog_entry_id,
    sashSpec,
    selectedSashCatalogEntryId: sashSpec.sash_catalog_entry_id,
    quantity: 1,
    baseQuantity: 1,
    laborCount: 0,
    baseLaborCount: 0,
    laborRate: 0,
    baseLaborRate: 0,
    unit: "식",
    unitPrice: sashSpec.unit_price,
    baseUnitPrice: sashSpec.unit_price,
    hasTemplateValue: true,
  };
}
