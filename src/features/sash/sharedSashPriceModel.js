import { hasNumericInput, toNullableNumber } from "../../shared/utils/numbers";
import {
  getSashCategoryLabel,
  getSashFrameSpec,
  hasExplicitSashWindowType,
} from "./sashCatalogModel";

export const SASH_PRICE_MATCH = Object.freeze({
  HIGH: "high",
  PARTIAL: "partial",
  SPEC_DIFFERENCE: "spec_difference",
});

export const SASH_PRICE_COMPARISON = Object.freeze({
  SAME: "same",
  DIFFERENT: "different",
  SOURCE_MISSING: "source_missing",
  CANDIDATE_MISSING: "candidate_missing",
  BOTH_MISSING: "both_missing",
});

export const SASH_PRICE_SPEC_FIELDS = Object.freeze([
  { key: "brand", label: "제조사" },
  { key: "frame_spec", label: "틀" },
  { key: "pair_spec", label: "페어" },
  { key: "glass_spec", label: "유리" },
  { key: "glass_thickness", label: "유리 두께" },
  { key: "gas_spec", label: "가스" },
  { key: "screen_spec", label: "망" },
]);

export const SASH_PRICE_IDENTITY_FIELD_KEYS = new Set([
  "width_mm",
  "height_mm",
  "window_type",
  "product_type",
  ...SASH_PRICE_SPEC_FIELDS.map(({ key }) => key),
]);

function normalizeComparisonText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function hasSashPriceCandidateAnchor(entry) {
  return hasNumericInput(entry?.width_mm)
    && hasNumericInput(entry?.height_mm)
    && toNullableNumber(entry.width_mm) > 0
    && toNullableNumber(entry.height_mm) > 0
    && hasExplicitSashWindowType(entry?.window_type);
}

export function compareSashPriceSpec(source, candidate) {
  return SASH_PRICE_SPEC_FIELDS.map(({ key, label }) => {
    const sourceValue = normalizeComparisonText(
      key === "frame_spec" ? getSashFrameSpec(source) : source?.[key]
    );
    const candidateValue = normalizeComparisonText(
      key === "frame_spec" ? getSashFrameSpec(candidate) : candidate?.[key]
    );
    let status = SASH_PRICE_COMPARISON.SAME;
    if (!sourceValue && !candidateValue) status = SASH_PRICE_COMPARISON.BOTH_MISSING;
    else if (!sourceValue) status = SASH_PRICE_COMPARISON.SOURCE_MISSING;
    else if (!candidateValue) status = SASH_PRICE_COMPARISON.CANDIDATE_MISSING;
    else if (sourceValue !== candidateValue) status = SASH_PRICE_COMPARISON.DIFFERENT;
    return { candidateValue, key, label, sourceValue, status };
  });
}

export function classifySashPriceCandidate(source, candidate) {
  if (!hasSashPriceCandidateAnchor(source) || !hasSashPriceCandidateAnchor(candidate)) {
    return null;
  }
  if (
    toNullableNumber(source.width_mm) !== toNullableNumber(candidate.width_mm)
    || toNullableNumber(source.height_mm) !== toNullableNumber(candidate.height_mm)
    || source.window_type !== candidate.window_type
  ) return null;

  const comparisons = compareSashPriceSpec(source, candidate);
  const hasDifference = comparisons.some(({ status }) => (
    status === SASH_PRICE_COMPARISON.DIFFERENT
  ));
  const hasMissingSide = comparisons.some(({ status }) => (
    status === SASH_PRICE_COMPARISON.SOURCE_MISSING
    || status === SASH_PRICE_COMPARISON.CANDIDATE_MISSING
    || status === SASH_PRICE_COMPARISON.BOTH_MISSING
  ));
  return {
    classification: hasDifference
      ? SASH_PRICE_MATCH.SPEC_DIFFERENCE
      : hasMissingSide
        ? SASH_PRICE_MATCH.PARTIAL
        : SASH_PRICE_MATCH.HIGH,
    comparisons,
  };
}

export function getSashPriceContextLabel(entry) {
  const conditionNames = entry?.sashConditionNames ?? [];
  const subitemName = entry?.construction_subitem?.name
    ?? entry?.construction_subitems?.name
    ?? "샷시 항목";
  return [conditionNames.join(", "), getSashCategoryLabel(entry), subitemName]
    .filter(Boolean)
    .join(" · ");
}

export function buildSharedPriceExpectedRows(rows = []) {
  return [...new Map(rows.map((row) => [row.id, row])).values()].map((row) => ({
    id: row.id,
    sash_price_id: row.sash_price_id || null,
    updated_at: row.updated_at,
  }));
}

export function buildSharedPriceExpectedGroups(rows = []) {
  return [...new Map(rows
    .filter((row) => row.sash_price_id)
    .map((row) => [row.sash_price_id, row])).values()].map((row) => ({
    id: row.sash_price_id,
    updated_at: row.sash_price?.updated_at ?? null,
  }));
}
