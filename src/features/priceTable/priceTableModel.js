import {
  DEFAULT_FLOORING_SPEC,
  FLOORING_MATERIAL_KEYWORDS,
  FLOORING_THICKNESS_OPTIONS,
} from "../../shared/constants/estimateOptions";
import { toNonNegativeNumberOrZero } from "../../shared/utils/numbers";

const LOCAL_SUBITEM_ID_PREFIX = "local-subitem-";

function normalizeFlooringThickness(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw || raw === DEFAULT_FLOORING_SPEC) return DEFAULT_FLOORING_SPEC;

  const numericValue = Number(raw.replace(/t$/i, ""));
  if (!Number.isFinite(numericValue)) return DEFAULT_FLOORING_SPEC;

  const normalized = numericValue.toFixed(1);
  return FLOORING_THICKNESS_OPTIONS.includes(normalized)
    ? normalized
    : DEFAULT_FLOORING_SPEC;
}

function isFlooringMaterialName(name) {
  const normalized = `${name ?? ""}`.trim();
  return FLOORING_MATERIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function parseFlooringVariantName(name) {
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

function getCanonicalFlooringName(name) {
  const parsed = parseFlooringVariantName(name);
  if (!parsed || parsed.thickness === DEFAULT_FLOORING_SPEC) {
    return `${name ?? ""}`.trim();
  }
  const displayThickness = Number(parsed.thickness);
  const thicknessLabel = Number.isInteger(displayThickness)
    ? `${displayThickness}`
    : parsed.thickness;
  return `${parsed.baseName} ${thicknessLabel}T`;
}

export function resolveFlooringVariant(subitems, baseName, thickness) {
  const requestedBaseName = `${baseName ?? ""}`.trim();
  const requestedThickness = normalizeFlooringThickness(thickness);

  return (subitems ?? []).find((subitem) => {
    const parsed = parseFlooringVariantName(subitem?.name);
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
    .map((subitem) => parseFlooringVariantName(subitem?.name))
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
  const canonicalName = getCanonicalFlooringName(
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

export function isLocalPriceTableSubitem(subitem) {
  return `${subitem?.id ?? ""}`.startsWith(LOCAL_SUBITEM_ID_PREFIX);
}

export function buildSubitemSaveOperation(subitem) {
  if (!subitem?.id) return null;
  const operation = isLocalPriceTableSubitem(subitem) ? "insert" : "update";
  return {
    operation,
    ...(operation === "update" ? { id: subitem.id } : {}),
    payload: {
      item_id: subitem.item_id,
      name: getCanonicalFlooringName(subitem.name),
      ...buildSubitemPricePayload(subitem),
    },
  };
}

function getSubitemPersistenceKey(subitem) {
  return `${subitem?.item_id ?? ""}::${getCanonicalFlooringName(subitem?.name)}`;
}

export function reconcileFlooringVariantRows(subitems) {
  const reconciled = [];
  const indexByKey = new Map();

  (subitems ?? []).forEach((subitem) => {
    const parsed = parseFlooringVariantName(subitem?.name);
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
    name: getCanonicalFlooringName(row.name),
    unit_price: row.unit_price ?? "",
    labor_rate: row.labor_rate ?? "",
    labor_rate_empty: row.labor_rate_empty ?? row.labor_rate ?? "",
    labor_rate_occupied: row.labor_rate_occupied ?? row.labor_rate ?? "",
  }));
}
