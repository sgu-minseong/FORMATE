export const CONSTRUCTION_PRODUCT_KINDS = Object.freeze({
  VARIANT_GROUP: "variant-group",
  SUBITEM: "subitem",
});

export const CONSTRUCTION_VARIANT_VALUE_TYPES = Object.freeze({
  NUMBER: "number",
  TEXT: "text",
});

export const CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES = Object.freeze({
  DUPLICATE_GROUP_ID: "duplicate-variant-group-id",
  DUPLICATE_SUBITEM_ID: "duplicate-construction-subitem-id",
  DUPLICATE_VARIANT_IDENTITY: "duplicate-variant-identity",
  INCOMPLETE_VARIANT_METADATA: "incomplete-variant-metadata",
  INVALID_BASE_SUBITEM: "invalid-base-subitem",
  INVALID_CONSTRUCTION_ITEM: "invalid-construction-item",
  INVALID_VARIANT_GROUP: "invalid-variant-group",
  INVALID_VARIANT_WRITE: "invalid-variant-write",
  INVALID_VARIANT_VALUE_TYPE: "invalid-variant-value-type",
  MISSING_VARIANT_GROUP: "missing-variant-group",
  VARIANT_ITEM_MISMATCH: "variant-item-mismatch",
  VARIANT_VALUE_TYPE_MISMATCH: "variant-value-type-mismatch",
});

export class ConstructionCatalogContractError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.name = "ConstructionCatalogContractError";
    this.code = code;
    this.context = context;
  }
}

function normalizeId(value) {
  return `${value ?? ""}`.trim();
}

