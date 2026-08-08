const STORAGE_PREFIX = "formate.adminTemplateCondition";
const RECENT_LIMIT = 5;

function getStorageKey(companyId, preference) {
  return `${STORAGE_PREFIX}.${preference}.${companyId || "default"}`;
}

function readIdList(storage, key) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.map((id) => `${id}`).filter(Boolean))] : [];
  } catch {
    return [];
  }
}

function writeIdList(storage, key, ids) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify([...new Set((ids ?? []).map((id) => `${id}`).filter(Boolean))]));
}

export function readTemplateConditionPreferences(storage, companyId) {
  return {
    favorites: readIdList(storage, getStorageKey(companyId, "favorites")),
    recent: readIdList(storage, getStorageKey(companyId, "recent")),
    lastSelectedId: storage?.getItem(getStorageKey(companyId, "lastSelected")) ?? "",
  };
}

export function writeTemplateConditionFavorites(storage, companyId, ids) {
  writeIdList(storage, getStorageKey(companyId, "favorites"), ids);
}

export function writeTemplateConditionRecent(storage, companyId, ids) {
  writeIdList(storage, getStorageKey(companyId, "recent"), ids?.slice(0, RECENT_LIMIT));
}

export function writeLastSelectedTemplateCondition(storage, companyId, templateId) {
  if (!storage || !companyId) return;
  storage.setItem(getStorageKey(companyId, "lastSelected"), `${templateId ?? ""}`);
}

export function addRecentTemplateCondition(ids, templateId) {
  if (!templateId) return ids ?? [];
  return [`${templateId}`, ...(ids ?? []).filter((id) => `${id}` !== `${templateId}`)].slice(0, RECENT_LIMIT);
}

export function toggleFavoriteTemplateCondition(ids, templateId) {
  const normalizedId = `${templateId ?? ""}`;
  if (!normalizedId) return ids ?? [];
  return (ids ?? []).some((id) => `${id}` === normalizedId)
    ? ids.filter((id) => `${id}` !== normalizedId)
    : [...ids, normalizedId];
}

export function filterTemplateConditions(templates, query, getLabel) {
  const normalizedQuery = `${query ?? ""}`.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return templates ?? [];
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return (templates ?? []).filter((template) => {
    const label = `${getLabel(template)}`.toLocaleLowerCase("ko-KR");
    return queryTokens.every((token) => label.includes(token));
  });
}
