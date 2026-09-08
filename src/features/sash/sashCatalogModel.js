import {
  hasNumericInput,
  toNullableNumber,
} from "../../shared/utils/numbers";

export const SASH_ITEM_KIND = "sash";
export const LOCAL_SASH_CATALOG_ENTRY_PREFIX = "local-sash-catalog-entry-";

export const SASH_WINDOW_TYPES = Object.freeze({
  UNSPECIFIED: "unspecified",
  SINGLE: "single",
  DOUBLE: "double",
});

export const SASH_MEASUREMENT_KINDS = Object.freeze({
  UNSPECIFIED: "unspecified",
  ESTIMATE: "estimate",
  MEASURED: "measured",
});

export const SASH_PRICING_BASES = Object.freeze({
  FIXED: "fixed",
  AREA: "area",
});

export const SASH_LOCATION_KINDS = Object.freeze({
  STANDARD: "standard",
  BALCONY: "balcony",
});

export const SASH_CATEGORIES = Object.freeze({
  UNSPECIFIED: "unspecified",
  STANDARD: "standard",
  BALCONY: "balcony",
});

const SASH_SPEC_VERSION = 1;
const VALID_SASH_WINDOW_TYPES = new Set(Object.values(SASH_WINDOW_TYPES));
const VALID_SASH_MEASUREMENT_KINDS = new Set(Object.values(SASH_MEASUREMENT_KINDS));
const VALID_SASH_PRICING_BASES = new Set(Object.values(SASH_PRICING_BASES));
const VALID_SASH_CATEGORIES = new Set(Object.values(SASH_CATEGORIES));

function createLocalId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.()
    ?? Date.now() + "-" + Math.random().toString(16).slice(2);
  return prefix + randomId;
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value ?? "").trim();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function toOptionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function toOptionalInteger(value) {
  const numericValue = toNullableNumber(value);
  return numericValue === null ? null : Math.trunc(numericValue);
}

function isPresent(value) {
  return String(value ?? "").trim() !== "";
}

function roundSashArea(value) {
  return Number(Number(value).toFixed(4));
}

function getRawSashArea(widthMm, heightMm) {
  const width = Number(widthMm);
  const height = Number(heightMm);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return (width / 1000) * (height / 1000);
}

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

export function getSashCategory(value) {
  const directValue = typeof value === "string"
    ? value
    : value?.sashCategory
      ?? value?.sash_category
      ?? value?.sashSpec?.sash_category;
  const normalized = String(directValue ?? "").trim();
  if (VALID_SASH_CATEGORIES.has(normalized)) return normalized;
  return SASH_CATEGORIES.UNSPECIFIED;
}

export function getLegacyCompatibleSashCategory(value) {
  const directValue = typeof value === "string"
    ? value
    : value?.sashCategory
      ?? value?.sash_category
      ?? value?.sashSpec?.sash_category;
  const normalized = String(directValue ?? "").trim();
  if (VALID_SASH_CATEGORIES.has(normalized)) return normalized;
  const legacyLocation = typeof value === "object"
    ? value?.sashLocationKind ?? value?.sash_location_kind
    : "";
  return [SASH_LOCATION_KINDS.STANDARD, SASH_LOCATION_KINDS.BALCONY].includes(legacyLocation)
    ? legacyLocation
    : SASH_CATEGORIES.UNSPECIFIED;
}

export function getSashCategoryLabel(value) {
  const sashCategory = getSashCategory(value);
  if (sashCategory === SASH_CATEGORIES.STANDARD) return "일반";
  if (sashCategory === SASH_CATEGORIES.BALCONY) return "베란다";
  return "미분류";
}

export function isBalconySashCategory(value) {
  return getSashCategory(value) === SASH_CATEGORIES.BALCONY;
}

