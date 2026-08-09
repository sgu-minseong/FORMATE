import { DEFAULT_FLOORING_SPEC } from "../../shared/constants/estimateOptions";
import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
} from "../../shared/utils/numbers";
import {
  compareFlooringThickness,
  composeFlooringSubitemName,
  formatFlooringThickness,
  getFlooringThicknessGroups,
  isFlooringThicknessItem,
  normalizeSpecOptions,
} from "../priceTable/priceTableModel";
import {
  CONSTRUCTION_PRODUCT_KINDS,
  buildCanonicalConstructionProductModel,
} from "../constructionCatalog/constructionCatalogModel";
import { isSashItem } from "../sash/sashCatalogModel";
import {
  calculateEstimateRow,
  getLaborRateForResidence,
  toConstructionDays,
} from "./calculation";

const ESTIMATE_OPTION_KINDS = Object.freeze({
  VARIANT: "variant",
  BASE: "base",
  BASE_SPEC: "base-spec",
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

function decodeOptionPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

function createVariantOptionId(subitemId) {
  return `${ESTIMATE_OPTION_KINDS.VARIANT}:${encodeOptionPart(subitemId)}`;
}

function createBaseOptionId(subitemId) {
  return `${ESTIMATE_OPTION_KINDS.BASE}:${encodeOptionPart(subitemId)}`;
}

function createBaseSpecOptionId(subitemId, spec) {
  return `${ESTIMATE_OPTION_KINDS.BASE_SPEC}:${encodeOptionPart(subitemId)}:${encodeOptionPart(spec)}`;
}

function parseEstimateOptionId(optionId) {
  const normalized = `${optionId ?? ""}`;
  if (normalized.startsWith(`${ESTIMATE_OPTION_KINDS.BASE_SPEC}:`)) {
    const encodedParts = normalized.slice(ESTIMATE_OPTION_KINDS.BASE_SPEC.length + 1);
    const separatorIndex = encodedParts.indexOf(":");
    if (separatorIndex < 0) return null;
    return {
      kind: ESTIMATE_OPTION_KINDS.BASE_SPEC,
      subitemId: decodeOptionPart(encodedParts.slice(0, separatorIndex)),
      spec: decodeOptionPart(encodedParts.slice(separatorIndex + 1)),
    };
  }

  for (const kind of [ESTIMATE_OPTION_KINDS.VARIANT, ESTIMATE_OPTION_KINDS.BASE]) {
    if (normalized.startsWith(`${kind}:`)) {
      return {
        kind,
        subitemId: decodeOptionPart(normalized.slice(kind.length + 1)),
        spec: "",
      };
    }
  }

  return null;
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
    specOptions: normalizeSpecOptions(subitem?.spec_options),
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

function createBaseEstimateOptions(subitem, material, residenceStatus) {
  if (!subitem?.id) return [];
  const specOptions = normalizeSpecOptions(subitem.spec_options);
  if (!specOptions.length) {
    return [createEstimateOption({
      id: createBaseOptionId(subitem.id),
      kind: ESTIMATE_OPTION_KINDS.BASE,
      label: DEFAULT_FLOORING_SPEC,
      subitem,
      residenceStatus,
      displayMaterial: material,
    })];
  }

  return specOptions.map((spec) => createEstimateOption({
    id: createBaseSpecOptionId(subitem.id, spec),
    kind: ESTIMATE_OPTION_KINDS.BASE_SPEC,
    label: spec,
    subitem,
    residenceStatus,
    displayMaterial: `${material} ${spec}`.trim(),
    selectedSpecOption: spec,
  }));
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

function getThicknessCompatibilityOptions(options) {
  return (options ?? [])
    .filter((option) => option.kind === ESTIMATE_OPTION_KINDS.VARIANT && option.selectedThickness)
    .map((option) => ({
      thickness: option.selectedThickness,
      label: option.label,
      subitemId: option.subitemId,
      quantity: option.quantity,
      laborCount: option.laborCount,
      constructionDays: option.constructionDays,
      unitPrice: option.unitPrice,
      laborRate: option.laborRate,
      baseQuantity: option.baseQuantity,
      baseLaborCount: option.baseLaborCount,
      baseUnitPrice: option.baseUnitPrice,
      baseLaborRate: option.baseLaborRate,
      specOptions: option.specOptions,
      templateValueId: option.templateValueId,
      hasTemplateRecord: option.hasTemplateRecord,
      hasTemplateValue: option.hasTemplateValue,
    }));
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
    thicknessOptions: getThicknessCompatibilityOptions(options),
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

function buildStableVariantGroupRow(item, product, pyeong, residenceStatus) {
  const material = `${product.displayName || product.label || ""}`.trim();
  // The base row suppresses its legacy presentation only; it is not selectable in a stable group.
  const variantOptions = product.variants.map((variant) => {
    return createVariantEstimateOption({
      subitem: variant.subitem,
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

function buildLegacyFlooringRows(item, subitems, pyeong, residenceStatus) {
  return getFlooringThicknessGroups(subitems).map((group) => {
    const optionKeys = Object.keys(group.options).sort(compareFlooringThickness);
    const baseSubitem = group.options[DEFAULT_FLOORING_SPEC] ?? null;
    const baseOptions = createBaseEstimateOptions(baseSubitem, group.baseName, residenceStatus);
    const variantOptions = optionKeys
      .filter((thickness) => thickness !== DEFAULT_FLOORING_SPEC)
      .map((thickness) => {
        const subitem = group.options[thickness];
        return createVariantEstimateOption({
          subitem,
          label: formatFlooringThickness(thickness),
          material: group.baseName,
          residenceStatus,
          thickness,
        });
      });
    const options = uniqueEstimateOptions([...baseOptions, ...variantOptions]);
    return createEstimateRowFromOptions(item, group.baseName, options, pyeong);
  }).filter(Boolean);
}

function buildEstimateItemRows(item, pyeong, residenceStatus, variantGroups) {
  const itemSubitems = item.subitems ?? [];
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
      hasTemplateRecord: false,
      hasTemplateValue: false,
    }));
  }

  const productModel = buildCanonicalConstructionProductModel({
    subitems: itemSubitems,
    variantGroups: (variantGroups ?? []).filter((group) => (
      `${group?.construction_item_id ?? group?.constructionItemId ?? ""}` === `${item.id}`
    )),
  });
  const sections = productModel.products;
  const stableRowsBySectionId = new Map();
  sections
    .filter((section) => section.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP)
    .forEach((section) => {
      const row = buildStableVariantGroupRow(item, section, pyeong, residenceStatus);
      if (row) stableRowsBySectionId.set(section.id, row);
    });

  const ungroupedSections = sections.filter(
    (section) => section.kind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM
  );
  if (!stableRowsBySectionId.size) {
    return isFlooringThicknessItem(item)
      ? buildLegacyFlooringRows(
          item,
          ungroupedSections.map((section) => section.subitem),
          pyeong,
          residenceStatus
        )
      : ungroupedSections.map(
          (section) => createEstimateRowFromSubitem(item, section.subitem, pyeong, residenceStatus)
        );
  }

  if (!isFlooringThicknessItem(item)) {
    return sections.map((section) => (
      section.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
        ? stableRowsBySectionId.get(section.id)
        : createEstimateRowFromSubitem(item, section.subitem, pyeong, residenceStatus)
    )).filter(Boolean);
  }

  const legacyRows = buildLegacyFlooringRows(
    item,
    ungroupedSections.map((section) => section.subitem),
    pyeong,
    residenceStatus
  );
  const legacyRowsByMaterial = new Map(legacyRows.map((row) => [row.material, row]));
  const emittedLegacyMaterials = new Set();
  const rows = [];
  sections.forEach((section) => {
    if (section.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) {
      const row = stableRowsBySectionId.get(section.id);
      if (row) rows.push(row);
      return;
    }

    const group = getFlooringThicknessGroups([section.subitem])[0];
    const material = group?.baseName ?? section.subitem.name;
    if (emittedLegacyMaterials.has(material)) return;
    const row = legacyRowsByMaterial.get(material);
    if (row) rows.push(row);
    emittedLegacyMaterials.add(material);
  });
  return rows;
}

export function buildEstimateItemsFromTemplate(
  catalog,
  pyeong,
  residenceStatus = "empty",
  variantGroups = []
) {
  return Object.fromEntries(
    (catalog ?? []).map((item) => [
      item.id,
      buildEstimateItemRows(item, pyeong, residenceStatus, variantGroups),
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

  const thicknessChoices = (row?.thicknessOptions ?? [])
    .filter((option) => option.subitemId)
    .map((option) => ({
      key: createVariantOptionId(option.subitemId),
      type: ESTIMATE_OPTION_KINDS.VARIANT,
      value: option.subitemId,
      label: option.label ?? formatFlooringThickness(option.thickness),
    }));
  const specChoices = row?.subitemId
    ? normalizeSpecOptions(row.specOptions).map((spec) => ({
        key: createBaseSpecOptionId(row.subitemId, spec),
        type: ESTIMATE_OPTION_KINDS.BASE_SPEC,
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

export function getEstimateRowSpecChoiceValue(row) {
  if (row?.selectedEstimateOptionId) return row.selectedEstimateOptionId;
  if (row?.selectedSpecOption && row?.subitemId) {
    return createBaseSpecOptionId(row.subitemId, row.selectedSpecOption);
  }
  if (row?.selectedThickness) {
    const option = (row.thicknessOptions ?? []).find((entry) => (
      entry.subitemId === row.subitemId
      || `${entry.thickness}` === `${row.selectedThickness}`
    ));
    if (option?.subitemId) return createVariantOptionId(option.subitemId);
  }
  return "";
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
    if (patch?.selectedThickness) {
      const registeredVariant = (row?.estimateOptions ?? []).find((option) => (
        option.kind === ESTIMATE_OPTION_KINDS.VARIANT
        && `${option.selectedThickness}` === `${patch.selectedThickness}`
      ));
      if (registeredVariant) {
        return applyEstimateRowPatch(row, {
          ...patch,
          selectedEstimateOptionId: registeredVariant.id,
        });
      }
      const legacyVariant = (row?.thicknessOptions ?? []).find(
        (option) => `${option.thickness}` === `${patch.selectedThickness}`
      );
      if (legacyVariant?.subitemId) {
        return applyEstimateRowPatch(row, {
          ...patch,
          selectedEstimateOptionId: createVariantOptionId(legacyVariant.subitemId),
        });
      }
    }
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

  const parsedOption = parseEstimateOptionId(optionId);
  if (parsedOption?.kind === ESTIMATE_OPTION_KINDS.VARIANT) {
    const matchedOption = (row?.thicknessOptions ?? []).find(
      (option) => `${option.subitemId ?? ""}` === parsedOption.subitemId
    );
    if (matchedOption) {
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
        displayMaterial: composeFlooringSubitemName(row.material, matchedOption.thickness),
      };
    }
  }

  if (parsedOption?.kind === ESTIMATE_OPTION_KINDS.BASE_SPEC) {
    return {
      ...row,
      ...patch,
      selectedSpecOption: parsedOption.spec,
      selectedThickness: "",
    };
  }

  return { ...row, ...patch };
}