function normalizeSortOrder(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeNumericVariantValue(value) {
  if (value === null || value === undefined || `${value}`.trim() === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeTextVariantValue(value) {
  if (value === null || value === undefined) return null;
  const textValue = `${value}`.trim();
  return textValue || null;
}

function normalizeVariantValueType(value) {
  const normalized = `${value ?? CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER}`
    .trim()
    .toLowerCase();
  return Object.values(CONSTRUCTION_VARIANT_VALUE_TYPES).includes(normalized)
    ? normalized
    : "";
}

function getSubitemItemId(subitem = {}) {
  return normalizeId(subitem.item_id ?? subitem.itemId);
}

function getSubitemSortOrder(subitem = {}) {
  return normalizeSortOrder(subitem.sort_order ?? subitem.sortOrder);
}

function getArchivedAt(row = {}) {
  return row.archived_at ?? row.archivedAt ?? null;
}

function getVariantMetadataState(subitem = {}) {
  const rawGroupId = subitem.variant_group_id ?? subitem.variantGroupId;
  const rawNumericValue = subitem.variant_value ?? subitem.variantValue;
  const rawTextValue = subitem.variant_value_text ?? subitem.variantValueText;
  const rawUnit = subitem.variant_unit ?? subitem.variantUnit;
  const groupId = normalizeId(rawGroupId);
  const numericValueProvided = rawNumericValue !== null && rawNumericValue !== undefined;
  const textValueProvided = rawTextValue !== null && rawTextValue !== undefined;
  const unit = `${rawUnit ?? ""}`.trim();
  const hasAnyMetadata = (
    rawGroupId !== null && rawGroupId !== undefined
  )
    || numericValueProvided
    || textValueProvided
    || (rawUnit !== null && rawUnit !== undefined);

  if (!hasAnyMetadata) return { kind: "standard", metadata: null };

  if (!groupId || numericValueProvided === textValueProvided) {
    return { kind: "invalid", metadata: null };
  }

  if (numericValueProvided) {
    const value = normalizeNumericVariantValue(rawNumericValue);
    if (value === null || !unit) return { kind: "invalid", metadata: null };
    return {
      kind: "variant",
      metadata: {
        groupId,
        valueType: CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER,
        value,
        numericValue: value,
        textValue: null,
        unit,
        unitKey: unit.toLowerCase(),
      },
    };
  }

  const value = normalizeTextVariantValue(rawTextValue);
  if (value === null) return { kind: "invalid", metadata: null };

  return {
    kind: "variant",
    metadata: {
      groupId,
      valueType: CONSTRUCTION_VARIANT_VALUE_TYPES.TEXT,
      value,
      numericValue: null,
      textValue: value,
      valueKey: value.toLowerCase(),
      unit: unit || null,
      unitKey: unit.toLowerCase(),
    },
  };
}

export function normalizeConstructionSubitemVariantGroup(group = {}) {
  return {
    id: normalizeId(group.id),
    constructionItemId: normalizeId(
      group.construction_item_id ?? group.constructionItemId
    ),
    displayName: `${group.display_name ?? group.displayName ?? ""}`.trim(),
    baseSubitemId: normalizeId(
      group.base_subitem_id ?? group.baseSubitemId
    ) || null,
    variantKind: `${group.variant_kind ?? group.variantKind ?? ""}`.trim(),
    variantValueType: normalizeVariantValueType(
      group.variant_value_type ?? group.variantValueType
    ),
    sortOrder: normalizeSortOrder(group.sort_order ?? group.sortOrder),
    archivedAt: getArchivedAt(group),
  };
}

export function getConstructionSubitemVariantMetadata(subitem = {}) {
  const state = getVariantMetadataState(subitem);
  return state.kind === "variant" ? state.metadata : null;
}

export function formatConstructionSubitemVariantLabel(value, unit) {
  const normalizedValue = typeof value === "number"
    ? (Number.isFinite(value) ? `${value}` : "")
    : `${value ?? ""}`.trim();
  const normalizedUnit = `${unit ?? ""}`.trim();
  if (!normalizedValue) return "";
  return `${normalizedValue}${normalizedUnit}`;
}

/**
 * Builds the persistence payload for a user-authored canonical product group.
 * Display fields remain presentation metadata; the database-generated group ID
 * is the only product identity used after insertion.
 */
export function buildConstructionVariantGroupWritePayload({
  constructionItemId,
  displayName,
  variantKind,
  variantValueType,
  sortOrder = 0,
} = {}) {
  const normalizedItemId = normalizeId(constructionItemId);
  const normalizedDisplayName = `${displayName ?? ""}`.trim();
  const normalizedVariantKind = `${variantKind ?? ""}`.trim();
  const normalizedValueType = normalizeVariantValueType(variantValueType);

  if (
    !normalizedItemId
    || !normalizedDisplayName
    || !normalizedVariantKind
    || !normalizedValueType
  ) {
    throw createContractError(
      CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_WRITE,
      "A canonical variant group write requires explicit product and variant metadata.",
      {
        constructionItemId: normalizedItemId,
        displayName: normalizedDisplayName,
        variantKind: normalizedVariantKind,
        variantValueType: normalizedValueType,
      }
    );
  }

  return {
    construction_item_id: normalizedItemId,
    display_name: normalizedDisplayName,
    variant_kind: normalizedVariantKind,
    variant_value_type: normalizedValueType,
    sort_order: normalizeSortOrder(sortOrder),
    archived_at: null,
  };
}

/**
 * Builds the mutually-exclusive numeric/text metadata written to one stable
 * construction_subitem UUID. No display name, label, or spec_options value is
 * consulted to determine identity.
 */
export function buildConstructionVariantMetadataWritePayload({
  variantGroupId,
  variantValueType,
  value,
  unit,
} = {}) {
  const normalizedGroupId = normalizeId(variantGroupId);
  const normalizedValueType = normalizeVariantValueType(variantValueType);
  const normalizedUnit = `${unit ?? ""}`.trim();

  if (!normalizedGroupId || !normalizedValueType) {
    throw createContractError(
      CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_WRITE,
      "A canonical variant write requires an explicit group ID and value type.",
      { variantGroupId: normalizedGroupId, variantValueType: normalizedValueType }
    );
  }

  if (normalizedValueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER) {
    const numericValue = normalizeNumericVariantValue(value);
    if (numericValue === null || !normalizedUnit) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_WRITE,
        "A numeric canonical variant requires a finite value and non-blank unit.",
        { variantGroupId: normalizedGroupId, value, unit: normalizedUnit }
      );
    }
    return {
      variant_group_id: normalizedGroupId,
      variant_value: numericValue,
      variant_value_text: null,
      variant_unit: normalizedUnit,
      archived_at: null,
    };
  }

  const textValue = normalizeTextVariantValue(value);
  if (textValue === null) {
    throw createContractError(
      CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_WRITE,
      "A text canonical variant requires a non-blank value.",
      { variantGroupId: normalizedGroupId, value }
    );
  }
  return {
    variant_group_id: normalizedGroupId,
    variant_value: null,
    variant_value_text: textValue,
    variant_unit: normalizedUnit || null,
    archived_at: null,
  };
}

/**
 * Creates a new selectable variant row with intentionally empty commercial
 * values. Work-unit presentation may be inherited, but price/labor values are
 * never copied from the currently selected sibling variant.
 */
export function buildConstructionVariantSubitemInsertPayload({
  constructionItemId,
  variantGroupId,
  displayName,
  variantValueType,
  value,
  unit,
  workUnit = "평",
  sortOrder = 0,
} = {}) {
  const normalizedItemId = normalizeId(constructionItemId);
  const normalizedDisplayName = `${displayName ?? ""}`.trim();
  const metadata = buildConstructionVariantMetadataWritePayload({
    variantGroupId,
    variantValueType,
    value,
    unit,
  });
  if (!normalizedItemId || !normalizedDisplayName) {
    throw createContractError(
      CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_WRITE,
      "A canonical variant row requires an owning construction item and product label.",
      { constructionItemId: normalizedItemId, displayName: normalizedDisplayName }
    );
  }

  const variantLabel = formatConstructionSubitemVariantLabel(
    metadata.variant_value ?? metadata.variant_value_text,
    metadata.variant_unit
  );
  return {
    item_id: normalizedItemId,
    name: `${normalizedDisplayName} ${variantLabel}`.trim(),
    unit: `${workUnit ?? ""}`.trim() || "평",
    cost_price: 0,
    cost_unit: "",
    unit_price: 0,
    labor_rate: 0,
    labor_rate_empty: 0,
    labor_rate_occupied: 0,
    sort_order: normalizeSortOrder(sortOrder),
    ...metadata,
  };
}

function createContractError(code, message, context) {
  return new ConstructionCatalogContractError(code, message, context);
}

function compareCanonicalVariants(a, b) {
  if (
    a.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
    && b.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
  ) {
    return a.numericValue - b.numericValue
      || a.unitKey.localeCompare(b.unitKey)
      || a.sortOrder - b.sortOrder
      || a.constructionSubitemId.localeCompare(b.constructionSubitemId);
  }
  return a.sortOrder - b.sortOrder
    || a.valueKey.localeCompare(b.valueKey)
    || a.unitKey.localeCompare(b.unitKey)
    || a.constructionSubitemId.localeCompare(b.constructionSubitemId);
}

function compareCanonicalProducts(a, b) {
  return a.sortOrder - b.sortOrder
    || a.id.localeCompare(b.id);
}

function validateBaseSubitem({ group, subitemsById, baseOwners }) {
  if (!group.baseSubitemId) return null;
  const baseSubitem = subitemsById.get(group.baseSubitemId);
  const baseMetadataState = getVariantMetadataState(baseSubitem);
  const currentOwner = baseOwners.get(group.baseSubitemId);

  if (
    !baseSubitem
    || getSubitemItemId(baseSubitem) !== group.constructionItemId
    || baseMetadataState.kind !== "standard"
    || (currentOwner && currentOwner !== group.id)
  ) {
    throw createContractError(
      CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_BASE_SUBITEM,
      "A canonical variant group has an invalid or ambiguous base subitem.",
      { groupId: group.id, baseSubitemId: group.baseSubitemId }
    );
  }

  baseOwners.set(group.baseSubitemId, group.id);
  return baseSubitem;
}

function createCanonicalVariant(group, subitem, metadata) {
  const constructionSubitemId = normalizeId(subitem.id);
  return {
    id: constructionSubitemId,
    constructionSubitemId,
    productId: group.id,
    variantGroupId: group.id,
    variantKind: group.variantKind,
    metadata: {
      kind: group.variantKind,
      valueType: metadata.valueType,
      value: metadata.value,
      unit: metadata.unit,
    },
    valueType: metadata.valueType,
    value: metadata.value,
    numericValue: metadata.numericValue,
    textValue: metadata.textValue,
    legacyNumericValue: metadata.numericValue,
    valueKey: metadata.valueType === CONSTRUCTION_VARIANT_VALUE_TYPES.NUMBER
      ? `${metadata.numericValue}`
      : metadata.valueKey,
    unit: metadata.unit,
    unitKey: metadata.unitKey,
    label: formatConstructionSubitemVariantLabel(metadata.value, metadata.unit),
    sortOrder: getSubitemSortOrder(subitem),
    archivedAt: getArchivedAt(subitem),
    isArchived: Boolean(getArchivedAt(subitem)),
    subitem,
  };
}

/**
 * Builds the canonical logical-product view over construction_subitems.
 *
 * Stable products are identified only by variant_group_id. Their selectable
 * variants are identified only by construction_subitem_id. base_subitem_id is
 * presentation compatibility metadata and is never added to variants.
 * A group declares one value representation: legacy-compatible number or
 * arbitrary text. Active and archived rows remain in one ID graph, while only
 * active products and variants are exposed through products/selectable IDs.
 * Standard subitems remain independent products identified by their own IDs.
 */
export function buildCanonicalConstructionProductModel({
  subitems = [],
  variantGroups = [],
} = {}) {
  const allSubitems = subitems ?? [];
  const subitemsById = new Map();
  const subitemIndexes = new Map();

  allSubitems.forEach((subitem, index) => {
    const subitemId = normalizeId(subitem?.id);
    if (!subitemId || subitemsById.has(subitemId)) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.DUPLICATE_SUBITEM_ID,
        "A canonical construction catalog requires unique construction_subitem IDs.",
        { constructionSubitemId: subitemId }
      );
    }
    subitemsById.set(subitemId, subitem);
    subitemIndexes.set(subitemId, index);
  });

  const groupsById = new Map();
  (variantGroups ?? [])
    .map(normalizeConstructionSubitemVariantGroup)
    .forEach((group) => {
      if (!group.variantValueType) {
        throw createContractError(
          CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_VALUE_TYPE,
          "A canonical variant group has an unsupported value representation.",
          { groupId: group.id }
        );
      }
      if (
        !group.id
        || !group.constructionItemId
        || !group.displayName
        || !group.variantKind
      ) {
        throw createContractError(
          CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_VARIANT_GROUP,
          "A canonical variant group is missing required stable metadata.",
          { groupId: group.id }
        );
      }
      if (groupsById.has(group.id)) {
        throw createContractError(
          CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.DUPLICATE_GROUP_ID,
          "A canonical construction catalog requires unique variant group IDs.",
          { groupId: group.id }
        );
      }
      groupsById.set(group.id, { ...group, variants: [] });
  });

  const ungroupedSubitems = [];
  allSubitems.forEach((subitem) => {
    const metadataState = getVariantMetadataState(subitem);
    const constructionSubitemId = normalizeId(subitem.id);
    const constructionItemId = getSubitemItemId(subitem);

    if (metadataState.kind === "invalid") {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INCOMPLETE_VARIANT_METADATA,
        "A construction subitem has incomplete variant metadata.",
        { constructionSubitemId }
      );
    }

    if (metadataState.kind === "standard") {
      ungroupedSubitems.push(subitem);
      return;
    }

    const metadata = metadataState.metadata;
    const group = groupsById.get(metadata.groupId);
    if (!group) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.MISSING_VARIANT_GROUP,
        "Canonical construction catalog variant group metadata could not be loaded.",
        { constructionSubitemId, variantGroupId: metadata.groupId }
      );
    }
    if (!constructionItemId || group.constructionItemId !== constructionItemId) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.VARIANT_ITEM_MISMATCH,
        "A construction subitem and its variant group belong to different construction items.",
        {
          constructionSubitemId,
          constructionItemId,
          variantGroupId: group.id,
          groupConstructionItemId: group.constructionItemId,
        }
      );
    }
    if (metadata.valueType !== group.variantValueType) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.VARIANT_VALUE_TYPE_MISMATCH,
        "A construction subitem value representation does not match its variant group.",
        {
          constructionSubitemId,
          variantGroupId: group.id,
          groupValueType: group.variantValueType,
          subitemValueType: metadata.valueType,
        }
      );
    }

    group.variants.push(createCanonicalVariant(group, subitem, metadata));
  });

  const baseOwners = new Map();
  const groupProducts = [...groupsById.values()].map((group) => {
      const allVariants = [...group.variants].sort(compareCanonicalVariants);
      const variants = allVariants.filter((variant) => !variant.isArchived);
      const archivedVariants = allVariants.filter((variant) => variant.isArchived);
      const semanticIdentities = new Set();
      variants.forEach((variant) => {
        const identity = `${variant.valueType}:${variant.valueKey}:${variant.unitKey}`;
        if (semanticIdentities.has(identity)) {
          throw createContractError(
            CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.DUPLICATE_VARIANT_IDENTITY,
            "A canonical variant group contains duplicate value and unit metadata.",
            {
              variantGroupId: group.id,
              constructionSubitemId: variant.constructionSubitemId,
              value: variant.value,
              unit: variant.unit,
            }
          );
        }
        semanticIdentities.add(identity);
      });

      const baseSubitem = validateBaseSubitem({ group, subitemsById, baseOwners });
      const sourceSubitems = [
        ...allVariants.map((variant) => variant.subitem),
        ...(baseSubitem ? [baseSubitem] : []),
      ];
      const sourceIndexes = sourceSubitems
        .map((subitem) => subitemIndexes.get(normalizeId(subitem.id)))
        .filter(Number.isInteger);

      return {
        id: group.id,
        productId: group.id,
        kind: CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP,
        constructionItemId: group.constructionItemId,
        variantGroupId: group.id,
        displayName: group.displayName,
        label: group.displayName,
        variantKind: group.variantKind,
        variantValueType: group.variantValueType,
        baseSubitemId: group.baseSubitemId,
        baseSubitem,
        variants,
        archivedVariants,
        allVariants,
        archivedAt: group.archivedAt,
        isArchived: Boolean(group.archivedAt),
        selectableSubitemIds: group.archivedAt
          ? []
          : variants.map((variant) => variant.constructionSubitemId),
        groupSortOrder: group.sortOrder,
        sortOrder: group.sortOrder,
        sourceIndex: sourceIndexes.length ? Math.min(...sourceIndexes) : 0,
      };
    });

  const activeGroupProducts = groupProducts.filter((product) => !product.isArchived);
  const variantProducts = activeGroupProducts.filter((product) => product.variants.length > 0);
  const unselectableVariantGroups = activeGroupProducts.filter(
    (product) => product.variants.length === 0
  );
  const archivedVariantProducts = groupProducts.filter((product) => product.isArchived);

  const groupedBaseSubitemIds = new Set(
    groupProducts.map((product) => product.baseSubitemId).filter(Boolean)
  );
  const allStandardProducts = ungroupedSubitems
    .filter((subitem) => !groupedBaseSubitemIds.has(normalizeId(subitem.id)))
    .map((subitem) => {
      const constructionSubitemId = normalizeId(subitem.id);
      const archivedAt = getArchivedAt(subitem);
      return {
        id: constructionSubitemId,
        productId: constructionSubitemId,
        kind: CONSTRUCTION_PRODUCT_KINDS.SUBITEM,
        constructionItemId: getSubitemItemId(subitem),
        variantGroupId: null,
        displayName: `${subitem.name ?? ""}`.trim(),
        label: `${subitem.name ?? ""}`.trim(),
        variantKind: null,
        baseSubitemId: null,
        subitemId: constructionSubitemId,
        subitem,
        archivedAt,
        isArchived: Boolean(archivedAt),
        selectableSubitemIds: archivedAt ? [] : [constructionSubitemId],
        sortOrder: getSubitemSortOrder(subitem),
        sourceIndex: subitemIndexes.get(constructionSubitemId) ?? 0,
      };
    });
  const standardProducts = allStandardProducts.filter((product) => !product.isArchived);
  const archivedStandardProducts = allStandardProducts.filter((product) => product.isArchived);
  const products = [...variantProducts, ...standardProducts].sort(compareCanonicalProducts);
  const archivedProducts = [...archivedVariantProducts, ...archivedStandardProducts]
    .sort(compareCanonicalProducts);

  return {
    products,
    archivedProducts,
    variantProducts,
    archivedVariantProducts,
    standardProducts,
    archivedStandardProducts,
    variantGroups: [...groupsById.values()]
      .filter((group) => !group.archivedAt)
      .map(({ variants, ...group }) => group),
    archivedVariantGroups: [...groupsById.values()]
      .filter((group) => group.archivedAt)
      .map(({ variants, ...group }) => group),
    unselectableVariantGroups,
    ungroupedSubitems,
  };
}