export function buildSashCatalogEntryCategoryCounts(entries = [], constructionSubitemIds = []) {
  const counts = Object.fromEntries(constructionSubitemIds.map((constructionSubitemId) => [
    constructionSubitemId,
    {
      total: 0,
      [SASH_CATEGORIES.UNSPECIFIED]: 0,
      [SASH_CATEGORIES.STANDARD]: 0,
      [SASH_CATEGORIES.BALCONY]: 0,
    },
  ]));

  entries.forEach((entry) => {
    const constructionSubitemId = entry?.construction_subitem_id;
    if (!constructionSubitemId || entry?.archived_at || !counts[constructionSubitemId]) return;
    const sashCategory = getSashCategory(entry);
    counts[constructionSubitemId].total += 1;
    counts[constructionSubitemId][sashCategory] += 1;
  });

  return counts;
}

export function orderSashCatalogEntriesForDisplay(
  entries = [],
  { pinnedEntryId = "", usageRanking = [] } = {}
) {
  const rankingByEntryId = new Map((usageRanking ?? []).map((entry) => [
    entry.sashCatalogEntryId,
    Number(entry.usageCount ?? 0),
  ]));
  return (entries ?? []).map((entry, canonicalIndex) => ({ entry, canonicalIndex }))
    .sort((left, right) => (
      Number(right.entry.id === pinnedEntryId) - Number(left.entry.id === pinnedEntryId)
      || (rankingByEntryId.get(right.entry.id) ?? 0) - (rankingByEntryId.get(left.entry.id) ?? 0)
      || left.canonicalIndex - right.canonicalIndex
    ))
    .map(({ entry }) => entry);
}

export function formatSashArea(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return "-";
  return Number(numericValue.toFixed(4)).toLocaleString("ko-KR") + "㎡";
}

export function getSashAreaPreview(widthMm, heightMm) {
  const rawArea = getRawSashArea(widthMm, heightMm);
  return rawArea === null ? "" : roundSashArea(rawArea);
}

export function getSashWindowMultiplier(windowType) {
  return windowType === SASH_WINDOW_TYPES.DOUBLE ? 2 : 1;
}

export function hasExplicitSashWindowType(windowType) {
  return [SASH_WINDOW_TYPES.SINGLE, SASH_WINDOW_TYPES.DOUBLE].includes(windowType);
}

export function getSashBillableArea(entry) {
  if (
    entry?.pricing_basis === SASH_PRICING_BASES.AREA
    && !hasExplicitSashWindowType(entry?.window_type)
  ) {
    return "";
  }
  const rawArea = getRawSashArea(entry?.width_mm, entry?.height_mm);
  if (rawArea !== null) {
    return roundSashArea(rawArea * getSashWindowMultiplier(entry?.window_type));
  }
  if (
    Object.prototype.hasOwnProperty.call(entry ?? {}, "width_mm")
    || Object.prototype.hasOwnProperty.call(entry ?? {}, "height_mm")
  ) return "";
  const storedArea = Number(entry?.billable_area_sqm);
  return Number.isFinite(storedArea) && storedArea > 0 ? roundSashArea(storedArea) : "";
}

export function getSashCatalogEntryAmount(entry) {
  const unitPrice = toNullableNumber(entry?.unit_price);
  if (unitPrice === null || unitPrice < 0) return null;
  if (entry?.pricing_basis !== SASH_PRICING_BASES.AREA) return unitPrice;
  if (!hasExplicitSashWindowType(entry?.window_type)) return null;
  const billableArea = getSashBillableArea(entry);
  return billableArea === "" ? null : Number(billableArea) * unitPrice;
}

