function normalizeRankingPyeong(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? String(numericValue)
    : "";
}

function getRankingScopeKey(pyeong, constructionSubitemId) {
  const normalizedPyeong = normalizeRankingPyeong(pyeong);
  const normalizedSubitemId = String(constructionSubitemId ?? "").trim();
  if (!normalizedPyeong || !normalizedSubitemId) return "";
  return JSON.stringify([normalizedPyeong, normalizedSubitemId]);
}

function getEstimateItems(estimate) {
  const itemsData = estimate?.items_data ?? estimate?.itemsData;
  if (Array.isArray(itemsData)) return itemsData;
  return Array.isArray(itemsData?.items) ? itemsData.items : [];
}

function getEstimatePyeong(estimate, row) {
  const condition = estimate?.condition_snapshot ?? estimate?.conditionSnapshot ?? {};
  return row?.estimatePyeong
    ?? row?.estimate_pyeong
    ?? row?.pyeong
    ?? row?.conditionPyeong
    ?? row?.condition_pyeong
    ?? condition?.estimate_pyeong
    ?? condition?.estimatePyeong
    ?? condition?.condition_pyeong
    ?? condition?.conditionPyeong;
}

function getSashCatalogEntryId(row) {
  return String(
    row?.sashCatalogEntryId
      ?? row?.sash_catalog_entry_id
      ?? row?.sashSpec?.sash_catalog_entry_id
      ?? ""
  ).trim();
}

function getConstructionSubitemId(row) {
  return String(row?.subitemId ?? row?.construction_subitem_id ?? "").trim();
}

function isSavedIncludedSashRow(row) {
  const itemKind = row?.itemKind ?? row?.item_kind;
  return itemKind === "sash" && row?.selected !== false;
}

function toTimestamp(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function buildSashUsageRankings(estimates = []) {
  const scopeCounts = new Map();

  estimates.forEach((estimate, estimateIndex) => {
    const countedKeys = new Set();
    const usedAt = toTimestamp(estimate?.updated_at ?? estimate?.created_at);

    getEstimateItems(estimate).forEach((row) => {
      if (!isSavedIncludedSashRow(row)) return;

      const constructionSubitemId = getConstructionSubitemId(row);
      const sashCatalogEntryId = getSashCatalogEntryId(row);
      const scopeKey = getRankingScopeKey(getEstimatePyeong(estimate, row), constructionSubitemId);
      if (!scopeKey || !sashCatalogEntryId) return;

      const countedKey = JSON.stringify([scopeKey, sashCatalogEntryId]);
      if (countedKeys.has(countedKey)) return;
      countedKeys.add(countedKey);

      const entryCounts = scopeCounts.get(scopeKey) ?? new Map();
      const previous = entryCounts.get(sashCatalogEntryId);
      entryCounts.set(sashCatalogEntryId, {
        sashCatalogEntryId,
        usageCount: (previous?.usageCount ?? 0) + 1,
        lastUsedAt: Math.max(previous?.lastUsedAt ?? 0, usedAt),
        firstSeenOrder: previous?.firstSeenOrder ?? estimateIndex,
      });
      scopeCounts.set(scopeKey, entryCounts);
    });
  });

  return Object.fromEntries(
    [...scopeCounts.entries()].map(([scopeKey, entryCounts]) => [
      scopeKey,
      [...entryCounts.values()].sort((left, right) => (
        right.usageCount - left.usageCount
        || right.lastUsedAt - left.lastUsedAt
        || left.firstSeenOrder - right.firstSeenOrder
        || left.sashCatalogEntryId.localeCompare(right.sashCatalogEntryId)
      )),
    ])
  );
}

export function getSashUsageRanking(rankings, pyeong, constructionSubitemId) {
  const scopeKey = getRankingScopeKey(pyeong, constructionSubitemId);
  return scopeKey ? rankings?.[scopeKey] ?? [] : [];
}
