import {
  DEFAULT_FLOORING_SPEC,
  FLOORING_THICKNESS_OPTIONS,
} from "../../shared/constants/estimateOptions";

export const ESTIMATE_HISTORY_COMPATIBILITY_KIND = "saved-estimate-snapshot";

const LEGACY_ESTIMATE_OPTION_KINDS = Object.freeze({
  VARIANT: "variant",
  BASE_SPEC: "base-spec",
});

function encodeOptionPart(value) {
  return encodeURIComponent(`${value ?? ""}`);
}

function decodeOptionPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function createLegacyVariantOptionId(subitemId) {
  return `${LEGACY_ESTIMATE_OPTION_KINDS.VARIANT}:${encodeOptionPart(subitemId)}`;
}

function createLegacyBaseSpecOptionId(subitemId, spec) {
  return `${LEGACY_ESTIMATE_OPTION_KINDS.BASE_SPEC}:${encodeOptionPart(subitemId)}:${encodeOptionPart(spec)}`;
}

function parseLegacyEstimateOptionId(optionId) {
  const normalized = `${optionId ?? ""}`;
  if (normalized.startsWith(`${LEGACY_ESTIMATE_OPTION_KINDS.BASE_SPEC}:`)) {
    const encodedParts = normalized.slice(LEGACY_ESTIMATE_OPTION_KINDS.BASE_SPEC.length + 1);
    const separatorIndex = encodedParts.indexOf(":");
    if (separatorIndex < 0) return null;
    return {
      kind: LEGACY_ESTIMATE_OPTION_KINDS.BASE_SPEC,
      subitemId: decodeOptionPart(encodedParts.slice(0, separatorIndex)),
      spec: decodeOptionPart(encodedParts.slice(separatorIndex + 1)),
    };
  }
  if (normalized.startsWith(`${LEGACY_ESTIMATE_OPTION_KINDS.VARIANT}:`)) {
    return {
      kind: LEGACY_ESTIMATE_OPTION_KINDS.VARIANT,
      subitemId: decodeOptionPart(normalized.slice(LEGACY_ESTIMATE_OPTION_KINDS.VARIANT.length + 1)),
      spec: "",
    };
  }
  return null;
}

export function isEstimateHistoryCompatibilityRow(row) {
  return row?.estimateHistoryCompatibility === ESTIMATE_HISTORY_COMPATIBILITY_KIND;
}

export function normalizeLegacyFlooringThickness(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw || raw === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;

  const numericValue = Number(raw.replace(/t$/i, ""));
  if (!Number.isFinite(numericValue)) return DEFAULT_FLOORING_SPEC;

  const normalized = numericValue.toFixed(1);
  return FLOORING_THICKNESS_OPTIONS.includes(normalized)
    ? normalized
    : DEFAULT_FLOORING_SPEC;
}