export function createLocalSashCatalogEntry({
  constructionSubitemId,
  sortOrder = 0,
  id = createLocalId(LOCAL_SASH_CATALOG_ENTRY_PREFIX),
  pricingBasis = SASH_PRICING_BASES.FIXED,
  windowType = SASH_WINDOW_TYPES.UNSPECIFIED,
  measurementKind = SASH_MEASUREMENT_KINDS.UNSPECIFIED,
  sashCategory = SASH_CATEGORIES.UNSPECIFIED,
} = {}) {
  return {
    id,
    construction_subitem_id: constructionSubitemId,
    sash_category: normalizeEnum(
      sashCategory,
      VALID_SASH_CATEGORIES,
      SASH_CATEGORIES.UNSPECIFIED
    ),
    brand: "",
    product_type: "",
    frame_spec: "",
    pair_spec: "",
    glass_spec: "",
    gas_spec: "",
    screen_spec: "",
    glass_thickness: "",
    handle_type: "",
    window_count: "",
    sash_price_id: null,
    sash_price: null,
    window_type_option_id: null,
    window_type: normalizeEnum(
      windowType,
      VALID_SASH_WINDOW_TYPES,
      SASH_WINDOW_TYPES.UNSPECIFIED
    ),
    measurement_kind: normalizeEnum(
      measurementKind,
      VALID_SASH_MEASUREMENT_KINDS,
      SASH_MEASUREMENT_KINDS.UNSPECIFIED
    ),
    pricing_basis: normalizeEnum(
      pricingBasis,
      VALID_SASH_PRICING_BASES,
      SASH_PRICING_BASES.FIXED
    ),
    width_mm: "",
    height_mm: "",
    area_sqm: null,
    billable_area_sqm: null,
    unit_price: "",
    calculated_amount: null,
    cost_price: "",
    sort_order: sortOrder,
    archived_at: null,
    created_at: "",
    updated_at: "",
  };
}

export function normalizeSashCatalogEntry(entry) {
  const joinedPrice = Array.isArray(entry?.sash_price)
    ? entry.sash_price[0] ?? null
    : entry?.sash_price ?? entry?.sash_prices ?? null;
  return {
    ...entry,
    sash_category: getSashCategory(entry),
    brand: String(entry?.brand ?? ""),
    product_type: String(entry?.product_type ?? ""),
    frame_spec: String(entry?.frame_spec ?? ""),
    pair_spec: String(entry?.pair_spec ?? ""),
    glass_spec: String(entry?.glass_spec ?? ""),
    gas_spec: String(entry?.gas_spec ?? ""),
    screen_spec: String(entry?.screen_spec ?? ""),
    glass_thickness: String(entry?.glass_thickness ?? ""),
    handle_type: String(entry?.handle_type ?? ""),
    window_count: String(entry?.window_count ?? ""),
    sash_price_id: entry?.sash_price_id ?? null,
    sash_price: joinedPrice,
    window_type_option_id: entry?.window_type_option_id ?? null,
    window_type: normalizeEnum(
      entry?.window_type,
      VALID_SASH_WINDOW_TYPES,
      SASH_WINDOW_TYPES.UNSPECIFIED
    ),
    measurement_kind: normalizeEnum(
      entry?.measurement_kind,
      VALID_SASH_MEASUREMENT_KINDS,
      SASH_MEASUREMENT_KINDS.UNSPECIFIED
    ),
    pricing_basis: normalizeEnum(
      entry?.pricing_basis,
      VALID_SASH_PRICING_BASES,
      SASH_PRICING_BASES.FIXED
    ),
    width_mm: entry?.width_mm ?? "",
    height_mm: entry?.height_mm ?? "",
    unit_price: entry?.sash_price_id ? joinedPrice?.unit_price ?? "" : entry?.unit_price ?? "",
    cost_price: entry?.cost_price ?? "",
    sort_order: Number(entry?.sort_order ?? 0),
  };
}

export function getSashEntryArea(entry) {
  const calculatedArea = getSashAreaPreview(entry?.width_mm, entry?.height_mm);
  if (calculatedArea !== "") return calculatedArea;
  if (
    Object.prototype.hasOwnProperty.call(entry ?? {}, "width_mm")
    || Object.prototype.hasOwnProperty.call(entry ?? {}, "height_mm")
  ) return "";
  const storedArea = Number(entry?.area_sqm);
  return Number.isFinite(storedArea) && storedArea > 0 ? roundSashArea(storedArea) : "";
}

export function getSashFrameSpec(entry) {
  return String(entry?.frame_spec ?? "").trim()
    || String(entry?.product_type ?? "").trim();
}

