import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
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

const SASH_SPEC_VERSION = 1;
const VALID_SASH_WINDOW_TYPES = new Set(Object.values(SASH_WINDOW_TYPES));
const VALID_SASH_MEASUREMENT_KINDS = new Set(Object.values(SASH_MEASUREMENT_KINDS));
const VALID_SASH_PRICING_BASES = new Set(Object.values(SASH_PRICING_BASES));

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
  const storedArea = Number(entry?.billable_area_sqm);
  return Number.isFinite(storedArea) && storedArea > 0 ? roundSashArea(storedArea) : "";
}

export function getSashCatalogEntryAmount(entry) {
  const unitPrice = toNonNegativeNumberOrZero(entry?.unit_price);
  if (entry?.pricing_basis !== SASH_PRICING_BASES.AREA) return unitPrice;
  if (!hasExplicitSashWindowType(entry?.window_type)) return null;
  const billableArea = Number(getSashBillableArea(entry));
  return Number.isFinite(billableArea) && billableArea > 0
    ? billableArea * unitPrice
    : 0;
}

export function createLocalSashCatalogEntry({
  constructionSubitemId,
  sortOrder = 0,
  id = createLocalId(LOCAL_SASH_CATALOG_ENTRY_PREFIX),
  pricingBasis = SASH_PRICING_BASES.FIXED,
  windowType = SASH_WINDOW_TYPES.UNSPECIFIED,
  measurementKind = SASH_MEASUREMENT_KINDS.UNSPECIFIED,
} = {}) {
  return {
    id,
    construction_subitem_id: constructionSubitemId,
    brand: "",
    product_type: "",
    frame_spec: "",
    pair_spec: "",
    glass_spec: "",
    gas_spec: "",
    screen_spec: "",
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
  return {
    ...entry,
    brand: String(entry?.brand ?? ""),
    product_type: String(entry?.product_type ?? ""),
    frame_spec: String(entry?.frame_spec ?? ""),
    pair_spec: String(entry?.pair_spec ?? ""),
    glass_spec: String(entry?.glass_spec ?? ""),
    gas_spec: String(entry?.gas_spec ?? ""),
    screen_spec: String(entry?.screen_spec ?? ""),
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
    unit_price: entry?.unit_price ?? "",
    cost_price: entry?.cost_price ?? "",
    sort_order: Number(entry?.sort_order ?? 0),
  };
}

export function getSashEntryArea(entry) {
  const calculatedArea = getSashAreaPreview(entry?.width_mm, entry?.height_mm);
  if (calculatedArea !== "") return calculatedArea;
  const storedArea = Number(entry?.area_sqm);
  return Number.isFinite(storedArea) && storedArea > 0 ? roundSashArea(storedArea) : "";
}

export function getSashFrameSpec(entry) {
  return String(entry?.frame_spec ?? "").trim()
    || String(entry?.product_type ?? "").trim();
}

export function getSashCatalogEntryValidationError(entry) {
  if (!String(entry?.brand ?? "").trim()) return "제조사를 입력하세요.";
  if (!getSashFrameSpec(entry)) return "틀 사양을 입력하세요.";
  if (!hasNumericInput(entry?.width_mm) || Number(entry.width_mm) <= 0) {
    return "가로(mm)를 0보다 크게 입력하세요.";
  }
  if (!hasNumericInput(entry?.height_mm) || Number(entry.height_mm) <= 0) {
    return "세로(mm)를 0보다 크게 입력하세요.";
  }
  if (entry?.pricing_basis === SASH_PRICING_BASES.AREA) {
    if (!String(entry?.frame_spec ?? "").trim()) return "틀 사양을 입력하세요.";
    if (!String(entry?.pair_spec ?? "").trim()) return "페어 사양을 입력하세요.";
    if (!String(entry?.glass_spec ?? "").trim()) return "유리 사양을 입력하세요.";
    if (!String(entry?.gas_spec ?? "").trim()) return "가스 사양을 입력하세요.";
    if (!String(entry?.screen_spec ?? "").trim()) return "망 사양을 입력하세요.";
    if (![SASH_WINDOW_TYPES.SINGLE, SASH_WINDOW_TYPES.DOUBLE].includes(entry?.window_type)) {
      return "단창·2중창을 선택하세요.";
    }
    if (![SASH_MEASUREMENT_KINDS.ESTIMATE, SASH_MEASUREMENT_KINDS.MEASURED]
      .includes(entry?.measurement_kind)) {
      return "가견적 치수인지 실측 치수인지 선택하세요.";
    }
    if (!hasNumericInput(entry?.unit_price)) return "단가를 입력하세요.";
  }
  return "";
}

export function buildSashCatalogEntryPayload(entry, {
  companyId,
  constructionSubitemId = entry?.construction_subitem_id,
} = {}) {
  const frameSpec = toOptionalText(entry?.frame_spec);
  return {
    company_id: companyId,
    construction_subitem_id: constructionSubitemId,
    brand: String(entry?.brand ?? "").trim(),
    product_type: String(entry?.product_type ?? "").trim() || frameSpec || "",
    frame_spec: frameSpec,
    pair_spec: toOptionalText(entry?.pair_spec),
    glass_spec: toOptionalText(entry?.glass_spec),
    gas_spec: toOptionalText(entry?.gas_spec),
    screen_spec: toOptionalText(entry?.screen_spec),
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
  return [spec.brand, getSashFrameSpec(spec), dimensions].filter(Boolean).join(" / ");
}

export function createSashSpecSnapshot(entry) {
  const calculatedBillableArea = getSashBillableArea(entry);
  const billableArea = calculatedBillableArea === ""
    ? null
    : Number(calculatedBillableArea) || 0;
  return {
    sash_spec_version: SASH_SPEC_VERSION,
    sash_catalog_entry_id: entry.id,
    brand: String(entry?.brand ?? ""),
    product_type: String(entry?.product_type ?? ""),
    frame_spec: String(entry?.frame_spec ?? ""),
    pair_spec: String(entry?.pair_spec ?? ""),
    glass_spec: String(entry?.glass_spec ?? ""),
    gas_spec: String(entry?.gas_spec ?? ""),
    screen_spec: String(entry?.screen_spec ?? ""),
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
    width_mm: Number(entry?.width_mm),
    height_mm: Number(entry?.height_mm),
    area_sqm: Number(getSashEntryArea(entry)),
    billable_area_sqm: billableArea,
    unit_price: toNonNegativeNumberOrZero(entry?.unit_price),
    calculated_amount: getSashCatalogEntryAmount(entry),
  };
}

export function buildSashEstimateSelectionPatch(entry) {
  const sashSpec = createSashSpecSnapshot(entry);
  const usesAreaPricing = sashSpec.pricing_basis === SASH_PRICING_BASES.AREA;
  const quantity = usesAreaPricing ? sashSpec.billable_area_sqm : 1;
  return {
    sashCatalogEntryId: sashSpec.sash_catalog_entry_id,
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
  if (spec.pricing_basis !== SASH_PRICING_BASES.AREA) return true;
  return hasExplicitSashWindowType(spec.window_type);
}

export function buildSashEstimateSpecPatch(spec, patch = {}) {
  const canonicalId = String(spec?.sash_catalog_entry_id ?? "").trim();
  if (!canonicalId) return {};

  const nextSpec = createSashSpecSnapshot({
    ...spec,
    ...patch,
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