export function formatLegacyFlooringThickness(thickness) {
  const normalized = normalizeLegacyFlooringThickness(thickness);
  if (normalized === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;
  const numericValue = Number(normalized);
  const displayValue = Number.isInteger(numericValue) ? `${numericValue}` : normalized;
  return `${displayValue}T`;
}

export function composeLegacyFlooringDisplayName(baseName, thickness) {
  const nextBaseName = `${baseName ?? ""}`.trim() || "장판";
  const normalizedThickness = normalizeLegacyFlooringThickness(thickness);
  if (normalizedThickness === DEFAULT_FLOORING_SPEC) return nextBaseName;
  return `${nextBaseName} ${formatLegacyFlooringThickness(normalizedThickness)}`;
}

export function normalizeLegacyEstimateSpecOptions(value) {
  let rawOptions = value;
  if (typeof rawOptions === "string") {
    try {
      rawOptions = JSON.parse(rawOptions);
    } catch {
      rawOptions = [];
    }
  }
  if (!Array.isArray(rawOptions)) return [];

  return [
    ...new Set(
      rawOptions
        .map((entry) => `${entry ?? ""}`.trim())
        .filter(
          (entry) =>
            entry
            && entry !== DEFAULT_FLOORING_SPEC
            && entry !== "기본(삭제예정)"
        )
    ),
  ];
}

export function getLegacyEstimateHistoryChoices(row) {
  if (!isEstimateHistoryCompatibilityRow(row)) return [];

  const thicknessChoices = (row?.thicknessOptions ?? [])
    .filter((option) => option.subitemId)
    .map((option) => ({
      key: createLegacyVariantOptionId(option.subitemId),
      type: LEGACY_ESTIMATE_OPTION_KINDS.VARIANT,
      value: option.subitemId,
      label: option.label ?? formatLegacyFlooringThickness(option.thickness),
    }));
  const specChoices = row?.subitemId
    ? normalizeLegacyEstimateSpecOptions(row.specOptions).map((spec) => ({
        key: createLegacyBaseSpecOptionId(row.subitemId, spec),
        type: LEGACY_ESTIMATE_OPTION_KINDS.BASE_SPEC,
        value: spec,
        label: spec,
      }))
    : [];
  const seenIds = new Set();
  return [...thicknessChoices, ...specChoices].filter((option) => {
    if (!option.key || seenIds.has(option.key)) return false;
    seenIds.add(option.key);
    return true;
  });
}

export function getLegacyEstimateHistoryChoiceValue(row) {
  if (!isEstimateHistoryCompatibilityRow(row)) return "";
  if (row?.selectedSpecOption && row?.subitemId) {
    return createLegacyBaseSpecOptionId(row.subitemId, row.selectedSpecOption);
  }
  if (row?.selectedThickness) {
    const option = (row.thicknessOptions ?? []).find((entry) => (
      entry.subitemId === row.subitemId
      || `${entry.thickness}` === `${row.selectedThickness}`
    ));
    if (option?.subitemId) return createLegacyVariantOptionId(option.subitemId);
  }
  return "";
}

export function applyLegacyEstimateHistoryChoice(row, optionId, patch = {}) {
  if (!isEstimateHistoryCompatibilityRow(row)) return null;
  const parsedOption = parseLegacyEstimateOptionId(optionId);
  if (parsedOption?.kind === LEGACY_ESTIMATE_OPTION_KINDS.VARIANT) {
    const matchedOption = (row?.thicknessOptions ?? []).find(
      (option) => `${option.subitemId ?? ""}` === parsedOption.subitemId
    );
    if (!matchedOption) return null;
    return {
      ...row,
      ...patch,
      subitemId: matchedOption.subitemId,
      template_value_id: matchedOption.templateValueId,
      quantity: matchedOption.quantity,
      laborCount: matchedOption.laborCount,
      constructionDays: matchedOption.constructionDays,
      unitPrice: matchedOption.unitPrice,
      laborRate: matchedOption.laborRate,
      baseQuantity: matchedOption.baseQuantity,
      baseLaborCount: matchedOption.baseLaborCount,
      baseUnitPrice: matchedOption.baseUnitPrice,
      baseLaborRate: matchedOption.baseLaborRate,
      specOptions: matchedOption.specOptions ?? [],
      selectedSpecOption: "",
      selectedThickness: matchedOption.thickness,
      hasTemplateRecord: matchedOption.hasTemplateRecord,
      hasTemplateValue: matchedOption.hasTemplateValue,
      selected: row.selected,
      displayMaterial: composeLegacyFlooringDisplayName(row.material, matchedOption.thickness),
    };
  }
  if (parsedOption?.kind === LEGACY_ESTIMATE_OPTION_KINDS.BASE_SPEC) {
    return {
      ...row,
      ...patch,
      selectedSpecOption: parsedOption.spec,
      selectedThickness: "",
    };
  }
  return null;
}

export function getLegacyEstimateHistorySpecLabel(row) {
  if (!isEstimateHistoryCompatibilityRow(row)) return "";
  if (row?.selectedSpecOption) return `${row.selectedSpecOption}`.trim();
  if (row?.selectedThickness) {
    const normalizedThickness = normalizeLegacyFlooringThickness(row.selectedThickness);
    if (normalizedThickness !== DEFAULT_FLOORING_SPEC) {
      return formatLegacyFlooringThickness(normalizedThickness);
    }
  }
  return `${row?.spec ?? ""}`.trim();
}