export function getSashCatalogEntryValidationError(entry) {
  const width = toNullableNumber(entry?.width_mm);
  const height = toNullableNumber(entry?.height_mm);
  const unitPrice = toNullableNumber(entry?.unit_price);
  const costPrice = toNullableNumber(entry?.cost_price);
  if (isPresent(entry?.width_mm) && (
    !hasNumericInput(entry.width_mm) || !Number.isInteger(width) || width <= 0
  )) {
    return "가로(mm)를 0보다 크게 입력하세요.";
  }
  if (isPresent(entry?.height_mm) && (
    !hasNumericInput(entry.height_mm) || !Number.isInteger(height) || height <= 0
  )) {
    return "세로(mm)를 0보다 크게 입력하세요.";
  }
  if (isPresent(entry?.unit_price) && (!hasNumericInput(entry.unit_price) || unitPrice < 0)) {
    return "단가를 0 이상으로 입력하세요.";
  }
  if (isPresent(entry?.cost_price) && (!hasNumericInput(entry.cost_price) || costPrice < 0)) {
    return "원가를 0 이상으로 입력하세요.";
  }
  return "";
}

export function buildSashCatalogEntryPayload(entry, {
  companyId,
  constructionSubitemId = entry?.construction_subitem_id,
} = {}) {
  const validationError = getSashCatalogEntryValidationError(entry);
  if (validationError) throw new Error(validationError);
  return {
    company_id: companyId,
    construction_subitem_id: constructionSubitemId,
    sash_category: getSashCategory(entry),
    brand: toOptionalText(entry?.brand),
    product_type: toOptionalText(entry?.product_type),
    frame_spec: toOptionalText(entry?.frame_spec),
    pair_spec: toOptionalText(entry?.pair_spec),
    glass_spec: toOptionalText(entry?.glass_spec),
    gas_spec: toOptionalText(entry?.gas_spec),
    screen_spec: toOptionalText(entry?.screen_spec),
    glass_thickness: toOptionalText(entry?.glass_thickness),
    handle_type: toOptionalText(entry?.handle_type),
    window_count: toOptionalText(entry?.window_count),
    window_type_option_id: entry?.window_type_option_id || null,
    window_type: normalizeEnum(
      entry?.window_type,
      VALID_SASH_WINDOW_TYPES,
      SASH_WINDOW_TYPES.UNSPECIFIED
    ),
    measurement_kind: normalizeEnum(
      entry?.measurement_kind,
      VALID_SASH_MEASUREMENT_KINDS,
      SASH_MEASUREMENT_KINDS.UNSPECIFIED
    ),
    pricing_basis: normalizeEnum(
      entry?.pricing_basis,
      VALID_SASH_PRICING_BASES,
      SASH_PRICING_BASES.FIXED
    ),
    width_mm: toOptionalInteger(entry?.width_mm),
    height_mm: toOptionalInteger(entry?.height_mm),
    unit_price: toNullableNumber(entry?.unit_price),
    cost_price: toNullableNumber(entry?.cost_price),
    sort_order: Number(entry?.sort_order ?? 0),
  };
}

export function buildSashCatalogEntryPatch(entry, fieldNames = []) {
  const payload = buildSashCatalogEntryPayload(entry);
  const requestedFields = new Set(fieldNames);
  return Object.fromEntries(
    Object.entries(payload).filter(([fieldName]) => requestedFields.has(fieldName))
  );
}

export function getSashSpecLabel(spec) {
  if (!spec) return "";
  const dimensions = spec.width_mm && spec.height_mm
    ? Number(spec.width_mm).toLocaleString("ko-KR") + " × " + Number(spec.height_mm).toLocaleString("ko-KR")
    : "";
  return [spec.brand, getSashFrameSpec(spec), dimensions].filter(Boolean).join(" / ");
}

