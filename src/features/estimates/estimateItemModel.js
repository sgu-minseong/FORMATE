import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
} from "../../shared/utils/numbers";
import {
  CONSTRUCTION_PRODUCT_KINDS,
} from "../constructionCatalog/constructionCatalogModel";
import { isSashItem } from "../sash/sashCatalogModel";
import {
  calculateEstimateRow,
  getLaborRateForResidence,
  toConstructionDays,
} from "./calculation";
import {
  applyLegacyEstimateHistoryChoice,
  getLegacyEstimateHistoryChoices,
  getLegacyEstimateHistoryChoiceValue,
} from "./estimateHistoryCompatibility";

const ESTIMATE_OPTION_KINDS = Object.freeze({
  VARIANT: "variant",
});

const ESTIMATE_OPTION_STATE_FIELDS = [
  "unit",
  "quantity",
  "laborCount",
  "constructionDays",
  "unitPrice",
  "laborRate",
  "baseQuantity",
  "baseLaborCount",
  "baseUnitPrice",
  "baseLaborRate",
  "specOptions",
  "hasTemplateRecord",
  "hasTemplateValue",
];

function encodeOptionPart(value) {
  return encodeURIComponent(`${value ?? ""}`);
}

function createVariantOptionId(subitemId) {
  return `${ESTIMATE_OPTION_KINDS.VARIANT}:${encodeOptionPart(subitemId)}`;
}

function hasTemplateValue(row) {
  return hasNumericInput(row?.quantity) || hasNumericInput(row?.labor_count ?? row?.laborCount);
}

function getEstimateOptionSource(subitem, residenceStatus) {
  const quantity = subitem?.quantity ?? "";
  const laborCount = subitem?.labor_count ?? "";
  const unitPrice = toNonNegativeNumberOrZero(subitem?.unit_price);
  const laborRate = getLaborRateForResidence(subitem, residenceStatus);
  return {
    subitemId: subitem?.id ?? "",
    unit: subitem?.unit ?? "식",
    quantity,
    laborCount,
    constructionDays: toConstructionDays(subitem?.construction_days),
    unitPrice,
    laborRate,
    baseQuantity: quantity,
    baseLaborCount: laborCount,
    baseUnitPrice: unitPrice,
    baseLaborRate: laborRate,
    specOptions: [],
    templateValueId: subitem?.template_value_id ?? null,
    hasTemplateRecord: Boolean(subitem?.template_value_id),
    hasTemplateValue: hasTemplateValue(subitem),
  };
}

function createEstimateOption({
  id,
  kind,
  label,
  subitem,
  residenceStatus,
  displayMaterial,
  selectedThickness = "",
  selectedSpecOption = "",
}) {
  return {
    id,
    kind,
    label,
    displayMaterial,
    selectedThickness,
    selectedSpecOption,
    ...getEstimateOptionSource(subitem, residenceStatus),
  };
}

function createVariantEstimateOption({
  subitem,
  label,
  material,
  residenceStatus,
  thickness,
}) {
  return createEstimateOption({
    id: createVariantOptionId(subitem.id),
    kind: ESTIMATE_OPTION_KINDS.VARIANT,
    label,
    subitem,
    residenceStatus,
    displayMaterial: `${material} ${label}`.trim(),
    selectedThickness: `${thickness ?? ""}`,
  });
}

function uniqueEstimateOptions(options) {
  const seenIds = new Set();
  return (options ?? []).filter((option) => {
    if (!option?.id || seenIds.has(option.id)) return false;
    seenIds.add(option.id);
    return true;
  });
}

function getInitialEstimateOption(options, initialOptionId = "") {
  if (initialOptionId) {
    const requestedOption = options.find((option) => option.id === initialOptionId);
    if (requestedOption) return requestedOption;
  }
  return options.find((option) => option.hasTemplateValue) ?? options[0] ?? null;
}

