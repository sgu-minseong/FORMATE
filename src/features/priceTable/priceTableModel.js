import { UNIT_OPTIONS } from "../../shared/constants/estimateOptions";
import { CATEGORY_DISPLAY_TARGETS } from "../../shared/constants/defaultConstructionCatalog";
import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
  toNullableNumber,
  toNumberOrZero,
} from "../../shared/utils/numbers";
import { CONSTRUCTION_PRODUCT_KINDS } from "../constructionCatalog/constructionCatalogModel";

const LOCAL_SUBITEM_ID_PREFIX = "local-subitem-";

export const CONSTRUCTION_ITEM_RENDERER_KINDS = Object.freeze({
  STANDARD: "standard",
  SASH: "sash",
});

export function getConstructionItemRendererKind(item) {
  return item?.item_kind === CONSTRUCTION_ITEM_RENDERER_KINDS.SASH
    ? CONSTRUCTION_ITEM_RENDERER_KINDS.SASH
    : CONSTRUCTION_ITEM_RENDERER_KINDS.STANDARD;
}

export function normalizeUnitOptionValue(value) {
  const rawValue = `${value ?? ""}`.trim();
  if (rawValue === "㎡") return "m²";
  if (rawValue === "미터") return "m";
  return rawValue;
}

export function getUnitSelectOptions(currentUnit = "") {
  const normalizedCurrent = normalizeUnitOptionValue(currentUnit);
  if (normalizedCurrent && !UNIT_OPTIONS.includes(normalizedCurrent)) {
    return [normalizedCurrent, ...UNIT_OPTIONS];
  }
  return UNIT_OPTIONS;
}

export function getLaborRateEmptyValue(subitem) {
  return subitem?.labor_rate_empty ?? subitem?.labor_rate ?? "";
}

export function getLaborRateOccupiedValue(subitem) {
  return subitem?.labor_rate_occupied ?? subitem?.labor_rate ?? "";
}

export function patchSubitemPriceById(items, subitemId, patch) {
  let changed = false;
  const nextItems = (items ?? []).map((item) => {
    let itemChanged = false;
    const nextSubitems = (item.subitems ?? []).map((subitem) => {
      if (subitem.id !== subitemId) return subitem;
      changed = true;
      itemChanged = true;
      return { ...subitem, ...patch };
    });
    return itemChanged ? { ...item, subitems: nextSubitems } : item;
  });

  return changed ? nextItems : items;
}

export function getAdminProductRows(item) {
  return Array.isArray(item?.products) ? item.products : [];
}

export function getAdminProductSelectedSubitemId(
  product,
  selectedSubitemIdByProduct = {}
) {
  if (!product) return "";
  if (product.kind === CONSTRUCTION_PRODUCT_KINDS.SUBITEM) {
    return product.subitemId ?? product.selectableSubitemIds?.[0] ?? "";
  }
  if (product.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) return "";

  const requestedSubitemId = `${
    selectedSubitemIdByProduct?.[product.productId] ?? ""
  }`.trim();
  return product.selectableSubitemIds?.includes(requestedSubitemId)
    ? requestedSubitemId
    : product.selectableSubitemIds?.[0] ?? "";
}

export function resolveAdminProductSubitem(
  item,
  product,
  selectedSubitemIdByProduct = {}
) {
  const selectedSubitemId = getAdminProductSelectedSubitemId(
    product,
    selectedSubitemIdByProduct
  );
  if (!selectedSubitemId) return null;
  return (item?.subitems ?? []).find(
    (subitem) => subitem.id === selectedSubitemId
  ) ?? null;
}

export function reconcileAdminProductSelections(
  items,
  selectedSubitemIdByProduct = {}
) {
  const nextSelections = {};
  (items ?? []).forEach((item) => {
    getAdminProductRows(item).forEach((product) => {
      if (product.kind !== CONSTRUCTION_PRODUCT_KINDS.VARIANT_GROUP) return;
      const selectedSubitemId = getAdminProductSelectedSubitemId(
        product,
        selectedSubitemIdByProduct
      );
      if (selectedSubitemId) {
        nextSelections[product.productId] = selectedSubitemId;
      }
    });
  });
  return nextSelections;
}

