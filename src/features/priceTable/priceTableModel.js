import {
  DEFAULT_FLOORING_SPEC,
  FLOORING_NAME_KEYWORDS,
  FLOORING_MATERIAL_KEYWORDS,
  FLOORING_THICKNESS_OPTIONS,
  UNIT_OPTIONS,
} from "../../shared/constants/estimateOptions";
import { CATEGORY_DISPLAY_TARGETS } from "../../shared/constants/defaultConstructionCatalog";
import {
  hasNumericInput,
  toNonNegativeNumberOrZero,
  toNumberOrZero,
} from "../../shared/utils/numbers";

const LOCAL_SUBITEM_ID_PREFIX = "local-subitem-";

export function normalizeFlooringThickness(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw || raw === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;

  const numericValue = Number(raw.replace(/t$/i, ""));
  if (!Number.isFinite(numericValue)) return DEFAULT_FLOORING_SPEC;

  const normalized = numericValue.toFixed(1);
  return FLOORING_THICKNESS_OPTIONS.includes(normalized)
    ? normalized
    : DEFAULT_FLOORING_SPEC;
}

export function isFlooringMaterialName(name) {
  const normalized = `${name ?? ""}`.trim();
  return FLOORING_MATERIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function parseFlooringThicknessName(name) {
  const normalized = `${name ?? ""}`.trim();
  const directThickness = normalized.match(/^([1-4](?:\.\d)?)T?$/i);
  if (directThickness) {
    return {
      baseName: "장판",
      thickness: normalizeFlooringThickness(directThickness[1]),
    };
  }

  const match = normalized.match(/^(.+?)\s+(기본|[1-4](?:\.\d)?T?)$/i);
  if (match) {
    const thickness = match[2] === DEFAULT_FLOORING_SPEC
      ? DEFAULT_FLOORING_SPEC
      : normalizeFlooringThickness(match[2]);
    if (thickness === DEFAULT_FLOORING_SPEC && match[2] !== DEFAULT_FLOORING_SPEC) {
      return null;
    }
    return {
      baseName: match[1].trim(),
      thickness,
    };
  }

  if (!isFlooringMaterialName(normalized)) return null;
  return {
    baseName: normalized,
    thickness: DEFAULT_FLOORING_SPEC,
  };
}

export function getCanonicalFlooringSubitemName(name) {
  const parsed = parseFlooringThicknessName(name);
  if (!parsed || parsed.thickness === DEFAULT_FLOORING_SPEC) {
    return `${name ?? ""}`.trim();
  }
  const displayThickness = Number(parsed.thickness);
  const thicknessLabel = Number.isInteger(displayThickness)
    ? `${displayThickness}`
    : parsed.thickness;
  return `${parsed.baseName} ${thicknessLabel}T`;
}

export function formatFlooringThickness(thickness) {
  const normalized = normalizeFlooringThickness(thickness);
  if (normalized === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;
  const numericValue = Number(normalized);
  const displayValue = Number.isInteger(numericValue) ? `${numericValue}` : normalized;
  return `${displayValue}T`;
}

export function composeFlooringSubitemName(baseName, thickness) {
  const nextBaseName = `${baseName ?? ""}`.trim() || "장판";
  const normalizedThickness = normalizeFlooringThickness(thickness);
  if (normalizedThickness === DEFAULT_FLOORING_SPEC) return nextBaseName;
  return `${nextBaseName} ${formatFlooringThickness(normalizedThickness)}`;
}

export function compareFlooringThickness(a, b) {
  if (a === b) return 0;
  if (a === DEFAULT_FLOORING_SPEC) return -1;
  if (b === DEFAULT_FLOORING_SPEC) return 1;
  return Number(a) - Number(b);
}

export function isFlooringThicknessItem(item) {
  const normalized = `${item?.name ?? ""}`.trim();
  return FLOORING_NAME_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function getFlooringThicknessGroups(subitems = []) {
  const groupsByName = new Map();

  subitems.forEach((subitem) => {
    const parsed = parseFlooringThicknessName(subitem.name);
    const baseName = parsed?.baseName ?? subitem.name;
    const thickness = parsed?.thickness ?? DEFAULT_FLOORING_SPEC;

    if (!groupsByName.has(baseName)) {
      groupsByName.set(baseName, {
        baseName,
        sort_order: subitem.sort_order ?? 0,
        options: {},
      });
    }

    const group = groupsByName.get(baseName);
    group.sort_order = Math.min(group.sort_order, subitem.sort_order ?? group.sort_order);
    if (!group.options[thickness]) {
      group.options[thickness] = {
        ...subitem,
        baseName,
        thickness,
      };
    }
  });

  return [...groupsByName.values()]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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

export function normalizeSpecOptions(value) {
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

export function getLaborRateEmptyValue(subitem) {
  return subitem?.labor_rate_empty ?? subitem?.labor_rate ?? "";
}

export function getLaborRateOccupiedValue(subitem) {
  return subitem?.labor_rate_occupied ?? subitem?.labor_rate ?? "";
}

export function getTemplateOptionValue(subitem) {
  const thickness = parseFlooringThicknessName(subitem?.name)?.thickness;
  return thickness && thickness !== DEFAULT_FLOORING_SPEC ? thickness : "";
}

export function resolveFlooringVariant(subitems, baseName, thickness) {
  const requestedBaseName = `${baseName ?? ""}`.trim();
  const requestedThickness = normalizeFlooringThickness(thickness);

  return (subitems ?? []).find((subitem) => {
    const parsed = parseFlooringThicknessName(subitem?.name);
    return (
      parsed?.baseName === requestedBaseName
      && parsed.thickness === requestedThickness
    );
  }) ?? null;
}

export function isFlooringThicknessSelection(value) {
  const rawValue = `${value ?? ""}`.trim();
  return (
    /^[1-4](?:\.\d)?T?$/i.test(rawValue)
    && normalizeFlooringThickness(rawValue) !== DEFAULT_FLOORING_SPEC
  );
}

export function normalizeFlooringOptionKey(value) {
  return isFlooringThicknessSelection(value)
    ? normalizeFlooringThickness(value)
    : "";
}

export function buildUniqueFlooringOptions({
  subitems,
  baseName,
  specOptions = [],
}) {
  const rowOptions = (subitems ?? [])
    .map((subitem) => parseFlooringThicknessName(subitem?.name))
    .filter((parsed) => parsed?.baseName === `${baseName ?? ""}`.trim())
    .map((parsed) => parsed.thickness)
    .filter((thickness) => thickness && thickness !== DEFAULT_FLOORING_SPEC);

  const uniqueOptions = [];
  const seenKeys = new Set();
  const appendOption = (option) => {
    const rawOption = `${option ?? ""}`.trim();
    if (
      !rawOption
      || rawOption === "\uC120\uD0DD"
      || rawOption.startsWith("__formate_")
    ) {
      return;
    }

    const canonicalThickness = normalizeFlooringOptionKey(rawOption);
    const key = canonicalThickness
      ? `thickness:${canonicalThickness}`
      : `spec:${rawOption}`;
    if (seenKeys.has(key)) return;

    seenKeys.add(key);
    uniqueOptions.push(canonicalThickness || rawOption);
  };

  rowOptions.forEach(appendOption);
  (specOptions ?? []).forEach(appendOption);
  return uniqueOptions;
}

export function resolveActiveFlooringVariant(subitems, baseName, thickness) {
  if (!`${thickness ?? ""}`.trim()) return null;
  return resolveFlooringVariant(subitems, baseName, thickness);
}

export function createEmptyFlooringVariantDraft({
  id,
  itemId,
  baseName,
  thickness,
  source,
  sortOrder = 0,
}) {
  const normalizedThickness = normalizeFlooringThickness(thickness);
  const canonicalName = getCanonicalFlooringSubitemName(
    `${`${baseName ?? ""}`.trim()} ${normalizedThickness}T`
  );

  return {
    id,
    item_id: itemId,
    name: canonicalName,
    option_value: normalizedThickness,
    unit: source?.unit ?? "평",
    cost_price: "",
    cost_unit: source?.cost_unit ?? "",
    unit_price: "",
    labor_rate: "",
    labor_rate_empty: "",
    labor_rate_occupied: "",
    spec_options: [],
    spec_option_draft: "",
    selected_spec_option: "",
    quantity: "",
    labor_count: "",
    template_value_id: null,
    sort_order: sortOrder,
  };
}

export function getFlooringVariantDisplayValues(variant) {
  return {
    disabled: !variant,
    unit_price: variant?.unit_price ?? "",
    labor_rate_empty: variant?.labor_rate_empty ?? variant?.labor_rate ?? "",
    labor_rate_occupied: variant?.labor_rate_occupied ?? variant?.labor_rate ?? "",
  };
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
    name: getCanonicalFlooringSubitemName(subitem?.name),
    unit: normalizeUnitOptionValue(subitem?.unit) || "평",
    sort_order: subitem?.sort_order ?? 0,
  };

  if (includePrices) {
    payload.cost_price = toNonNegativeNumberOrZero(subitem?.cost_price);
    payload.cost_unit = normalizeUnitOptionValue(subitem?.cost_unit);
    Object.assign(payload, buildSubitemPricePayload(subitem));
    payload.spec_options = normalizeSpecOptions(subitem?.spec_options);
  }

  return payload;
}

export function buildConstructionSubitemInsertPayload(subitem) {
  return {
    item_id: subitem?.item_id,
    ...buildConstructionSubitemSavePayload(subitem, {
      includePrices: true,
    }),
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

  if (`${subitem?.selected_spec_option ?? ""}`.trim()) return false;
  if (`${subitem?.spec_option_draft ?? ""}`.trim()) return false;
  if (normalizeSpecOptions(subitem?.spec_options).length) return false;

  const dirtyFields = new Set(
    Array.isArray(subitem?._dirtyFields) ? subitem._dirtyFields : []
  );
  if (
    ["unit", "cost_unit", "selected_spec_option", "spec_option_draft", "spec_options"]
      .some((field) => dirtyFields.has(field))
  ) {
    return false;
  }

  return true;
}

export function buildSubitemSaveOperation(subitem) {
  if (!subitem?.id) return null;
  const operation = isLocalPriceTableSubitem(subitem) ? "insert" : "update";
  return {
    operation,
    ...(operation === "update" ? { id: subitem.id } : {}),
    payload: {
      item_id: subitem.item_id,
      name: getCanonicalFlooringSubitemName(subitem.name),
      ...buildSubitemPricePayload(subitem),
    },
  };
}

function getSubitemPersistenceKey(subitem) {
  return `${subitem?.item_id ?? ""}::${getCanonicalFlooringSubitemName(subitem?.name)}`;
}

export function reconcileFlooringVariantRows(subitems) {
  const reconciled = [];
  const indexByKey = new Map();

  (subitems ?? []).forEach((subitem) => {
    const parsed = parseFlooringThicknessName(subitem?.name);
    if (!parsed || parsed.thickness === DEFAULT_FLOORING_SPEC) {
      reconciled.push(subitem);
      return;
    }

    const key = `${parsed.baseName}::${parsed.thickness}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, reconciled.length);
      reconciled.push(subitem);
      return;
    }

    const existing = reconciled[existingIndex];
    if (
      isLocalPriceTableSubitem(existing)
      && !isLocalPriceTableSubitem(subitem)
    ) {
      reconciled[existingIndex] = subitem;
    }
  });

  return reconciled;
}

export function reconcileInsertedSubitems(localSubitems, insertedSubitems) {
  const insertedByKey = new Map(
    (insertedSubitems ?? []).map((subitem) => [
      getSubitemPersistenceKey(subitem),
      subitem,
    ])
  );

  return (localSubitems ?? []).map((subitem) => {
    const persisted = insertedByKey.get(getSubitemPersistenceKey(subitem));
    return persisted ? { ...subitem, ...persisted } : subitem;
  });
}

export function normalizePriceTableRows(rows) {
  return (rows ?? []).map((row) => ({
    ...row,
    name: getCanonicalFlooringSubitemName(row.name),
    unit_price: row.unit_price ?? "",
    labor_rate: row.labor_rate ?? "",
    labor_rate_empty: row.labor_rate_empty ?? row.labor_rate ?? "",
    labor_rate_occupied: row.labor_rate_occupied ?? row.labor_rate ?? "",
  }));
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
  templateValueRows = []
) {
  const subitemsByItemId = (subitemRows ?? []).reduce((acc, row) => {
    acc[row.item_id] = acc[row.item_id] ?? [];
    acc[row.item_id].push(row);
    return acc;
  }, {});
  const templateValueBySubitemId = Object.fromEntries(
    (templateValueRows ?? []).map((row) => [row.subitem_id, row])
  );

  return mergeDisplayCategoryItems(
    (itemRows ?? []).map((item) => ({
      ...item,
      item_type: item.item_type ?? "itemized",
      subitems: [...(subitemsByItemId[item.id] ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((subitem) => {
          const templateValue = templateValueBySubitemId[subitem.id];
          return {
            ...subitem,
            option_value: getTemplateOptionValue(subitem),
            cost_price: subitem.cost_price ?? "",
            cost_unit: normalizeUnitOptionValue(subitem.cost_unit),
            unit_price: subitem.unit_price ?? "",
            labor_rate: subitem.labor_rate ?? "",
            labor_rate_empty:
              subitem.labor_rate_empty ?? subitem.labor_rate ?? "",
            labor_rate_occupied:
              subitem.labor_rate_occupied ?? subitem.labor_rate ?? "",
            spec_options: normalizeSpecOptions(subitem.spec_options),
            spec_option_draft: "",
            selected_spec_option: "",
            quantity: templateValue?.quantity ?? "",
            labor_count: templateValue?.labor_count ?? "",
            construction_days:
              toConstructionDaysValue(templateValue?.construction_days) || "",
            template_value_id: templateValue?.id ?? null,
          };
        }),
    }))
  );
}