function createEstimateRowFromOptions(item, material, options, pyeong, initialOptionId = "") {
  const selectedOption = getInitialEstimateOption(options, initialOptionId);
  if (!selectedOption) return null;
  return calculateEstimateRow({
    itemId: item.id,
    itemName: item.name,
    itemType: item.item_type ?? "itemized",
    itemKind: item.item_kind ?? "standard",
    material,
    pyeong: Number(pyeong),
    contractor: "",
    expanded: false,
    selected: false,
    estimateOptions: options,
    thicknessOptions: [],
    selectedEstimateOptionId: selectedOption.id,
    subitemId: selectedOption.subitemId,
    unit: selectedOption.unit,
    quantity: selectedOption.quantity,
    laborCount: selectedOption.laborCount,
    constructionDays: selectedOption.constructionDays,
    unitPrice: selectedOption.unitPrice,
    laborRate: selectedOption.laborRate,
    baseQuantity: selectedOption.baseQuantity,
    baseLaborCount: selectedOption.baseLaborCount,
    baseUnitPrice: selectedOption.baseUnitPrice,
    baseLaborRate: selectedOption.baseLaborRate,
    specOptions: selectedOption.specOptions,
    selectedSpecOption: selectedOption.selectedSpecOption,
    selectedThickness: selectedOption.selectedThickness,
    template_value_id: selectedOption.templateValueId,
    hasTemplateRecord: selectedOption.hasTemplateRecord,
    hasTemplateValue: selectedOption.hasTemplateValue,
    displayMaterial: selectedOption.displayMaterial,
  });
}

function createEstimateRowFromSubitem(item, subitem, pyeong, residenceStatus = "empty", patch = {}) {
  const source = getEstimateOptionSource(subitem, residenceStatus);
  return calculateEstimateRow({
    itemId: item.id,
    itemName: item.name,
    itemType: item.item_type ?? "itemized",
    itemKind: item.item_kind ?? "standard",
    subitemId: subitem.id,
    material: subitem.name,
    displayMaterial: subitem.name,
    unit: source.unit,
    pyeong: Number(pyeong),
    baseQuantity: source.baseQuantity,
    baseUnitPrice: source.baseUnitPrice,
    baseLaborCount: source.baseLaborCount,
    baseLaborRate: source.baseLaborRate,
    specOptions: source.specOptions,
    selectedSpecOption: source.specOptions[0] ?? "",
    quantity: source.quantity,
    laborCount: source.laborCount,
    constructionDays: source.constructionDays,
    unitPrice: source.unitPrice,
    laborRate: source.laborRate,
    contractor: "",
    hasTemplateRecord: source.hasTemplateRecord,
    hasTemplateValue: source.hasTemplateValue,
    expanded: false,
    selected: false,
    ...patch,
  });
}

function buildStableVariantGroupRow(
  item,
  product,
  subitemsById,
  pyeong,
  residenceStatus
) {
  const material = `${product.displayName || product.label || ""}`.trim();
  // The base row suppresses its legacy presentation only; it is not selectable in a stable group.
  const variantOptions = product.variants.map((variant) => {
    return createVariantEstimateOption({
      subitem: subitemsById.get(variant.constructionSubitemId) ?? variant.subitem,
      label: variant.label,
      material,
      residenceStatus,
      thickness: variant.legacyNumericValue ?? "",
    });
  });
  const options = uniqueEstimateOptions(variantOptions);
  const row = createEstimateRowFromOptions(item, material, options, pyeong, options[0]?.id);
  return row ? { ...row, variantGroupId: product.variantGroupId } : null;
}

function buildEstimateItemRows(item, pyeong, residenceStatus) {
  const itemSubitems = item.subitems ?? [];
  const subitemsById = new Map(itemSubitems.map((subitem) => [subitem.id, subitem]));
  if (isSashItem(item)) {
    return itemSubitems.map((subitem) => createEstimateRowFromSubitem(item, subitem, pyeong, residenceStatus, {
      itemKind: "sash",
      unit: "식",
      quantity: 1,
      baseQuantity: 1,
      laborCount: 0,
      baseLaborCount: 0,
      laborRate: 0,
      baseLaborRate: 0,
      unitPrice: 0,
      baseUnitPrice: 0,
      sashCatalogEntryId: "",
      selectedSashCatalogEntryId: "",
      sashSpec: null,
      sashLocationKind: subitem.sash_location_kind ?? null,
      sashSpecialItemSelections: [],
      hasTemplateRecord: false,
      hasTemplateValue: false,
    }));
  }

  if (!Array.isArray(item.products)) {
    throw new Error("Estimate catalog items must include canonical construction products.");
  }

  return item.products.map((product) => (
    product.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
      ? buildStableVariantGroupRow(item, product, subitemsById, pyeong, residenceStatus)
      : createEstimateRowFromSubitem(
          item,
          subitemsById.get(product.subitemId) ?? product.subitem,
          pyeong,
          residenceStatus
        )
  )).filter(Boolean);
}

