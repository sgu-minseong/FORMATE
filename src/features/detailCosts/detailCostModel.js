import { toNumberOrZero } from "../../shared/utils/numbers";

export function buildDetailSubitems(itemRows = [], subitemRows = []) {
  const itemById = Object.fromEntries(itemRows.map((item) => [item.id, item]));
  return subitemRows.map((subitem) => ({
    ...subitem,
    item_name: itemById[subitem.item_id]?.name ?? "시공 항목",
    item_sort_order: itemById[subitem.item_id]?.sort_order ?? 0,
    item_is_favorite: Boolean(itemById[subitem.item_id]?.is_favorite),
  }));
}

export function groupDetailSubitems(subitems = []) {
  const groups = new Map();
  subitems.forEach((subitem) => {
    if (!groups.has(subitem.item_id)) {
      groups.set(subitem.item_id, {
        id: subitem.item_id,
        name: subitem.item_name,
        sort_order: subitem.item_sort_order,
        is_favorite: subitem.item_is_favorite,
        subitems: [],
      });
    }
    groups.get(subitem.item_id).subitems.push(subitem);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      subitems: [...group.subitems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
    .sort((a, b) => (
      Number(b.is_favorite) - Number(a.is_favorite)
      || (a.sort_order ?? 0) - (b.sort_order ?? 0)
    ));
}

export function buildNewDetailCostPayload({ companyId, subitemId, draft, costs }) {
  const nextSortOrder = costs.length
    ? Math.max(...costs.map((cost) => cost.sort_order ?? 0)) + 1
    : 0;
  return {
    company_id: companyId,
    subitem_id: subitemId,
    name: `${draft.name ?? ""}`.trim(),
    cost: toNumberOrZero(draft.cost),
    category_type: draft.category_type,
    sort_order: nextSortOrder,
  };
}

export function normalizeDetailCostPatch(patch) {
  const payload = { ...patch };
  if (Object.prototype.hasOwnProperty.call(payload, "name")) payload.name = `${payload.name ?? ""}`.trim();
  if (Object.prototype.hasOwnProperty.call(payload, "cost")) payload.cost = toNumberOrZero(payload.cost);
  return payload;
}

export function selectBulkDetailCosts(costs, mode) {
  return costs.filter((cost) => mode === "overwrite" || toNumberOrZero(cost.cost) === 0);
}
