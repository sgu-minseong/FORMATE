export function createInternalPageHistory(initialPage) {
  return {
    entries: [initialPage],
    index: 0,
  };
}

export function getCurrentInternalPage(history) {
  return history?.entries?.[history.index] ?? "landing";
}

export function pushInternalPage(history, nextPage) {
  const currentPage = getCurrentInternalPage(history);
  if (!nextPage || nextPage === currentPage) return history;

  const entries = [...(history?.entries ?? []).slice(0, (history?.index ?? 0) + 1), nextPage];
  return {
    entries,
    index: entries.length - 1,
  };
}

export function moveInternalPageHistory(history, direction) {
  const offset = direction === "forward" ? 1 : -1;
  const nextIndex = (history?.index ?? 0) + offset;
  if (!history?.entries?.[nextIndex]) return history;

  return {
    ...history,
    index: nextIndex,
  };
}

export function canMoveInternalPageHistory(history, direction) {
  const offset = direction === "forward" ? 1 : -1;
  return Boolean(history?.entries?.[(history?.index ?? 0) + offset]);
}