export function buildEstimateItemsFromTemplate(
  catalog,
  pyeong,
  residenceStatus = "empty"
) {
  return Object.fromEntries(
    (catalog ?? []).map((item) => [
      item.id,
      buildEstimateItemRows(item, pyeong, residenceStatus),
    ])
  );
}

export function getEstimateRowSpecChoices(row) {
  if ((row?.estimateOptions ?? []).length) {
    return uniqueEstimateOptions(row.estimateOptions).map((option) => ({
      key: option.id,
      type: option.kind,
      value: option.id,
      label: option.label,
    }));
  }

  return getLegacyEstimateHistoryChoices(row);
}

export function getEstimateRowSpecChoiceValue(row) {
  if (row?.selectedEstimateOptionId) return row.selectedEstimateOptionId;
  return getLegacyEstimateHistoryChoiceValue(row);
}

export function getEstimateRowSpecPatchFromChoice(value) {
  return value
    ? { selectedEstimateOptionId: `${value}` }
    : { selectedEstimateOptionId: "", selectedSpecOption: "", selectedThickness: "" };
}

function preserveCurrentEstimateOption(options, row) {
  if (!row?.selectedEstimateOptionId) return options;
  return options.map((option) => {
    if (option.id !== row.selectedEstimateOptionId) return option;
    return ESTIMATE_OPTION_STATE_FIELDS.reduce(
      (nextOption, field) => ({ ...nextOption, [field]: row[field] }),
      { ...option }
    );
  });
}

function applyRegisteredEstimateOption(row, option, options, patch) {
  return {
    ...row,
    ...patch,
    subitemId: option.subitemId,
    unit: option.unit,
    template_value_id: option.templateValueId,
    quantity: option.quantity,
    laborCount: option.laborCount,
    constructionDays: option.constructionDays,
    unitPrice: option.unitPrice,
    laborRate: option.laborRate,
    baseQuantity: option.baseQuantity,
    baseLaborCount: option.baseLaborCount,
    baseUnitPrice: option.baseUnitPrice,
    baseLaborRate: option.baseLaborRate,
    specOptions: option.specOptions ?? [],
    selectedSpecOption: option.selectedSpecOption,
    selectedThickness: option.selectedThickness,
    hasTemplateRecord: option.hasTemplateRecord,
    hasTemplateValue: option.hasTemplateValue,
    displayMaterial: option.displayMaterial,
    estimateOptions: options,
    selectedEstimateOptionId: option.id,
    selected: row.selected,
  };
}

export function applyEstimateRowPatch(row, patch) {
  if (!Object.hasOwn(patch ?? {}, "selectedEstimateOptionId")) {
    const nextRow = { ...row, ...patch };
    if (!(row?.estimateOptions ?? []).length) return nextRow;
    return {
      ...nextRow,
      estimateOptions: preserveCurrentEstimateOption(row.estimateOptions, nextRow),
    };
  }

  const optionId = `${patch.selectedEstimateOptionId ?? ""}`;
  const options = preserveCurrentEstimateOption(row?.estimateOptions ?? [], row);
  const registeredOption = options.find((option) => option.id === optionId);
  if (registeredOption) {
    return applyRegisteredEstimateOption(row, registeredOption, options, patch);
  }

  const legacyRow = applyLegacyEstimateHistoryChoice(row, optionId, patch);
  if (legacyRow) return legacyRow;
  return optionId ? row : { ...row, ...patch };
}