export function buildCanonicalConstructionCatalog({
  itemRows = [],
  subitemRows = [],
  variantGroupRows = [],
} = {}) {
  const itemsById = new Map();
  (itemRows ?? []).forEach((item) => {
    const constructionItemId = normalizeId(item?.id);
    if (!constructionItemId || itemsById.has(constructionItemId)) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_CONSTRUCTION_ITEM,
        "A canonical construction catalog requires unique construction item IDs.",
        { constructionItemId }
      );
    }
    itemsById.set(constructionItemId, item);
  });

  const subitemsByItemId = new Map([...itemsById.keys()].map((itemId) => [itemId, []]));
  (subitemRows ?? []).forEach((subitem) => {
    const constructionItemId = getSubitemItemId(subitem);
    if (!subitemsByItemId.has(constructionItemId)) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_CONSTRUCTION_ITEM,
        "A construction subitem belongs to an unloaded construction item.",
        { constructionItemId, constructionSubitemId: normalizeId(subitem?.id) }
      );
    }
    subitemsByItemId.get(constructionItemId).push(subitem);
  });

  const groupsByItemId = new Map([...itemsById.keys()].map((itemId) => [itemId, []]));
  (variantGroupRows ?? []).forEach((groupRow) => {
    const group = normalizeConstructionSubitemVariantGroup(groupRow);
    if (!groupsByItemId.has(group.constructionItemId)) {
      throw createContractError(
        CONSTRUCTION_CATALOG_CONTRACT_ERROR_CODES.INVALID_CONSTRUCTION_ITEM,
        "A variant group belongs to an unloaded construction item.",
        { constructionItemId: group.constructionItemId, variantGroupId: group.id }
      );
    }
    groupsByItemId.get(group.constructionItemId).push(groupRow);
  });

  const items = (itemRows ?? []).map((item) => {
    const constructionItemId = normalizeId(item.id);
    const subitems = subitemsByItemId.get(constructionItemId) ?? [];
    const variantGroups = groupsByItemId.get(constructionItemId) ?? [];
    const productModel = buildCanonicalConstructionProductModel({
      subitems,
      variantGroups,
    });
    return {
      id: constructionItemId,
      constructionItemId,
      displayName: `${item.name ?? ""}`.trim(),
      item,
      subitems,
      ...productModel,
    };
  });

  return {
    items,
    products: items.flatMap((item) => item.products),
    archivedProducts: items.flatMap((item) => item.archivedProducts),
  };
}

export function resolveCanonicalConstructionVariant(
  products = [],
  { variantGroupId, constructionSubitemId } = {}
) {
  const requestedGroupId = normalizeId(variantGroupId);
  const requestedSubitemId = normalizeId(constructionSubitemId);
  if (!requestedGroupId || !requestedSubitemId) return null;

  const product = (products ?? []).find((entry) => (
    entry.kind === CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP
    && entry.variantGroupId === requestedGroupId
  ));
  return product?.variants.find(
    (variant) => variant.constructionSubitemId === requestedSubitemId
  ) ?? null;
}