export function createSashSpecSnapshot(entry) {
  const calculatedBillableArea = getSashBillableArea(entry);
  const area = getSashEntryArea(entry);
  const billableArea = calculatedBillableArea === ""
    ? null
    : Number(calculatedBillableArea);
  return {
    sash_spec_version: SASH_SPEC_VERSION,
    sash_catalog_entry_id: entry.id,
    sash_price_id: entry?.sash_price_id ?? null,
    sash_category: getSashCategory(entry),
    brand: String(entry?.brand ?? ""),
    product_type: String(entry?.product_type ?? ""),
    frame_spec: String(entry?.frame_spec ?? ""),
    pair_spec: String(entry?.pair_spec ?? ""),
    glass_spec: String(entry?.glass_spec ?? ""),
    gas_spec: String(entry?.gas_spec ?? ""),
    screen_spec: String(entry?.screen_spec ?? ""),
    glass_thickness: String(entry?.glass_thickness ?? ""),
    handle_type: String(entry?.handle_type ?? ""),
    window_count: String(entry?.window_count ?? ""),
    window_type_option_id: entry?.window_type_option_id ?? null,
    window_type: normalizeEnum(
      entry?.window_type,
      VALID_SASH_WINDOW_TYPES,
      SASH_WINDOW_TYPES.UNSPECIFIED
    ),
    measurement_kind: normalizeEnum(
      entry?.measurement_kind,
      VALID_SASH_MEASUREMENT_KINDS,
      SASH_MEASUREMENT_KINDS.UNSPECIFIED
    ),
    pricing_basis: normalizeEnum(
      entry?.pricing_basis,
      VALID_SASH_PRICING_BASES,
      SASH_PRICING_BASES.FIXED
    ),
    width_mm: toNullableNumber(entry?.width_mm),
    height_mm: toNullableNumber(entry?.height_mm),
    area_sqm: area === "" ? null : Number(area),
    billable_area_sqm: billableArea,
    unit_price: toNullableNumber(entry?.unit_price),
    calculated_amount: getSashCatalogEntryAmount(entry),
  };
}

export function buildSashEstimateSelectionPatch(entry) {
  const sashSpec = createSashSpecSnapshot(entry);
  const usesAreaPricing = sashSpec.pricing_basis === SASH_PRICING_BASES.AREA;
  const quantity = usesAreaPricing ? sashSpec.billable_area_sqm : 1;
  return {
    sashCatalogEntryId: sashSpec.sash_catalog_entry_id,
    sashCategory: sashSpec.sash_category,
    sashSpec,
    selectedSashCatalogEntryId: sashSpec.sash_catalog_entry_id,
    quantity,
    baseQuantity: quantity,
    laborCount: 0,
    baseLaborCount: 0,
    laborRate: 0,
    baseLaborRate: 0,
    unit: usesAreaPricing ? "헤베" : "식",
    unitPrice: sashSpec.unit_price,
    baseUnitPrice: sashSpec.unit_price,
    hasTemplateValue: true,
  };
}

export function isSashEstimateSpecPricingConfirmed(spec) {
  if (!spec) return false;
  const unitPrice = toNullableNumber(spec.unit_price);
  if (unitPrice === null || unitPrice < 0) return false;
  if (spec.pricing_basis !== SASH_PRICING_BASES.AREA) return true;
  return hasExplicitSashWindowType(spec.window_type) && getSashBillableArea(spec) !== "";
}

export function buildSashEstimateSpecPatch(spec, patch = {}) {
  const canonicalId = String(spec?.sash_catalog_entry_id ?? "").trim();
  if (!canonicalId) return {};

  const normalizedPatch = {
    ...patch,
    ...(Object.prototype.hasOwnProperty.call(patch, "window_type")
      && !Object.prototype.hasOwnProperty.call(patch, "window_type_option_id")
      ? { window_type_option_id: null }
      : {}),
  };
  const nextSpec = createSashSpecSnapshot({
    ...spec,
    ...normalizedPatch,
    id: canonicalId,
    area_sqm: null,
    billable_area_sqm: null,
    calculated_amount: null,
  });
  const usesAreaPricing = nextSpec.pricing_basis === SASH_PRICING_BASES.AREA;
  const pricingConfirmed = isSashEstimateSpecPricingConfirmed(nextSpec);

  return {
    sashCatalogEntryId: canonicalId,
    selectedSashCatalogEntryId: canonicalId,
    sashSpec: nextSpec,
    quantity: usesAreaPricing
      ? pricingConfirmed ? nextSpec.billable_area_sqm : ""
      : 1,
    unit: usesAreaPricing ? "헤베" : "식",
    unitPrice: nextSpec.unit_price,
    hasTemplateValue: true,
  };
}

export function isBalconySashLocation(value) {
  const locationKind = typeof value === "string"
    ? value
    : value?.sashLocationKind ?? value?.sash_location_kind;
  return locationKind === SASH_LOCATION_KINDS.BALCONY;
}