export function filterAdminProductRows(item, searchTerm = "") {
  const normalizedSearchTerm = `${searchTerm ?? ""}`.trim().toLowerCase();
  const products = getAdminProductRows(item);
  if (!normalizedSearchTerm) return products;
  if (`${item?.name ?? ""}`.toLowerCase().includes(normalizedSearchTerm)) {
    return products;
  }
  return products.filter((product) => (
    `${product.displayName ?? ""}`.toLowerCase().includes(normalizedSearchTerm)
    || (product.variants ?? []).some((variant) => (
      `${variant.label ?? ""}`.toLowerCase().includes(normalizedSearchTerm)
    ))
  ));
}

export function buildSubitemPricePayload(subitem) {
  const laborRateEmpty = subitem?.labor_rate_empty ?? subitem?.labor_rate ?? "";
  const laborRateOccupied = subitem?.labor_rate_occupied ?? subitem?.labor_rate ?? "";

  return {
    unit_price: toNonNegativeNumberOrZero(subitem?.unit_price),
    labor_rate_empty: toNonNegativeNumberOrZero(laborRateEmpty),
    labor_rate_occupied: toNonNegativeNumberOrZero(laborRateOccupied),
    labor_rate: toNonNegativeNumberOrZero(laborRateEmpty),
  };
}

export function buildConstructionItemSavePayload(item) {
  return {
    name: getCategoryPersistName(item) || "새 대분류",
    item_type: item?.item_type ?? "itemized",
    is_favorite: Boolean(item?.is_favorite),
    sort_order: item?.sort_order ?? 0,
  };
}

export function buildConstructionSubitemSavePayload(
  subitem,
  { includePrices = false } = {}
) {
  const payload = {
    name: `${subitem?.name ?? ""}`.trim(),
    unit: normalizeUnitOptionValue(subitem?.unit) || "평",
    sort_order: subitem?.sort_order ?? 0,
  };

  if (includePrices) {
    payload.cost_price = toNonNegativeNumberOrZero(subitem?.cost_price);
    payload.cost_unit = normalizeUnitOptionValue(subitem?.cost_unit);
    Object.assign(payload, buildSubitemPricePayload(subitem));
  }

  return payload;
}

export function buildConstructionSubitemInsertPayload(subitem) {
  return {
    item_id: subitem?.item_id,
    ...buildConstructionSubitemSavePayload(subitem, {
      includePrices: true,
    }),
    variant_group_id: null,
    variant_value: null,
    variant_value_text: null,
    variant_unit: null,
    archived_at: null,
  };
}

export function isLocalPriceTableSubitem(subitem) {
  const subitemId = typeof subitem === "object" ? subitem?.id : subitem;
  return `${subitemId ?? ""}`.startsWith(LOCAL_SUBITEM_ID_PREFIX);
}

export function isEmptyLocalPriceTableSubitemPlaceholder(subitem, materialNamePlaceholder = "") {
  if (!isLocalPriceTableSubitem(subitem)) return false;
  const name = `${subitem?.name ?? ""}`.trim();
  if (name && name !== materialNamePlaceholder) return false;

  const numericFields = [
    "cost_price",
    "unit_price",
    "labor_rate",
    "labor_rate_empty",
    "labor_rate_occupied",
    "quantity",
    "labor_count",
    "labor_count_occupied",
  ];
  if (
    numericFields.some(
      (field) =>
        hasNumericInput(subitem?.[field])
        && toNumberOrZero(subitem?.[field]) !== 0
    )
  ) {
    return false;
  }

  const dirtyFields = new Set(
    Array.isArray(subitem?._dirtyFields) ? subitem._dirtyFields : []
  );
  if (
    ["unit", "cost_unit"]
      .some((field) => dirtyFields.has(field))
  ) {
    return false;
  }

  return true;
}

