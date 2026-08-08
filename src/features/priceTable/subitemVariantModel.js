export const CONSTRUCTION_SUBITEM_VARIANT_KINDS = Object.freeze({
  THICKNESS: "thickness",
});

function normalizeVariantValue(value) {
  if (value === null || value === undefined || `${value}`.trim() === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

export function normalizeConstructionSubitemVariantGroup(group = {}) {
  return {
    id: group.id ?? "",
    constructionItemId: group.construction_item_id ?? group.constructionItemId ?? "",
    displayName: `${group.display_name ?? group.displayName ?? ""}`.trim(),
    baseSubitemId: group.base_subitem_id ?? group.baseSubitemId ?? null,
    variantKind: group.variant_kind ?? group.variantKind ?? "",
    sortOrder: group.sort_order ?? group.sortOrder ?? 0,
    archivedAt: group.archived_at ?? group.archivedAt ?? null,
  };
}

export function getConstructionSubitemVariantMetadata(subitem = {}) {
  const groupId = `${subitem.variant_group_id ?? subitem.variantGroupId ?? ""}`.trim();
  const value = normalizeVariantValue(subitem.variant_value ?? subitem.variantValue);
  const unit = `${subitem.variant_unit ?? subitem.variantUnit ?? ""}`.trim();

  if (!groupId || value === null || !unit) return null;
  return { groupId, value, unit };
}

export function buildStableSubitemVariantModel({ subitems = [], variantGroups = [] } = {}) {
  const groupsById = new Map(
    (variantGroups ?? [])
      .map(normalizeConstructionSubitemVariantGroup)
      .filter((group) => group.id && !group.archivedAt)
      .map((group) => [group.id, { ...group, variants: [] }])
  );
  const ungroupedSubitems = [];

  (subitems ?? []).forEach((subitem) => {
    const metadata = getConstructionSubitemVariantMetadata(subitem);
    const group = metadata ? groupsById.get(metadata.groupId) : null;
    const itemId = subitem.item_id ?? subitem.itemId ?? "";

    if (!group || !itemId || group.constructionItemId !== itemId) {
      ungroupedSubitems.push(subitem);
      return;
    }

    group.variants.push({
      subitem,
      subitemId: subitem.id ?? "",
      value: metadata.value,
      unit: metadata.unit,
    });
  });

  const groups = [...groupsById.values()]
    .filter((group) => group.variants.length > 0)
    .map((group) => ({
      ...group,
      variants: [...group.variants].sort((a, b) => (
        a.value - b.value
        || a.unit.localeCompare(b.unit)
        || (a.subitem.sort_order ?? a.subitem.sortOrder ?? 0)
          - (b.subitem.sort_order ?? b.subitem.sortOrder ?? 0)
      )),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  return { groups, ungroupedSubitems };
}

function getSubitemSortOrder(subitem = {}) {
  return subitem.sort_order ?? subitem.sortOrder ?? 0;
}

export function formatConstructionSubitemVariantLabel(value, unit) {
  const numericValue = normalizeVariantValue(value);
  const normalizedUnit = `${unit ?? ""}`.trim();
  if (numericValue === null || !normalizedUnit) return "";
  return `${Number.isInteger(numericValue) ? numericValue : numericValue.toString()}${normalizedUnit}`;
}

export function buildStableSubitemSections({ subitems = [], variantGroups = [] } = {}) {
  const { groups, ungroupedSubitems } = buildStableSubitemVariantModel({
    subitems,
    variantGroups,
  });
  const groupedBaseSubitemIds = new Set(
    groups.map((group) => group.baseSubitemId).filter(Boolean)
  );
  const subitemsById = new Map((subitems ?? []).map((subitem) => [subitem.id, subitem]));
  const subitemIndexes = new Map((subitems ?? []).map((subitem, index) => [subitem.id, index]));
  const sections = [
    ...groups.map((group) => {
      const sourceSortOrders = group.variants.map((variant) => getSubitemSortOrder(variant.subitem));
      const sourceIndexes = group.variants.map((variant) => subitemIndexes.get(variant.subitemId));
      const baseSubitem = group.baseSubitemId ? subitemsById.get(group.baseSubitemId) : null;
      if (baseSubitem) {
        sourceSortOrders.push(getSubitemSortOrder(baseSubitem));
        sourceIndexes.push(subitemIndexes.get(baseSubitem.id));
      }
      return {
        id: `variant-group:${group.id}`,
        kind: "variant-group",
        label: group.displayName,
        groupId: group.id,
        variants: group.variants,
        sortOrder: sourceSortOrders.length ? Math.min(...sourceSortOrders) : group.sortOrder,
        sourceIndex: Math.min(...sourceIndexes.filter(Number.isInteger)),
      };
    }),
    ...ungroupedSubitems
      .filter((subitem) => !groupedBaseSubitemIds.has(subitem.id))
      .map((subitem) => ({
        id: `subitem:${subitem.id}`,
        kind: "subitem",
        label: subitem.name,
        subitem,
        subitemId: subitem.id,
        sortOrder: getSubitemSortOrder(subitem),
        sourceIndex: subitemIndexes.get(subitem.id),
      })),
  ];

  return sections.sort((a, b) => (
    a.sortOrder - b.sortOrder
    || a.sourceIndex - b.sourceIndex
    || a.id.localeCompare(b.id)
  ));
}

export function resolveStableSubitemVariant(subitems = [], { groupId, value, unit } = {}) {
  const requestedValue = normalizeVariantValue(value);
  const requestedGroupId = `${groupId ?? ""}`.trim();
  const requestedUnit = `${unit ?? ""}`.trim();
  if (!requestedGroupId || requestedValue === null || !requestedUnit) return null;

  return (subitems ?? []).find((subitem) => {
    const metadata = getConstructionSubitemVariantMetadata(subitem);
    return metadata?.groupId === requestedGroupId
      && metadata.value === requestedValue
      && metadata.unit === requestedUnit;
  }) ?? null;
}