export function reconcileInsertedSubitems(localSubitems, insertResults) {
  const insertedByLocalId = new Map(
    (insertResults ?? []).map((result) => [
      result.localId,
      result.persistedSubitem,
    ])
  );

  return (localSubitems ?? []).map((subitem) => {
    const persisted = insertedByLocalId.get(subitem.id);
    return persisted ? { ...subitem, ...persisted } : subitem;
  });
}

function sortPriceTableItems(rows) {
  return [...(rows ?? [])].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export function getCategoryDisplayName(name) {
  const trimmed = `${name ?? ""}`.trim();
  return CATEGORY_DISPLAY_TARGETS[trimmed] ?? trimmed;
}

export function getCategoryPersistName(item) {
  const displayName = `${item?.name ?? ""}`.trim();
  const sourceName = `${item?._sourceName ?? ""}`.trim();
  if (sourceName && displayName === getCategoryDisplayName(sourceName)) return sourceName;
  return displayName;
}

function getCategorySourceRank(sourceName, displayName) {
  const trimmed = `${sourceName ?? ""}`.trim();
  if (trimmed === displayName) return 0;
  if (displayName === "도장/페인트" && trimmed === "도장") return 1;
  return 2;
}

function mergeDisplayCategoryItems(items) {
  const mergedByName = new Map();

  sortPriceTableItems(items).forEach((item) => {
    const sourceName = `${item.name ?? ""}`.trim();
    const displayName = getCategoryDisplayName(sourceName);
    const normalizedItem = {
      ...item,
      name: displayName,
      item_type: sourceName === displayName ? item.item_type ?? "itemized" : "itemized",
      _sourceName: sourceName,
    };
    const existing = mergedByName.get(displayName);

    if (!existing) {
      mergedByName.set(displayName, normalizedItem);
      return;
    }

    const existingRank = getCategorySourceRank(existing._sourceName, displayName);
    const currentRank = getCategorySourceRank(sourceName, displayName);
    const useCurrentAsParent = currentRank < existingRank;
    const parent = useCurrentAsParent ? normalizedItem : existing;
    const other = useCurrentAsParent ? existing : normalizedItem;
    mergedByName.set(displayName, {
      ...parent,
      is_favorite: Boolean(parent.is_favorite || other.is_favorite),
      sort_order: Math.min(parent.sort_order ?? 0, other.sort_order ?? 0),
      subitems: [...(existing.subitems ?? []), ...(normalizedItem.subitems ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      ...(Array.isArray(existing.products) || Array.isArray(normalizedItem.products)
        ? {
            products: [
              ...(existing.products ?? []),
              ...(normalizedItem.products ?? []),
            ].sort((a, b) => (
              (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
              || `${a.productId ?? ""}`.localeCompare(`${b.productId ?? ""}`)
            )),
            variantGroups: [
              ...(existing.variantGroups ?? []),
              ...(normalizedItem.variantGroups ?? []),
            ],
            canonicalSourceSubitems: [
              ...(existing.canonicalSourceSubitems ?? []),
              ...(normalizedItem.canonicalSourceSubitems ?? []),
            ],
          }
        : {}),
      _sourceName: parent._sourceName,
    });
  });

  return sortPriceTableItems([...mergedByName.values()]);
}

function toConstructionDaysValue(value) {
  const numberValue = Number(`${value ?? ""}`.replaceAll(",", ""));
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.trunc(numberValue)
    : 0;
}

export function normalizeAdminItems(
  itemRows,
  subitemRows,
  templateValueRows = [],
  canonicalCatalog
) {
  if (!canonicalCatalog) {
    throw new Error("Admin catalog normalization requires the canonical construction catalog.");
  }
  const canonicalItemsById = new Map(
    (canonicalCatalog.items ?? []).map((item) => [item.constructionItemId, item])
  );
  const selectableSubitemIds = new Set(
    (canonicalCatalog.products ?? [])
      .flatMap((product) => product.selectableSubitemIds ?? [])
  );
  const subitemsByItemId = (subitemRows ?? []).reduce((acc, row) => {
    acc[row.item_id] = acc[row.item_id] ?? [];
    acc[row.item_id].push(row);
    return acc;
  }, {});
  const templateValueBySubitemId = new Map();
  (templateValueRows ?? []).forEach((row) => {
    if (!selectableSubitemIds.has(row.subitem_id)) return;
    if (templateValueBySubitemId.has(row.subitem_id)) {
      const error = new Error(
        "A canonical template contains more than one value row for the same construction_subitem UUID."
      );
      error.code = "duplicate-template-subitem-id";
      error.context = { constructionSubitemId: row.subitem_id };
      throw error;
    }
    templateValueBySubitemId.set(row.subitem_id, row);
  });

  return mergeDisplayCategoryItems(
    (itemRows ?? []).map((item) => {
      const canonicalItem = canonicalItemsById.get(item.id);
      const itemSelectableSubitemIds = new Set(
        (canonicalItem?.products ?? [])
          .flatMap((product) => product.selectableSubitemIds ?? [])
      );
      return {
        ...item,
        item_type: item.item_type ?? "itemized",
        products: canonicalItem?.products ?? [],
        variantGroups: [
          ...(canonicalItem?.variantGroups ?? []),
          ...(canonicalItem?.archivedVariantGroups ?? []),
        ],
        canonicalSourceSubitems: [...(subitemsByItemId[item.id] ?? [])],
        subitems: [...(subitemsByItemId[item.id] ?? [])]
        .filter((subitem) => itemSelectableSubitemIds.has(subitem.id))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((subitem) => {
          const templateValue = templateValueBySubitemId.get(subitem.id);
          return {
            ...subitem,
            option_value: "",
            template_option_value: "",
            cost_price: subitem.cost_price ?? "",
            cost_unit: normalizeUnitOptionValue(subitem.cost_unit),
            unit_price: subitem.unit_price ?? "",
            labor_rate: subitem.labor_rate ?? "",
            labor_rate_empty:
              subitem.labor_rate_empty ?? subitem.labor_rate ?? "",
            labor_rate_occupied:
              subitem.labor_rate_occupied ?? subitem.labor_rate ?? "",
            quantity: templateValue?.quantity ?? "",
            labor_count: templateValue?.labor_count ?? "",
            labor_count_occupied: templateValue?.labor_count_occupied ?? "",
            construction_days:
              toConstructionDaysValue(templateValue?.construction_days) || "",
            template_value_id: templateValue?.id ?? null,
            template_value_updated_at: templateValue?.updated_at ?? null,
          };
        }),
      };
    })
  );
}

export function buildAdminTemplateValueSaveOperations({
  templateId,
  items,
  excludedItemIds = [],
} = {}) {
  const excludedIds = excludedItemIds instanceof Set
    ? excludedItemIds
    : new Set(excludedItemIds ?? []);

  return (items ?? []).flatMap((item) => (
    excludedIds.has(item.id)
      ? []
      : (item.subitems ?? []).map((subitem) => {
          const values = {
            quantity: toNullableNumber(subitem.quantity),
            labor_count: toNullableNumber(subitem.labor_count),
            labor_count_occupied: toNullableNumber(subitem.labor_count_occupied),
            construction_days: toConstructionDaysValue(subitem.construction_days),
          };
          if (subitem.template_value_id) {
            return {
              operation: "update",
              valueId: subitem.template_value_id,
              itemId: subitem.item_id,
              subitemId: subitem.id,
              payload: values,
            };
          }
          return {
            operation: "insert",
            itemId: subitem.item_id,
            subitemId: subitem.id,
            payload: {
              template_id: templateId,
              item_id: subitem.item_id,
              subitem_id: subitem.id,
              option_value: "",
              ...values,
            },
          };
        })
  ));
}

/**
 * Builds the UUID-based value payload consumed by the atomic Template RPC.
 * `subitem_ref` can temporarily contain a local UI ID; the catalog RPC resolves
 * it to the newly inserted construction_subitem UUID in the same transaction.
 */
export function buildAdminTemplateValueAtomicWrites({
  items,
  excludedItemIds = [],
} = {}) {
  const excludedIds = excludedItemIds instanceof Set
    ? excludedItemIds
    : new Set(excludedItemIds ?? []);

  return (items ?? []).flatMap((item) => (
    excludedIds.has(item.id)
      ? []
      : (item.subitems ?? []).map((subitem) => ({
          item_id: subitem.item_id,
          subitem_ref: subitem.id,
          quantity: toNullableNumber(subitem.quantity),
          labor_count: toNullableNumber(subitem.labor_count),
          labor_count_occupied: toNullableNumber(subitem.labor_count_occupied),
          construction_days: toConstructionDaysValue(subitem.construction_days),
        }))
  ));
}

export function buildAdminTemplateValueClonePayloads({
  templateId,
  values,
} = {}) {
  const seenSubitemIds = new Set();
  return (values ?? []).map((value) => {
    const constructionSubitemId = `${value?.subitem_id ?? ""}`.trim();
    if (!constructionSubitemId || seenSubitemIds.has(constructionSubitemId)) {
      const error = new Error(
        "A canonical template clone requires exactly one value row per construction_subitem UUID."
      );
      error.code = "duplicate-template-subitem-id";
      error.context = { constructionSubitemId };
      throw error;
    }
    seenSubitemIds.add(constructionSubitemId);
    return {
      template_id: templateId,
      item_id: value.item_id,
      subitem_id: constructionSubitemId,
      option_value: "",
      quantity: value.quantity,
      labor_count: value.labor_count,
      labor_count_occupied: value.labor_count_occupied,
      construction_days: value.construction_days,
    };
  });
}

export function shouldBootstrapAdminCatalog({
  allowBootstrap = false,
  bootstrapAlreadyAttempted = false,
  itemRows = [],
} = {}) {
  return Boolean(
    allowBootstrap
    && !bootstrapAlreadyAttempted
    && Array.isArray(itemRows)
    && itemRows.length === 0
  );
}

export async function loadAdminCatalogSnapshot({
  companyId,
  readCatalog,
  bootstrapCatalog,
  allowBootstrap = false,
  bootstrapAlreadyAttempted = false,
  hasBootstrapBeenAttempted = () => bootstrapAlreadyAttempted,
  canBootstrap = () => true,
  markBootstrapAttempted = () => {},
}) {
  const initialSnapshot = await readCatalog(companyId);
  if (!shouldBootstrapAdminCatalog({
    allowBootstrap: allowBootstrap && canBootstrap(companyId),
    bootstrapAlreadyAttempted: hasBootstrapBeenAttempted(companyId),
    itemRows: initialSnapshot.itemRows,
  })) {
    return { ...initialSnapshot, bootstrapped: false };
  }

  markBootstrapAttempted(companyId);
  await bootstrapCatalog(
    companyId,
    initialSnapshot.itemRows,
    initialSnapshot.subitemRows
  );
  const refreshedSnapshot = await readCatalog(companyId);
  return { ...refreshedSnapshot, bootstrapped: true };
}

export function countVerifiedImportRows(results = [], snapshot = {}) {
  const persistedSubitems = new Map(
    (snapshot.subitemRows ?? []).map((subitem) => [subitem.id, subitem])
  );
  return results.filter((result) => {
    const subitemId = result.subitem?.id ?? result.target?.matchedSubitemId;
    const persisted = persistedSubitems.get(subitemId);
    if (!persisted) return false;
    if (!result.payload) return true;
    return Object.entries(result.payload).every(([key, value]) => `${persisted[key] ?? ""}` === `${value ?? ""}`);
  }).length;
}
